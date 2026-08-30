import { Pause, Play, SkipBack } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { GraphBucket } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { formatCount, formatDateTime } from '@/lib/format';

const BUCKET_WIDTHS = ['1h', '6h', '12h', '1d', '7d'] as const;

/**
 * Activity histogram plus Play Mode.
 *
 * Play Mode animates the already-loaded graph: it advances an index into `buckets[]`
 * and the parent flips `hidden` on nodes and edges accordingly. It issues no request
 * per frame -- a fetch per animation step would be tens of requests for one press of
 * play, and the animation would stutter at exactly the moment the analyst is trying to
 * read the spread.
 *
 * Changing the bucket *width* is different: that is a new aggregation and does refetch.
 */
export function TimelineScrubber({
  buckets,
  bucketWidth,
  onBucketWidthChange,
  index,
  onIndexChange,
  tz,
  shown,
}: {
  buckets: GraphBucket[];
  bucketWidth: string;
  onBucketWidthChange: (width: string) => void;
  /** `null` means "show everything", not "show bucket 0". */
  index: number | null;
  onIndexChange: (index: number | null) => void;
  tz: string;
  /**
   * What is actually on the canvas at this index. Play Mode is cumulative -- a node
   * appears and stays -- so this is not the same as the bucket's own activity, and
   * showing only the bucket counts next to a fuller canvas reads as a bug.
   */
  shown: { nodes: number; edges: number } | null;
}) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(6);

  // The interval reads the live index and callback from refs so it is created once per
  // play, not rebuilt on every advanced frame.
  const indexRef = useRef(index);
  indexRef.current = index;
  const onIndexChangeRef = useRef(onIndexChange);
  onIndexChangeRef.current = onIndexChange;

  useEffect(() => {
    if (!playing || buckets.length === 0) return;

    const timer = setInterval(() => {
      const next = (indexRef.current ?? -1) + 1;
      if (next >= buckets.length) {
        // Reaching the end shows the whole window again rather than freezing on the
        // last bucket, which would read as a stuck animation.
        setPlaying(false);
        onIndexChangeRef.current(null);
        return;
      }
      onIndexChangeRef.current(next);
    }, 1000 / speed);

    return () => clearInterval(timer);
  }, [playing, speed, buckets.length]);

  if (buckets.length === 0) return null;

  const max = Math.max(...buckets.map((b) => b.node_count), 1);
  const active = index ?? buckets.length - 1;
  const current = buckets[active];

  return (
    <section
      aria-label="Timeline"
      className="space-y-1.5 border-t border-border bg-surface px-3 py-2"
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={playing ? 'Pause playback' : 'Play the graph over time'}
            onClick={() => {
              if (!playing && index === null) onIndexChange(0);
              setPlaying((p) => !p);
            }}
          >
            {playing ? (
              <Pause className="h-3 w-3" aria-hidden="true" />
            ) : (
              <Play className="h-3 w-3" aria-hidden="true" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Reset to show the whole window"
            onClick={() => {
              setPlaying(false);
              onIndexChange(null);
            }}
          >
            <SkipBack className="h-3 w-3" aria-hidden="true" />
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          <Label htmlFor="bucket-width" className="whitespace-nowrap">
            Bar width
          </Label>
          <Select value={bucketWidth} onValueChange={onBucketWidthChange}>
            <SelectTrigger id="bucket-width" className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUCKET_WIDTHS.map((w) => (
                <SelectItem key={w} value={w}>
                  {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1.5">
          <Label htmlFor="play-speed" className="whitespace-nowrap">
            Speed
          </Label>
          <Slider
            id="play-speed"
            aria-label="Playback speed in buckets per second"
            min={1}
            max={20}
            step={1}
            value={[speed]}
            onValueChange={([v]) => setSpeed(v ?? 6)}
            className="w-24"
          />
          <span className="w-14 shrink-0 tabular text-2xs text-muted-foreground">{speed}/s</span>
        </div>

        <div className="flex-1" />

        {/* Explicit start and end, in the analyst's timezone. */}
        <p className="tabular text-2xs text-muted-foreground">
          {index === null ? (
            <>
              Whole window {formatDateTime(buckets[0]?.bucket_start, tz)} –{' '}
              {formatDateTime(buckets.at(-1)?.bucket_end, tz)}{' '}
              <span className="font-mono">{tz}</span>
            </>
          ) : (
            <>
              Bucket {active + 1}/{buckets.length} ·{' '}
              {formatDateTime(current?.bucket_start, tz)} –{' '}
              {formatDateTime(current?.bucket_end, tz)} <span className="font-mono">{tz}</span>
              {' · '}
              <span title="Activity within this bucket alone">
                {formatCount(current?.node_count)} active nodes,{' '}
                {formatCount(current?.edge_count)} new edges
              </span>
              {shown && (
                <span title="Everything that has appeared up to and including this bucket">
                  {' · showing '}
                  {formatCount(shown.nodes)} nodes, {formatCount(shown.edges)} edges cumulative
                </span>
              )}
            </>
          )}
        </p>
      </div>

      {/* Histogram doubles as the scrubber: click a bar to jump to that bucket. */}
      <div className="flex h-12 items-end gap-px">
        {buckets.map((b, i) => (
          <button
            key={b.bucket_start}
            type="button"
            aria-label={`${formatDateTime(b.bucket_start, tz)} — ${b.node_count} nodes, ${b.edge_count} edges`}
            aria-pressed={index !== null && i <= active}
            onClick={() => {
              setPlaying(false);
              onIndexChange(i);
            }}
            className={
              index !== null && i <= active
                ? 'min-w-[2px] flex-1 rounded-sm bg-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
                : 'min-w-[2px] flex-1 rounded-sm bg-muted-foreground/40 transition-colors hover:bg-muted-foreground/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
            }
            style={{ height: `${Math.max(3, (b.node_count / max) * 100)}%` }}
          />
        ))}
      </div>
    </section>
  );
}
