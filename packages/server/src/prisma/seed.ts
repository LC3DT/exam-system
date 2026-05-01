import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash('admin123', 10);
  const teacherHash = await bcrypt.hash('teacher123', 10);
  const studentHash = await bcrypt.hash('student123', 10);

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminHash,
      realName: '系统管理员',
      role: 'admin',
    },
  });

  await prisma.user.upsert({
    where: { username: 'teacher' },
    update: {},
    create: {
      username: 'teacher',
      passwordHash: teacherHash,
      realName: '张老师',
      role: 'teacher',
    },
  });

  await prisma.user.upsert({
    where: { username: 'student' },
    update: {},
    create: {
      username: 'student',
      passwordHash: studentHash,
      realName: '李同学',
      role: 'student',
    },
  });

  const adminId = (await prisma.user.findUnique({ where: { username: 'admin' } }))!.id;

  const questions = [
    {
      type: 'single',
      content: JSON.stringify({ text: 'JavaScript 中 typeof null 的结果是？' }),
      options: JSON.stringify([
        { label: 'A', content: 'null' },
        { label: 'B', content: 'undefined' },
        { label: 'C', content: 'object' },
        { label: 'D', content: 'string' },
      ]),
      answer: JSON.stringify({ correct: 'C' }),
      knowledgePoint: 'JavaScript基础',
      difficulty: 0.3,
      estimatedTime: 30,
      tags: JSON.stringify(['JavaScript', '基础']),
    },
    {
      type: 'multiple',
      content: JSON.stringify({ text: '以下哪些是 HTTP 请求方法？' }),
      options: JSON.stringify([
        { label: 'A', content: 'GET' },
        { label: 'B', content: 'POST' },
        { label: 'C', content: 'QUERY' },
        { label: 'D', content: 'DELETE' },
      ]),
      answer: JSON.stringify({ correct: ['A', 'B', 'D'] }),
      knowledgePoint: 'HTTP协议',
      difficulty: 0.4,
      estimatedTime: 45,
      tags: JSON.stringify(['HTTP', '网络']),
    },
    {
      type: 'judge',
      content: JSON.stringify({ text: 'TCP 是无连接的传输协议。' }),
      answer: JSON.stringify({ correct: false }),
      knowledgePoint: '网络协议',
      difficulty: 0.2,
      estimatedTime: 20,
      tags: JSON.stringify(['网络', 'TCP']),
    },
    {
      type: 'fill',
      content: JSON.stringify({ text: 'React 中使用 ____ 来管理组件的内部状态。' }),
      answer: JSON.stringify({ correct: 'useState' }),
      knowledgePoint: 'React',
      difficulty: 0.4,
      estimatedTime: 40,
      tags: JSON.stringify(['React', 'Hooks']),
    },
    {
      type: 'essay',
      content: JSON.stringify({ text: '请简述 RESTful API 的设计原则。' }),
      answer: JSON.stringify({ correct: '' }),
      knowledgePoint: 'API设计',
      difficulty: 0.6,
      estimatedTime: 300,
      tags: JSON.stringify(['REST', 'API']),
    },
  ];

  for (const q of questions) {
    await prisma.question.create({
      data: { ...q, creatorId: adminId },
    });
  }

  console.log('Seed data created successfully');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
