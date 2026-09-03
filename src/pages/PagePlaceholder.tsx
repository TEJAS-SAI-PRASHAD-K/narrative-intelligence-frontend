import { Construction } from 'lucide-react';
import { EmptyState } from '@/components/states';

/**
 * Stands in for a screen that is routed but not built. Currently unused: every route
 * in `App.tsx` now renders a real page.
 */
export function PagePlaceholder({ name }: { name: string }) {
  return (
    <div className="px-4 py-5 lg:px-6">
      <EmptyState
        icon={<Construction className="h-6 w-6" />}
        title={name}
        description="This screen is not built yet. Nothing is wrong with your filters — there is simply nothing here to show."
      />
    </div>
  );
}
