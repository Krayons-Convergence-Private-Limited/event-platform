import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database schema
export interface Event {
  id: string
  name: string
  slug: string
  description: string | null
  event_date_start: string | null
  event_date_end: string | null
  location: string | null
  banner_url: string | null
  status: string
  organization_id: string
}

export interface EventQuestion {
  id: string
  event_id: string
  question_master_id: string | null
  required: boolean
  page_number: number
  row_number: number
  column_number: number
  order_in_cell: number
  custom_text: string | null
  custom_options: any
  type: string | null
  questions_master?: QuestionMaster
}

export interface QuestionMaster {
  id: string
  type: string
  text: string
  options: string[] | null
}

export interface ProcessedQuestion {
  id: string
  type: string
  question: string
  required: boolean
  options?: string[]
  placeholder?: string
  maxRating?: number
  maxTags?: number
  page: number
}