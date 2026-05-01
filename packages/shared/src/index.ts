export enum UserRole {
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STUDENT = 'student',
}

export enum QuestionType {
  SINGLE = 'single',
  MULTIPLE = 'multiple',
  JUDGE = 'judge',
  FILL = 'fill',
  ESSAY = 'essay',
  CODE = 'code',
}

export enum ExamStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ONGOING = 'ongoing',
  FINISHED = 'finished',
}

export enum SessionStatus {
  ACTIVE = 'active',
  SUBMITTED = 'submitted',
  TERMINATED = 'terminated',
}

export enum ViolationType {
  TAB_SWITCH = 'tab_switch',
  FULLSCREEN_EXIT = 'fullscreen_exit',
  FACE_FAIL = 'face_fail',
  IDLE = 'idle',
}

export enum PaperMode {
  FIXED = 'fixed',
  RANDOM = 'random',
}

export interface DifficultyRange {
  min: number
  max: number
}

export interface RandomStrategy {
  knowledgePoint: string
  difficulty: DifficultyRange
  count: number
}

export interface QuestionOption {
  label: string
  content: string
}

export interface QuestionDto {
  type: QuestionType
  content: Record<string, unknown>
  options?: QuestionOption[]
  answer: Record<string, unknown>
  knowledgePoint: string
  difficulty: number
  estimatedTime: number
  tags?: string[]
}

export interface ExamDto {
  title: string
  totalScore: number
  durationMinutes: number
  startTime: string
  endTime: string
  paperMode: PaperMode
  shuffleOptions: boolean
  shuffleQuestions: boolean
  sections: ExamSectionDto[]
}

export interface ExamSectionDto {
  name: string
  fixedQuestionIds?: string[]
  randomStrategies?: RandomStrategy[]
  scorePerQuestion: number
}

export interface ViolationDto {
  sessionId: string
  type: ViolationType
  description: string
}

export {
  LoginDto,
  CreateUserDto,
  UpdateUserDto,
  ResetPasswordDto,
  CreateQuestionDto,
  UpdateQuestionDto,
  BatchDeleteDto,
  ExamListQueryDto,
  CreateExamDto,
  UpdateExamDto,
  SaveAnswerDto,
  RecordViolationDto,
  TerminateSessionDto,
  ExtendTimeDto,
  AssignGradingDto,
  SubmitGradeDto,
} from './dto';
