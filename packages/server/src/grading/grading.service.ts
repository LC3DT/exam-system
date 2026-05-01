import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GradingService {
  constructor(private prisma: PrismaService) {}

  async assignGrading(examId: string, sectionId: string, graiderIds: string[], assignedBy: string) {
    const answers = await this.prisma.examAnswer.findMany({
      where: {
        instance: { examId },
        question: {
          examSections: { some: { sectionId } },
          type: { in: ['essay', 'fill', 'code'] },
        },
        status: 'answered',
      },
    });

    const tasks: any[] = [];
    for (let i = 0; i < answers.length; i++) {
      tasks.push({
        answerId: answers[i].id,
        sectionId,
        examId,
        graderId: graiderIds[i % graiderIds.length],
        assignedBy,
        status: 'pending',
      });
    }

    await this.prisma.gradingTask.createMany({ data: tasks });
    return { assigned: tasks.length, graders: graiderIds.length };
  }

  async getPendingTasks(graderId: string) {
    return this.prisma.gradingTask.findMany({
      where: { graderId, status: 'pending' },
      include: {
        grader: { select: { realName: true } },
      },
      take: 50,
      orderBy: { assignedAt: 'asc' },
    });
  }

  async submitGrade(taskId: string, graderId: string, score: number, comment?: string) {
    const task = await this.prisma.gradingTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('阅卷任务不存在');
    if (task.graderId !== graderId) throw new NotFoundException('无权批阅此题目');

    await this.prisma.gradingTask.update({
      where: { id: taskId },
      data: { score, comment, status: 'completed', completedAt: new Date() },
    });

    await this.prisma.examAnswer.update({
      where: { id: task.answerId },
      data: { score },
    });

    return { message: '评分成功' };
  }
}
