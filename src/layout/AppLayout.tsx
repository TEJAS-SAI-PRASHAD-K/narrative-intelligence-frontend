import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { hasApiKey } from '@/api/client';
import { EmptyState, ErrorState, SkeletonCard } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { JobsSheet } from '@/jobs/JobsSheet';
import { useFilters } from '@/lib/useFilters';
import { STORAGE_KEYS } from '@/lib/storage';
import { useLocalState } from '@/lib/useLocalState';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useCurrentProject } from './useProject';

/**
 * Shell for every route except the full-screen graph, which owns its own layout.
 *
 * The filter hook is instantiated here so the top bar's chips and the page below read
 * from the same URL -- one source, no mirror.
 *
 * The sidebar rests as a 72px rail and floats its full panel over the page on hover;
 * pinning it open makes it a normal flex child that the page lays out beside. Below `lg`
 * there is room for neither, so the same nav renders in a sheet.
 */
export function AppLayout() {
  const { slug, project, projectId, projects, isLoading, error, notFound } = useCurrentProject();
  const navigate = useNavigate();
  const location = useLocation();
  const { filters, setFilters } = useFilters(projectId);

  // Collapsed by default: the rail plus hover-reveal is the intended resting state, and
  // pinning it open is the deliberate choice.
  const [collapsed, setCollapsed] = useLocalState(STORAGE_KEYS.sidebarCollapsed, true);
  const [navOpen, setNavOpen] = useState(false);
  const [jobsOpen, setJobsOpen] = useState(false);

  // Routes outside a project (/jobs, /settings/keys) still get the nav and top bar.
  const navSlug = slug ?? projects[0]?.slug ?? '';

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <TopBar
        project={project}
        projects={projects}
        filters={filters}
        onFiltersChange={setFilters}
        onOpenNav={() => setNavOpen(true)}
      />

      <div className="flex min-h-0 flex-1">
        <div className="hidden lg:flex">
          <Sidebar
            slug={navSlug}
            collapsed={collapsed}
            onCollapsedChange={setCollapsed}
            onOpenJobs={() => setJobsOpen(true)}
          />
        </div>

        {/* Under `lg` the same navigation, in a sheet. */}
        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetContent side="left" className="w-56 p-0 sm:max-w-none">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Sidebar
              slug={navSlug}
              collapsed={false}
              onCollapsedChange={() => setNavOpen(false)}
              onOpenJobs={() => setJobsOpen(true)}
              onNavigate={() => setNavOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <main className="relative min-w-0 flex-1 overflow-y-auto" id="main-content">
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

          {isLoading && !error && (
            <div className="p-6">
              <SkeletonCard />
            </div>
          )}

          {/* An error wins over the skeleton: a background refetch after a failure
              must not hide the failure behind a loading state. */}
          {Boolean(error) && (
            <div className="p-6">
              <ErrorState
                error={error}
                title="Could not load your projects"
                onRetry={() => navigate(0)}
              />
            </div>
          )}

          {notFound && (
            <div className="p-6">
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

          {/* `/jobs` and `/settings/keys` live in this shell but carry no slug, so a
              resolved project is required only when the route actually has one. */}
          {!isLoading && !error && !notFound && (!slug || project) && (
            /* Keyed on the project so a switch remounts pages rather than briefly
               rendering one project's data under another project's route. */
            <div key={projectId || location.pathname}>
              <Outlet context={{ projectId, slug }} />
            </div>
          )}
        </main>
      </div>

      <JobsSheet open={jobsOpen} onOpenChange={setJobsOpen} />
    </div>
  );
}
