import { Construction } from 'lucide-react';
import { EmptyState } from '@/components/states';

/**
 * Route skeleton only. Build step 3 wires every route so navigation and code-splitting
 * are real from the start; each page replaces this at its own numbered step.
 */
export function PagePlaceholder({ name, step }: { name: string; step: string }) {
  return (
    <div className="p-4">
      <EmptyState
        icon={<Construction className="h-6 w-6" />}
        title={name}
        description={`Route is wired and code-split. The screen itself lands in build step ${step}.`}
      />
    </div>
  );
}
