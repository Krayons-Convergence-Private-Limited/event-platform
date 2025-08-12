import { useState, useCallback } from "react";
import { PageTransition } from "@/components/ui/page-transition";
import { GradientButton } from "@/components/ui/gradient-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, Image, Mail, FileImage, Eye } from "lucide-react";
import { Event } from "@/types/event";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";

interface MediaManagementProps {
  onBack: () => void;
  onNext: (updatedEvent: Event) => void;
  event: Event;
}

interface EmailTemplate {
  id: string;
  template_name: string;
  subject_template: string;
  body_template: string;
  template_variables: Record<string, string>;
}

export const MediaManagement = ({ onBack, onNext, event }: MediaManagementProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [badgeFile, setBadgeFile] = useState<File | null>(null);
  const [badgePreview, setBadgePreview] = useState<string>("");
  const [emailMediaFile, setEmailMediaFile] = useState<File | null>(null);
  
  const [emailSubject, setEmailSubject] = useState(
    event.email_subject || "Registration Confirmation for {{event_name}}"
  );
  const [emailBody, setEmailBody] = useState(
    event.email_body || `Dear {{user_name}},

Thank you for registering for {{event_name}}.

Your Registration ID: {{registration_id}}

Event Details:
Date: {{event_date}}
Venue: {{event_location}}

{{qr_code_placeholder}}

Best Regards,
{{event_name}} Team`
  );
  
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Hardcoded email templates
  const emailTemplates: EmailTemplate[] = [
    {
      id: "india_expo",
      template_name: "India Expo Shop Template",
      subject_template: "Fwd: INDIAEXPOSHOP 2025 Registration Confirmation",
      body_template: `Registration Confirmation

Dear {{user_name}},

Your Registration ID: {{registration_id}}

Greetings from {{event_name}}!

Thank you for registering for the {{event_name}}.

We're excited to see you at the premier platform for events and exhibitions.

Event Details:
Date: {{event_date}}
Venue: {{event_location}}

{{qr_code_placeholder}}

Thanks & Regards
{{event_name}} Team`,
      template_variables: {
        user_name: "User Name",
        registration_id: "Registration ID",
        event_name: "Event Name",
        event_date: "Event Date",
        event_location: "Event Location",
        qr_code_placeholder: "QR Code"
      }
    },
    {
      id: "gartex",
      template_name: "Gartex Template",
      subject_template: "Your registration for {{event_name}} is successful",
      body_template: `Dear {{user_name}},

Thank you for registering to visit {{event_name}} from {{event_date}} at {{event_location}}.

Attached is your e-badge to visit the show.

Carry a print out of your E-badge to the show for direct entry.

Opening Hours:
{{event_date}} 10:00 am – 6:00 pm

Venue:
{{event_location}}

For enquiries, contact: {{contact_info}}

{{qr_code_placeholder}}

*E-badge/Mobile badges are not acceptable for direct hall entry.
*Entry for business visitors above 16 years of age only

Have a safe and fruitful networking!

See you at {{event_name}}!

Best Regards,
Team {{event_name}}`,
      template_variables: {
        user_name: "User Name",
        event_name: "Event Name",
        event_date: "Event Date",
        event_location: "Event Location",
        contact_info: "Contact Information",
        qr_code_placeholder: "QR Code"
      }
    }
  ];

  // Handle file upload (supports all file types)
  const uploadFile = async (file: File, type: 'badge' | 'email'): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${type}_${event.id}_${Date.now()}.${fileExt}`;
    const filePath = `${type}s/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('event-media')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('event-media')
      .getPublicUrl(filePath);

    // TODO: Store in media_assets table for advanced media management
    // Currently skipped to avoid conflicts - URLs are stored directly in events table

    return urlData.publicUrl;
  };

  // Handle badge upload
  const handleBadgeUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBadgeFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setBadgePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  // Handle email media upload (any file type)
  const handleEmailMediaUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEmailMediaFile(file);
    }
  }, []);

  // Apply email template
  const applyEmailTemplate = (templateId: string) => {
    const template = emailTemplates.find(t => t.id === templateId);
    if (template) {
      setEmailSubject(template.subject_template);
      setEmailBody(template.body_template);
      setSelectedTemplate(templateId);
    }
  };

  // Preview email with sample data
  const getEmailPreview = () => {
    const sampleData = {
      '{{user_name}}': 'John Doe',
      '{{registration_id}}': 'REG001234',
      '{{event_name}}': event.name,
      '{{event_date}}': `${new Date(event.startDate).toLocaleDateString()} - ${new Date(event.endDate).toLocaleDateString()}`,
      '{{event_location}}': event.location,
      '{{qr_code_placeholder}}': '[QR CODE WILL BE INSERTED HERE]'
    };

    let previewSubject = emailSubject;
    let previewBody = emailBody;

    Object.entries(sampleData).forEach(([placeholder, value]) => {
      previewSubject = previewSubject.replace(new RegExp(placeholder, 'g'), value);
      previewBody = previewBody.replace(new RegExp(placeholder, 'g'), value);
    });

    return { subject: previewSubject, body: previewBody };
  };

  // Save and continue
  const handleSaveAndContinue = async () => {
    try {
      setIsLoading(true);
      
      let badgeUrl = "";
      let emailMediaUrl = "";

      // Upload badge if file selected
      if (badgeFile) {
        badgeUrl = await uploadFile(badgeFile, 'badge');
      }

      // Upload email media if file selected
      if (emailMediaFile) {
        emailMediaUrl = await uploadFile(emailMediaFile, 'email');
      }

      // Update event with media and email settings
      const { error } = await supabase
        .from('events')
        .update({
          badge_template_url: badgeUrl,
          email_media_url: emailMediaUrl,
          email_subject: emailSubject,
          email_body: emailBody,
          email_template_variables: {
            user_name: "User Name",
            registration_id: "Registration ID", 
            event_name: "Event Name",
            event_date: "Event Date",
            event_location: "Event Location",
            qr_code_placeholder: "QR Code"
          }
        })
        .eq('id', event.id);

      if (error) throw error;

      const updatedEvent = {
        ...event,
        badge_template_url: badgeUrl,
        email_media_url: emailMediaUrl,
        email_subject: emailSubject,
        email_body: emailBody
      };

      toast({
        title: "Media settings saved!",
        description: "Your badge and email templates have been configured.",
      });

      onNext(updatedEvent);
    } catch (error) {
      console.error('Error saving media settings:', error);
      toast({
        title: "Error",
        description: "Failed to save media settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const preview = getEmailPreview();

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
                Back to Header Selection
              </GradientButton>
            </div>
            
            <div className="mb-8">
              <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                Media & Email Configuration
              </h1>
              <p className="text-muted-foreground">
                Configure banners, badges, and email templates for your event
              </p>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary text-sm font-medium">
                  ✓
                </div>
                <span className="text-primary">Event Details</span>
              </div>
              <div className="w-12 h-0.5 bg-primary"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary text-sm font-medium">
                  ✓
                </div>
                <span className="text-primary">Questionnaires</span>
              </div>
              <div className="w-12 h-0.5 bg-primary"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary text-sm font-medium">
                  ✓
                </div>
                <span className="text-primary">Header Design</span>
              </div>
              <div className="w-12 h-0.5 bg-primary"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                  4
                </div>
                <span className="font-medium text-primary">Media & Email</span>
              </div>
            </div>
          </div>

          <div className="max-w-6xl mx-auto space-y-8">
            {/* Badge Template Section */}
            <Card className="border-0 shadow-elegant bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileImage className="h-5 w-5 text-primary" />
                  Registration Badge Template
                </CardTitle>
                <CardDescription>
                  Upload a custom badge template (recommended: 800x600px)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Upload Badge Template</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBadgeUpload}
                        className="hidden"
                        id="badge-upload"
                      />
                      <label htmlFor="badge-upload" className="cursor-pointer">
                        <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload badge template
                        </p>
                      </label>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Preview</Label>
                    <div className="border rounded-lg bg-muted/30 flex items-center justify-center min-h-[200px]">
                      {badgePreview ? (
                        <img
                          src={badgePreview}
                          alt="Badge preview"
                          className="max-w-full max-h-[200px] object-contain rounded"
                        />
                      ) : (
                        <p className="text-muted-foreground text-sm">Badge preview will appear here</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email Attachment Section */}
            <Card className="border-0 shadow-elegant bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Email Attachment
                </CardTitle>
                <CardDescription>
                  Upload any file to be sent as an attachment with registration emails (PDFs, images, documents, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Upload Email Attachment</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                      <input
                        type="file"
                        onChange={handleEmailMediaUpload}
                        className="hidden"
                        id="email-media-upload"
                      />
                      <label htmlFor="email-media-upload" className="cursor-pointer">
                        <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload any file as email attachment
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PDFs, images, documents, etc. (Max 10MB)
                        </p>
                      </label>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium mb-2 block">File Info</Label>
                    <div className="border rounded-lg bg-muted/30 flex items-center justify-center min-h-[200px] p-4">
                      {emailMediaFile ? (
                        <div className="text-center space-y-2">
                          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-lg flex items-center justify-center">
                            <Mail className="h-8 w-8 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{emailMediaFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(emailMediaFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {emailMediaFile.type || 'Unknown type'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">File info will appear here</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email Template Section */}
            <Card className="border-0 shadow-elegant bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Email Template Configuration
                </CardTitle>
                <CardDescription>
                  Configure the email template sent to registrants
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Template Selection */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Choose Template</Label>
                  <Select value={selectedTemplate} onValueChange={applyEmailTemplate}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select a template or create custom" />
                    </SelectTrigger>
                    <SelectContent>
                      {emailTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.template_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Email Subject */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Email Subject</Label>
                  <Input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Enter email subject..."
                    className="bg-background"
                  />
                </div>

                {/* Email Body */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Email Body</Label>
                  <Textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder="Enter email body..."
                    className="bg-background min-h-[200px]"
                  />
                </div>

                {/* Available Placeholders */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Available Placeholders:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <code>{'{{user_name}}'}</code>
                    <code>{'{{registration_id}}'}</code>
                    <code>{'{{event_name}}'}</code>
                    <code>{'{{event_date}}'}</code>
                    <code>{'{{event_location}}'}</code>
                    <code>{'{{qr_code_placeholder}}'}</code>
                  </div>
                </div>

                {/* Preview Toggle */}
                <div className="flex items-center gap-4">
                  <GradientButton
                    variant="outline"
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    {showPreview ? 'Hide Preview' : 'Show Preview'}
                  </GradientButton>
                </div>

                {/* Email Preview */}
                {showPreview && (
                  <div className="border rounded-lg p-4 bg-background">
                    <h4 className="font-medium mb-2">Email Preview:</h4>
                    <div className="space-y-2">
                      <div>
                        <strong>Subject:</strong> {preview.subject}
                      </div>
                      <div>
                        <strong>Body:</strong>
                        <pre className="whitespace-pre-wrap mt-2 text-sm bg-muted p-3 rounded">
                          {preview.body}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Continue Button */}
            <div className="flex justify-end">
              <GradientButton
                size="lg"
                onClick={handleSaveAndContinue}
                disabled={isLoading}
                className="min-w-[200px]"
              >
                {isLoading ? 'Saving...' : 'Save & Continue'}
              </GradientButton>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};