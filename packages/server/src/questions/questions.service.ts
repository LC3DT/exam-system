import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function toJson(value: any): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function fromJson(value: string | null): any {
  if (!value) return null;
  return JSON.parse(value);
}

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService) {}

  async list(query: {
    type?: string;
    knowledgePoint?: string;
    difficulty?: number;
    tags?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const type = query.type;
    const knowledgePoint = query.knowledgePoint;
    const difficulty = query.difficulty;
    const tags = query.tags;
    const status = query.status;
    const page = Number(query.page || 1);
    const pageSize = Number(query.pageSize || 20);
    const where: any = {};

    if (type) where.type = type;
    if (knowledgePoint) where.knowledgePoint = { contains: knowledgePoint };
    if (difficulty) where.difficulty = Number(difficulty);
    if (status) where.status = status;
    if (tags) where.tags = { contains: tags };

    const [items, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        include: { creator: { select: { id: true, realName: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.question.count({ where }),
    ]);

    return {
      items: items.map((i) => ({
        ...i,
        content: fromJson(i.content),
        options: fromJson(i.options),
        answer: fromJson(i.answer),
        tags: fromJson(i.tags),
      })),
      total,
      page,
      pageSize,
    };
  }

  async getById(id: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: { creator: { select: { id: true, realName: true } } },
    });
    if (!question) throw new NotFoundException('题目不存在');
    return {
      ...question,
      content: fromJson(question.content),
      options: fromJson(question.options),
      answer: fromJson(question.answer),
      tags: fromJson(question.tags),
    };
  }

  async create(data: any, creatorId: string) {
    return this.prisma.question.create({
      data: {
        type: data.type,
        content: toJson(data.content),
        options: data.options ? toJson(data.options) : null,
        answer: toJson(data.answer),
        knowledgePoint: data.knowledgePoint,
        difficulty: data.difficulty,
        estimatedTime: data.estimatedTime,
        tags: data.tags ? toJson(data.tags) : '[]',
        creatorId,
      },
    });
  }

  async update(id: string, data: any) {
    await this.getById(id);
    const updateData: any = { ...data };
    if (data.content) updateData.content = toJson(data.content);
    if (data.options) updateData.options = toJson(data.options);
    if (data.answer) updateData.answer = toJson(data.answer);
    if (data.tags) updateData.tags = toJson(data.tags);
    return this.prisma.question.update({ where: { id }, data: updateData });
  }

  async remove(id: string) {
    await this.getById(id);
    return this.prisma.question.update({ where: { id }, data: { status: 'deleted' } });
  }

  async batchImport(questions: any[], creatorId: string) {
    const results = { total: questions.length, success: 0, failed: 0, errors: [] as any[] };
    for (const q of questions) {
      try {
        await this.create(q, creatorId);
        results.success++;
      } catch (e) {
        results.failed++;
        results.errors.push({ error: e.message });
      }
    }
    return results;
  }

  async batchDelete(ids: string[]) {
    return this.prisma.question.updateMany({
      where: { id: { in: ids } },
      data: { status: 'deleted' },
    });
  }

  async importFromExcel(rows: any[], creatorId: string) {
    const results = { total: rows.length, success: 0, failed: 0, errors: [] as any[] };
    for (const [index, row] of rows.entries()) {
      try {
        const question = {
          type: row['题型'] || row['type'] || 'single',
          content: { text: row['题目内容'] || row['content'] || '' },
          options: row['选项'] ? JSON.parse(row['选项']) : (row['options'] ? JSON.parse(row['options']) : null),
          answer: { correct: row['答案'] || row['answer'] || '' },
          knowledgePoint: row['知识点'] || row['knowledgePoint'] || '',
          difficulty: parseFloat(row['难度'] || row['difficulty'] || '0.5'),
          estimatedTime: parseInt(row['预计用时'] || row['estimatedTime'] || '60'),
          tags: (row['标签'] || row['tags'] || '').split(',').filter(Boolean),
        };
        await this.create(question, creatorId);
        results.success++;
      } catch (e) {
        results.failed++;
        results.errors.push({ row: index + 2, error: e.message });
      }
    }
    return results;
  }

  async getByStrategy(strategy: { knowledgePoint: string; difficultyMin: number; difficultyMax: number; count: number }) {
    const candidates = await this.prisma.question.findMany({
      where: {
        status: 'published',
        knowledgePoint: strategy.knowledgePoint,
        difficulty: { gte: strategy.difficultyMin, lte: strategy.difficultyMax },
      },
    });

    if (candidates.length < strategy.count) {
      throw new NotFoundException(
        `知识点 "${strategy.knowledgePoint}" 下符合条件的题目不足 ${strategy.count} 道`,
      );
    }

    const shuffled = candidates.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, strategy.count).map((q) => ({
      ...q,
      content: fromJson(q.content),
      options: fromJson(q.options),
      answer: fromJson(q.answer),
      tags: fromJson(q.tags),
    }));
  }
}
