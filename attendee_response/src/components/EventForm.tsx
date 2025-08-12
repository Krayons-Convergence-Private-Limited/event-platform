'use client'

import { useState, useCallback, memo } from 'react'
import { Event, ProcessedQuestion } from '@/lib/supabase'

interface EventFormProps {
  event: Event
  questions: ProcessedQuestion[]
}

interface FormData {
  [questionId: string]: string | string[]
}

export default function EventForm({ event, questions }: EventFormProps) {
  const [formData, setFormData] = useState<FormData>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // Group questions by page
  const questionsByPage = questions.reduce((acc, question) => {
    const page = question.page
    if (!acc[page]) acc[page] = []
    acc[page].push(question)
    return acc
  }, {} as Record<number, ProcessedQuestion[]>)

  const totalPages = Math.max(...Object.keys(questionsByPage).map(Number), 1)
  const currentPageQuestions = questionsByPage[currentPage] || []

  const handleInputChange = useCallback((questionId: string, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [questionId]: value
    }))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      const response = await fetch('/api/submit-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: event.id,
          answers: formData
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit registration')
      }

      setSubmitStatus('success')
    } catch (error) {
      console.error('Submission error:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Memoized input components that only re-render when their specific value changes
  const TextInput = memo(({ question, value, onChange }: { 
    question: ProcessedQuestion, 
    value: string, 
    onChange: (questionId: string, value: string) => void 
  }) => (
    <input
      type={question.type}
      id={question.id}
      value={value}
      onChange={(e) => onChange(question.id, e.target.value)}
      placeholder={question.placeholder}
      required={question.required}
      className="w-full h-11 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  ))

  const TextAreaInput = memo(({ question, value, onChange }: { 
    question: ProcessedQuestion, 
    value: string, 
    onChange: (questionId: string, value: string) => void 
  }) => (
    <textarea
      id={question.id}
      value={value}
      onChange={(e) => onChange(question.id, e.target.value)}
      placeholder={question.placeholder}
      required={question.required}
      rows={3}
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  ))

  const renderQuestion = (question: ProcessedQuestion) => {
    const value = formData[question.id] || ''

    switch (question.type) {
      case 'text':
      case 'email':
      case 'tel':
        return (
          <TextInput
            question={question}
            value={value as string}
            onChange={handleInputChange}
          />
        )

      case 'textarea':
        return (
          <TextAreaInput
            question={question}
            value={value as string}
            onChange={handleInputChange}
          />
        )

      case 'dropdown':
        return (
          <select
            id={question.id}
            value={value as string}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            required={question.required}
            className="w-full h-11 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="">Select an option</option>
            {question.options?.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        )

      case 'multiple-choice':
        return (
          <div className="space-y-2">
            {question.options?.map((option, index) => (
              <label key={index} className="flex items-center">
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleInputChange(question.id, e.target.value)}
                  required={question.required}
                  className="mr-2 text-blue-600"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        )

      case 'checkbox_group':
        const selectedValues = Array.isArray(value) ? value : []
        return (
          <div className="space-y-2">
            {question.options?.map((option, index) => (
              <label key={index} className="flex items-center">
                <input
                  type="checkbox"
                  value={option}
                  checked={selectedValues.includes(option)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...selectedValues, option]
                      : selectedValues.filter(v => v !== option)
                    handleInputChange(question.id, newValues)
                  }}
                  className="mr-2 text-blue-600"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        )

      case 'rating':
        const maxRating = question.maxRating || 5
        return (
          <div className="flex space-x-2">
            {Array.from({ length: maxRating }, (_, i) => i + 1).map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => handleInputChange(question.id, rating.toString())}
                className={`w-8 h-8 rounded-full border-2 ${
                  (value as string) === rating.toString()
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300'
                }`}
              >
                {rating}
              </button>
            ))}
          </div>
        )

      case 'boolean':
        return (
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name={question.id}
                value="yes"
                checked={value === 'yes'}
                onChange={(e) => handleInputChange(question.id, e.target.value)}
                required={question.required}
                className="mr-2 text-blue-600"
              />
              <span>Yes</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name={question.id}
                value="no"
                checked={value === 'no'}
                onChange={(e) => handleInputChange(question.id, e.target.value)}
                required={question.required}
                className="mr-2 text-blue-600"
              />
              <span>No</span>
            </label>
          </div>
        )

      default:
        return (
          <input
            type="text"
            id={question.id}
            value={value as string}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            required={question.required}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        )
    }
  }

  if (submitStatus === 'success') {
    return (
      <div className="text-center py-8">
        <div className="text-green-600 text-6xl mb-4">✓</div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">Registration Successful!</h3>
        <p className="text-gray-600">Thank you for registering for {event.name}.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Page Progress */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mb-6 p-4 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex space-x-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <div
                key={page}
                className={`w-3 h-3 rounded-full ${
                  page === currentPage ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Two-Column Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-6">
        {currentPageQuestions.map((question, index) => (
          <div key={question.id} className={`space-y-2 ${
            // Some questions might need full width
            ['textarea', 'checkbox_group'].includes(question.type) ? 'md:col-span-2' : ''
          }`}>
            <label htmlFor={question.id} className="block text-sm font-medium text-gray-700">
              {question.question}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {renderQuestion(question)}
          </div>
        ))}
      </div>

      {/* Navigation/Submit Button - Centered */}
      <div className="flex justify-center pt-4">
        {currentPage > 1 && (
          <button
            type="button"
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="mr-4 px-6 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Previous
          </button>
        )}
        
        {currentPage < totalPages ? (
          <button
            type="button"
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="px-8 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ width: '90px', height: '40px' }}
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ width: '120px', height: '40px' }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        )}
      </div>

      {/* Error Message */}
      {submitStatus === 'error' && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">
            There was an error submitting your registration. Please try again.
          </p>
        </div>
      )}
    </form>
  )
}