import { PageTransition } from "@/components/ui/page-transition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, User } from "lucide-react";

interface EventLandingProps {
  eventId: string;
}

export const EventLanding = ({ eventId }: EventLandingProps) => {
  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-hero">
        <div className="container mx-auto px-6 py-12">
          <Card className="max-w-2xl mx-auto border-0 shadow-elegant bg-card/95 backdrop-blur-sm">
            <CardHeader className="text-center pb-8">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-3xl font-bold mb-4">
                Welcome to Our Event!
              </CardTitle>
              <CardDescription className="text-lg">
                Thank you for your interest. Event registration will be available soon.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center justify-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>Multi-day Event</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>Professional Venue</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <span>Expert Speakers</span>
                </div>
              </div>
              <p className="text-muted-foreground">
                Event ID: <code className="bg-muted px-2 py-1 rounded text-sm">{eventId}</code>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};