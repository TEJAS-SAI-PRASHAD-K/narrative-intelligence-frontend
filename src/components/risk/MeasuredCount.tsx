import { NotMeasured } from '@/components/risk/NotMeasured';
import { formatCount, isMeasured, NOT_MEASURED_LABEL } from '@/lib/format';

/**
 * A count that can be `null`. A measured number renders as text; `null` renders the
 * em dash with "Not measured" as its title and aria text. Never `0` for `null`.
 */
export function MeasuredCount({ value }: { value: number | null | undefined }) {
  if (!isMeasured(value)) return <NotMeasured reason={NOT_MEASURED_LABEL} />;
  return <span className="tabular">{formatCount(value)}</span>;
}
