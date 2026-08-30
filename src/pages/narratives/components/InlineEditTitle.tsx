import { Check, Pencil, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Inline rename. Escape cancels, Enter commits, and the input takes focus on open so
 * the interaction works from the keyboard alone.
 *
 * The save is optimistic upstream, but this component never assumes success: it stays
 * in edit mode until the mutation settles, so a failed PATCH does not silently discard
 * what the analyst typed.
 */
export function InlineEditTitle({
  value,
  onSave,
  isSaving,
  className,
  label = 'Rename',
}: {
  value: string;
  onSave: (next: string) => Promise<void> | void;
  isSaving?: boolean;
  className?: string;
  label?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  // Adopt a new server value only while not editing, so a background refetch cannot
  // overwrite an in-flight edit.
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  async function commit() {
    const next = draft.trim();
    if (next.length === 0 || next === value) {
      setEditing(false);
      setDraft(value);
      return;
    }
    await onSave(next);
    setEditing(false);
  }

  if (!editing) {
    return (
      <span className={cn('inline-flex items-start gap-1.5', className)}>
        <span>{value}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          onClick={() => setEditing(true)}
          className="mt-0.5 shrink-0"
        >
          <Pencil className="h-3 w-3" aria-hidden="true" />
        </Button>
      </span>
    );
  }

  return (
    <span className={cn('inline-flex w-full items-center gap-1.5', className)}>
      <Input
        ref={inputRef}
        value={draft}
        aria-label={label}
        disabled={isSaving}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void commit();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            setDraft(value);
            setEditing(false);
          }
        }}
        className="h-7 flex-1"
      />
      <Button variant="ghost" size="icon-sm" aria-label="Save" disabled={isSaving} onClick={() => void commit()}>
        <Check className="h-3 w-3" aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Cancel"
        disabled={isSaving}
        onClick={() => {
          setDraft(value);
          setEditing(false);
        }}
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </Button>
    </span>
  );
}
