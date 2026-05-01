import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuestionsService } from '../questions/questions.service';

function fisherYatesShuffle<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function safeParse(v: any): any {
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return v; }
}

@Injectable()
export class ExamsService {
  constructor(
    private prisma: PrismaService,
    private questionsService: QuestionsService,
  ) {}

  async list(query: { status?: string; page?: number; pageSize?: number; role?: string }) {
    const status = query.status;
    const page = Number(query.page || 1);
    const pageSize = Number(query.pageSize || 20);
    const role = query.role;
    const where: any = {};

    if (role === 'student') {
      where.status = status || { in: ['published', 'ongoing', 'finished'] };
    } else if (status) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      this.prisma.exam.findMany({
        where,
        include: { creator: { select: { realName: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.exam.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async getById(id: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        sections: {
          include: { questions: { include: { question: true } }, strategies: true },
          orderBy: { orderIndex: 'asc' },
        },
        creator: { select: { realName: true } },
      },
    });
    if (!exam) throw new NotFoundException('试卷不存在');
    return exam;
  }

  async create(data: any, creatorId: string) {
    const { sections, ...examData } = data;

    return this.prisma.exam.create({
      data: {
        ...examData,
        creatorId,
        sections: {
          create: sections.map((s: any, i: number) => ({
            name: s.name,
            scorePerQuestion: s.scorePerQuestion,
            orderIndex: i,
            questions: data.paperMode === 'fixed' && s.fixedQuestionIds
              ? { create: s.fixedQuestionIds.map((qid: string, qi: number) => ({ questionId: qid, orderIndex: qi })) }
              : undefined,
            strategies: data.paperMode === 'random' && s.randomStrategies
              ? { create: s.randomStrategies.map((rs: any) => ({
                  knowledgePoint: rs.knowledgePoint,
                  difficultyMin: rs.difficultyMin ?? rs.difficulty?.min ?? 0,
                  difficultyMax: rs.difficultyMax ?? rs.difficulty?.max ?? 1,
                  count: rs.count,
                })) }
              : undefined,
          })),
        },
      },
      include: { sections: { include: { questions: true, strategies: true } } },
    });
  }

  async update(id: string, data: any) {
    const exam = await this.getById(id);
    if (exam.status !== 'draft') throw new BadRequestException('只有草稿状态的试卷可以编辑');

    const { sections, ...examData } = data;

    return this.prisma.$transaction(async (tx) => {
      await tx.examSection.deleteMany({ where: { examId: id } });

      return tx.exam.update({
        where: { id },
        data: {
          ...examData,
          sections: {
            create: sections.map((s: any, i: number) => ({
              name: s.name,
              scorePerQuestion: s.scorePerQuestion,
              orderIndex: i,
              questions: data.paperMode === 'fixed' && s.fixedQuestionIds
                ? { create: s.fixedQuestionIds.map((qid: string, qi: number) => ({ questionId: qid, orderIndex: qi })) }
                : undefined,
              strategies: data.paperMode === 'random' && s.randomStrategies
                ? { create: s.randomStrategies.map((rs: any) => ({
                    knowledgePoint: rs.knowledgePoint,
                    difficultyMin: rs.difficultyMin ?? rs.difficulty?.min ?? 0,
                    difficultyMax: rs.difficultyMax ?? rs.difficulty?.max ?? 1,
                    count: rs.count,
                  })) }
                : undefined,
            })),
          },
        },
        include: { sections: { include: { questions: true, strategies: true } } },
      });
    });
  }

  async publish(id: string) {
    const exam = await this.getById(id);
    if (exam.status !== 'draft') throw new BadRequestException('只有草稿状态的试卷可以发布');

    if (!exam.sections || exam.sections.length === 0) {
      throw new BadRequestException('试卷至少需要一个大题');
    }

    for (const section of exam.sections) {
      if (exam.paperMode === 'fixed' && (!section.questions || section.questions.length === 0)) {
        throw new BadRequestException(`大题 "${section.name}" 在固定组卷模式下需要指定题目`);
      }
      if (exam.paperMode === 'random' && (!section.strategies || section.strategies.length === 0)) {
        throw new BadRequestException(`大题 "${section.name}" 在随机组卷模式下需要配置抽题策略`);
      }
    }

    return this.prisma.exam.update({
      where: { id },
      data: { status: 'published' },
    });
  }

  async startExam(id: string) {
    const exam = await this.getById(id);
    if (!['published', 'ongoing'].includes(exam.status)) {
      throw new BadRequestException('只能已发布或进行中的试卷可以开考');
    }
    return this.prisma.exam.update({
      where: { id },
      data: { status: 'ongoing' },
    });
  }

  async finishExam(id: string) {
    const exam = await this.getById(id);
    if (!['ongoing', 'published'].includes(exam.status)) {
      throw new BadRequestException('只能进行中或已发布的试卷可以结束');
    }
    return this.prisma.exam.update({
      where: { id },
      data: { status: 'finished' },
    });
  }

  async preview(id: string) {
    const exam = await this.getById(id);
    let totalQuestions = 0;
    let totalDifficulty = 0;

    for (const section of exam.sections) {
      if (exam.paperMode === 'fixed') {
        const count = section.questions?.length || 0;
        totalQuestions += count;
        for (const eq of section.questions || []) {
          totalDifficulty += eq.question?.difficulty || 0;
        }
      } else {
        for (const strategy of section.strategies || []) {
          totalQuestions += strategy.count;
          totalDifficulty += ((strategy.difficultyMin + strategy.difficultyMax) / 2) * strategy.count;
        }
      }
    }

    const avgDifficulty = totalQuestions > 0 ? totalDifficulty / totalQuestions : 0;
    const estimatedAvgScore = Math.round((1 - avgDifficulty) * exam.totalScore * 100) / 100;

    return {
      title: exam.title,
      totalScore: exam.totalScore,
      durationMinutes: exam.durationMinutes,
      paperMode: exam.paperMode,
      totalQuestions,
      avgDifficulty: Math.round(avgDifficulty * 100) / 100,
      estimatedAvgScore,
    };
  }

  async generateInstance(examId: string, studentId: string) {
    const exam = await this.getById(examId);
    if (exam.status !== 'published' && exam.status !== 'ongoing') {
      throw new BadRequestException('试卷未发布');
    }

    const now = new Date();
    if (now < new Date(exam.startTime) || now > new Date(exam.endTime)) {
      throw new BadRequestException('不在考试时间范围内');
    }

    const questionList: Array<{ questionId: string; sectionId: string; order: number }> = [];
    let globalOrder = 0;

    for (const section of exam.sections) {
      if (exam.paperMode === 'fixed') {
        for (const eq of section.questions || []) {
          questionList.push({ questionId: eq.questionId, sectionId: section.id, order: globalOrder++ });
        }
      } else {
        for (const strategy of section.strategies || []) {
          const questions = await this.questionsService.getByStrategy({
            knowledgePoint: strategy.knowledgePoint,
            difficultyMin: strategy.difficultyMin,
            difficultyMax: strategy.difficultyMax,
            count: strategy.count,
          });
          for (const q of questions) {
            questionList.push({ questionId: q.id, sectionId: section.id, order: globalOrder++ });
          }
        }
      }
    }

    if (exam.shuffleQuestions) {
      questionList.sort(() => Math.random() - 0.5);
    }

    const questionPayload = questionList.map((q) => ({ questionId: q.questionId, order: q.order }));

    let instance: any;
    try {
      instance = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.examInstance.findUnique({
          where: { examId_studentId: { examId, studentId } },
        });
        if (existing) return existing;

        const inst = await tx.examInstance.create({
          data: {
            examId,
            studentId,
            questions: JSON.stringify(questionPayload),
          },
        });

        if (questionList.length > 0) {
          await tx.examAnswer.createMany({
            data: questionList.map((q) => ({
              instanceId: inst.id,
              questionId: q.questionId,
              status: 'unanswered',
            })),
          });
        }

        return inst;
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        const existing = await this.prisma.examInstance.findUnique({
          where: { examId_studentId: { examId, studentId } },
        });
        if (existing) {
          const parsed = safeParse(existing.questions);
          const questions = Array.isArray(parsed) ? parsed : [];
          const enriched = await this.enrichQuestions(questions);
          return { ...existing, questions: enriched, durationMinutes: exam.durationMinutes };
        }
      }
      throw err;
    }

    if (!Array.isArray(instance.answers) && instance.questions) {
      const parsed = safeParse(instance.questions);
      const questions = Array.isArray(parsed) ? parsed : [];
      const enriched = await this.enrichQuestions(questions);
      return { ...instance, questions: enriched, durationMinutes: exam.durationMinutes };
    }

    const enriched = await this.enrichQuestions(questionPayload);
    return { ...instance, questions: enriched, durationMinutes: exam.durationMinutes };
  }

  private async enrichQuestions(questionList: Array<{ questionId: string; order: number }>) {
    const ids = questionList.map((q) => q.questionId);
    const questions = await this.prisma.question.findMany({
      where: { id: { in: ids } },
    });
    const qMap = new Map(questions.map((q) => [q.id, q]));

    return questionList.map((item) => {
      const q = qMap.get(item.questionId);
      if (!q) return item;
      return {
        questionId: item.questionId,
        order: item.order,
        type: q.type,
        content: safeParse(q.content),
        options: safeParse(q.options),
      };
    });
  }
}
