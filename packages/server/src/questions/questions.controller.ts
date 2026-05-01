import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards, Request, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { QuestionsService } from './questions.service';
import { Roles, RolesGuard } from '../common/guards/roles.guard';
import { memoryStorage } from 'multer';
import * as XLSX from 'xlsx';
import { CreateQuestionDto, UpdateQuestionDto, BatchDeleteDto } from '@exam/shared';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('questions')
export class QuestionsController {
  constructor(private questionsService: QuestionsService) {}

  @Roles('admin', 'teacher')
  @Get()
  list(@Query() query: any) {
    return this.questionsService.list(query);
  }

  @Roles('admin', 'teacher', 'student')
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.questionsService.getById(id);
  }

  @Roles('admin', 'teacher')
  @Post()
  create(@Body() body: CreateQuestionDto, @Request() req) {
    return this.questionsService.create(body, req.user.id);
  }

  @Roles('admin', 'teacher')
  @Put(':id')
  update(@Param('id') id: string, @Body() body: UpdateQuestionDto) {
    return this.questionsService.update(id, body);
  }

  @Roles('admin', 'teacher')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.questionsService.remove(id);
  }

  @Roles('admin', 'teacher')
  @Post('batch-delete')
  batchDelete(@Body() body: BatchDeleteDto) {
    return this.questionsService.batchDelete(body.ids);
  }

  @Roles('admin', 'teacher')
  @Post('import')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async importFile(@UploadedFile() file: Express.Multer.File, @Request() req) {
    if (!file) throw new BadRequestException('请上传文件');
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    return this.questionsService.importFromExcel(rows, req.user.id);
  }
}
