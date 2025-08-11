-- CORRECTED DATABASE SCHEMA FOR RESPONSES

-- Remove the old responses table structure and create the new one
DROP TABLE IF EXISTS responses;
DROP TABLE IF EXISTS attendees; -- We won't use this for now (check-in system)

-- Create the corrected responses table
CREATE TABLE responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL, -- Generated unique user ID for each form submission
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    event_question_id UUID REFERENCES event_questions(id) ON DELETE CASCADE,
    response_value TEXT NOT NULL, -- Plain text or JSON for multiple selections
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Composite unique constraint to prevent duplicate responses for same user+event+question
    UNIQUE(user_id, event_id, event_question_id)
);

-- Index for performance
CREATE INDEX idx_responses_user_event ON responses(user_id, event_id);
CREATE INDEX idx_responses_event ON responses(event_id);

-- Comments for clarity
COMMENT ON TABLE responses IS 'Form submissions - each user_id represents one person who filled the form';
COMMENT ON COLUMN responses.user_id IS 'Generated unique ID for each form submission (not linked to auth system)';
COMMENT ON COLUMN responses.response_value IS 'Answer value - plain text for single answers, JSON for multiple selections';
COMMENT ON COLUMN responses.event_question_id IS 'Links to specific question instance in the event form';