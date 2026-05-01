import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async examReport(examId: string) {
    const [exam, instances] = await Promise.all([
      this.prisma.exam.findUnique({
        where: { id: examId },
        select: { title: true, totalScore: true },
      }),
      this.prisma.examInstance.findMany({
        where: { examId },
        select: {
          answers: { select: { score: true } },
        },
      }),
    ]);

    if (!exam) return null;

    const scores: number[] = instances.map(
      (inst) => inst.answers.reduce((sum, a) => sum + (a.score || 0), 0),
    );

    scores.sort((a, b) => a - b);
    const highest = scores.length > 0 ? scores[scores.length - 1] : 0;
    const lowest = scores.length > 0 ? scores[0] : 0;
    const average = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100) / 100
      : 0;
    const passCount = scores.filter((s) => s >= exam.totalScore * 0.6).length;
    const passRate = scores.length > 0 ? Math.round(passCount / scores.length * 100) / 100 : 0;

    const distribution = this.calculateDistribution(scores, exam.totalScore);

    return {
      title: exam.title,
      totalScore: exam.totalScore,
      totalStudents: scores.length,
      highest,
      lowest,
      average,
      passRate,
      distribution,
    };
  }

  async questionAnalysis(examId: string) {
    const questions = await this.prisma.question.findMany({
      where: { examSections: { some: { section: { examId } } } },
      select: {
        id: true,
        type: true,
        knowledgePoint: true,
        difficulty: true,
        examAnswers: {
          where: { instance: { examId } },
          select: { score: true },
        },
      },
    });

    return questions.map((q) => {
      const total = q.examAnswers.length;
      const correctCount = q.examAnswers.filter((a) => (a.score || 0) > 0).length;
      const correctRate = total > 0 ? Math.round(correctCount / total * 100) / 100 : 0;
      const isAnomalous = total > 0 && (correctRate < 0.1 || correctRate > 0.95);

      return {
        id: q.id,
        type: q.type,
        knowledgePoint: q.knowledgePoint,
        difficulty: q.difficulty,
        totalAnswers: total,
        correctRate,
        isAnomalous,
      };
    });
  }

  private calculateDistribution(scores: number[], totalScore: number) {
    if (scores.length === 0) return [];
    const step = totalScore / 10;
    const buckets: { range: string; count: number }[] = [];

    for (let i = 0; i < 10; i++) {
      const min = Math.round(i * step * 100) / 100;
      const max = Math.round((i + 1) * step * 100) / 100;
      const count = scores.filter((s) => s >= min && (i === 9 ? s <= max : s < max)).length;
      buckets.push({ range: `${min}-${max}`, count });
    }

    return buckets;
  }
}
