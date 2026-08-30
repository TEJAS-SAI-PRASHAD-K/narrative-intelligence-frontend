import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { createQueryClient } from '@/api/queryClient';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SkeletonCard } from '@/components/states';
import { ToastProvider } from '@/components/ui/toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import { JobStoreProvider } from '@/jobs/JobStore';
import { AppLayout } from '@/layout/AppLayout';

// Every page is lazily loaded. The graph page in particular pulls Sigma + graphology
// and must stay out of the initial bundle.
const ProjectPicker = lazy(() => import('@/pages/ProjectPicker'));
const OverviewPage = lazy(() => import('@/pages/overview/OverviewPage'));
const NarrativeFeedPage = lazy(() => import('@/pages/narratives/NarrativeFeedPage'));
const NarrativeDetailPage = lazy(() => import('@/pages/narratives/NarrativeDetailPage'));
const CuratePage = lazy(() => import('@/pages/curate/CuratePage'));
const DriversPage = lazy(() => import('@/pages/drivers/DriversPage'));
const CohortsPage = lazy(() => import('@/pages/cohorts/CohortsPage'));
const DomainsPage = lazy(() => import('@/pages/domains/DomainsPage'));
const DomainDetailPage = lazy(() => import('@/pages/domains/DomainDetailPage'));
const AuthorPage = lazy(() => import('@/pages/authors/AuthorPage'));
const NetworkEntryPage = lazy(() => import('@/pages/network/NetworkEntryPage'));
const NetworkGraphPage = lazy(() => import('@/pages/network/NetworkGraphPage'));
const MediaPage = lazy(() => import('@/pages/media/MediaPage'));
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage'));
const AlertsPage = lazy(() => import('@/pages/alerts/AlertsPage'));
const SourcesPage = lazy(() => import('@/pages/sources/SourcesPage'));
const KeysPage = lazy(() => import('@/pages/settings/KeysPage'));
const JobsPage = lazy(() => import('@/pages/jobs/JobsPage'));
const KitchenSinkPage = lazy(() => import('@/pages/kitchen-sink/KitchenSinkPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function PageFallback() {
  return (
    <div className="p-4">
      <SkeletonCard />
    </div>
  );
}

declare global {
  interface Window {
    /** Dev-only handle for inspecting the cache from the console. */
    __queryClient?: QueryClient;
  }
}

export function App() {
  // One client per app instance, created once -- a client rebuilt on render would
  // throw away the cache on every state change.
  const [queryClient] = useState(createQueryClient);

  if (import.meta.env.DEV) window.__queryClient = queryClient;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={200} skipDelayDuration={300}>
          <ToastProvider>
            <BrowserRouter>
              {/* Inside the router: the job tray navigates on "view". */}
              <JobStoreProvider>
                <Suspense fallback={<PageFallback />}>
                  <Routes>
                    <Route path="/" element={<ProjectPicker />} />
                    <Route path="/kitchen-sink" element={<KitchenSinkPage />} />

                    {/* The full-screen graph owns its own shell: no rail, no top bar. */}
                    <Route
                      path="/p/:projectSlug/network/graph"
                      element={<NetworkGraphPage />}
                    />

                    <Route element={<AppLayout />}>
                      <Route
                        path="/p/:projectSlug"
                        element={<Navigate to="overview" replace />}
                      />
                      <Route path="/p/:projectSlug/overview" element={<OverviewPage />} />
                      <Route path="/p/:projectSlug/narratives" element={<NarrativeFeedPage />} />
                      <Route
                        path="/p/:projectSlug/narratives/:narrativeId"
                        element={<NarrativeDetailPage />}
                      />
                      <Route path="/p/:projectSlug/curate" element={<CuratePage />} />
                      <Route path="/p/:projectSlug/drivers" element={<DriversPage />} />
                      <Route path="/p/:projectSlug/cohorts" element={<CohortsPage />} />
                      <Route path="/p/:projectSlug/domains" element={<DomainsPage />} />
                      <Route path="/p/:projectSlug/domains/:domain" element={<DomainDetailPage />} />
                      <Route path="/p/:projectSlug/authors/:authorId" element={<AuthorPage />} />
                      <Route path="/p/:projectSlug/network" element={<NetworkEntryPage />} />
                      <Route path="/p/:projectSlug/media" element={<MediaPage />} />
                      <Route path="/p/:projectSlug/reports" element={<ReportsPage />} />
                      <Route path="/p/:projectSlug/alerts" element={<AlertsPage />} />
                      <Route path="/p/:projectSlug/sources" element={<SourcesPage />} />
                      <Route path="/settings/keys" element={<KeysPage />} />
                      <Route path="/jobs" element={<JobsPage />} />
                    </Route>

                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Suspense>
              </JobStoreProvider>
            </BrowserRouter>
          </ToastProvider>
        </TooltipProvider>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
