export class CreateQuestionDto {
  type: string;
  content: any;
  options?: any;
  answer: any;
  knowledgePoint: string;
  difficulty: number;
  estimatedTime: number;
  tags?: string[];
}

export class UpdateQuestionDto {
  type?: string;
  content?: any;
  options?: any;
  answer?: any;
  knowledgePoint?: string;
  difficulty?: number;
  estimatedTime?: number;
  tags?: string[];
}
