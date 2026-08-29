import { ArrowRight, FolderOpen } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHealth, useProjects } from '@/api/queries/projects';
import { hasApiKey } from '@/api/client';
import { EmptyState, ErrorState, SkeletonCard } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCount, formatDateRange } from '@/lib/format';
import { readLocal, STORAGE_KEYS, writeLocal } from '@/lib/storage';

/**
 * Landing route. Redirects straight to the last-used project so an analyst returning
 * mid-investigation lands where they left off, and falls back to a picker otherwise.
 */
export default function ProjectPicker() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useProjects();
  const health = useHealth();
  const projects = useMemo(() => data?.items ?? [], [data]);

  useEffect(() => {
    if (isLoading || projects.length === 0) return;
    const last = readLocal<string | null>(STORAGE_KEYS.lastProjectSlug, null);
    if (last && projects.some((p) => p.slug === last)) {
      navigate(`/p/${last}/overview`, { replace: true });
    }
  }, [isLoading, projects, navigate]);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 p-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Narrative Intelligence</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose a project to open its analyst workspace.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {health.data && (
            <>
              <Badge variant={health.data.status === 'ok' ? 'risk-low' : 'risk-med'}>
                API {health.data.status}
              </Badge>
              <Badge variant="muted">{health.data.environment}</Badge>
              <Badge variant={health.data.demo_mode ? 'ai' : 'muted'}>
                {health.data.demo_mode ? 'DEMO_MODE=1' : 'live data'}
              </Badge>
              <Badge variant="muted">{health.data.version}</Badge>
            </>
          )}
          {health.isError && <Badge variant="risk-high">API unreachable</Badge>}
        </div>
      </header>

      {!hasApiKey() && (
        <div className="rounded-md border border-risk-med/40 bg-risk-med-bg px-3 py-2 text-xs text-risk-med">
          No <code>VITE_API_KEY</code> configured. Copy <code>.env.example</code> to{' '}
          <code>.env.local</code>, paste a key with the <code>read</code> scope, and restart{' '}
          <code>pnpm dev</code>.
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {error && <ErrorState error={error} onRetry={() => void refetch()} />}

      {!isLoading && !error && projects.length === 0 && (
        <EmptyState
          icon={<FolderOpen className="h-6 w-6" />}
          title="No projects yet"
          description="Create one with the backend CLI, then reload this page. Phase 5 does not create projects for you."
        />
      )}

      <ul className="space-y-2">
        {projects.map((p) => (
          <li key={p.id}>
            <Card className="transition-colors hover:border-primary/50">
              <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <div className="min-w-0">
                  <CardTitle className="truncate">{p.name}</CardTitle>
                  <p className="mt-0.5 font-mono text-2xs text-muted-foreground">/{p.slug}</p>
                  {p.description && (
                    <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                      {p.description}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    writeLocal(STORAGE_KEYS.lastProjectSlug, p.slug);
                    navigate(`/p/${p.slug}/overview`);
                  }}
                >
                  Open
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Button>
              </CardHeader>
              <CardContent>
                <dl className="flex flex-wrap gap-x-5 gap-y-1 text-2xs text-muted-foreground">
                  <Stat label="Posts" value={formatCount(p.stats?.post_count)} />
                  <Stat label="Narratives" value={formatCount(p.stats?.narrative_count)} />
                  <Stat label="Authors" value={formatCount(p.stats?.author_count)} />
                  <Stat label="Domains" value={formatCount(p.stats?.domain_count)} />
                  <Stat
                    label="Corpus window"
                    value={formatDateRange(p.stats?.first_post_at, p.stats?.last_post_at)}
                  />
                </dl>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5">
      <dt>{label}</dt>
      <dd className="tabular text-foreground">{value}</dd>
    </div>
  );
}
