import { useOutletContext } from 'react-router-dom';

export interface ProjectRouteContext {
  projectId: string;
  slug: string | undefined;
}

/** Handed down by `<AppLayout>`; every project-scoped page reads it. */
export function useProjectContext(): ProjectRouteContext {
  return useOutletContext<ProjectRouteContext>();
}
