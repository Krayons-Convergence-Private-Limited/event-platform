-- Add type field to event_questions table for completely new questions
-- This field will be NULL for questions that reference questions_master
-- and will contain the question type for completely custom questions

ALTER TABLE event_questions ADD COLUMN type TEXT NULL;

-- Add comment to explain the usage
COMMENT ON COLUMN event_questions.type IS 'Question type for completely new questions. NULL if question references questions_master table.';