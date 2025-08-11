import { notFound } from 'next/navigation'
import { supabase, Event, EventQuestion, ProcessedQuestion } from '@/lib/supabase'
import EventForm from '@/components/EventForm'

interface PageProps {
  params: Promise<{
    eventSlug: string
  }>
}

// This function runs on the SERVER - users never see this code!
async function getEventData(eventSlug: string) {
  try {
    console.log('🔍 Fetching event data for slug:', eventSlug)
    
    // Query the database on the server
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        id,
        name,
        slug,
        description,
        event_date_start,
        event_date_end,
        location,
        banner_url,
        status,
        organization_id
      `)
      .eq('slug', eventSlug)
      .eq('status', 'active') // Only show active events
      .single()

    if (eventError || !event) {
      console.log('❌ Event not found:', eventError?.message)
      return null
    }

    // Get questions for this event
    const { data: eventQuestions, error: questionsError } = await supabase
      .from('event_questions')
      .select(`
        id,
        event_id,
        question_master_id,
        required,
        page_number,
        row_number,
        column_number,
        order_in_cell,
        custom_text,
        custom_options,
        type,
        questions_master (
          id,
          type,
          text,
          options
        )
      `)
      .eq('event_id', event.id)
      .order('page_number')
      .order('row_number')
      .order('column_number')
      .order('order_in_cell')

    if (questionsError) {
      console.log('❌ Error fetching questions:', questionsError.message)
      return { event, questions: [] }
    }

    // Process questions according to the architecture we discussed
    const processedQuestions: ProcessedQuestion[] = (eventQuestions || []).map((eq: any) => {
      // Case 1: Completely new question (type field is not null)
      if (eq.type) {
        const customOptions = eq.custom_options
        let questionData: ProcessedQuestion = {
          id: eq.id, // Use event_question id for new questions
          type: eq.type,
          question: eq.custom_text || '',
          required: eq.required,
          page: eq.page_number,
        }

        // Parse custom_options based on question type
        if (customOptions) {
          if (Array.isArray(customOptions)) {
            // It's an options array for dropdown/multiple-choice
            questionData.options = customOptions
          } else if (typeof customOptions === 'object') {
            // It's an object with metadata
            if (customOptions.placeholder) questionData.placeholder = customOptions.placeholder
            if (customOptions.maxRating) questionData.maxRating = customOptions.maxRating
            if (customOptions.maxTags) questionData.maxTags = customOptions.maxTags
          }
        }

        return questionData
      }
      // Case 2 & 3: Questions from master (with or without modifications)
      else if (eq.questions_master && eq.questions_master.length > 0) {
        const masterQuestion = eq.questions_master[0] // Take first item from array
        const hasCustomText = eq.custom_text !== null
        const hasCustomOptions = eq.custom_options !== null

        let questionData: ProcessedQuestion = {
          id: eq.id, // Use event_question id
          type: masterQuestion.type,
          question: eq.custom_text || masterQuestion.text,
          required: eq.required,
          page: eq.page_number,
        }

        // Handle custom_options for modified questions
        if (eq.custom_options) {
          if (Array.isArray(eq.custom_options)) {
            // Modified dropdown/multiple-choice options
            questionData.options = eq.custom_options
          } else if (typeof eq.custom_options === 'object') {
            // Modified placeholder or other metadata
            if (eq.custom_options.placeholder) questionData.placeholder = eq.custom_options.placeholder
            if (eq.custom_options.maxRating) questionData.maxRating = eq.custom_options.maxRating
            if (eq.custom_options.maxTags) questionData.maxTags = eq.custom_options.maxTags
            
            // If no custom options but master has options, use master options
            if (!Array.isArray(eq.custom_options) && masterQuestion.options) {
              questionData.options = masterQuestion.options
            }
          }
        } else {
          // No custom options, use master options if available
          if (masterQuestion.options) {
            questionData.options = masterQuestion.options
          }
        }

        return questionData
      }
      
      // Fallback for malformed data
      return {
        id: eq.id,
        type: 'text',
        question: 'Invalid question',
        required: false,
        page: 1
      }
    })

    console.log('✅ Successfully fetched event data:', {
      eventName: event.name,
      questionCount: processedQuestions.length
    })

    return {
      event,
      questions: processedQuestions
    }

  } catch (error) {
    console.error('💥 Error in getEventData:', error)
    return null
  }
}

// This is a Server Component - it runs on the server
export default async function EventPage({ params }: PageProps) {
  const { eventSlug } = await params
  
  // Fetch data on the server
  const eventData = await getEventData(eventSlug)
  
  // If event not found, show 404
  if (!eventData) {
    notFound()
  }

  const { event, questions } = eventData

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header/Banner Area */}
      <div className="pt-5 pb-5 px-8">
        <div 
          className="relative h-24 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg px-8 py-5 flex items-center justify-between"
          style={{
            backgroundImage: event.banner_url ? `url(${event.banner_url})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-black bg-opacity-30 rounded-lg"></div>
          
          {/* Event Info */}
          <div className="relative z-10 text-white">
            <h1 className="text-xl font-bold">{event.name}</h1>
            {event.event_date_start && (
              <p className="text-sm opacity-90">
                {new Date(event.event_date_start).toLocaleDateString()}
                {event.location && ` • ${event.location}`}
              </p>
            )}
          </div>
          
          {/* Right-aligned buttons */}
          <div className="relative z-10 flex gap-4">
            <button className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-full text-sm border border-white border-opacity-30 hover:bg-opacity-30 transition-all">
              Help
            </button>
            <button className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-full text-sm border border-white border-opacity-30 hover:bg-opacity-30 transition-all">
              Contact
            </button>
          </div>
        </div>
      </div>

      {/* Form Title */}
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800 uppercase tracking-wide">
          NEW VISITOR REGISTRATION
        </h2>
      </div>

      {/* Event Description */}
      {event.description && (
        <div className="max-w-4xl mx-auto px-8 mb-6">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
            <p className="text-gray-700 leading-relaxed">{event.description}</p>
          </div>
        </div>
      )}

      {/* Form Container */}
      <div className="max-w-4xl mx-auto px-8 pb-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Pass event and questions to client component */}
          <EventForm event={event} questions={questions} />
        </div>
      </div>

      {/* Notes Section */}
      <div className="max-w-4xl mx-auto px-8 pb-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-red-600 text-sm mt-0.5">•</span>
              <p className="text-red-700 text-sm">
                Admission is exclusive to trade professionals.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-600 text-sm mt-0.5">•</span>
              <p className="text-red-700 text-sm">
                Children under 18 years of age are not permitted.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-600 text-sm mt-0.5">•</span>
              <p className="text-red-700 text-sm">
                STUDENTS ENTRY ONLY ON LAST DAY AFTER 11.00 AM.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps) {
  const { eventSlug } = await params
  const eventData = await getEventData(eventSlug)
  
  if (!eventData) {
    return {
      title: 'Event Not Found'
    }
  }

  return {
    title: `Register for ${eventData.event.name}`,
    description: eventData.event.description || `Register for ${eventData.event.name}`,
  }
}