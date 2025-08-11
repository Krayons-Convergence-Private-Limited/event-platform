import { useState } from "react";
import { PageTransition } from "@/components/ui/page-transition";
import { GradientButton } from "@/components/ui/gradient-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Calendar, Users, Settings, LogOut } from "lucide-react";
import { Event } from "@/types/event";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardProps {
  onCreateEvent: () => void;
  events: Event[];
}

export const Dashboard = ({ onCreateEvent, events }: DashboardProps) => {
  const { user, signOut } = useAuth();
  
  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Event Manager Pro
                </h1>
                <p className="text-muted-foreground mt-2">
                  Create and manage professional expo events
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="px-4 py-2 bg-card rounded-lg border shadow-card">
                  <span className="text-sm text-muted-foreground">Organization</span>
                  <p className="font-semibold">{user?.user_metadata?.organization_name || 'Your Organization'}</p>
                </div>
                <GradientButton
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </GradientButton>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="border-0 shadow-card bg-gradient-to-br from-card to-secondary/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-primary rounded-lg">
                      <Calendar className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{events.length}</p>
                      <p className="text-muted-foreground">Total Events</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-card bg-gradient-to-br from-card to-secondary/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-primary rounded-lg">
                      <Users className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">247</p>
                      <p className="text-muted-foreground">Registrations</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-card bg-gradient-to-br from-card to-secondary/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-primary rounded-lg">
                      <Settings className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">12</p>
                      <p className="text-muted-foreground">Active Forms</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Create New Event */}
            <Card className="lg:col-span-1 border-0 shadow-elegant bg-gradient-to-br from-card to-secondary/30">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <PlusCircle className="h-5 w-5 text-primary" />
                  Create New Event
                </CardTitle>
                <CardDescription>
                  Launch a new expo or conference with custom questionnaires
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GradientButton 
                  onClick={onCreateEvent} 
                  size="lg" 
                  className="w-full"
                >
                  Start Creating
                </GradientButton>
              </CardContent>
            </Card>

            {/* Recent Events */}
            <Card className="lg:col-span-2 border-0 shadow-card">
              <CardHeader>
                <CardTitle>Recent Events</CardTitle>
                <CardDescription>
                  Your latest expo events and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {events.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No events created yet</p>
                    <GradientButton onClick={onCreateEvent} variant="outline">
                      Create Your First Event
                    </GradientButton>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {events.slice(0, 3).map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg hover:bg-secondary/70 transition-colors">
                        <div>
                          <h4 className="font-semibold">{event.name}</h4>
                          <p className="text-sm text-muted-foreground">{event.location}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{new Date(event.startDate).toLocaleDateString()}</p>
                          <p className="text-xs text-muted-foreground">{event.questions.length} questions</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};