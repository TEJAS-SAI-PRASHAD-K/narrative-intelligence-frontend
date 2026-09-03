import { ApiError } from '@/api/client';

/**
 * What happened, what it means, and what to do about it -- in the analyst's language
 * rather than the backend's.
 *
 * The API's `error.message` is written for whoever is building the API. It says things
 * like "reports.list_reports is not wired to real data yet; it lands at build step 13",
 * which tells an analyst nothing they can act on and reads as if the product is broken
 * in a way they caused. So the code is translated here, and the backend's own words
 * move into the technical disclosure, where a bug report can still quote them.
 *
 * A code with no entry returns `null`, and the caller falls back to the backend's
 * message: a generic sentence would be less informative than the real one, not more.
 */

export interface ErrorExplanation {
  /** Replaces the title. */
  title: string;
  /** One or two sentences: what happened and what it means for this screen. */
  lead: string;
  /** What the analyst can do now. Omitted when there is genuinely nothing. */
  next?: string;
}

export function explainError(error: unknown): ErrorExplanation | null {
  if (!(error instanceof ApiError)) return null;

  if (error.code === 'network_error') {
    return {
      title: 'Cannot reach the server',
      lead: 'The dashboard could not connect to the backend at all — the request never arrived.',
      next: 'Check that the API is running and that this browser can reach it, then retry.',
    };
  }

  if (error.isAuth) {
    return {
      title: 'Not authorised',
      lead: 'The key this dashboard is using was rejected, or it does not carry the permission this screen needs.',
      next: 'Ask whoever runs this backend for a key with read access, then restart the dev server so it picks the new key up.',
    };
  }

  if (error.status === 404 || error.code === 'not_found') {
    return {
      title: 'Not found',
      lead: 'Whatever this screen was asked to show does not exist on this backend.',
      next: 'It may have been renamed or removed, or the link may point at a different environment.',
    };
  }

  if (error.status === 501 || error.code === 'not_implemented') {
    return {
      title: 'Not available in this build',
      lead: 'This screen is finished, but the part of the backend that feeds it real data is not connected yet.',
      next: 'Nothing is wrong with your filters or your key — there is simply nothing to show until that lands.',
    };
  }

  if (error.status === 429 || error.code === 'rate_limited') {
    return {
      title: 'Too many requests',
      lead: 'The backend is asking this dashboard to slow down.',
      next: 'Wait a few seconds and retry.',
    };
  }

  if (error.code === 'contract_violation') {
    return {
      title: 'Unexpected response',
      lead: 'The backend answered, but not in the shape this screen knows how to read, so nothing is shown rather than something wrong.',
      next: 'This is a defect worth reporting — the details below identify the exact request.',
    };
  }

  if (error.code === 'validation_error' || error.status === 422) {
    return {
      title: 'The server rejected these filters',
      lead: 'One of the values in the current view is not something this endpoint accepts.',
      next: 'Reset the filters and narrow again from a clean state.',
    };
  }

  if (error.status >= 500) {
    return {
      title: 'The server failed on this request',
      lead: 'The backend accepted the request and then errored while answering it.',
      next: 'Retry — if it keeps happening, the details below identify the exact request.',
    };
  }

  return null;
}
