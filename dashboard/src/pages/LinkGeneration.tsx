import { useState, useEffect } from "react";
import { PageTransition } from "@/components/ui/page-transition";
import { GradientButton } from "@/components/ui/gradient-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Link2, Copy, ExternalLink, Check, Share2, Eye } from "lucide-react";
import { Event } from "@/types/event";
import { useToast } from "@/hooks/use-toast";

interface LinkGenerationProps {
  onBack: () => void;
  event: Event;
  onViewEvent: (eventId: string) => void;
  onBackToDashboard: () => void;
}

export const LinkGeneration = ({ onBack, event, onViewEvent, onBackToDashboard }: LinkGenerationProps) => {
  const [eventUrl, setEventUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Generate the unique event URL
    const baseUrl = window.location.origin;
    const eventSlug = event.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const uniqueUrl = `${baseUrl}/event/${eventSlug}-${event.uniqueId}`;
    setEventUrl(uniqueUrl);
  }, [event]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Event link has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const openEventPreview = () => {
    onViewEvent(event.uniqueId);
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
                Back to Header Selection
              </GradientButton>
            </div>
            
            <div className="mb-8">
              <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                Event Created Successfully!
              </h1>
              <p className="text-muted-foreground">
                Your unique event link is ready to share with attendees
              </p>
            </div>

            {/* Progress Steps - All Complete */}
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
                  ✓
                </div>
                <span className="font-medium text-primary">Generate Link</span>
              </div>
            </div>
          </div>

          <div className="max-w-3xl mx-auto space-y-8">
            {/* Event Summary */}
            <Card className="border-0 shadow-elegant bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-primary" />
                  Event Summary
                </CardTitle>
                <CardDescription>
                  Review your event details before sharing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Event Information</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name:</span>
                        <span className="ml-2 font-medium">{event.name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Location:</span>
                        <span className="ml-2">{event.location}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Date:</span>
                        <span className="ml-2">
                          {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Organizer:</span>
                        <span className="ml-2">{event.organizerName}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Registration Form</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Questions:</span>
                        <span className="ml-2 font-medium">{event.questions.length} total</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Required:</span>
                        <span className="ml-2">{event.questions.filter(q => q.required).length} questions</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Types:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {Array.from(new Set(event.questions.map(q => q.type))).map(type => (
                            <span
                              key={type}
                              className="text-xs bg-primary/20 text-primary px-2 py-1 rounded capitalize"
                            >
                              {type.replace('-', ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Unique Link */}
            <Card className="border-0 shadow-elegant bg-gradient-to-br from-card to-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-primary" />
                  Your Unique Event Link
                </CardTitle>
                <CardDescription>
                  Share this link with attendees for event registration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-2">
                  <Input
                    value={eventUrl}
                    readOnly
                    className="font-mono text-sm bg-background"
                  />
                  <GradientButton
                    variant="outline"
                    size="sm"
                    onClick={copyToClipboard}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </GradientButton>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <GradientButton
                    onClick={openEventPreview}
                    className="flex-1 flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Preview Event Page
                  </GradientButton>
                  <GradientButton
                    variant="outline"
                    onClick={() => window.open(eventUrl, '_blank')}
                    className="flex-1 flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open in New Tab
                  </GradientButton>
                </div>
              </CardContent>
            </Card>

            {/* Sharing Options */}
            <Card className="border-0 shadow-card bg-muted/50">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <h4 className="font-semibold">Ready to go live!</h4>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Your event page is now live and ready to accept registrations. 
                    Share the link via email, social media, or embed it on your website.
                  </p>
                  <GradientButton
                    onClick={onBackToDashboard}
                    variant="outline"
                  >
                    Back to Dashboard
                  </GradientButton>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};