import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './client';

/**
 * Server state lives here and nowhere else. No Redux, no Zustand, no
 * `useEffect` + `useState` fetching.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Analyst sessions are long and the corpus only changes when a job runs, so a
        // short stale window plus job-driven invalidation beats aggressive refetching.
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // A bad key or a missing row will not fix itself; retrying only delays the
          // ErrorState the analyst needs to see.
          if (error instanceof ApiError && (error.isAuth || error.isNotFound)) return false;
          if (error instanceof ApiError && error.code === 'contract_violation') return false;
          return failureCount < 2;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      },
      mutations: { retry: false },
    },
  });
}
