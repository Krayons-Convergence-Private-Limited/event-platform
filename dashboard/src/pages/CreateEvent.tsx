import { useState } from "react";
import { PageTransition } from "@/components/ui/page-transition";
import { GradientButton } from "@/components/ui/gradient-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Calendar, MapPin, User, Mail } from "lucide-react";

interface CreateEventProps {
  onBack: () => void;
  onNext: (eventData: EventFormData) => void;
}

export interface EventFormData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  organizerName: string;
  organizerEmail: string;
}

export const CreateEvent = ({ onBack, onNext }: CreateEventProps) => {
  const [formData, setFormData] = useState<EventFormData>({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    location: "",
    organizerName: "John Smith",
    organizerEmail: "john@democompany.com"
  });

  const [errors, setErrors] = useState<Partial<EventFormData>>({});

  const handleInputChange = (field: keyof EventFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<EventFormData> = {};
    
    if (!formData.name.trim()) newErrors.name = "Event name is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    if (!formData.startDate) newErrors.startDate = "Start date is required";
    if (!formData.endDate) newErrors.endDate = "End date is required";
    if (!formData.location.trim()) newErrors.location = "Location is required";
    if (!formData.organizerName.trim()) newErrors.organizerName = "Organizer name is required";
    if (!formData.organizerEmail.trim()) newErrors.organizerEmail = "Organizer email is required";
    
    if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
      newErrors.endDate = "End date must be after start date";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onNext(formData);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <GradientButton
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </GradientButton>
            </div>
            
            <div className="mb-8">
              <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                Create New Event
              </h1>
              <p className="text-muted-foreground">
                Set up the basic details for your expo or conference
              </p>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                  1
                </div>
                <span className="font-medium text-primary">Event Details</span>
              </div>
              <div className="w-12 h-0.5 bg-border"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-muted-foreground text-sm">
                  2
                </div>
                <span className="text-muted-foreground">Questionnaires</span>
              </div>
              <div className="w-12 h-0.5 bg-border"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-muted-foreground text-sm">
                  3
                </div>
                <span className="text-muted-foreground">Header Design</span>
              </div>
              <div className="w-12 h-0.5 bg-border"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-muted-foreground text-sm">
                  4
                </div>
                <span className="text-muted-foreground">Generate Link</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <Card className="max-w-2xl mx-auto border-0 shadow-elegant bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Event Information
              </CardTitle>
              <CardDescription>
                Provide the essential details about your event
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Event Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Event Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Tech Innovation Expo 2024"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={errors.name ? "border-destructive" : ""}
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your event, its purpose, and what attendees can expect..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className={`min-h-[100px] ${errors.description ? "border-destructive" : ""}`}
                  />
                  {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      className={errors.startDate ? "border-destructive" : ""}
                    />
                    {errors.startDate && <p className="text-sm text-destructive">{errors.startDate}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      className={errors.endDate ? "border-destructive" : ""}
                    />
                    {errors.endDate && <p className="text-sm text-destructive">{errors.endDate}</p>}
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location">
                    <MapPin className="h-4 w-4 inline mr-2" />
                    Location *
                  </Label>
                  <Input
                    id="location"
                    placeholder="e.g., New York Convention Center"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className={errors.location ? "border-destructive" : ""}
                  />
                  {errors.location && <p className="text-sm text-destructive">{errors.location}</p>}
                </div>

                {/* Organizer Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="organizerName">
                      <User className="h-4 w-4 inline mr-2" />
                      Organizer Name *
                    </Label>
                    <Input
                      id="organizerName"
                      placeholder="Your name"
                      value={formData.organizerName}
                      onChange={(e) => handleInputChange('organizerName', e.target.value)}
                      className={errors.organizerName ? "border-destructive" : ""}
                    />
                    {errors.organizerName && <p className="text-sm text-destructive">{errors.organizerName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="organizerEmail">
                      <Mail className="h-4 w-4 inline mr-2" />
                      Organizer Email *
                    </Label>
                    <Input
                      id="organizerEmail"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.organizerEmail}
                      onChange={(e) => handleInputChange('organizerEmail', e.target.value)}
                      className={errors.organizerEmail ? "border-destructive" : ""}
                    />
                    {errors.organizerEmail && <p className="text-sm text-destructive">{errors.organizerEmail}</p>}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-6">
                  <GradientButton type="submit" size="lg" className="flex items-center gap-2">
                    Continue to Questionnaires
                    <ArrowRight className="h-4 w-4" />
                  </GradientButton>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};