import type { Engagement } from '@/api/types';

type Counter = keyof Engagement;

export interface EngagementLabels {
  label: string;
  /** Why the counter is null on this platform, shown beside the em dash. */
  nullReason?: string;
}

const DEFAULTS: Record<Counter, EngagementLabels> = {
  likes: { label: 'Likes' },
  shares: { label: 'Shares' },
  replies: { label: 'Replies' },
  views: { label: 'Views', nullReason: 'This platform does not report view counts.' },
};

/**
 * Telegram has no likes or reposts. The contract maps its reaction total to `likes`
 * and its forward count to `shares`, so the labels are renamed to what the platform
 * calls them. Reactions and replies are only present when the channel exposes them.
 */
const BY_PLATFORM: Record<string, Partial<Record<Counter, EngagementLabels>>> = {
  telegram: {
    likes: {
      label: 'Reactions',
      nullReason: 'This channel does not show reactions.',
    },
    shares: { label: 'Forwards' },
    replies: {
      label: 'Replies',
      nullReason: 'This channel has no linked discussion group.',
    },
    views: { label: 'Views', nullReason: 'Telegram did not report views for this post.' },
  },
};

export function engagementLabels(source: string, counter: Counter): EngagementLabels {
  return BY_PLATFORM[source]?.[counter] ?? DEFAULTS[counter];
}
