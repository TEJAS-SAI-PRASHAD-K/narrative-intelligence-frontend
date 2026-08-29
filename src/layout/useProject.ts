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
  const { data, isLoading, error } = useProjects();

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
    notFound: Boolean(projectSlug) && !isLoading && !error && project === undefined,
  };
}
