import { Injectable, NotFoundException, BadRequestException, Inject, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import Redis from 'ioredis';
import { SessionsGateway } from './sessions.gateway';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    private prisma: PrismaService,
    @Optional() @Inject(REDIS_CLIENT) private redis: Redis | null,
    @Optional() private gateway?: SessionsGateway,
  ) {}

  private get redisAvailable(): boolean {
    return !!(this.redis && this.redis.status === 'ready');
  }

  async startSession(examId: string, studentId: string, ipAddress: string) {
    const existing = await this.prisma.examSession.findFirst({
      where: { examId, studentId, status: 'active' },
    });
    if (existing) return existing;

    return this.prisma.examSession.create({
      data: { examId, studentId, ipAddress, status: 'active', startedAt: new Date() },
    });
  }

  async saveAnswer(sessionId: string, questionId: string, answer: any, markedForReview = false) {
    if (this.redisAvailable) {
      const cacheKey = `session:${sessionId}:answers`;
      const existing = await this.redis!.hget(cacheKey, questionId);
      const data = { questionId, answer, markedForReview, timestamp: new Date().toISOString() };
      if (existing) {
        const parsed = JSON.parse(existing);
        if (parsed.answer) data.answer = { ...parsed.answer, ...answer };
      }
      await this.redis!.hset(cacheKey, questionId, JSON.stringify(data));
    }

    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      select: { examId: true, studentId: true, instanceId: true },
    });
    if (!session) return;

    let instanceId: string | null = session.instanceId ?? null;
    if (!instanceId) {
      const instance = await this.prisma.examInstance.findFirst({
        where: { examId: session.examId, studentId: session.studentId },
        select: { id: true },
      });
      instanceId = instance?.id ?? null;
    }
    if (!instanceId) return;

    await this.prisma.examAnswer.upsert({
      where: {
        instanceId_questionId: { instanceId, questionId },
      },
      create: {
        instanceId,
        questionId,
        answer: JSON.stringify(answer),
        status: 'answered',
        markedForReview,
      },
      update: {
        answer: JSON.stringify(answer),
        status: 'answered',
        markedForReview,
      },
    });
  }

  async getCachedAnswers(sessionId: string) {
    if (this.redisAvailable) {
      const cacheKey = `session:${sessionId}:answers`;
      const entries = await this.redis!.hgetall(cacheKey);
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(entries)) {
        result[key] = JSON.parse(value);
      }
      return result;
    }
    return {};
  }

  async submitExam(sessionId: string) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: { exam: { select: { id: true, totalScore: true } } },
    });
    if (!session) throw new NotFoundException('考试会话不存在');
    if (session.status !== 'active') throw new BadRequestException('考试已结束');

    await this.prisma.$transaction(async (tx) => {
      await tx.examSession.update({
        where: { id: sessionId },
        data: { status: 'submitted', submittedAt: new Date() },
      });
    });

    if (this.redisAvailable) {
      await this.redis!.del(`session:${sessionId}`);
      await this.redis!.del(`session:${sessionId}:answers`);
    }

    await this.autoGrade(session.examId, session.studentId);

    const instance = await this.prisma.examInstance.findFirst({
      where: { examId: session.examId, studentId: session.studentId },
      select: { answers: { select: { score: true } } },
    });

    const totalScore = instance?.answers.reduce((sum, a) => sum + (a.score || 0), 0) || 0;

    if (this.gateway) {
      try { this.gateway.broadcastStatus(session.examId, { type: 'submit', studentId: session.studentId }); } catch {}
    }

    return {
      message: '交卷成功',
      score: totalScore,
      total: session.exam.totalScore || 100,
      submittedAt: new Date(),
    };
  }

  async autoGrade(examId: string, studentId: string) {
    const instance = await this.prisma.examInstance.findFirst({
      where: { examId, studentId },
      include: {
        answers: { include: { question: true } },
        exam: {
          select: {
            sections: {
              select: {
                scorePerQuestion: true,
                questions: { select: { questionId: true } },
              },
            },
          },
        },
      },
    });

    if (!instance) return;

    const questionScoreMap = new Map<string, number>();
    for (const section of instance.exam.sections) {
      for (const eq of section.questions) {
        questionScoreMap.set(eq.questionId, section.scorePerQuestion);
      }
    }

    const updates: Array<{ id: string; score: number }> = [];
    for (const answer of instance.answers) {
      if (!['single', 'multiple', 'judge'].includes(answer.question.type)) continue;

      let correctAnswer: any;
      try { correctAnswer = JSON.parse(answer.question.answer).correct; } catch { correctAnswer = answer.question.answer; }

      let studentAnswer: any;
      try { studentAnswer = answer.answer ? JSON.parse(answer.answer).correct : null; } catch { studentAnswer = answer.answer; }

      const perQuestionScore = questionScoreMap.get(answer.questionId) || 5;
      let score = 0;

      if (answer.question.type === 'multiple') {
        const correct = Array.isArray(correctAnswer) ? correctAnswer.sort().join(',') : String(correctAnswer);
        const student = Array.isArray(studentAnswer) ? studentAnswer.sort().join(',') : String(studentAnswer);
        score = correct === student ? perQuestionScore : 0;
      } else {
        score = String(correctAnswer) === String(studentAnswer ?? '') ? perQuestionScore : 0;
      }

      updates.push({ id: answer.id, score });
    }

    if (updates.length > 0) {
      await this.prisma.$transaction(
        updates.map((u) =>
          this.prisma.examAnswer.update({ where: { id: u.id }, data: { score: u.score } }),
        ),
      );
    }
  }

  async recordViolation(sessionId: string, studentId: string, type: string, description?: string) {
    const [violation] = await this.prisma.$transaction([
      this.prisma.violation.create({ data: { sessionId, studentId, type, description } }),
      this.prisma.examSession.update({
        where: { id: sessionId },
        data: { violationCount: { increment: 1 } },
      }),
    ]);

    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      select: { examId: true },
    });

    if (this.gateway && session) {
      try {
        this.gateway.broadcastViolation(session.examId, {
          id: violation.id,
          type: violation.type,
          description: violation.description,
          studentId,
          detectedAt: violation.detectedAt,
        });
      } catch {}
    }

    return violation;
  }

  async getLiveStatus(examId: string) {
    const [sessions, violations] = await Promise.all([
      this.prisma.examSession.findMany({
        where: { examId },
        select: {
          status: true,
          student: { select: { id: true, realName: true } },
        },
      }),
      this.prisma.violation.findMany({
        where: {
          session: { examId, status: 'active' },
          detectedAt: { gte: new Date(Date.now() - 60000) },
        },
        include: { student: { select: { id: true, realName: true } } },
        take: 50,
        orderBy: { detectedAt: 'desc' },
      }),
    ]);

    return {
      total: sessions.length,
      onlineCount: sessions.filter((s) => s.status === 'active').length,
      submittedCount: sessions.filter((s) => s.status === 'submitted').length,
      terminatedCount: sessions.filter((s) => s.status === 'terminated').length,
      recentViolations: violations,
    };
  }

  async terminateSession(sessionId: string, reason: string) {
    const session = await this.prisma.examSession.update({
      where: { id: sessionId },
      data: { status: 'terminated', submittedAt: new Date() },
      select: { examId: true },
    });

    if (this.gateway) {
      try { this.gateway.broadcastStatus(session.examId, { type: 'terminate', sessionId, reason }); } catch {}
    }

    return { message: '已强制收卷' };
  }

  async extendTime(sessionId: string, extraMinutes: number) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      select: { examId: true },
    });
    if (!session) throw new NotFoundException('会话不存在');

    if (this.gateway) {
      try { this.gateway.broadcastStatus(session.examId, { type: 'extend', sessionId, extraMinutes }); } catch {}
    }

    return { message: '已延长作答时间', extraMinutes };
  }
}
