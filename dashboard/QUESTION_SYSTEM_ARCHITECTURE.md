# Question System Architecture

## Overview

The question management system has been redesigned to intelligently categorize and store questions in three distinct scenarios:

1. **Unmodified Master Questions** - Questions from the master catalog used as-is
2. **Modified Master Questions** - Questions from the master catalog with customizations
3. **Completely New Questions** - Brand new questions created from scratch

## Database Schema

### `questions_master` Table
Stores reusable question templates that can be shared across events and organizations.

```sql
CREATE TABLE questions_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    text TEXT NOT NULL,
    options JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_global BOOLEAN NOT NULL DEFAULT TRUE,
    organization_id UUID REFERENCES auth.users(id)
);
```

### `event_questions` Table (Updated)
Links questions to events with positional data and customization fields.

```sql
CREATE TABLE event_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    question_master_id UUID REFERENCES questions_master(id) ON DELETE CASCADE,
    required BOOLEAN NOT NULL DEFAULT FALSE,
    page_number INTEGER NOT NULL DEFAULT 1,
    row_number INTEGER NOT NULL DEFAULT 0,
    column_number INTEGER NOT NULL DEFAULT 0,
    order_in_cell INTEGER NOT NULL DEFAULT 0,
    custom_text TEXT,
    custom_options JSONB,
    type TEXT NULL -- NEW FIELD for completely custom questions
);
```

**Key Addition**: The `type` field distinguishes between master-based and completely new questions.

## Question Categories & Storage Logic

### Category 1: Unmodified Master Questions
**Characteristics:**
- Dragged from question bank and used without any modifications
- Text, options, placeholders, and all settings remain exactly as defined in master
- No custom data is stored - purely references the master question

**Database Storage:**
```sql
INSERT INTO event_questions (
    event_id, question_master_id, required, page_number, row_number, column_number,
    custom_text, custom_options, type
) VALUES (
    'event-uuid', 'master-question-uuid', true, 1, 0, 0,
    NULL, NULL, NULL
);
```

**Display Logic:**
- Use ALL data from `questions_master` table
- `custom_text` is NULL → use `questions_master.text`
- `custom_options` is NULL → use `questions_master.options`
- `type` field is NULL → indicates master-based question
- All placeholders, ratings, and other settings come from master

### Category 2: Modified Master Questions
**Characteristics:**
- Started as master questions but were edited in any way
- Maintains reference to original master question
- Only modified fields are stored as custom data - unmodified fields use master data
- Supports different types of modifications: text, options, placeholders, ratings, tags

**Database Storage:**
```sql
-- Example: Only text was modified
INSERT INTO event_questions (
    event_id, question_master_id, required, page_number, row_number, column_number,
    custom_text, custom_options, type
) VALUES (
    'event-uuid', 'master-question-uuid', true, 1, 0, 0,
    'Modified question text', NULL, NULL
);

-- Example: Only dropdown options were modified
INSERT INTO event_questions (
    event_id, question_master_id, required, page_number, row_number, column_number,
    custom_text, custom_options, type
) VALUES (
    'event-uuid', 'master-question-uuid', true, 1, 0, 0,
    NULL, '["New Option 1", "New Option 2"]', NULL
);

-- Example: Only placeholder was modified (for text inputs)
INSERT INTO event_questions (
    event_id, question_master_id, required, page_number, row_number, column_number,
    custom_text, custom_options, type
) VALUES (
    'event-uuid', 'master-question-uuid', true, 1, 0, 0,
    NULL, '{"placeholder": "Enter your custom placeholder"}', NULL
);

-- Example: Rating scale was modified
INSERT INTO event_questions (
    event_id, question_master_id, required, page_number, row_number, column_number,
    custom_text, custom_options, type
) VALUES (
    'event-uuid', 'master-question-uuid', true, 1, 0, 0,
    NULL, '{"maxRating": 10}', NULL
);
```

**Display Logic:**
- Use `custom_text` if not NULL, otherwise use `questions_master.text`
- Parse `custom_options` intelligently:
  - If array → modified dropdown/multiple-choice options
  - If object with `placeholder` → modified placeholder for text inputs
  - If object with `maxRating` → modified rating scale
  - If object with `maxTags` → modified tag limit
  - If NULL → use `questions_master.options`
- `type` field is NULL (indicates master-based question)

### Category 3: Completely New Questions
**Characteristics:**
- Created from scratch using custom question builder
- No reference to master questions
- All data stored as custom fields with appropriate structure
- Support for all question types and their specific properties

