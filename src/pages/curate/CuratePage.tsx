import { PenLine, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { useCreateNarrative, useNarrativeFeed, useUpdateNarrative } from '@/api/queries/narratives';
import { usePosts } from '@/api/queries/entities';
import { AiPill } from '@/components/ai/AiPill';
import { FilterBar } from '@/components/filters/FilterBar';
import { PageShell } from '@/components/page';
import { OriginalPost } from '@/components/post/OriginalPost';
import { RiskScorecard } from '@/components/risk/RiskScorecard';
import { EmptyState, ErrorState, SkeletonCard } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { useProjectContext } from '@/layout/useProjectContext';
import { formatCount, truncate } from '@/lib/format';
import { useFilters } from '@/lib/useFilters';
import { InlineEditTitle } from '@/pages/narratives/components/InlineEditTitle';

/**
 * 4.x Compose and curate.
 *
 * A manual narrative is a first-class narrative: it gets the same scorecard treatment
 * and is marked `is_manual`, so nobody later mistakes an analyst's grouping for a
 * clustering output.
 */
export default function CuratePage() {
  const { projectId, slug } = useProjectContext();
  const navigate = useNavigate();
  const { filters, patchFilters, resetFilters } = useFilters(projectId);
  const { toast } = useToast();

  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);

  const feed = useNarrativeFeed(filters, { sort: 'date', limit: 50 });
  const posts = usePosts(filters, { limit: 50, sort: 'engagement' });
  const updateNarrative = useUpdateNarrative();

  const narratives = useMemo(() => feed.data?.pages.flatMap((p) => p.items) ?? [], [feed.data]);
  const postItems = useMemo(() => posts.data?.pages.flatMap((p) => p.items) ?? [], [posts.data]);

  async function rename(id: string, title: string) {
    try {
      await updateNarrative.mutateAsync({ id, body: { title } });
      toast({ title: 'Narrative renamed', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Rename failed',
        description: err instanceof ApiError ? `${err.message} (${err.code})` : String(err),
        variant: 'error',
      });
    }
  }

  return (
    <PageShell
      title="Curate"
      description="Build a narrative by hand when clustering has not grouped posts the way an analyst would. Tick the posts that belong together, then name the narrative."
      meta={
        <Badge variant="muted">
          {formatCount(selectedPostIds.length)} post
          {selectedPostIds.length === 1 ? '' : 's'} selected
        </Badge>
      }
      actions={
        <Button
          size="sm"
          onClick={() => setComposeOpen(true)}
          disabled={selectedPostIds.length === 0}
        >
          <Plus className="h-3 w-3" aria-hidden="true" />
          Create narrative
        </Button>
      }
      filterBar={<FilterBar filters={filters} onChange={patchFilters} onReset={resetFilters} />}
    >
      <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-2">
        <section className="min-w-0 space-y-3">
          <h2 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            Posts
          </h2>

          {posts.isLoading && <SkeletonCard />}
          {Boolean(posts.error) && (
            <ErrorState error={posts.error} onRetry={() => void posts.refetch()} />
          )}
          {!posts.isLoading && postItems.length === 0 && (
            <EmptyState title="No posts match these filters" />
          )}

          <ul className="space-y-2">
            {postItems.map((post) => {
              const checked = selectedPostIds.includes(post.id);
              return (
                <li key={post.id} className="flex gap-2">
                  <Checkbox
                    id={`post-${post.id}`}
                    className="mt-3"
                    checked={checked}
                    aria-label={`Select post by ${post.author_handle ?? post.author_id}`}
                    onCheckedChange={() =>
                      setSelectedPostIds((prev) =>
                        prev.includes(post.id)
                          ? prev.filter((id) => id !== post.id)
                          : [...prev, post.id],
                      )
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <OriginalPost post={post} tz={filters.tz} compact />
                  </div>
                </li>
              );
            })}
          </ul>

          {posts.hasNextPage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void posts.fetchNextPage()}
              disabled={posts.isFetchingNextPage}
            >
              {posts.isFetchingNextPage ? 'Loading…' : 'Load more posts'}
            </Button>
          )}
        </section>

        <section className="min-w-0 space-y-3">
          <h2 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            Rename and tag
          </h2>
          <p className="text-2xs text-muted-foreground">
            A title you edit is marked as analyst-written wherever that narrative appears, so nobody
            mistakes your wording for the model's.
          </p>

          {feed.isLoading && <SkeletonCard />}
          {Boolean(feed.error) && (
            <ErrorState error={feed.error} onRetry={() => void feed.refetch()} />
          )}
          {!feed.isLoading && narratives.length === 0 && (
            <EmptyState icon={<PenLine className="h-6 w-6" />} title="No narratives to curate" />
          )}

          <ul className="space-y-2">
            {narratives.map((n) => (
              <li key={n.id} className="space-y-2 card-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="muted" className="font-mono">
                    ID: {n.display_id}
                  </Badge>
                  {n.is_manual && <Badge variant="outline">Manual</Badge>}
                  <AiPill provenance={n.title.provenance} />
                  <div className="flex-1" />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/p/${slug}/narratives/${n.id}`)}
                  >
                    Open
                  </Button>
                </div>

                <div className="text-xs font-medium">
                  <InlineEditTitle
                    value={n.title.text ?? 'Untitled narrative'}
                    onSave={(title) => rename(n.id, title)}
                    isSaving={updateNarrative.isPending}
                    label={`Rename narrative ${n.display_id}`}
                  />
                </div>

                <RiskScorecard scorecard={n.scorecard} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <ComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        projectId={projectId}
        postIds={selectedPostIds}
        preview={postItems
          .filter((p) => selectedPostIds.includes(p.id))
          .map((p) => truncate(p.text, 80))}
        onCreated={(id) => {
          setSelectedPostIds([]);
          navigate(`/p/${slug}/narratives/${id}`);
        }}
      />
    </PageShell>
  );
}

function ComposeDialog({
  open,
  onOpenChange,
  projectId,
  postIds,
  preview,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  postIds: string[];
  preview: string[];
  onCreated: (narrativeId: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [claim, setClaim] = useState('');
  const [summary, setSummary] = useState('');
  const create = useCreateNarrative();
  const { toast } = useToast();

  async function submit() {
    try {
      const created = await create.mutateAsync({
        project_id: projectId,
        title: title.trim(),
        claim: claim.trim() || null,
        summary: summary.trim() || null,
        post_ids: postIds,
      });
      toast({ title: 'Narrative created', variant: 'success' });
      onOpenChange(false);
      setTitle('');
      setClaim('');
      setSummary('');
      onCreated(created.id);
    } catch (err) {
      toast({
        title: 'Could not create the narrative',
        description: err instanceof ApiError ? `${err.message} (${err.code})` : String(err),
        variant: 'error',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a manual narrative</DialogTitle>
          <DialogDescription>
            Groups {postIds.length} selected post{postIds.length === 1 ? '' : 's'} into one
            narrative. It is marked as analyst-built, so nobody mistakes it for something the
            clustering produced.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="narrative-title">Title</Label>
            <Input
              id="narrative-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Coordinated push on vendor ownership"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="narrative-claim">Claim (optional)</Label>
            <Input
              id="narrative-claim"
              value={claim}
              onChange={(e) => setClaim(e.target.value)}
              placeholder="The voting machine vendor is majority foreign-owned."
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="narrative-summary">Summary (optional)</Label>
            <Textarea
              id="narrative-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="What these posts have in common and why they were grouped."
            />
          </div>

          {preview.length > 0 && (
            <div className="rounded-md border border-border bg-surface-sunken p-2.5">
              <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                Selected posts
              </p>
              <ul className="mt-1 max-h-32 space-y-0.5 overflow-y-auto">
                {preview.map((text, i) => (
                  <li key={i} className="truncate text-2xs text-muted-foreground">
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => void submit()}
            disabled={create.isPending || title.trim().length === 0}
          >
            {create.isPending ? 'Creating…' : 'Create narrative'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
