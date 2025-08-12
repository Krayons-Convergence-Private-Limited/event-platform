import { useState, useEffect, useCallback, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { PageTransition } from "@/components/ui/page-transition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { GradientButton } from "@/components/ui/gradient-button";
import { Calendar, MapPin, User, Loader2, Star, Download, QrCode } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { loadEventQuestions } from "@/lib/questions";
import { Question } from "@/types/event";
import QRCode from 'qrcode';

interface EventLandingProps {
  eventId?: string;
  eventSlug?: string;
}

interface EventData {
  id: string;
  name: string;
  description: string;
  location: string;
  event_date_start: string;
  event_date_end: string;
  banner_url: string;
  badge_template_url?: string;
  email_media_url?: string;
  email_subject?: string;
  email_body?: string;
}

export const EventLanding = ({ eventId, eventSlug }: EventLandingProps) => {
  const { control, handleSubmit, getValues, setValue, watch, reset } = useForm<Record<string, any>>({
    defaultValues: {}
  });
  const [event, setEvent] = useState<EventData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [registrationData, setRegistrationData] = useState<{
    userId: string;
    registrationId: string;
    userName: string;
    userEmail: string;
    userPhone: string;
    qrCode: string;
  } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadEventData();
  }, [eventId, eventSlug]);

  // Function to generate badge image
  const generateBadgeImage = async () => {
    if (!canvasRef.current || !event.badge_template_url || !registrationData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load the badge template image
    const badgeImg = new Image();
    badgeImg.crossOrigin = 'anonymous';
    
    badgeImg.onload = async () => {
      // Set canvas size to match image
      canvas.width = badgeImg.width;
      canvas.height = badgeImg.height;

      // Draw the badge template
      ctx.drawImage(badgeImg, 0, 0);

      // Load and draw QR code
      const qrImg = new Image();
      qrImg.onload = () => {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Draw user name (large, bold, black) - increased by 25%
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(registrationData.userName, centerX, centerY - 100);

        // Draw registration ID (medium, bold, black) - increased by 25%
        ctx.font = 'bold 30px Arial';
        ctx.fillText(registrationData.registrationId, centerX, centerY - 25);

        // Draw QR code (200x200, centered below text) - increased by 25%
        const qrSize = 180;
        ctx.drawImage(qrImg, centerX - qrSize/2, centerY + 25, qrSize, qrSize);

        // Trigger download
        downloadBadgeImage();
      };
      qrImg.src = registrationData.qrCode;
    };

    badgeImg.src = event.badge_template_url;
  };

  // Function to download the generated badge image
  const downloadBadgeImage = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `${registrationData?.userName || 'badge'}_${registrationData?.registrationId || 'badge'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const loadEventData = async () => {
    try {
      setLoading(true);
      
      if (!eventId && !eventSlug) {
        setError('No event identifier provided');
        return;
      }

      console.log('Loading event data for:', { eventId, eventSlug });
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
      console.log('Environment:', import.meta.env.MODE);

      // Load event data - use slug if provided, otherwise use ID
      const query = supabase.from('events').select('*');
      const { data, error: fetchError } = await (eventSlug 
        ? query.eq('slug', eventSlug).single()
        : query.eq('id', eventId).single());

      if (fetchError) {
        console.error('Error loading event:', fetchError);
        setError('Failed to load event data');
        return;
      }

      if (!data) {
        setError('Event not found');
        return;
      }

      console.log('Event data loaded:', data);
      setEvent(data);

      // Load questions for this event using the actual event ID
      const actualEventId = data.id;
      const { questions: eventQuestions, error: questionsError } = await loadEventQuestions(actualEventId);
      
      if (questionsError) {
        console.error('Error loading questions:', questionsError);
        setError('Failed to load registration form');
        return;
      }

      console.log('Questions loaded:', eventQuestions);
      setQuestions(eventQuestions);
      
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const onSubmit = async (formData: Record<string, any>) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      const actualEventId = event?.id;
      if (!actualEventId) {
        throw new Error('Event ID not found');
      }
      
      console.log('Submitting registration:', { eventId: actualEventId, formData });

      // Validate required fields
      const requiredQuestions = questions.filter(q => q.required);
      const missingFields = requiredQuestions.filter(q => !formData[q.id] || formData[q.id] === '');
      
      if (missingFields.length > 0) {
        setSubmitError(`Please fill in all required fields: ${missingFields.map(q => q.question).join(', ')}`);
        return;
      }

      // Extract user identification from answers by examining question text
      const extractUserInfo = () => {
        let email = null;
        let name = null;
        let phone = null;

        // Loop through form values and match with question text/type
        Object.keys(formData).forEach(questionId => {
          const question = questions.find(q => q.id === questionId);
          if (!question || !formData[questionId]) return;

          const value = formData[questionId];
          const stringValue = Array.isArray(value) ? value[0] : String(value);
          const questionText = question.question.toLowerCase();
          
          // Extract email
          if (!email && (question.type === 'email' || 
              questionText.includes('email') || 
              questionText.includes('e-mail') ||
              questionText.includes('mail'))) {
            email = stringValue;
          }
          
          // Extract phone/mobile
          if (!phone && (question.type === 'tel' || 
              questionText.includes('phone') || 
              questionText.includes('mobile') || 
              questionText.includes('number') ||
              questionText.includes('contact'))) {
            phone = stringValue;
          }
          
          // Extract name
          if (!name && (questionText.includes('name') || 
              questionText.includes('full name') ||
              questionText.includes('your name') ||
              questionText.includes('first name'))) {
            name = stringValue;
          }
        });

        return { email, name, phone };
      };

      const { email, name, phone } = extractUserInfo();
      console.log('Extracted user info:', { email, name, phone });

      let userId = null;

      // Create or find user
      if (email || phone) {
        // Check if user exists
        let { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .or(`email.eq.${email || 'null'},phone_number.eq.${phone || 'null'}`)
          .single();

        if (existingUser) {
          userId = existingUser.id;
          console.log('Found existing user:', userId);
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
            .single();

          if (userError) throw new Error('Failed to create user: ' + userError.message);
          userId = newUser.id;
          console.log('Created new user:', userId);
        }
      } else {
        // Create anonymous user
        const { data: anonUser, error: userError } = await supabase
          .from('users')
          .insert({ name: name || 'Anonymous User' })
          .select('id')
          .single();

        if (userError) throw new Error('Failed to create user: ' + userError.message);
        userId = anonUser.id;
        console.log('Created anonymous user:', userId);
      }

      // Check for existing registration
      const { data: existingResponse } = await supabase
        .from('event_responses')
        .select('id')
        .eq('user_id', userId)
        .eq('event_id', actualEventId)
        .single();

      if (existingResponse) {
        throw new Error('You have already registered for this event');
      }

      // Store the registration
      const { error: responseError } = await supabase
        .from('event_responses')
        .insert({
          user_id: userId,
          event_id: actualEventId,
          answers: formData
        });

      if (responseError) throw new Error('Failed to save registration: ' + responseError.message);

      // Generate registration ID and QR code
      const registrationId = `${event.name.substring(0, 3).toUpperCase()}${Date.now().toString().slice(-6)}`;
      const qrData = JSON.stringify({
        userId,
        registrationId,
        eventId: actualEventId,
        name: name || 'Guest',
        email: email || '',
        phone: phone || ''
      });
      
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      setRegistrationData({
        userId,
        registrationId,
        userName: name || 'Guest',
        userEmail: email || '',
        userPhone: phone || '',
        qrCode: qrCodeDataUrl
      });

      console.log('Registration submitted successfully');
      setSubmitSuccess(true);
      reset(); // Clear form
      
    } catch (error) {
      console.error('Error submitting registration:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Organize questions by pages, rows, and columns (similar to QuestionnaireBuilder)
  const organizeQuestions = (questions: Question[]) => {
    const pages: Record<number, Record<number, Record<number, Question[]>>> = {};
    
    questions.forEach(question => {
      const pageNum = question.page || 1;
      const rowNum = question.rowNumber || 0;
      const colNum = question.columnNumber || 0;
      
      if (!pages[pageNum]) pages[pageNum] = {};
      if (!pages[pageNum][rowNum]) pages[pageNum][rowNum] = {};
      if (!pages[pageNum][rowNum][colNum]) pages[pageNum][rowNum][colNum] = [];
      
      pages[pageNum][rowNum][colNum].push(question);
    });
    
    // Sort questions within each cell by orderInCell
    Object.values(pages).forEach(page => {
      Object.values(page).forEach(row => {
        Object.values(row).forEach(column => {
          column.sort((a, b) => (a.orderInCell || 0) - (b.orderInCell || 0));
        });
      });
    });
    
    return pages;
  };

  // Get organized form structure
  const formPages = organizeQuestions(questions);
  const pageNumbers = Object.keys(formPages).map(Number).sort();
  const currentPageQuestions = formPages[pageNumbers[currentPageIndex]] || {};
  const totalPages = pageNumbers.length;


  // Form Preview Component - Simple input handling
  const QuestionPreview = ({ question, index }: { question: Question; index: number }) => {
    const questionLabel = (
      <Label className="text-sm font-medium mb-2 block">
        {index + 1}. {question.question}
        {question.required && <span className="text-red-500 ml-1">*</span>}
      </Label>
    );

    switch (question.type) {
      case 'text':
        return (
          <div className="space-y-2">
            {questionLabel}
            <Controller
              name={question.id}
              control={control}
              defaultValue=""
              render={({ field }) => (
                <Input 
                  placeholder={question.placeholder || "Enter your response"}
                  className="bg-background"
                  {...field}
                />
              )}
            />
          </div>
        );

      case 'textarea':
        return (
          <div className="space-y-2">
            {questionLabel}
            <Controller
              name={question.id}
              control={control}
              defaultValue=""
              render={({ field }) => (
                <Textarea 
                  placeholder={question.placeholder || "Enter detailed response"}
                  className="bg-background min-h-[80px]"
                  {...field}
                />
              )}
            />
          </div>
        );

      case 'email':
        return (
          <div className="space-y-2">
            {questionLabel}
            <Controller
              name={question.id}
              control={control}
              defaultValue=""
              render={({ field }) => (
                <Input 
                  type="email"
                  placeholder={question.placeholder || "your@email.com"}
                  className="bg-background"
                  {...field}
                />
              )}
            />
          </div>
        );

      case 'tel':
        return (
          <div className="space-y-2">
            {questionLabel}
            <div className="flex">
              <div className="px-3 py-2 bg-muted border border-r-0 rounded-l text-sm text-muted-foreground">
                +91
              </div>
              <Controller
                name={question.id}
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <Input 
                    type="tel"
                    placeholder={question.placeholder || "Mobile number"}
                    className="bg-background rounded-l-none"
                    {...field}
                  />
                )}
              />
            </div>
          </div>
        );

      case 'dropdown':
        return (
          <div className="space-y-2">
            {questionLabel}
            <Controller
              name={question.id}
              control={control}
              defaultValue=""
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={question.options?.[0] || "Select an option"} />
                  </SelectTrigger>
                  <SelectContent>
                    {question.options?.map((option, idx) => (
                      <SelectItem key={idx} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        );

      case 'multiple-choice':
        return (
          <div className="space-y-3">
            {questionLabel}
            <Controller
              name={question.id}
              control={control}
              defaultValue=""
              render={({ field }) => (
                <RadioGroup 
                  value={field.value} 
                  onValueChange={field.onChange}
                  className="space-y-2"
                >
                  {question.options?.map((option, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`${question.id}-${idx}`} />
                      <Label htmlFor={`${question.id}-${idx}`} className="text-sm cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            />
          </div>
        );

      case 'checkbox_group':
        return (
          <div className="space-y-3">
            {questionLabel}
            <Controller
              name={question.id}
              control={control}
              defaultValue={[]}
              render={({ field }) => {
                const checkboxValues = field.value || [];
                const handleCheckboxChange = (option: string, checked: boolean) => {
                  let newValues;
                  if (checked) {
                    newValues = [...checkboxValues, option];
                  } else {
                    newValues = checkboxValues.filter((v: string) => v !== option);
                  }
                  field.onChange(newValues);
                };

                return (
                  <>
                    <div className="space-y-2">
                      {question.options?.slice(0, 8).map((option, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`${question.id}-${idx}`}
                            checked={checkboxValues.includes(option)}
                            onCheckedChange={(checked) => handleCheckboxChange(option, checked as boolean)}
                          />
                          <Label htmlFor={`${question.id}-${idx}`} className="text-sm cursor-pointer">
                            {option}
                          </Label>
                        </div>
                      ))}
                      {question.options && question.options.length > 8 && (
                        <div className="text-xs text-muted-foreground pl-6">
                          ... and {question.options.length - 8} more options
                        </div>
                      )}
                    </div>
                    {checkboxValues.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Selected: {checkboxValues.length} option(s)
                      </div>
                    )}
                  </>
                );
              }}
            />
          </div>
        );

      case 'boolean':
        return (
          <div className="space-y-3">
            {questionLabel}
            <Controller
              name={question.id}
              control={control}
              defaultValue={false}
              render={({ field }) => (
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                  />
                  <Label className="text-sm cursor-pointer">
                    {field.value ? "Yes" : "No"}
                  </Label>
                </div>
              )}
            />
          </div>
        );

      case 'rating':
        return (
          <div className="space-y-3">
            {questionLabel}
            <Controller
              name={question.id}
              control={control}
              defaultValue={0}
              render={({ field }) => (
                <div className="flex items-center space-x-1">
                  {Array.from({ length: question.maxRating || 5 }).map((_, idx) => (
                    <Star 
                      key={idx} 
                      className={`h-6 w-6 cursor-pointer transition-colors ${
                        idx < field.value 
                          ? "text-yellow-400 fill-yellow-400" 
                          : "text-muted-foreground hover:text-yellow-200"
                      }`}
                      onClick={() => field.onChange(idx + 1)}
                    />
                  ))}
                  <span className="text-xs text-muted-foreground ml-2">
                    {field.value > 0 ? `${field.value}/${question.maxRating || 5}` : `Rate 1-${question.maxRating || 5}`}
                  </span>
                </div>
              )}
            />
          </div>
        );

      case 'tags':
        return (
          <div className="space-y-3">
            {questionLabel}
            <Controller
              name={question.id}
              control={control}
              defaultValue={[]}
              render={({ field }) => {
                const tagValues = field.value || [];
                const [newTag, setNewTag] = useState("");
                
                const addTag = () => {
                  if (newTag.trim() && !tagValues.includes(newTag.trim()) && tagValues.length < (question.maxTags || 5)) {
                    field.onChange([...tagValues, newTag.trim()]);
                    setNewTag("");
                  }
                };
                
                const removeTag = (tagToRemove: string) => {
                  field.onChange(tagValues.filter((tag: string) => tag !== tagToRemove));
                };

                return (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {tagValues.map((tag: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-xs rounded-full border border-primary/20">
                          <span>{tag}</span>
                          <button
                            onClick={() => removeTag(tag)}
                            className="ml-1 hover:text-red-500 transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    {tagValues.length < (question.maxTags || 5) && (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a tag..."
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                          className="bg-background text-xs h-8"
                        />
                        <Button size="sm" onClick={addTag} className="h-8 px-3 text-xs">
                          Add
                        </Button>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {tagValues.length}/{question.maxTags || 5} tags used
                    </div>
                  </div>
                );
              }}
            />
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            {questionLabel}
            <div className="p-3 bg-muted/50 rounded border text-sm text-muted-foreground">
              Question type: {question.type}
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading event...</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (error || !event) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center">
          <Card className="max-w-md border-0 shadow-elegant bg-card/95 backdrop-blur-sm">
            <CardContent className="text-center p-8">
              <h2 className="text-2xl font-bold mb-4">Event Not Found</h2>
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  // If form is successfully submitted, show only the success card
  if (submitSuccess && registrationData) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center">
          <div className="container mx-auto px-6 py-12 max-w-4xl">
            {/* Digital Entry Badge - Only show uploaded badge */}
            {event.badge_template_url ? (
              <div className="space-y-6">
                <div className="relative max-w-2xl mx-auto">
                  <img 
                    src={event.badge_template_url} 
                    alt="Event Badge Template"
                    className="w-full object-cover rounded-lg"
                  />
                  {/* Simple center overlay with name, registration ID, and QR code */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      {/* User Name */}
                      <h2 className="text-5xl font-bold text-black mb-4">
                        {registrationData.userName}
                      </h2>
                      
                      {/* Registration ID */}
                      <p className="text-3xl font-bold text-black mb-8">
                        {registrationData.registrationId}
                      </p>
                      
                      {/* QR Code */}
                      <img 
                        src={registrationData.qrCode} 
                        alt="Entry QR Code"
                        className="w-52 h-52 mx-auto"
                      />
                    </div>
                  </div>
                </div>

                {/* Download Button */}
                <div className="text-center">
                  <GradientButton 
                    size="lg" 
                    onClick={generateBadgeImage}
                    className="mb-4"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Badge Image
                  </GradientButton>
                </div>

                {/* Hidden Canvas for image generation */}
                <canvas 
                  ref={canvasRef} 
                  style={{ display: 'none' }}
                />
              </div>
            ) : (
              <div className="text-center p-8">
                <p className="text-muted-foreground">No badge template available for this event.</p>
              </div>
            )}
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
        {/* Banner Section */}
        {event.banner_url && (
          <div className="w-full px-6 pt-6">
            <div className="max-w-6xl mx-auto">
              <img
                src={event.banner_url}
                alt={`${event.name} banner`}
                className="w-full h-auto object-cover rounded-lg shadow-elegant"
                style={{
                  maxHeight: '400px',
                  objectFit: 'cover'
                }}
              />
            </div>
          </div>
        )}

        {/* Content Section */}
        <div className="container mx-auto px-6 py-12 max-w-4xl">
          {/* Event Info - Show only on first page */}
          {currentPageIndex === 0 && (
            <Card className="border-0 shadow-elegant bg-card/95 backdrop-blur-sm mb-8">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-3xl font-bold mb-4">
                  {event.name}
                </CardTitle>
                <CardDescription className="text-lg">
                  {event.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center justify-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>
                      {new Date(event.event_date_start).toLocaleDateString()}
                      {event.event_date_end !== event.event_date_start && 
                        ` - ${new Date(event.event_date_end).toLocaleDateString()}`
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>{event.location}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <span>Professional Event</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Registration Form */}
          {questions.length > 0 && (
            <Card className="border-0 shadow-elegant bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      Event Registration
                    </CardTitle>
                    <CardDescription>
                      Please fill out the form below to register for this event
                    </CardDescription>
                  </div>
                  
                  {/* Page Navigation */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      {pageNumbers.map((pageNum, index) => (
                        <Button
                          key={pageNum}
                          variant={index === currentPageIndex ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPageIndex(index)}
                          className="h-8 w-8 p-0"
                        >
                          {index + 1}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>

                {/* Error Message */}
                {submitError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800">
                      <span className="text-red-600">✕</span>
                      <span className="font-medium">Registration Failed</span>
                    </div>
                    <p className="text-red-700 text-sm mt-1">{submitError}</p>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Current Page Questions */}
                  {Object.keys(currentPageQuestions).sort((a, b) => Number(a) - Number(b)).map(rowKey => {
                    const rowNum = Number(rowKey);
                    const row = currentPageQuestions[rowNum];
                    const columns = Object.keys(row).sort((a, b) => Number(a) - Number(b));
                    
                    return (
                      <div key={`page-${pageNumbers[currentPageIndex]}-row-${rowNum}`} className="relative">
                        {/* Row Container */}
                        <div className={`grid gap-4 ${columns.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                          {columns.map(colKey => {
                            const colNum = Number(colKey);
                            const columnQuestions = row[colNum];
                            
                            return (
                              <div key={`page-${pageNumbers[currentPageIndex]}-row-${rowNum}-col-${colNum}`} className="space-y-4">
                                {columnQuestions.map((question, questionIndex) => {
                                  // Calculate global index for display
                                  let globalIndex = 0;
                                  for (let p = 0; p < pageNumbers.length; p++) {
                                    if (p < currentPageIndex) {
                                      // Count all questions from previous pages
                                      const prevPage = formPages[pageNumbers[p]] || {};
                                      globalIndex += Object.values(prevPage)
                                        .flatMap(r => Object.values(r))
                                        .flatMap(c => c).length;
                                    } else if (p === currentPageIndex) {
                                      // Count questions from current page up to current position
                                      const currentPage = formPages[pageNumbers[p]] || {};
                                      for (const [rKey, rVal] of Object.entries(currentPage)) {
                                        const r = Number(rKey);
                                        if (r < rowNum) {
                                          globalIndex += Object.values(rVal).flatMap(c => c).length;
                                        } else if (r === rowNum) {
                                          for (const [cKey, cVal] of Object.entries(rVal)) {
                                            const c = Number(cKey);
                                            if (c < colNum) {
                                              globalIndex += cVal.length;
                                            } else if (c === colNum) {
                                              globalIndex += questionIndex;
                                              break;
                                            }
                                          }
                                          break;
                                        }
                                      }
                                      break;
                                    }
                                  }
                                  
                                  return (
                                    <div
                                      key={question.id} // Now using event_questions.id which is always unique
                                      className="bg-background rounded-lg border hover:shadow-md transition-all p-4"
                                    >
                                      <QuestionPreview question={question} index={globalIndex} />
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Navigation and Submit */}
                  <div className="flex items-center justify-between pt-6">
                    {/* Previous Page Button */}
                    <div>
                      {totalPages > 1 && currentPageIndex > 0 && (
                        <Button 
                          variant="outline" 
                          onClick={() => setCurrentPageIndex(currentPageIndex - 1)}
                        >
                          Previous Page
                        </Button>
                      )}
                    </div>
                    
                    {/* Next Page / Submit Button */}
                    <div>
                      {totalPages > 1 && currentPageIndex < totalPages - 1 ? (
                        <GradientButton 
                          onClick={() => setCurrentPageIndex(currentPageIndex + 1)}
                        >
                          Next Page
                        </GradientButton>
                      ) : (
                        <GradientButton 
                          size="lg" 
                          disabled={isSubmitting || submitSuccess}
                          onClick={handleSubmit(onSubmit)}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Submitting Registration...
                            </>
                          ) : submitSuccess ? (
                            '✓ Registration Submitted!'
                          ) : (
                            'Register for Event'
                          )}
                        </GradientButton>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageTransition>
  );
};