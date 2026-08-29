import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { hasApiKey } from '@/api/client';
import { EmptyState, ErrorState, SkeletonCard } from '@/components/states';
import { Button } from '@/components/ui/button';
import { JobTray } from '@/jobs/JobTray';
import { useFilters } from '@/lib/useFilters';
import { IconRail } from './IconRail';
import { TopBar } from './TopBar';
import { useCurrentProject } from './useProject';

/**
 * Shell for every route except the full-screen graph, which owns its own layout.
 * The filter hook is instantiated here so the top bar's platform and narrative
 * pickers write to the same URL the page below reads from -- one source, no mirror.
 */
export function AppLayout() {
  const { slug, project, projectId, projects, isLoading, error, notFound } = useCurrentProject();
  const navigate = useNavigate();
  const location = useLocation();
  const { filters, setFilters } = useFilters(projectId);

  // Routes outside a project (/jobs, /settings/keys) still get the rail and top bar.
  const railSlug = slug ?? projects[0]?.slug ?? '';

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <TopBar
        project={project}
        projects={projects}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <div className="flex min-h-0 flex-1">
        <IconRail slug={railSlug} />

        <main className="min-w-0 flex-1 overflow-y-auto" id="main-content">
          {!hasApiKey() && (
            <div
              role="status"
              className="border-b border-risk-med/40 bg-risk-med-bg px-4 py-2 text-xs text-risk-med"
            >
              No <code>VITE_API_KEY</code> is configured. Every request will return{' '}
              <code>401 unauthorized</code>. Copy <code>.env.example</code> to{' '}
              <code>.env.local</code>, paste a key, and restart the dev server.
            </div>
          )}

          {isLoading && (
            <div className="p-4">
              <SkeletonCard />
            </div>
          )}

          {!isLoading && Boolean(error) && (
            <div className="p-4">
              <ErrorState
                error={error}
                title="Could not load projects"
                onRetry={() => navigate(0)}
              />
            </div>
          )}

          {notFound && (
            <div className="p-4">
              <EmptyState
                title={`No project with slug "${slug}"`}
                description="It may have been renamed, or the link may point at a different backend."
                action={
                  <Button size="sm" onClick={() => navigate('/')}>
                    Choose a project
                  </Button>
                }
              />
            </div>
          )}

          {!isLoading && !error && !notFound && (
            /* Keyed on the project so a switch remounts pages rather than briefly
               rendering one project's data under another project's route. */
            <div key={projectId || location.pathname}>
              <Outlet context={{ projectId, slug }} />
            </div>
          )}
        </main>
      </div>

      <JobTray />
    </div>
  );
}
