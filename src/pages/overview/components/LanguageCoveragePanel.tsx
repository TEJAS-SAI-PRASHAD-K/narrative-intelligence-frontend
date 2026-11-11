import type { LanguageCoverage } from '@/api/types';
import { NotMeasured } from '@/components/risk/NotMeasured';
import { InfoTip } from '@/components/ui/tooltip';
import { formatExactCount, humanizeEnum } from '@/lib/format';
import { cn } from '@/lib/utils';
import { coverageModules, coverageRows, languageLabel } from './languageCoverage';

/**
 * Which records each scoring module actually scored, per language.
 *
 * Several models score English only, so an average, a share or a count from one of
 * them describes the scored posts and nothing else. This panel puts the denominator
 * next to the module so that number is never read as a statement about every language.
 * A zero is shown as a zero: it means the module scored nothing in that language.
 */
export function LanguageCoveragePanel({
  coverage,
  className,
}: {
  /** `null` or absent when the backend did not compute it; `[]` when nothing matches. */
  coverage: readonly LanguageCoverage[] | null | undefined;
  className?: string;
}) {
  return (
    <section
      aria-label="Scoring coverage by language"
      className={cn('card-surface p-4', className)}
    >
      <div className="flex items-center gap-1.5">
        <h2 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
          Scoring coverage by language
        </h2>
        <InfoTip label="What does scoring coverage show?">
          <div className="space-y-1.5">
            <p>
              For each language, the number of posts that a module scored, out of all posts in that
              language under the current filters.
            </p>
            <p className="text-muted-foreground">
              A post with no score from a module is not counted as scored. Some models cover English
              only, so a score or average from them describes the scored posts, not the whole
              corpus.
            </p>
          </div>
        </InfoTip>
      </div>

      <Body coverage={coverage} />
    </section>
  );
}

function Body({ coverage }: { coverage: readonly LanguageCoverage[] | null | undefined }) {
  if (coverage === null || coverage === undefined) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        The API did not report language coverage for this response.
      </p>
    );
  }
  if (coverage.length === 0) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        No posts match the current filters, so there is no coverage to show.
      </p>
    );
  }

  const modules = coverageModules(coverage);
  const rows = coverageRows(coverage);

  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-2xs uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="py-1 pr-3 font-medium">
              Language
            </th>
            <th scope="col" className="px-2 py-1 text-right font-medium">
              Posts
            </th>
            {modules.map((module) => (
              <th key={module} scope="col" className="px-2 py-1 text-right font-medium">
                {humanizeEnum(module)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.lang ?? '(none)'} className="border-t border-border">
              <th scope="row" className="py-1.5 pr-3 text-left font-normal">
                {languageLabel(row.lang)}
              </th>
              <td className="px-2 py-1.5 text-right tabular">{formatExactCount(row.total)}</td>
              {row.cells.map((cell) => (
                <td
                  key={cell.module}
                  className={cn(
                    'px-2 py-1.5 text-right tabular',
                    cell.scored === 0 && 'text-muted-foreground',
                  )}
                >
                  {cell.scored === null ? (
                    <NotMeasured reason="The API did not report this module for this language." />
                  ) : (
                    <span
                      aria-label={`${formatExactCount(cell.scored)} of ${formatExactCount(cell.total)} scored`}
                    >
                      {formatExactCount(cell.scored)}
                      <span className="text-muted-foreground">
                        {' '}
                        / {formatExactCount(cell.total)}
                      </span>
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
