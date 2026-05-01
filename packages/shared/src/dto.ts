import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  ValidateNested,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionType, ExamStatus, PaperMode, UserRole, ViolationType } from './index';

export class LoginDto {
  @IsString()
  username: string;

  @IsString()
  password: string;
}

export class CreateUserDto {
  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsString()
  realName: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsString()
  orgId?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  realName?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  orgId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ResetPasswordDto {
  @IsString()
  password: string;
}

export class CreateQuestionDto {
  @IsEnum(QuestionType)
  type: QuestionType;

  content: any;

  @IsOptional()
  options?: any;

  answer: any;

  @IsString()
  knowledgePoint: string;

  @IsNumber()
  difficulty: number;

  @IsNumber()
  estimatedTime: number;

  @IsOptional()
  tags?: string[];
}

export class UpdateQuestionDto {
  @IsOptional()
  @IsEnum(QuestionType)
  type?: QuestionType;

  @IsOptional()
  content?: any;

  @IsOptional()
  options?: any;

  @IsOptional()
  answer?: any;

  @IsOptional()
  @IsString()
  knowledgePoint?: string;

  @IsOptional()
  @IsNumber()
  difficulty?: number;

  @IsOptional()
  @IsNumber()
  estimatedTime?: number;

  @IsOptional()
  tags?: string[];
}

export class BatchDeleteDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}

export class ExamListQueryDto {
  @IsOptional()
  @IsEnum(ExamStatus)
  status?: ExamStatus;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  pageSize?: number;
}

export class CreateExamDto {
  @IsString()
  title: string;

  @IsNumber()
  @Min(1)
  totalScore: number;

  @IsNumber()
  @Min(1)
  durationMinutes: number;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsEnum(PaperMode)
  paperMode: PaperMode;

  @IsBoolean()
  shuffleOptions: boolean;

  @IsBoolean()
  shuffleQuestions: boolean;

  @IsArray()
  sections: any[];
}

export class UpdateExamDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  totalScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsEnum(PaperMode)
  paperMode?: PaperMode;

  @IsOptional()
  @IsBoolean()
  shuffleOptions?: boolean;

  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;

  @IsOptional()
  @IsArray()
  sections?: any[];
}

export class SaveAnswerDto {
  @IsString()
  questionId: string;

  answer: any;

  @IsOptional()
  @IsBoolean()
  markedForReview?: boolean;
}

export class RecordViolationDto {
  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class TerminateSessionDto {
  @IsString()
  reason: string;
}

export class ExtendTimeDto {
  @IsNumber()
  @Min(1)
  minutes: number;
}

export class AssignGradingDto {
  @IsString()
  examId: string;

  @IsString()
  sectionId: string;

  @IsArray()
  @IsString({ each: true })
  graderIds: string[];
}

export class SubmitGradeDto {
  @IsNumber()
  score: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
