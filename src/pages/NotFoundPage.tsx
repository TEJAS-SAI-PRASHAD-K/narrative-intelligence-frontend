import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/states';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <EmptyState
        title="No such screen"
        description="The URL does not match any route in this dashboard."
        action={
          <Button size="sm" asChild>
            <Link to="/">Back to projects</Link>
          </Button>
        }
      />
    </div>
  );
}
