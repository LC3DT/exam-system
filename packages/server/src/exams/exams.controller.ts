import { Controller, Get, Post, Put, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExamsService } from './exams.service';
import { Roles, RolesGuard } from '../common/guards/roles.guard';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('exams')
export class ExamsController {
  constructor(private examsService: ExamsService) {}

  @Roles('admin', 'teacher', 'student')
  @Get()
  list(@Query() query: any, @Request() req) {
    return this.examsService.list({ ...query, role: req.user?.role });
  }

  @Roles('admin', 'teacher', 'student')
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.examsService.getById(id);
  }

  @Roles('admin', 'teacher')
  @Post()
  create(@Body() body: any, @Request() req) {
    return this.examsService.create(body, req.user.id);
  }

  @Roles('admin', 'teacher')
  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.examsService.update(id, body);
  }

  @Roles('admin', 'teacher')
  @Post(':id/publish')
  publish(@Param('id') id: string) {
    return this.examsService.publish(id);
  }

  @Roles('admin', 'teacher')
  @Post(':id/start')
  startExam(@Param('id') id: string) {
    return this.examsService.startExam(id);
  }

  @Roles('admin', 'teacher')
  @Post(':id/finish')
  finishExam(@Param('id') id: string) {
    return this.examsService.finishExam(id);
  }

  @Roles('admin', 'teacher')
  @Get(':id/preview')
  preview(@Param('id') id: string) {
    return this.examsService.preview(id);
  }

  @Roles('admin', 'teacher', 'student')
  @Post(':id/enter')
  enterExam(@Param('id') examId: string, @Request() req) {
    return this.examsService.generateInstance(examId, req.user.id);
  }
}
