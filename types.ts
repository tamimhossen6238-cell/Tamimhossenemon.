export interface Project {
  id: string;
  name: string;
  code: string;
  date: number;
  subject?: string;
  topic?: string;
}

export interface QuizConfig {
  subject: string;
  topic: string;
  standard: string;
  questions: number;
  others?: string;
  negativeMarking: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
}