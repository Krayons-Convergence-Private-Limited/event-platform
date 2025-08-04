import { useState } from "react";
import { PageTransition } from "@/components/ui/page-transition";
import { GradientButton } from "@/components/ui/gradient-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Image, Check } from "lucide-react";
import { HeaderBanner } from "@/types/event";
import techExpoBanner from "@/assets/tech-expo-banner.jpg";
import healthcareExpoBanner from "@/assets/healthcare-expo-banner.jpg";
import businessExpoBanner from "@/assets/business-expo-banner.jpg";
import educationExpoBanner from "@/assets/education-expo-banner.jpg";
import artsExpoBanner from "@/assets/arts-expo-banner.jpg";
import foodExpoBanner from "@/assets/food-expo-banner.jpg";

interface HeaderSelectionProps {
  onBack: () => void;
  onNext: (selectedBanner: HeaderBanner) => void;
}

export const HeaderSelection = ({ onBack, onNext }: HeaderSelectionProps) => {
  const [selectedBanner, setSelectedBanner] = useState<HeaderBanner | null>(null);

  const banners: HeaderBanner[] = [
    {
      id: "tech",
      name: "Tech Innovation",
      image: techExpoBanner,
      category: "Technology & Innovation"
    },
    {
      id: "healthcare",
      name: "Healthcare & Medical",
      image: healthcareExpoBanner,
      category: "Healthcare & Medical"
    },
    {
      id: "business",
      name: "Business Summit",
      image: businessExpoBanner,
      category: "Business & Corporate"
    },
    {
      id: "education",
      name: "Education & Learning",
      image: educationExpoBanner,
      category: "Education & Training"
    },
    {
      id: "arts",
      name: "Arts & Culture",
      image: artsExpoBanner,
      category: "Arts & Entertainment"
    },
    {
      id: "food",
      name: "Food & Beverage",
      image: foodExpoBanner,
      category: "Food & Hospitality"
    }
  ];

  const handleNext = () => {
    if (selectedBanner) {
      onNext(selectedBanner);
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
                Back to Questionnaires
              </GradientButton>
            </div>
            
            <div className="mb-8">
              <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                Choose Header Design
              </h1>
              <p className="text-muted-foreground">
                Select a professional header banner that matches your event theme
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
                <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                  3
                </div>
                <span className="font-medium text-primary">Header Design</span>
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

          {/* Header Selection */}
          <Card className="border-0 shadow-elegant bg-card/50 backdrop-blur-sm mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5 text-primary" />
                Professional Header Banners
              </CardTitle>
              <CardDescription>
                Each design is crafted for different expo genres and audiences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {banners.map((banner) => (
                  <div
                    key={banner.id}
                    className={`relative group cursor-pointer animate-scale-in ${
                      selectedBanner?.id === banner.id
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : ""
                    }`}
                    onClick={() => setSelectedBanner(banner)}
                  >
                    <Card className="border-0 shadow-card hover:shadow-elegant transition-all duration-300 overflow-hidden">
                      <div className="relative">
                        <img
                          src={banner.image}
                          alt={banner.name}
                          className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                          <h3 className="font-bold text-lg mb-1">{banner.name}</h3>
                          <p className="text-sm text-white/80">{banner.category}</p>
                        </div>
                        {selectedBanner?.id === banner.id && (
                          <div className="absolute top-3 right-3 w-8 h-8 bg-primary rounded-full flex items-center justify-center animate-scale-in">
                            <Check className="h-5 w-5 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
              
              {selectedBanner && (
                <div className="mt-8 p-6 bg-primary/10 rounded-lg border border-primary/20 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-primary mb-1">Selected: {selectedBanner.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Perfect for {selectedBanner.category.toLowerCase()} events
                      </p>
                    </div>
                    <GradientButton
                      onClick={handleNext}
                      size="lg"
                      className="flex items-center gap-2"
                    >
                      Generate Event Link
                      <ArrowRight className="h-4 w-4" />
                    </GradientButton>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="border-0 shadow-card bg-muted/50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Image className="h-6 w-6 text-primary mt-1" />
                <div>
                  <h4 className="font-semibold mb-2">Design Tips</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Headers are optimized for professional event branding</li>
                    <li>• Each design includes space for your event title and details</li>
                    <li>• All banners are responsive and look great on mobile devices</li>
                    <li>• You can customize colors and text after generation</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};