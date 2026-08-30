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
        /**
         * `always`, not the default `online`.
         *
         * Under `networkMode: 'online'` TanStack parks a query as `fetchStatus:
         * "paused"` whenever it believes the browser is offline, and a paused query
         * never errors -- the screen shows no data, no spinner and no error state. For
         * a backend on localhost the browser's "online" signal says nothing useful in
         * either direction: a VPN flap or a captive portal can flip it while the API is
         * perfectly reachable. So requests always run and real failures always surface
         * as an ErrorState carrying a code and request_id.
         *
         * Note this does not override the separate pause-while-the-document-is-hidden
         * behaviour: retries still wait until the tab is visible, then resume and
         * surface the error. That is deliberate and left alone.
         */
        networkMode: 'always',

        // Analyst sessions are long and the corpus only changes when a job runs, so a
        // short stale window plus job-driven invalidation beats aggressive refetching.
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof ApiError) {
            // A bad key or a missing row will not fix itself; retrying only delays the
            // ErrorState the analyst needs to see.
            if (error.isAuth || error.isNotFound) return false;
            if (error.code === 'contract_violation') return false;

            // A backend that is not listening will not start listening within a couple
            // of seconds, and retrying actively hurts: TanStack pauses a retrying query
            // while the tab is hidden, so a retried network failure can sit as
            // `fetchStatus: "paused"` showing no data, no spinner and no error at all.
            // Failing fast puts "cannot reach the API" on screen straight away, which
            // is the whole point of the ErrorState.
            if (error.code === 'network_error') return false;
          }
          return failureCount < 2;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      },
      mutations: { retry: false, networkMode: 'always' },
    },
  });
}
