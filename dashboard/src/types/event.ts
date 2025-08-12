export interface Question {
  id: string;
  type: 'multiple-choice' | 'text' | 'textarea' | 'dropdown' | 'checkbox_group' | 'email' | 'tel' | 'tags' | 'rating' | 'boolean';
  question: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  maxTags?: number;
  maxRating?: number;
  page?: number;                   // Page number for multi-page forms
  rowNumber?: number;              // Row position within the page
  columnNumber?: number;           // Column position within the row (0 or 1)
  orderInCell?: number;            // Order within the same row/column position
  
  // New fields to track question origin and modifications
  isFromMaster?: boolean;          // true if from questions_master, false if completely new
  masterQuestionId?: string;       // ID from questions_master if applicable
  originalText?: string;           // Original text from master (for comparison)
  originalOptions?: string[];      // Original options from master (for comparison)
  originalPlaceholder?: string;    // Original placeholder from master (for comparison)
  originalMaxRating?: number;      // Original maxRating from master (for comparison)
  originalMaxTags?: number;        // Original maxTags from master (for comparison)
  isModified?: boolean;            // true if question was edited from its master version
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
  // New media management fields
  banner_url?: string;
  badge_template_url?: string;
  email_media_url?: string;
  email_subject?: string;
  email_body?: string;
  email_template_variables?: Record<string, string>;
}

export interface HeaderBanner {
  id: string;
  name: string;
  image: string;
  category: string;
}