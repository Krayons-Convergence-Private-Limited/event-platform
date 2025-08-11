import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface SubmissionData {
  eventId: string
  answers: Record<string, string | string[]>
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body: SubmissionData = await request.json()
    const { eventId, answers } = body

    // Validate required fields
    if (!eventId || !answers) {
      return NextResponse.json(
        { error: 'Missing required fields: eventId and answers' },
        { status: 400 }
      )
    }

    console.log('📝 Processing registration submission:', {
      eventId,
      answerCount: Object.keys(answers).length
    })

    // 1. Verify the event exists and is active
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, status, organization_id')
      .eq('id', eventId)
      .eq('status', 'active')
      .single()

    if (eventError || !event) {
      console.log('❌ Event not found or inactive:', eventError?.message)
      return NextResponse.json(
        { error: 'Event not found or no longer accepting registrations' },
        { status: 404 }
      )
    }

    // 2. Extract user identification from answers (if available)
    // Look for common identification fields
    const email = extractValue(answers, ['email', 'Email', 'EMAIL'])
    const name = extractValue(answers, ['name', 'Name', 'NAME', 'Full Name'])
    const phone = extractValue(answers, ['phone', 'Phone', 'Mobile', 'mobile', 'tel'])

    let userId = null

    // 3. Create or find user if we have identification info
    if (email || phone) {
      // Check if user already exists
      let { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .or(`email.eq.${email || 'null'},phone_number.eq.${phone || 'null'}`)
        .single()

      if (existingUser) {
        userId = existingUser.id
        console.log('👤 Found existing user:', userId)
      } else {
        // Create new user
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({
            email: email || null,
            phone_number: phone || null,
            name: name || null
          })
          .select('id')
          .single()

        if (userError) {
          console.error('❌ Error creating user:', userError)
          return NextResponse.json(
            { error: 'Failed to create user record' },
            { status: 500 }
          )
        }

        userId = newUser.id
        console.log('👤 Created new user:', userId)
      }
    } else {
      // Create anonymous user for events that don't collect identifying info
      const { data: anonUser, error: userError } = await supabase
        .from('users')
        .insert({
          name: name || 'Anonymous User'
        })
        .select('id')
        .single()

      if (userError) {
        console.error('❌ Error creating anonymous user:', userError)
        return NextResponse.json(
          { error: 'Failed to create user record' },
          { status: 500 }
        )
      }

      userId = anonUser.id
      console.log('👤 Created anonymous user:', userId)
    }

    // 4. Check if user already registered for this event
    const { data: existingResponse } = await supabase
      .from('event_responses')
      .select('id')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .single()

    if (existingResponse) {
      return NextResponse.json(
        { error: 'You have already registered for this event' },
        { status: 409 }
      )
    }

    // 5. Store the event response
    const { error: responseError } = await supabase
      .from('event_responses')
      .insert({
        user_id: userId,
        event_id: eventId,
        answers: answers
      })

    if (responseError) {
      console.error('❌ Error storing response:', responseError)
      return NextResponse.json(
        { error: 'Failed to save registration' },
        { status: 500 }
      )
    }

    console.log('✅ Registration successful:', {
      eventName: event.name,
      userId
    })

    // 6. Return success response
    return NextResponse.json({
      success: true,
      message: 'Registration submitted successfully',
      eventName: event.name
    })

  } catch (error) {
    console.error('💥 Unexpected error in submit-response:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to extract values from answers object
function extractValue(answers: Record<string, string | string[]>, possibleKeys: string[]): string | null {
  for (const key of possibleKeys) {
    // Check exact key match first
    if (answers[key]) {
      const value = answers[key]
      return Array.isArray(value) ? value[0] : value
    }
    
    // Check if any answer key contains the search term
    for (const answerKey in answers) {
      if (answerKey.toLowerCase().includes(key.toLowerCase())) {
        const value = answers[answerKey]
        return Array.isArray(value) ? value[0] : value
      }
    }
  }
  return null
}