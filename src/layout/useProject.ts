import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useProjects } from '@/api/queries/projects';
import type { ProjectOut } from '@/api/types';

/**
 * Every route below `/p/:projectSlug` needs the project's UUID, not its slug -- the
 * API takes `project_id`. Resolving it from the slug once here keeps the slug in the
 * URL (readable, shareable) and the id in the queries (correct).
 */
export function useCurrentProject(): {
  slug: string | undefined;
  project: ProjectOut | undefined;
  projectId: string;
  projects: ProjectOut[];
  isLoading: boolean;
  error: unknown;
  /** The slug is in the URL but no project matches it. */
  notFound: boolean;
} {
  const { projectSlug } = useParams<{ projectSlug: string }>();
  const { data, isLoading, isSuccess, error } = useProjects();

  const projects = useMemo(() => data?.items ?? [], [data]);
  const project = useMemo(
    () => projects.find((p) => p.slug === projectSlug),
    [projects, projectSlug],
  );

  return {
    slug: projectSlug,
    project,
    projectId: project?.id ?? '',
    projects,
    isLoading,
    error,
    /**
     * Only after the query has actually succeeded. Deriving this from
     * `!isLoading && !error` was wrong: there is a window before the first fetch is
     * dispatched where the query is pending, `isLoading` is false and `error` is null,
     * and a slug that exists would flash "no such project" -- or, with the backend
     * down, get stuck on it, telling the analyst their link is broken when the truth
     * is the API is unreachable.
     */
    notFound: Boolean(projectSlug) && isSuccess && project === undefined,
  };
}
