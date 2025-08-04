import { useState } from "react";
import { Dashboard } from "./Dashboard";
import { CreateEvent, EventFormData } from "./CreateEvent";
import { QuestionnaireBuilder } from "./QuestionnaireBuilder";
import { HeaderSelection } from "./HeaderSelection";
import { LinkGeneration } from "./LinkGeneration";
import { EventLanding } from "./EventLanding";
import { Event, Question, HeaderBanner } from "@/types/event";

type AppState = 'dashboard' | 'create-event' | 'questionnaire' | 'header-selection' | 'link-generation' | 'event-landing';

const Index = () => {
  const [currentState, setCurrentState] = useState<AppState>('dashboard');
  const [events, setEvents] = useState<Event[]>([]);
  const [currentEventData, setCurrentEventData] = useState<Partial<Event>>({});
  const [currentEventId, setCurrentEventId] = useState<string>("");

  const generateUniqueId = () => Math.random().toString(36).substr(2, 8);

  const handleCreateEvent = () => setCurrentState('create-event');
  
  const handleEventDetailsNext = (eventData: EventFormData) => {
    setCurrentEventData({
      ...eventData,
      id: generateUniqueId(),
      uniqueId: generateUniqueId(),
      createdAt: new Date().toISOString(),
      questions: []
    });
    setCurrentState('questionnaire');
  };

  const handleQuestionsNext = (questions: Question[]) => {
    setCurrentEventData(prev => ({ ...prev, questions }));
    setCurrentState('header-selection');
  };

  const handleHeaderNext = (selectedBanner: HeaderBanner) => {
    const completeEvent: Event = {
      ...currentEventData,
      headerBanner: selectedBanner.image
    } as Event;
    
    setEvents(prev => [...prev, completeEvent]);
    setCurrentEventData(completeEvent);
    setCurrentState('link-generation');
  };

  const handleViewEvent = (eventId: string) => {
    setCurrentEventId(eventId);
    setCurrentState('event-landing');
  };

  const handleBackToDashboard = () => {
    setCurrentState('dashboard');
    setCurrentEventData({});
  };

  switch (currentState) {
    case 'create-event':
      return <CreateEvent onBack={() => setCurrentState('dashboard')} onNext={handleEventDetailsNext} />;
    case 'questionnaire':
      return <QuestionnaireBuilder onBack={() => setCurrentState('create-event')} onNext={handleQuestionsNext} />;
    case 'header-selection':
      return <HeaderSelection onBack={() => setCurrentState('questionnaire')} onNext={handleHeaderNext} />;
    case 'link-generation':
      return <LinkGeneration onBack={() => setCurrentState('header-selection')} event={currentEventData as Event} onViewEvent={handleViewEvent} onBackToDashboard={handleBackToDashboard} />;
    case 'event-landing':
      return <EventLanding eventId={currentEventId} />;
    default:
      return <Dashboard onCreateEvent={handleCreateEvent} events={events} />;
  }
};

export default Index;
