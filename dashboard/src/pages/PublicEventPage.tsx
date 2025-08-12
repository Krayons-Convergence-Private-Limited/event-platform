import { useParams } from 'react-router-dom';
import { EventLanding } from './EventLanding';

const PublicEventPage = () => {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Event URL</h1>
          <p className="text-muted-foreground">No event slug provided in the URL</p>
        </div>
      </div>
    );
  }

  return <EventLanding eventSlug={slug} />;
};

export default PublicEventPage;