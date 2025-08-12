import { useState } from "react";
import { Dashboard } from "./Dashboard";
import { CreateEvent, EventFormData } from "./CreateEvent";
import { QuestionnaireBuilder } from "./QuestionnaireBuilder";
import { HeaderSelection } from "./HeaderSelection";
import { MediaManagement } from "./MediaManagement";
import { LinkGeneration } from "./LinkGeneration";
import { EventLanding } from "./EventLanding";
import { Event, Question, HeaderBanner } from "@/types/event";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";

type AppState = 'dashboard' | 'create-event' | 'questionnaire' | 'header-selection' | 'media-management' | 'link-generation' | 'event-landing';

const Index = () => {
  const { user } = useAuth();
  const [currentState, setCurrentState] = useState<AppState>('dashboard');
  const [events, setEvents] = useState<Event[]>([]);
  const [currentEventData, setCurrentEventData] = useState<Partial<Event>>({});
  const [currentEventId, setCurrentEventId] = useState<string>("");

  const generateUniqueId = () => Math.random().toString(36).substr(2, 8);

  const handleCreateEvent = () => setCurrentState('create-event');
  
  const handleEventDetailsNext = async (eventData: EventFormData) => {
    if (!user) return;

    try {
      console.log('Creating event with data:', eventData);
      
      // Create event in Supabase events table
      const { data: newEvent, error } = await supabase
        .from('events')
        .insert({
          organization_id: user.id,
          name: eventData.name,
          slug: `temp-${Date.now()}`, // Temporary slug, will be updated at the end
          status: 'draft',
          event_date_start: eventData.startDate,
          event_date_end: eventData.endDate || eventData.startDate,
          location: eventData.location,
          description: eventData.description,
          category: '' // Will be set later if needed
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating event:', error);
        alert('Failed to create event. Please try again.');
        return;
      }

      console.log('Event created successfully:', newEvent);

      // Update local state with database event
      setCurrentEventData({
        ...eventData,
        id: newEvent.id,
        uniqueId: newEvent.id,
        createdAt: newEvent.created_at,
        questions: []
      });
      setCurrentEventId(newEvent.id);
      setCurrentState('questionnaire');
    } catch (error) {
      console.error('Failed to create event:', error);
      alert('Failed to create event. Please try again.');
    }
  };

  const handleQuestionsNext = (questions: Question[]) => {
    setCurrentEventData(prev => ({ ...prev, questions }));
    setCurrentState('header-selection');
  };

  const handleHeaderNext = (selectedBanner: HeaderBanner | { type: 'custom'; url: string }) => {
    const bannerUrl = 'image' in selectedBanner ? selectedBanner.image : selectedBanner.url;
    
    const completeEvent: Event = {
      ...currentEventData,
      headerBanner: bannerUrl
    } as Event;
    
    setEvents(prev => [...prev, completeEvent]);
    setCurrentEventData(completeEvent);
    setCurrentState('media-management');
  };

  const handleViewEvent = (eventId: string) => {
    setCurrentEventId(eventId);
    setCurrentState('event-landing');
  };

  const handleMediaNext = (updatedEvent: Event) => {
    setCurrentEventData(updatedEvent);
    setCurrentState('link-generation');
  };

  const handleBackToDashboard = () => {
    setCurrentState('dashboard');
    setCurrentEventData({});
  };

  switch (currentState) {
    case 'create-event':
      return <CreateEvent onBack={() => setCurrentState('dashboard')} onNext={handleEventDetailsNext} />;
    case 'questionnaire':
      return <QuestionnaireBuilder onBack={() => setCurrentState('create-event')} onNext={handleQuestionsNext} eventId={currentEventId} />;
    case 'header-selection':
      return <HeaderSelection onBack={() => setCurrentState('questionnaire')} onNext={handleHeaderNext} eventId={currentEventId} />;
    case 'media-management':
      return <MediaManagement onBack={() => setCurrentState('header-selection')} onNext={handleMediaNext} event={currentEventData as Event} />;
    case 'link-generation':
      return <LinkGeneration onBack={() => setCurrentState('media-management')} event={currentEventData as Event} onViewEvent={handleViewEvent} onBackToDashboard={handleBackToDashboard} />;
    case 'event-landing':
      return <EventLanding eventId={currentEventId} />;
    default:
      return <Dashboard onCreateEvent={handleCreateEvent} events={events} />;
  }
};

export default Index;
