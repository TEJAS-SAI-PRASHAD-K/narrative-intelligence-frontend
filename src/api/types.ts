/**
 * Re-exports of the generated contract types. Every request and response type in
 * the app derives from `schema.d.ts`. Aliases here exist only to shorten
 * `components['schemas']['X']` at call sites -- they add no fields and change no
 * shapes. A hand-written interface that duplicates a backend schema is a bug: it
 * will silently drift the day Phase 4 changes a field.
 */
import type { components, operations, paths } from './schema';

export type { components, operations, paths };

type S = components['schemas'];

// --- primitives seen on nearly every screen -------------------------------
export type Metric = S['Metric'];
export type KpiBundle = S['KpiBundle'];
export type AiProvenance = S['AiProvenance'];
export type GeneratedText = S['GeneratedText'];
export type ScoreComponent = S['ScoreComponent'];

// --- narratives ------------------------------------------------------------
export type NarrativeScorecard = S['NarrativeScorecard'];
export type NarrativeSummary = S['NarrativeSummary'];
export type NarrativeDetail = S['NarrativeDetail'];
export type NarrativeScoreExplanation = S['NarrativeScoreExplanation'];
export type NarrativeFreshness = S['NarrativeFreshness'];
export type NarrativeTimeline = S['NarrativeTimeline'];
export type NarrativeCohortShare = S['NarrativeCohortShare'];
export type NarrativeCreate = S['NarrativeCreate'];
export type NarrativeUpdate = S['NarrativeUpdate'];
export type RepresentativePost = S['RepresentativePost'];
export type TimelinePoint = S['TimelinePoint'];

// --- compass ---------------------------------------------------------------
export type CompassContext = S['CompassContext'];
export type Citation = S['Citation'];
export type CompassFeedback = S['CompassFeedback'];
export type CompassFeedbackResult = S['CompassFeedbackResult'];

// --- posts / authors / cohorts --------------------------------------------
export type PostOut = S['PostOut'];
export type PostScores = S['PostScores'];
export type Engagement = S['Engagement'];
export type HighRiskPost = S['HighRiskPost'];
export type ThreadResponse = S['ThreadResponse'];
export type SimilarResponse = S['SimilarResponse'];
export type SimilarRequest = S['SimilarRequest'];
export type AuthorOut = S['AuthorOut'];
export type AuthorScoreExplanation = S['AuthorScoreExplanation'];
export type AuthorTimeline = S['AuthorTimeline'];
export type AuthorGroupOut = S['AuthorGroupOut'];
export type CohortOut = S['CohortOut'];
export type CohortMembership = S['CohortMembership'];

// --- overview --------------------------------------------------------------
export type TimeseriesResponse = S['TimeseriesResponse'];
export type TimeseriesPoint = S['TimeseriesPoint'];
export type ConceptsResponse = S['ConceptsResponse'];
export type ConceptItem = S['ConceptItem'];
export type PostsBreakdown = S['PostsBreakdown'];
export type EngagementsBreakdown = S['EngagementsBreakdown'];
export type AuthorsBreakdown = S['AuthorsBreakdown'];
export type EmotionsBreakdown = S['EmotionsBreakdown'];
export type SentimentBreakdown = S['SentimentBreakdown'];
export type EmotionShare = S['EmotionShare'];
export type SentimentShare = S['SentimentShare'];
export type HierarchyNode = S['HierarchyNode'];

// --- drivers / domains -----------------------------------------------------
export type DriversResponse = S['DriversResponse'];
export type DriverItem = S['DriverItem'];
export type DomainOut = S['DomainOut'];
export type DomainNarrativeLink = S['DomainNarrativeLink'];

// --- network ---------------------------------------------------------------
export type GraphResponse = S['GraphResponse'];
export type GraphNode = S['GraphNode'];
export type GraphEdge = S['GraphEdge'];
export type GraphBucket = S['GraphBucket'];
export type GraphLegendEntry = S['GraphLegendEntry'];
export type GraphStats = S['GraphStats'];
export type ComparisonOut = S['ComparisonOut'];
export type ComparisonCreate = S['ComparisonCreate'];
export type ComparisonMetricRow = S['ComparisonMetricRow'];
export type LayoutRequest = S['LayoutRequest'];

// --- projects / ops --------------------------------------------------------
export type ProjectOut = S['ProjectOut'];
export type ProjectCreate = S['ProjectCreate'];
export type ProjectStats = S['ProjectStats'];
export type SourceHealth = S['SourceHealth'];
export type SourceTestResult = S['SourceTestResult'];
export type IngestRunOut = S['IngestRunOut'];
export type IngestRequest = S['IngestRequest'];
export type JobAccepted = S['JobAccepted'];
export type JobOut = S['JobOut'];
export type JobKind = JobOut['kind'];
export type JobStatus = JobOut['status'];
export type ReportOut = S['ReportOut'];
export type ReportCreate = S['ReportCreate'];
export type AlertOut = S['AlertOut'];
export type AlertRuleOut = S['AlertRuleOut'];
export type AlertRuleCreate = S['AlertRuleCreate'];
export type AlertRuleUpdate = S['AlertRuleUpdate'];
export type AlertCondition = S['AlertCondition'];
export type ApiKeyOut = S['ApiKeyOut'];
export type ApiKeyCreated = S['ApiKeyCreated'];
export type ApiKeyCreate = S['ApiKeyCreate'];
export type HealthResponse = S['HealthResponse'];
export type ReadinessResponse = S['ReadinessResponse'];

// --- pagination ------------------------------------------------------------
/**
 * The backend emits one concrete `PageResponse_X_` per item type. They are
 * structurally identical, so a generic mirror is safe here and keeps hooks from
 * repeating the envelope. `items` is still the generated item type.
 */
export interface PageResponse<T> {
  items: T[];
  next_cursor?: string | null;
  total?: number | null;
  filters_applied?: Record<string, unknown>;
}

// --- enum unions used by controls -----------------------------------------
export type Priority = NonNullable<NarrativeScorecard['priority']>;
export type RiskBand = NonNullable<DomainOut['risk_band']>;
export type VerificationStatus = CompassContext['verification_status'];
export type EnrichmentStatus = NonNullable<DomainOut['enrichment_status']>;
export type TimeseriesMetric = TimeseriesResponse['metric'];
export type TimeseriesGroupBy = TimeseriesResponse['group_by'];
export type TimeseriesInterval = TimeseriesResponse['interval'];
export type TimeseriesAgg = TimeseriesResponse['agg'];
export type SourceName = SourceHealth['source'];
export type ReportTemplate = ReportCreate['template'];
export type ReportFormat = ReportCreate['format'];
export type EntityType = DriverItem['entity_type'];
