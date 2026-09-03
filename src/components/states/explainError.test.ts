import { describe, expect, it } from 'vitest';
import { ApiError } from '@/api/client';
import { explainError } from './explainError';

function apiError(code: string, status: number, message = 'raw backend message') {
  return new ApiError({ code, message, status, requestId: 'req-1' });
}

describe('explainError', () => {
  it('translates the 501 an analyst was shown as backend build vocabulary', () => {
    const explained = explainError(
      apiError(
        'not_implemented',
        501,
        'reports.list_reports is not wired to real data yet; it lands at build step 13. Set DEMO_MODE=1 to develop against the fixture data.',
      ),
    );

    expect(explained?.title).toBe('Not available in this build');
    // The point of the translation: none of the backend's own words leak into it.
    const shown = `${explained?.title} ${explained?.lead} ${explained?.next ?? ''}`;
    for (const jargon of ['list_reports', 'build step', 'DEMO_MODE', 'fixture']) {
      expect(shown).not.toContain(jargon);
    }
  });

  it('tells an analyst their key was rejected, not that the screen is broken', () => {
    for (const status of [401, 403]) {
      const explained = explainError(apiError('unauthorized', status));
      expect(explained?.title).toBe('Not authorised');
      expect(explained?.next).toBeTruthy();
    }
  });

  it('separates "cannot reach the server" from "the server failed"', () => {
    expect(explainError(apiError('network_error', 0))?.title).toBe('Cannot reach the server');
    expect(explainError(apiError('http_500', 500))?.title).toBe('The server failed on this request');
  });

  it('gives every explanation something the analyst can do next', () => {
    const codes: [string, number][] = [
      ['network_error', 0],
      ['unauthorized', 401],
      ['not_found', 404],
      ['not_implemented', 501],
      ['rate_limited', 429],
      ['contract_violation', 0],
      ['validation_error', 422],
      ['http_503', 503],
    ];
    for (const [code, status] of codes) {
      const explained = explainError(apiError(code, status));
      expect(explained, `${code} should be translated`).not.toBeNull();
      expect(explained?.next, `${code} needs a next step`).toBeTruthy();
    }
  });

  it('falls back to the backend message for a code it does not know', () => {
    // A generic sentence would be less informative than the real one, so there is none.
    expect(explainError(apiError('some_new_code', 418))).toBeNull();
  });

  it('ignores errors that did not come from the API', () => {
    expect(explainError(new Error('boom'))).toBeNull();
    expect(explainError('boom')).toBeNull();
  });
});
