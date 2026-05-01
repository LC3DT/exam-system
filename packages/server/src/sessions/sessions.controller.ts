import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SessionsService } from './sessions.service';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { SaveAnswerDto, RecordViolationDto, TerminateSessionDto, ExtendTimeDto } from '@exam/shared';

@Controller('sessions')
export class SessionsController {
  constructor(private sessionsService: SessionsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post(':examId/start')
  startExam(@Param('examId') examId: string, @Request() req) {
    return this.sessionsService.startSession(examId, req.user.id, req.ip);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':sessionId/answer')
  saveAnswer(
    @Param('sessionId') sessionId: string,
    @Body() body: SaveAnswerDto,
  ) {
    return this.sessionsService.saveAnswer(sessionId, body.questionId, body.answer, body.markedForReview);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':sessionId/submit')
  submitExam(@Param('sessionId') sessionId: string) {
    return this.sessionsService.submitExam(sessionId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':sessionId/answers')
  getCachedAnswers(@Param('sessionId') sessionId: string) {
    return this.sessionsService.getCachedAnswers(sessionId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':sessionId/violation')
  recordViolation(
    @Param('sessionId') sessionId: string,
    @Body() body: RecordViolationDto,
    @Request() req,
  ) {
    return this.sessionsService.recordViolation(sessionId, req.user.id, body.type, body.description);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'teacher')
  @Get(':examId/live')
  getLiveStatus(@Param('examId') examId: string) {
    return this.sessionsService.getLiveStatus(examId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'teacher')
  @Post(':sessionId/terminate')
  terminateSession(
    @Param('sessionId') sessionId: string,
    @Body() body: TerminateSessionDto,
  ) {
    return this.sessionsService.terminateSession(sessionId, body.reason);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'teacher')
  @Post(':sessionId/extend')
  extendTime(
    @Param('sessionId') sessionId: string,
    @Body() body: ExtendTimeDto,
  ) {
    return this.sessionsService.extendTime(sessionId, body.minutes);
  }
}
