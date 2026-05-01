import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { QuestionsModule } from './questions/questions.module';
import { ExamsModule } from './exams/exams.module';
import { SessionsModule } from './sessions/sessions.module';
import { GradingModule } from './grading/grading.module';
import { ReportsModule } from './reports/reports.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    QuestionsModule,
    ExamsModule,
    SessionsModule,
    GradingModule,
    ReportsModule,
  ],
})
export class AppModule {}
