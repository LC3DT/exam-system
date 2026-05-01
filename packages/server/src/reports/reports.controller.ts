import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './reports.service';
import { Roles, RolesGuard } from '../common/guards/roles.guard';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'teacher')
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('exam/:examId')
  examReport(@Param('examId') examId: string) {
    return this.reportsService.examReport(examId);
  }

  @Get('exam/:examId/questions')
  questionAnalysis(@Param('examId') examId: string) {
    return this.reportsService.questionAnalysis(examId);
  }
}
