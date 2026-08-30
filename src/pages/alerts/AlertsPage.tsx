import { BellRing, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ApiError } from '@/api/client';
import {
  useAcknowledgeAlert,
  useAlertRules,
  useAlerts,
  useCreateAlertRule,
  useDeleteAlertRule,
  useUpdateAlertRule,
} from '@/api/queries/ops';
import type { AlertCondition, AlertOut, AlertRuleOut } from '@/api/types';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import { useProjectContext } from '@/layout/useProjectContext';
import { formatDateTime, humanizeEnum } from '@/lib/format';
import { useFilters } from '@/lib/useFilters';
import { describeRule } from './components/describeRule';

const SCOPES: NonNullable<AlertCondition['scope']>[] = ['narrative', 'author', 'domain', 'project'];
const OPS: AlertCondition['op'][] = ['>', '>=', '<', '<=', '==', '!='];
const CHANNELS = ['in_app', 'email', 'webhook'] as const;

const METRICS = [
  'fusion_score',
  'bot_like',
  'anomalous',
  'toxicity',
  'negative_sentiment',
  'risk_score',
  'post_count',
  'engagement_total',
];

export default function AlertsPage() {
  const { projectId } = useProjectContext();
  const { filters } = useFilters(projectId);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);

  const alerts = useAlerts(projectId, undefined);
  const rules = useAlertRules(projectId);
  const acknowledge = useAcknowledgeAlert();
  const updateRule = useUpdateAlertRule();
  const deleteRule = useDeleteAlertRule();
  const { toast } = useToast();

  function ack(alert: AlertOut) {
    acknowledge.mutate(alert.id, {
      onSuccess: () => toast({ title: 'Alert acknowledged', variant: 'success' }),
      onError: (err) =>
        toast({
          title: 'Could not acknowledge',
          description: err instanceof ApiError ? err.message : String(err),
          variant: 'error',
        }),
    });
  }

  return (
    <div className="space-y-3 p-4">
      <h1 className="text-sm font-semibold">Alerts</h1>

      <Tabs defaultValue="fired">
        <TabsList>
          <TabsTrigger value="fired">Fired alerts</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="fired" className="mt-3 space-y-2">
          {alerts.isLoading && <SkeletonCard />}
          {Boolean(alerts.error) && (
            <ErrorState error={alerts.error} onRetry={() => void alerts.refetch()} />
          )}
          {!alerts.isLoading && (alerts.data?.items.length ?? 0) === 0 && !alerts.error && (
            <EmptyState
              icon={<BellRing className="h-6 w-6" />}
              title="No alerts have fired"
              description="Rules are evaluated by the alerts.evaluate job."
            />
          )}
          <ul className="space-y-2">
            {(alerts.data?.items ?? []).map((alert) => (
              <li
                key={alert.id}
                className="flex flex-wrap items-start gap-x-3 gap-y-1.5 rounded-lg border border-border bg-card p-3"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium">{alert.rule_name}</span>
                    <Badge variant="muted">{humanizeEnum(alert.subject_type)}</Badge>
                    {alert.acknowledged_at ? (
                      <Badge variant="risk-low">Acknowledged</Badge>
                    ) : (
                      <Badge variant="risk-med">Unacknowledged</Badge>
                    )}
                  </div>
                  {alert.narrative_title && (
                    <p className="truncate text-2xs text-muted-foreground">
                      {alert.narrative_title}
                    </p>
                  )}
                  <p className="tabular text-2xs text-muted-foreground">
                    Fired {formatDateTime(alert.triggered_at, filters.tz)}{' '}
                    <span className="font-mono">{filters.tz}</span>
                    {alert.acknowledged_at &&
                      ` · acknowledged by ${alert.acknowledged_by ?? 'unknown'}`}
                  </p>
                </div>
                {!alert.acknowledged_at && (
                  <Button size="sm" variant="outline" onClick={() => ack(alert)}>
                    Acknowledge
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="rules" className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1" />
            <Button size="sm" onClick={() => setRuleDialogOpen(true)}>
              <Plus className="h-3 w-3" aria-hidden="true" />
              New rule
            </Button>
          </div>

          {rules.isLoading && <SkeletonCard />}
          {Boolean(rules.error) && (
            <ErrorState error={rules.error} onRetry={() => void rules.refetch()} />
          )}
          {!rules.isLoading && (rules.data?.items.length ?? 0) === 0 && !rules.error && (
            <EmptyState title="No alert rules" description="A rule fires when a metric crosses a threshold." />
          )}

          <ul className="space-y-2">
            {(rules.data?.items ?? []).map((rule: AlertRuleOut) => (
              <li
                key={rule.id}
                className="flex flex-wrap items-start gap-x-3 gap-y-1.5 rounded-lg border border-border bg-card p-3"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium">{rule.name}</span>
                    {rule.channels.map((c) => (
                      <Badge key={c} variant="muted">
                        {humanizeEnum(c)}
                      </Badge>
                    ))}
                  </div>
                  {/* Plain English, always -- the JSON is below it, not instead of it. */}
                  <p className="text-xs">{describeRule(rule.condition)}</p>
                  <p className="tabular text-2xs text-muted-foreground">
                    Cooldown {rule.cooldown_minutes} min · fired {rule.trigger_count ?? 0} time(s)
                    {rule.last_triggered_at
                      ? ` · last ${formatDateTime(rule.last_triggered_at, filters.tz)}`
                      : ' · never fired'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <Switch
                      id={`rule-${rule.id}`}
                      checked={rule.enabled}
                      onCheckedChange={(enabled) =>
                        updateRule.mutate({ id: rule.id, body: { enabled } })
                      }
                    />
                    <Label htmlFor={`rule-${rule.id}`} className="normal-case tracking-normal">
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </Label>
                  </div>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Delete rule ${rule.name}`}
                    onClick={() => deleteRule.mutate(rule.id)}
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>

      <RuleDialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen} projectId={projectId} />
    </div>
  );
}

function RuleDialog({
  open,
  onOpenChange,
  projectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}) {
  const [name, setName] = useState('');
  const [metric, setMetric] = useState('fusion_score');
  const [op, setOp] = useState<AlertCondition['op']>('>');
  const [value, setValue] = useState('70');
  const [scope, setScope] = useState<NonNullable<AlertCondition['scope']>>('narrative');
  const [channels, setChannels] = useState<string[]>(['in_app']);
  const [cooldown, setCooldown] = useState('60');

  const create = useCreateAlertRule();
  const { toast } = useToast();

  const condition: AlertCondition = {
    metric,
    op,
    value: Number(value) || 0,
    scope,
  };

  async function submit() {
    try {
      await create.mutateAsync({
        project_id: projectId,
        name: name.trim(),
        condition,
        channels: channels as ('in_app' | 'email' | 'webhook')[],
        cooldown_minutes: Number(cooldown) || 60,
        enabled: true,
      });
      toast({ title: 'Rule created', variant: 'success' });
      onOpenChange(false);
      setName('');
    } catch (err) {
      toast({
        title: 'Could not create the rule',
        description: err instanceof ApiError ? `${err.message} (${err.code})` : String(err),
        variant: 'error',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New alert rule</DialogTitle>
          <DialogDescription>
            The rule is read back in plain English before you save it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="rule-name">Name</Label>
            <Input
              id="rule-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="High-priority narrative surge"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="rule-scope">Scope</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
                <SelectTrigger id="rule-scope" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCOPES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {humanizeEnum(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="rule-metric">Metric</Label>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger id="rule-metric" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METRICS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="rule-op">Comparison</Label>
              <Select value={op} onValueChange={(v) => setOp(v as AlertCondition['op'])}>
                <SelectTrigger id="rule-op" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPS.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="rule-value">Value</Label>
              <Input
                id="rule-value"
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="rule-cooldown">Cooldown (minutes)</Label>
              <Input
                id="rule-cooldown"
                type="number"
                value={cooldown}
                onChange={(e) => setCooldown(e.target.value)}
              />
            </div>
          </div>

          <fieldset className="space-y-1.5">
            <legend className="mb-1 text-2xs font-medium uppercase tracking-wide text-muted-foreground">
              Channels
            </legend>
            <div className="flex gap-4">
              {CHANNELS.map((c) => (
                <div key={c} className="flex items-center gap-1.5">
                  <Checkbox
                    id={`channel-${c}`}
                    checked={channels.includes(c)}
                    onCheckedChange={() =>
                      setChannels((prev) =>
                        prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
                      )
                    }
                  />
                  <Label htmlFor={`channel-${c}`} className="cursor-pointer normal-case tracking-normal">
                    {humanizeEnum(c)}
                  </Label>
                </div>
              ))}
            </div>
          </fieldset>

          <div className="rounded-md border border-primary/30 bg-primary/5 p-2.5">
            <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              This rule reads
            </p>
            <p className="mt-1 text-xs">{describeRule(condition)}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => void submit()}
            disabled={create.isPending || name.trim().length === 0 || channels.length === 0}
          >
            {create.isPending ? 'Creating…' : 'Create rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
