-- Create the events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES auth.users(id), -- Links to Supabase's built-in auth.users table
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    event_date_start DATE,
    event_date_end DATE,
    location TEXT,
    description TEXT,
    category TEXT,
    banner_url TEXT
);

-- Create the questions_master table
CREATE TABLE questions_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    text TEXT NOT NULL,
    options JSONB, -- Stores an array of strings for multiple choice, dropdowns, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_global BOOLEAN NOT NULL DEFAULT TRUE,
    organization_id UUID REFERENCES auth.users(id) -- NULL for global questions, otherwise links to the organization that created this custom question
);

-- Create the event_questions table (linking table for questions to events with positional info)
CREATE TABLE event_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    question_master_id UUID REFERENCES questions_master(id) ON DELETE CASCADE,
    required BOOLEAN NOT NULL DEFAULT FALSE,
    page_number INTEGER NOT NULL DEFAULT 1,
    row_number INTEGER NOT NULL DEFAULT 0,
    column_number INTEGER NOT NULL DEFAULT 0,
    order_in_cell INTEGER NOT NULL DEFAULT 0,
    custom_text TEXT, -- Optional: If the organization modifies the question text for this specific event
    custom_options JSONB -- Optional: If the organization modifies the options for this specific event
);

-- Create the attendees table
CREATE TABLE attendees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create the responses table
CREATE TABLE responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendee_id UUID REFERENCES attendees(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    event_question_id UUID REFERENCES event_questions(id) ON DELETE CASCADE, -- Links to the instance of the question on the event's form
    response_value TEXT, -- Stores the answer
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
