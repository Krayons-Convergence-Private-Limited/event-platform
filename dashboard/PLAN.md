# Supabase Integration Plan for Event Platform Dashboard

This document outlines the plan for integrating Supabase with the Event Platform Dashboard, including the refined database schema and the step-by-step implementation process.

## Overall Goal

To connect the dashboard to Supabase, making it fully functional for event creation, management, and data persistence, while ensuring data security and reusability of questions.

## Refined Supabase Database Schema

### 1. `events` table

Stores core event details.

-   `id` UUID PRIMARY KEY DEFAULT `uuid_generate_v4()`
-   `organization_id` UUID REFERENCES `auth.users(id)` (Links to Supabase's built-in `auth.users` table for organization identification)
-   `name` TEXT NOT NULL
-   `slug` TEXT UNIQUE NOT NULL (The unique event link identifier)
-   `status` TEXT NOT NULL DEFAULT 'draft' (e.g., 'draft', 'basic_details_saved', 'form_built', 'banner_selected', 'active' - to track progress)
-   `created_at` TIMESTAMP WITH TIME ZONE DEFAULT `now()`
-   `event_date_start` DATE (or TIMESTAMP WITH TIME ZONE if time is relevant)
-   `event_date_end` DATE (optional, for multi-day events)
-   `location` TEXT (optional)
-   `description` TEXT (optional)
-   `category` TEXT (optional)
-   `banner_url` TEXT (URL to the image in Supabase Storage)

### 2. `questions_master` table

Stores all unique, reusable question definitions.

-   `id` UUID PRIMARY KEY DEFAULT `uuid_generate_v4()`
-   `type` TEXT NOT NULL (e.g., 'single_choice', 'multiple_choice', 'short_text', 'long_text', 'dropdown', 'tags', 'consent_checkbox')
-   `text` TEXT NOT NULL (The default question description/prompt)
-   `options` JSONB (Stores an array of strings for multiple choice, dropdowns, etc. e.g., `["Option 1", "Option 2"]`)
-   `created_at` TIMESTAMP WITH TIME ZONE DEFAULT `now()`
-   `updated_at` TIMESTAMP WITH TIME ZONE DEFAULT `now()`
-   `is_global` BOOLEAN NOT NULL DEFAULT TRUE (TRUE for system-provided questions, FALSE for organization-specific custom questions)
-   `organization_id` UUID REFERENCES `auth.users(id)` (NULL for global questions, otherwise links to the organization that created this custom question)

### 3. `event_questions` table

This is the linking table. It connects an `event` to a `question_master` entry and stores all event-specific properties for that question instance on the form.

-   `id` UUID PRIMARY KEY DEFAULT `uuid_generate_v4()`
-   `event_id` UUID REFERENCES `events(id)` ON DELETE CASCADE
-   `question_master_id` UUID REFERENCES `questions_master(id)` ON DELETE CASCADE
-   `required` BOOLEAN NOT NULL DEFAULT FALSE (Can be different for the same question across events)
-   `page_number` INTEGER NOT NULL DEFAULT 1
-   `row_number` INTEGER NOT NULL DEFAULT 0
-   `column_number` INTEGER NOT NULL DEFAULT 0
-   `order_in_cell` INTEGER NOT NULL DEFAULT 0 (If multiple questions can occupy the *exact* same row/column position, this defines their order.)
-   `custom_text` TEXT (Optional: If the organization modifies the question text for *this specific event* without creating a new master question. If null, use `questions_master.text`.)
-   `custom_options` JSONB (Optional: If the organization modifies the options for *this specific event*. If null, use `questions_master.options`.)

### 4. `attendees` table

Stores information about individuals who register for an event.

-   `id` UUID PRIMARY KEY DEFAULT `uuid_generate_v4()`
-   `event_id` UUID REFERENCES `events(id)` ON DELETE CASCADE
-   `email` TEXT UNIQUE
-   `name` TEXT
-   `created_at` TIMESTAMP WITH TIME ZONE DEFAULT `now()`

### 5. `responses` table

Stores the answers provided by attendees to specific questions on an event's form.

-   `id` UUID PRIMARY KEY DEFAULT `uuid_generate_v4()`
-   `attendee_id` UUID REFERENCES `attendees(id)` ON DELETE CASCADE
-   `event_id` UUID REFERENCES `events(id)` ON DELETE CASCADE
-   `event_question_id` UUID REFERENCES `event_questions(id)` ON DELETE CASCADE (Crucially, this links to the *instance* of the question on the event's form, not the master question.)
-   `response_value` TEXT (Stores the answer. Can be a simple string for text inputs, or a stringified JSON for multi-selects or more complex types.)
-   `created_at` TIMESTAMP WITH TIME ZONE DEFAULT `now()`

## Implementation Guide (Step-by-Step)

1.  **Supabase Project Setup (Your Action):**
    *   Create a new project on Supabase.
    *   Note down your **Project URL** and **`anon` key**.

2.  **Environment Variables (My Action - Completed):**
    *   `F:\Soup\projects\krayons_link\dashboard\.env` has been created with your Supabase credentials.

3.  **Supabase Client Initialization (My Action - Completed):**
    *   `src/lib/supabaseClient.ts` has been created to initialize the Supabase client.

4.  **Database Table Creation (Your Action - Completed):**
    *   You have executed the SQL commands in your Supabase project's SQL editor to create the `events`, `questions_master`, `event_questions`, `attendees`, and `responses` tables.

5.  **Row Level Security (RLS) Policies (Your Action - Pending):**
    *   Set up RLS policies in Supabase to ensure data isolation and security. (This step is currently pending and should be completed before production deployment).

6.  **Auth Integration (My Action):**
    *   Integrate Supabase Auth into your application for user (organization) registration and login.

7.  **Event Creation Flow Implementation (My Action - Step-by-Step):**
    *   **Step 1: Basic Details (`CreateEvent.tsx`)**
        *   Modify `src/pages/CreateEvent.tsx` to capture event name, dates, location, description, and category.
        *   Upon "Next" or "Save", insert this data into the `events` table. Set `status` to `'basic_details_saved'`.
        *   Capture the `id` of the newly created event.
    *   **Step 2: Form Builder (`QuestionnaireBuilder.tsx`)**
        *   Fetch questions from `questions_master` (global and organization-specific custom ones).
        *   When a user drags/drops a question or creates a new custom one:
            *   If new custom, insert into `questions_master`.
            *   Insert an entry into `event_questions`, linking `event_id` to `question_master_id` and setting positional/custom properties.
        *   Update `event_questions` entries for the event upon save.
        *   Update `events` table, setting `status` to `'form_built'`.
    *   **Step 3: Banner Selection (`HeaderSelection.tsx`)**
        *   Handle image uploads to Supabase Storage.
        *   Get public URL of stored image.
        *   Update `events` table, setting `banner_url` and `status` to `'banner_selected'`.
    *   **Step 4: Link Generation (`LinkGeneration.tsx`)**
        *   Generate a unique `slug`.
        *   Update `events` table, setting `slug` and `status` to `'active'`.
        *   Display the final event link.

8.  **Dashboard Display (`Dashboard.tsx`) (My Action):**
    *   Fetch and display events associated with the logged-in `organization_id` from the `events` table.
