import { Check, Copy, RefreshCw, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { GeneratedText } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { AiPill } from './AiPill';

export type FeedbackVote = 'up' | 'down';

/**
 * Wraps any `GeneratedText`: the provenance pill plus the controls that make the
 * generation accountable -- thumbs up/down, share, regenerate.
 *
 * `text: null` is an explicit state, not an empty string: the backend has a row but
 * no generated text, and saying so beats rendering nothing.
 */
export function AiBlock({
  value,
  title,
  onFeedback,
  onRegenerate,
  regenerating,
  shareUrl,
  children,
  className,
  emptyMessage = 'No text has been generated for this field yet.',
}: {
  value: GeneratedText;
  title?: string;
  onFeedback?: ((vote: FeedbackVote) => void) | undefined;
  onRegenerate?: (() => void) | undefined;
  regenerating?: boolean;
  shareUrl?: string;
  /** Overrides the default paragraph rendering, e.g. Compass's inline citations. */
  children?: ReactNode;
  className?: string;
  emptyMessage?: string;
}) {
  const [vote, setVote] = useState<FeedbackVote | null>(null);
  const [copied, setCopied] = useState(false);

  function share() {
    const url = shareUrl ?? window.location.href;
    void navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      },
      () => setCopied(false),
    );
  }

  return (
    <section className={cn('rounded-lg border border-border bg-card', className)}>
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        {title && <h3 className="text-xs font-semibold">{title}</h3>}
        <AiPill provenance={value.provenance} />
        <div className="flex-1" />

        {onFeedback && (
          <div className="flex items-center gap-0.5" role="group" aria-label="Rate this generation">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Mark this generation helpful"
              aria-pressed={vote === 'up'}
              className={cn(vote === 'up' && 'text-risk-low')}
              onClick={() => {
                setVote('up');
                onFeedback('up');
              }}
            >
              <ThumbsUp className="h-3 w-3" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Mark this generation unhelpful"
              aria-pressed={vote === 'down'}
              className={cn(vote === 'down' && 'text-risk-high')}
              onClick={() => {
                setVote('down');
                onFeedback('down');
              }}
            >
              <ThumbsDown className="h-3 w-3" aria-hidden="true" />
            </Button>
          </div>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Copy a link to this view" onClick={share}>
              {copied ? (
                <Check className="h-3 w-3 text-risk-low" aria-hidden="true" />
              ) : (
                <Copy className="h-3 w-3" aria-hidden="true" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{copied ? 'Link copied' : 'Copy a link to this view'}</TooltipContent>
        </Tooltip>

        {onRegenerate && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={regenerating}
            aria-label="Regenerate this text"
          >
            <RefreshCw
              className={cn('h-3 w-3', regenerating && 'animate-spin')}
              aria-hidden="true"
            />
            {regenerating ? 'Queued' : 'Regenerate'}
          </Button>
        )}
      </header>

      <div className="px-3 py-2.5 text-sm leading-relaxed">
        {children ??
          (value.text ? (
            <p className="whitespace-pre-wrap">{value.text}</p>
          ) : (
            <p className="text-xs italic text-muted-foreground">{emptyMessage}</p>
          ))}
      </div>
    </section>
  );
}
