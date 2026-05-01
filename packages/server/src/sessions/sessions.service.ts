import { Injectable, NotFoundException, BadRequestException, Inject, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import Redis from 'ioredis';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    private prisma: PrismaService,
    @Optional() @Inject(REDIS_CLIENT) private redis: Redis | null,
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

    const instanceId = session.instanceId || (
      await this.prisma.examInstance.findFirst({
        where: { examId: session.examId, studentId: session.studentId },
        select: { id: true },
      })
    )?.id;

    if (!instanceId) return;

    const instanceAnswer = await this.prisma.examAnswer.findFirst({
      where: { instanceId, questionId },
    });

    if (instanceAnswer) {
      await this.prisma.examAnswer.update({
        where: { id: instanceAnswer.id },
        data: { answer: JSON.stringify(answer), status: 'answered', markedForReview },
      });
    }
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
    });
    if (!session) throw new NotFoundException('考试会话不存在');
    if (session.status !== 'active') throw new BadRequestException('考试已结束');

    await this.prisma.examSession.update({
      where: { id: sessionId },
      data: { status: 'submitted', submittedAt: new Date() },
    });

    if (this.redisAvailable) {
      await this.redis!.del(`session:${sessionId}`);
      await this.redis!.del(`session:${sessionId}:answers`);
    }

    await this.autoGrade(session.examId, session.studentId);

    const instance = await this.prisma.examInstance.findFirst({
      where: { examId: session.examId, studentId: session.studentId },
      include: { answers: true },
    });

    const totalScore = instance?.answers.reduce((sum, a) => sum + (a.score || 0), 0) || 0;

    const exam = await this.prisma.exam.findUnique({
      where: { id: session.examId },
      select: { totalScore: true },
    });

    return {
      message: '交卷成功',
      score: totalScore,
      total: exam?.totalScore || 100,
      submittedAt: new Date(),
    };
  }

  async autoGrade(examId: string, studentId: string) {
    const instance = await this.prisma.examInstance.findFirst({
      where: { examId, studentId },
      include: { answers: { include: { question: true } } },
    });

    if (!instance) return;

    const sections = await this.prisma.examSection.findMany({
      where: { examId },
      include: { questions: true },
    });

    const questionScoreMap = new Map<string, number>();
    for (const section of sections) {
      for (const eq of section.questions) {
        questionScoreMap.set(eq.questionId, section.scorePerQuestion);
      }
    }

    for (const answer of instance.answers) {
      if (['single', 'multiple', 'judge'].includes(answer.question.type)) {
        let correctAnswer: any;
        try {
          correctAnswer = JSON.parse(answer.question.answer).correct;
        } catch {
          correctAnswer = answer.question.answer;
        }

        let studentAnswer: any;
        try {
          studentAnswer = answer.answer ? JSON.parse(answer.answer).correct : null;
        } catch {
          studentAnswer = answer.answer;
        }

        const perQuestionScore = questionScoreMap.get(answer.questionId) || 5;
        let score = 0;

        if (answer.question.type === 'multiple') {
          const correct = Array.isArray(correctAnswer) ? correctAnswer.sort().join(',') : String(correctAnswer);
          const student = Array.isArray(studentAnswer) ? studentAnswer.sort().join(',') : String(studentAnswer);
          score = correct === student ? perQuestionScore : 0;
        } else {
          score = String(correctAnswer) === String(studentAnswer ?? '') ? perQuestionScore : 0;
        }

        await this.prisma.examAnswer.update({
          where: { id: answer.id },
          data: { score },
        });
      }
    }
  }

  async recordViolation(sessionId: string, studentId: string, type: string, description?: string) {
    const violation = await this.prisma.violation.create({
      data: { sessionId, studentId, type, description },
    });

    await this.prisma.examSession.update({
      where: { id: sessionId },
      data: { violationCount: { increment: 1 } },
    });

    return violation;
  }

  async getLiveStatus(examId: string) {
    const sessions = await this.prisma.examSession.findMany({
      where: { examId },
      include: { student: { select: { id: true, realName: true } } },
    });

    const onlineCount = sessions.filter((s) => s.status === 'active').length;
    const submittedCount = sessions.filter((s) => s.status === 'submitted').length;
    const terminatedCount = sessions.filter((s) => s.status === 'terminated').length;

    const violations = await this.prisma.violation.findMany({
      where: {
        session: { examId, status: 'active' },
        detectedAt: { gte: new Date(Date.now() - 60000) },
      },
      include: { student: { select: { id: true, realName: true } } },
      take: 50,
      orderBy: { detectedAt: 'desc' },
    });

    return {
      total: sessions.length,
      onlineCount,
      submittedCount,
      terminatedCount,
      recentViolations: violations,
    };
  }

  async terminateSession(sessionId: string, reason: string) {
    await this.prisma.examSession.update({
      where: { id: sessionId },
      data: { status: 'terminated', submittedAt: new Date() },
    });
    return { message: '已强制收卷' };
  }

  async extendTime(sessionId: string, extraMinutes: number) {
    const session = await this.prisma.examSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('会话不存在');
    return { message: '已延长作答时间', extraMinutes };
  }
}
