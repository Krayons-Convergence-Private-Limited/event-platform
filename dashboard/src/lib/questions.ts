import { supabase } from './supabaseClient';
import { Question } from '@/types/event';

export interface QuestionMaster {
  id: string;
  type: string;
  text: string;
  options: string[] | null;
  is_global: boolean;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventQuestion {
  id: string;
  event_id: string;
  question_master_id: string | null; // null for completely new questions
  required: boolean;
  page_number: number;
  row_number: number;
  column_number: number;
  order_in_cell: number;
  custom_text: string | null;
  custom_options: string[] | null;
  type: string | null; // question type for completely new questions, null for master questions
}

// Find or create a question in the questions_master table
export const findOrCreateQuestionMaster = async (
  question: Question, 
  organizationId: string
): Promise<{ questionMasterId: string; error: string | null }> => {
  try {
    console.log('Finding or creating question master:', question);
    
    // First, try to find existing global question with same type and text
    const { data: existingGlobal, error: searchError } = await supabase
      .from('questions_master')
      .select('id, text, options')
      .eq('type', question.type)
      .eq('text', question.question)
      .eq('is_global', true)
      .limit(1);

    if (searchError) {
      console.error('Error searching for global questions:', searchError);
      return { questionMasterId: '', error: searchError.message };
    }

    if (existingGlobal && existingGlobal.length > 0) {
      const globalQ = existingGlobal[0];
      // Check if options match too
      const optionsMatch = JSON.stringify(globalQ.options) === JSON.stringify(question.options);
      if (optionsMatch) {
        console.log('Found existing global question:', globalQ.id);
        return { questionMasterId: globalQ.id, error: null };
      }
    }

    // Check for existing organization-specific question
    const { data: existingOrg, error: orgSearchError } = await supabase
      .from('questions_master')
      .select('id')
      .eq('type', question.type)
      .eq('text', question.question)
      .eq('is_global', false)
      .eq('organization_id', organizationId)
      .limit(1);

    if (orgSearchError) {
      console.error('Error searching for org questions:', orgSearchError);
      return { questionMasterId: '', error: orgSearchError.message };
    }

    if (existingOrg && existingOrg.length > 0) {
      console.log('Found existing org question:', existingOrg[0].id);
      return { questionMasterId: existingOrg[0].id, error: null };
    }

    // Create a new organization-specific question
    const { data: newQuestion, error: insertError } = await supabase
      .from('questions_master')
      .insert({
        type: question.type,
        text: question.question,
        options: question.options || null,
        is_global: false,
        organization_id: organizationId
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error creating question master:', insertError);
      return { questionMasterId: '', error: insertError.message };
    }

    console.log('Created new question master:', newQuestion.id);
    return { questionMasterId: newQuestion.id, error: null };

  } catch (error) {
    console.error('Unexpected error in findOrCreateQuestionMaster:', error);
    return { questionMasterId: '', error: 'Unexpected error occurred' };
  }
};

// Save questions for an event with intelligent question categorization
export const saveEventQuestions = async (
  eventId: string,
  questions: Question[],
  organizationId: string
): Promise<{ success: boolean; error: string | null }> => {
  try {
    console.log('Saving event questions:', { eventId, questionCount: questions.length });

    // Delete existing event questions first (in case of re-saving)
    const { error: deleteError } = await supabase
      .from('event_questions')
      .delete()
      .eq('event_id', eventId);

    if (deleteError) {
      console.error('Error deleting existing event questions:', deleteError);
      return { success: false, error: deleteError.message };
    }

    // Process each question
    const eventQuestions = [];
    
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      console.log('Processing question:', { 
        id: question.id, 
        isFromMaster: question.isFromMaster, 
        isModified: question.isModified 
      });

      let eventQuestionRecord: any = {
        event_id: eventId,
        required: question.required || false,
        page_number: question.page || 1,
        row_number: question.rowNumber || 0,
        column_number: question.columnNumber || 0,
        order_in_cell: question.orderInCell || 0,
      };

      // Case 1: Completely new question (never existed in master)
      if (!question.isFromMaster) {
        console.log('Handling completely new question');
        
        // For completely new questions, store all relevant data
        let customOptions = null;
        
        // For questions with dropdown/multiple-choice options
        if (['dropdown', 'multiple-choice', 'checkbox_group'].includes(question.type) && question.options) {
          customOptions = question.options;
        }
        // For questions with placeholders (text, email, tel, textarea)
        else if (['text', 'email', 'tel', 'textarea'].includes(question.type) && question.placeholder) {
          customOptions = { placeholder: question.placeholder };
        }
        // For rating questions
        else if (question.type === 'rating' && question.maxRating) {
          customOptions = { maxRating: question.maxRating };
        }
        // For tags questions  
        else if (question.type === 'tags' && question.maxTags) {
          customOptions = { maxTags: question.maxTags };
        }

        eventQuestionRecord = {
          ...eventQuestionRecord,
          question_master_id: null,
          type: question.type,
          custom_text: question.question,
          custom_options: customOptions,
        };
      }
      // Case 2: Question from master but modified
      else if (question.isFromMaster && question.isModified) {
        console.log('Handling modified master question');
        
        // Find the original master question
        const { questionMasterId, error: masterError } = await findOrCreateQuestionMaster(
          {
            ...question,
            question: question.originalText || question.question,
            options: question.originalOptions || question.options
          }, 
          organizationId
        );

        if (masterError) {
          return { success: false, error: masterError };
        }

        // Determine what was modified
        const textModified = question.question !== (question.originalText || question.question);
        
        // For questions with options (dropdown, multiple-choice, checkbox_group)
        const hasOptionsType = ['dropdown', 'multiple-choice', 'checkbox_group'].includes(question.type);
        const optionsModified = hasOptionsType && 
          JSON.stringify(question.options) !== JSON.stringify(question.originalOptions || question.options);

        // For questions with placeholder (text, email, tel, textarea)
        const hasPlaceholderType = ['text', 'email', 'tel', 'textarea'].includes(question.type);
        const placeholderModified = hasPlaceholderType && 
          question.placeholder !== (question.originalPlaceholder || undefined);

        // Build custom_options for different cases
        let customOptions = null;
        if (optionsModified) {
          // Store modified dropdown/multiple-choice options
          customOptions = question.options;
        } else if (placeholderModified) {
          // Store placeholder for text-based inputs
          customOptions = { placeholder: question.placeholder };
        }

        eventQuestionRecord = {
          ...eventQuestionRecord,
          question_master_id: questionMasterId,
          type: null,
          custom_text: textModified ? question.question : null,
          custom_options: customOptions,
        };
      }
      // Case 3: Unmodified master question
      else {
        console.log('Handling unmodified master question');
        
        // Find or create question master
        const { questionMasterId, error: masterError } = await findOrCreateQuestionMaster(
          question, 
          organizationId
        );

        if (masterError) {
          return { success: false, error: masterError };
        }

        // For unmodified questions, store NO custom data
        eventQuestionRecord = {
          ...eventQuestionRecord,
          question_master_id: questionMasterId,
          type: null,
          custom_text: null,
          custom_options: null,
        };
      }

      eventQuestions.push(eventQuestionRecord);
    }

    // Insert all event questions
    const { error: insertError } = await supabase
      .from('event_questions')
      .insert(eventQuestions);

    if (insertError) {
      console.error('Error inserting event questions:', insertError);
      return { success: false, error: insertError.message };
    }

    console.log('Successfully saved event questions');
    return { success: true, error: null };

  } catch (error) {
    console.error('Unexpected error in saveEventQuestions:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
};

// Load questions for an event with intelligent question categorization
export const loadEventQuestions = async (eventId: string): Promise<{ questions: Question[]; error: string | null }> => {
  try {
    const { data: eventQuestions, error } = await supabase
      .from('event_questions')
      .select(`
        *,
        questions_master (
          id,
          type,
          text,
          options
        )
      `)
      .eq('event_id', eventId)
      .order('page_number')
      .order('row_number')
      .order('column_number')
      .order('order_in_cell');

    if (error) {
      console.error('Error loading event questions:', error);
      return { questions: [], error: error.message };
    }

    const questions: Question[] = eventQuestions.map((eq: any) => {
      // Always use event_questions.id as the unique identifier
      const questionData: Question = {
        id: eq.id, // Always use event_questions.id for unique identification
        required: eq.required,
        page: eq.page_number,
        rowNumber: eq.row_number,
        columnNumber: eq.column_number,
        orderInCell: eq.order_in_cell,
      } as Question;

      // Case 1: New custom question (question_master_id is null)
      if (!eq.question_master_id) {
        // This is a completely new question
        questionData.type = eq.type;
        questionData.question = eq.custom_text;
        questionData.isFromMaster = false;
        questionData.isModified = false;

        // Handle custom_options for new questions
        if (eq.custom_options) {
          if (Array.isArray(eq.custom_options)) {
            // Options array for dropdown/multiple-choice
            questionData.options = eq.custom_options;
          } else if (typeof eq.custom_options === 'object') {
            // Object with metadata (placeholder, maxRating, etc.)
            if (eq.custom_options.placeholder) questionData.placeholder = eq.custom_options.placeholder;
            if (eq.custom_options.maxRating) questionData.maxRating = eq.custom_options.maxRating;
            if (eq.custom_options.maxTags) questionData.maxTags = eq.custom_options.maxTags;
          }
        }
      }
      // Case 2: Question from master table (question_master_id is not null)
      else {
        const masterQuestion = eq.questions_master;
        
        // Get type from master question
        questionData.type = masterQuestion.type;
        
        // Use custom text if available, otherwise use master text
        questionData.question = eq.custom_text || masterQuestion.text;
        
        // Set master question tracking
        questionData.isFromMaster = true;
        questionData.masterQuestionId = masterQuestion.id;
        questionData.originalText = masterQuestion.text;
        questionData.originalOptions = masterQuestion.options;
        questionData.isModified = !!(eq.custom_text || eq.custom_options);

        // Handle options and other properties
        if (eq.custom_options) {
          // Use custom options if available
          if (Array.isArray(eq.custom_options)) {
            questionData.options = eq.custom_options;
          } else if (typeof eq.custom_options === 'object') {
            if (eq.custom_options.placeholder) questionData.placeholder = eq.custom_options.placeholder;
            if (eq.custom_options.maxRating) questionData.maxRating = eq.custom_options.maxRating;
            if (eq.custom_options.maxTags) questionData.maxTags = eq.custom_options.maxTags;
            
            // If it's not an array but master has options, use master options
            if (!Array.isArray(eq.custom_options) && masterQuestion.options) {
              questionData.options = masterQuestion.options;
            }
          }
        } else {
          // No custom options, use master options if available
          if (masterQuestion.options) {
            questionData.options = masterQuestion.options;
          }
        }
      }

      return questionData;
    });

    console.log('Loaded questions with categorization:', questions.map(q => ({
      id: q.id,
      isFromMaster: q.isFromMaster,
      isModified: q.isModified
    })));

    return { questions, error: null };

  } catch (error) {
    console.error('Unexpected error in loadEventQuestions:', error);
    return { questions: [], error: 'Unexpected error occurred' };
  }
};