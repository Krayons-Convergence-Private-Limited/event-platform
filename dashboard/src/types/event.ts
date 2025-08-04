export interface Question {
  id: string;
  type: 'multiple-choice' | 'text' | 'textarea' | 'dropdown' | 'checkbox_group' | 'email' | 'tel' | 'tags' | 'rating' | 'boolean';
  question: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  maxTags?: number;
  maxRating?: number;
}

export interface FormRow {
  id: string;
  columns: Question[][];
}

export interface Event {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  organizerName: string;
  organizerEmail: string;
  questions: Question[];
  headerBanner?: string;
  uniqueId: string;
  createdAt: string;
}

export interface HeaderBanner {
  id: string;
  name: string;
  image: string;
  category: string;
}