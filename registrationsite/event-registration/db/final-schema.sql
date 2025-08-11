-- ✅ FINAL CLEAN SCHEMA: One row per user per event with JSONB answers

-- Drop old tables first
DROP TABLE IF EXISTS responses CASCADE;
DROP TABLE IF EXISTS attendees CASCADE;

-- 1️⃣ Users table - Separate user identity from registrations
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT UNIQUE, -- Can be null
    email TEXT UNIQUE,        -- Can be null
    name TEXT,                -- Optional user name
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2️⃣ Event responses table - One row per user per event
CREATE TABLE event_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    answers JSONB NOT NULL,   -- { "question_id_1": "answer", "question_id_2": ["option1", "option2"] }
    registered_at TIMESTAMPTZ DEFAULT now(),
    
    -- Prevent duplicate registration for same event by same user
    UNIQUE (user_id, event_id)
);

-- 3️⃣ Indexes for performance
CREATE INDEX idx_users_phone ON users(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_event_responses_event ON event_responses(event_id);
CREATE INDEX idx_event_responses_user ON event_responses(user_id);

-- 4️⃣ JSONB indexes for fast answer queries (optional but recommended)
CREATE INDEX idx_event_responses_answers ON event_responses USING gin(answers);

-- 5️⃣ Comments for clarity
COMMENT ON TABLE users IS 'User identity table - separate from registrations';
COMMENT ON TABLE event_responses IS 'One row per user per event with JSONB answers';
COMMENT ON COLUMN event_responses.answers IS 'JSONB format: {"question_id": "answer", "multi_question_id": ["option1", "option2"]}';

-- 6️⃣ Sample JSONB answer structure
/*
Example answers JSONB:
{
  "eq_12345": "John Doe",                    -- Text question
  "eq_67890": "john@example.com",            -- Email question  
  "eq_11111": ["Option A", "Option C"],      -- Multiple choice
  "eq_22222": "5",                           -- Rating (stored as string)
  "eq_33333": ["tag1", "tag2", "tag3"]      -- Tags
}

Where "eq_12345" = event_question.id from the event_questions table
*/