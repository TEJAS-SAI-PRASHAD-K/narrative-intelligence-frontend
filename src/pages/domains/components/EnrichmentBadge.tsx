import type { EnrichmentStatus } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * `enrichment_status: "unavailable"` reads as "not enriched", never as low risk.
 *
 * A domain nobody could look up is not a domain that checked out clean. Mapping
 * `unavailable` or `failed` onto the low-risk token would turn an absence of evidence
 * into evidence of absence, which is the exact failure this product is built to catch.
 */
const LABEL: Record<EnrichmentStatus, string> = {
  enriched: 'Enriched',
  pending: 'Enrichment pending',
  unavailable: 'Not enriched',
  failed: 'Enrichment failed',
  not_applicable: 'Not applicable',
};

const VARIANT: Record<EnrichmentStatus, 'risk-low' | 'risk-med' | 'risk-none' | 'muted'> = {
  enriched: 'risk-low',
  pending: 'muted',
  unavailable: 'risk-none',
  failed: 'risk-med',
  not_applicable: 'muted',
};

const EXPLAIN: Record<EnrichmentStatus, string> = {
  enriched: 'WHOIS, hosting and TLS data were fetched for this domain.',
  pending: 'An enrichment job is queued or running.',
  unavailable:
    'No enrichment data could be obtained. This is an absence of information, not a clean result — the domain has not been checked.',
  failed:
    'The enrichment job errored. Nothing is known about this domain’s registration or hosting.',
  not_applicable: 'Enrichment does not apply to this kind of host.',
};

export function EnrichmentBadge({
  status,
  detail,
}: {
  status: EnrichmentStatus | null | undefined;
  detail?: string | null;
}) {
  const key: EnrichmentStatus = status ?? 'unavailable';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={VARIANT[key]} className="cursor-help">
          {LABEL[key]}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{EXPLAIN[key]}</p>
        {detail && <p className="mt-1 text-muted-foreground">{detail}</p>}
      </TooltipContent>
    </Tooltip>
  );
}