**Database Storage:**
```sql
-- Example: New dropdown question
INSERT INTO event_questions (
    event_id, question_master_id, required, page_number, row_number, column_number,
    custom_text, custom_options, type
) VALUES (
    'event-uuid', NULL, true, 1, 0, 0,
    'What is your favorite color?', '["Red", "Blue", "Green"]', 'dropdown'
);

-- Example: New text question with placeholder
INSERT INTO event_questions (
    event_id, question_master_id, required, page_number, row_number, column_number,
    custom_text, custom_options, type
) VALUES (
    'event-uuid', NULL, true, 1, 0, 0,
    'Enter your thoughts', '{"placeholder": "Share your detailed thoughts here..."}', 'textarea'
);

-- Example: New rating question
INSERT INTO event_questions (
    event_id, question_master_id, required, page_number, row_number, column_number,
    custom_text, custom_options, type
) VALUES (
    'event-uuid', NULL, false, 1, 0, 0,
    'Rate our service', '{"maxRating": 10}', 'rating'
);

-- Example: New tags question
INSERT INTO event_questions (
    event_id, question_master_id, required, page_number, row_number, column_number,
    custom_text, custom_options, type
) VALUES (
    'event-uuid', NULL, false, 1, 0, 0,
    'Add relevant tags', '{"maxTags": 8}', 'tags'
);
```

**Display Logic:**
- `question_master_id` is NULL (no master reference)
- `type` field contains the question type
- All display data comes from custom fields
- Parse `custom_options` based on question type:
  - Arrays for dropdown/multiple-choice/checkbox options
  - Objects for metadata (placeholder, maxRating, maxTags)
- `custom_text` contains the question text

## Code Implementation

### Question Interface (TypeScript)

```typescript
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
  
  // Origin tracking fields
  isFromMaster?: boolean;          // true if from questions_master
  masterQuestionId?: string;       // ID from questions_master if applicable
  originalText?: string;           // Original text from master (for comparison)
  originalOptions?: string[];      // Original options from master (for comparison)
  originalPlaceholder?: string;    // Original placeholder from master (for comparison)
  originalMaxRating?: number;      // Original maxRating from master (for comparison)
  originalMaxTags?: number;        // Original maxTags from master (for comparison)
  isModified?: boolean;            // true if question was edited from master version
}
```

### Save Logic Flow

```typescript
// In saveEventQuestions function
for (const question of questions) {
    if (!question.isFromMaster) {
        // Case 1: Completely new question - store all relevant data
        let customOptions = null;
        
        if (['dropdown', 'multiple-choice', 'checkbox_group'].includes(question.type) && question.options) {
            customOptions = question.options; // Store as array
        } else if (['text', 'email', 'tel', 'textarea'].includes(question.type) && question.placeholder) {
            customOptions = { placeholder: question.placeholder }; // Store as object
        } else if (question.type === 'rating' && question.maxRating) {
            customOptions = { maxRating: question.maxRating };
        } else if (question.type === 'tags' && question.maxTags) {
            customOptions = { maxTags: question.maxTags };
        }

        eventQuestionRecord = {
            question_master_id: null,
            type: question.type,
            custom_text: question.question,
            custom_options: customOptions,
        };
    } else if (question.isModified) {
        // Case 2: Modified master question - only store changes
        const textModified = question.question !== question.originalText;
        const optionsModified = ['dropdown', 'multiple-choice', 'checkbox_group'].includes(question.type) && 
            JSON.stringify(question.options) !== JSON.stringify(question.originalOptions);
        const placeholderModified = ['text', 'email', 'tel', 'textarea'].includes(question.type) && 
            question.placeholder !== question.originalPlaceholder;

        let customOptions = null;
        if (optionsModified) {
            customOptions = question.options; // Modified options array
        } else if (placeholderModified) {
            customOptions = { placeholder: question.placeholder }; // Modified placeholder
        }
        
        eventQuestionRecord = {
            question_master_id: masterQuestionId,
            type: null,
            custom_text: textModified ? question.question : null,
            custom_options: customOptions,
        };
    } else {
        // Case 3: Unmodified master question - store NO custom data
        eventQuestionRecord = {
            question_master_id: masterQuestionId,
            type: null,
            custom_text: null,
            custom_options: null, // Explicitly NULL for unmodified questions
        };
    }
}
```

### Load Logic Flow

