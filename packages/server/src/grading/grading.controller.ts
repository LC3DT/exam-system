import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GradingService } from './grading.service';
import { Roles, RolesGuard } from '../common/guards/roles.guard';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('grading')
export class GradingController {
  constructor(private gradingService: GradingService) {}

  @Roles('admin', 'teacher')
  @Post('assign')
  assign(@Body() body: { examId: string; sectionId: string; graderIds: string[] }, @Request() req) {
    return this.gradingService.assignGrading(body.examId, body.sectionId, body.graderIds, req.user.id);
  }

  @Roles('admin', 'teacher')
  @Get('tasks')
  getTasks(@Request() req) {
    return this.gradingService.getPendingTasks(req.user.id);
  }

  @Roles('admin', 'teacher')
  @Post('tasks/:taskId/grade')
  submitGrade(@Param('taskId') taskId: string, @Body() body: { score: number; comment?: string }, @Request() req) {
    return this.gradingService.submitGrade(taskId, req.user.id, body.score, body.comment);
  }
}