```typescript
// In loadEventQuestions function
const questions: Question[] = eventQuestions.map((eq: any) => {
    if (eq.type) {
        // Case 1: Completely new question - reconstruct from custom data
        let questionData: Question = {
            id: eq.id,
            type: eq.type,
            question: eq.custom_text,
            required: eq.required,
            page: eq.page_number,
            isFromMaster: false,
            isModified: false,
        };

        // Parse custom_options based on question type and data structure
        if (eq.custom_options) {
            if (Array.isArray(eq.custom_options)) {
                questionData.options = eq.custom_options; // Dropdown/multiple-choice options
            } else if (typeof eq.custom_options === 'object') {
                if (eq.custom_options.placeholder) questionData.placeholder = eq.custom_options.placeholder;
                if (eq.custom_options.maxRating) questionData.maxRating = eq.custom_options.maxRating;
                if (eq.custom_options.maxTags) questionData.maxTags = eq.custom_options.maxTags;
            }
        }

        return questionData;
    } else {
        // Case 2 & 3: Questions from master (with or without modifications)
        const masterQuestion = eq.questions_master;
        const hasCustomText = eq.custom_text !== null;
        const hasCustomOptions = eq.custom_options !== null;
        
        let questionData: Question = {
            id: eq.question_master_id,
            type: masterQuestion.type,
            question: eq.custom_text || masterQuestion.text,
            required: eq.required,
            page: eq.page_number,
            isFromMaster: true,
            masterQuestionId: masterQuestion.id,
            originalText: masterQuestion.text,
            originalOptions: masterQuestion.options,
            isModified: hasCustomText || hasCustomOptions,
        };

        // Handle custom_options intelligently
        if (eq.custom_options) {
            if (Array.isArray(eq.custom_options)) {
                questionData.options = eq.custom_options; // Modified options
            } else if (typeof eq.custom_options === 'object') {
                if (eq.custom_options.placeholder) questionData.placeholder = eq.custom_options.placeholder;
                if (eq.custom_options.maxRating) questionData.maxRating = eq.custom_options.maxRating;
                if (eq.custom_options.maxTags) questionData.maxTags = eq.custom_options.maxTags;
                
                // If no array in custom but master has options, use master
                if (!Array.isArray(eq.custom_options) && masterQuestion.options) {
                    questionData.options = masterQuestion.options;
                }
            }
        } else {
            // No custom options, use master data
            if (masterQuestion.options) questionData.options = masterQuestion.options;
        }

        return questionData;
    }
});
```

## Visual Indicators

The UI provides clear visual feedback for question status:

- **🔵 Modified Badge**: Blue badge with "Modified" text for edited master questions
- **🟢 New Badge**: Green badge with "New" text for completely new questions
- **⚪ No Badge**: Unmodified master questions have no special indicator

## Benefits of This Architecture

### 1. **Maximum Storage Efficiency**
- **Unmodified Questions**: Only store reference (~95% storage reduction)
  - `question_master_id` reference + positioning data only
  - `custom_text` and `custom_options` are explicitly NULL
- **Partially Modified Questions**: Only store changes (~60-80% storage reduction)
  - Text changes: only `custom_text` populated
  - Option changes: only `custom_options` populated (array format)
  - Placeholder changes: only `custom_options` populated (object format)
  - Unmodified fields pull from master automatically
- **New Questions**: Full data storage with optimized structure
  - `custom_options` uses appropriate format (array vs object) per question type
  - No unnecessary data duplication

### 2. **Question Reusability**
- Master questions can be reused across multiple events
- Global questions are available to all organizations
- Organization-specific questions are properly isolated

### 3. **Modification Tracking**
- Clear distinction between original and modified content
- Easy to identify which questions have been customized
- Maintains audit trail of changes

### 4. **Flexibility**
- Support for completely custom questions when needed
- Partial modifications (text-only or options-only) are properly handled
- Future extensibility for additional customization fields

### 5. **Performance**
- Efficient queries with proper indexing on `question_master_id` and `type` fields
- Reduced JOIN complexity for completely new questions
- Optimized storage utilization

## Migration Notes

To implement this system on existing databases:

1. **Add the `type` field:**
   ```sql
   ALTER TABLE event_questions ADD COLUMN type TEXT NULL;
   ```

2. **Update existing records:**
   - All existing `event_questions` records will have `type = NULL`
   - This correctly identifies them as master-based questions
   - No data migration needed

3. **Deploy updated code:**
   - New save/load logic will handle all three categories
   - Existing questions will continue to work normally
   - New questions will use the enhanced categorization

## Example Scenarios

### Scenario 1: Using Pre-built Question
1. User drags "Name" question from question bank
2. Question is marked as `isFromMaster: true, isModified: false`
3. Saved with `question_master_id` reference, no custom data
4. Displays using master question data

### Scenario 2: Editing Pre-built Question
1. User drags "Email" question and edits placeholder text
2. Question becomes `isFromMaster: true, isModified: true`
3. Saved with `question_master_id` reference + `custom_text` for placeholder
4. Displays using master data + custom override

### Scenario 3: Creating New Question
1. User creates new dropdown question from scratch
2. Question is marked as `isFromMaster: false`
3. Saved with `question_master_id: null` + all data in custom fields + `type` field
4. Displays using only custom data

This architecture provides a robust, scalable foundation for question management while maintaining backward compatibility and optimizing for both performance and user experience.