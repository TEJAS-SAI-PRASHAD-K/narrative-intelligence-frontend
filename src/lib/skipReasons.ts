/**
 * Readable sentences for the `module:reason` codes in `scores.skip_reasons`.
 *
 * A code is looked up by its full `module:reason` form first, then by the bare reason
 * (the reasons shared by every scorer), and otherwise shown as the code itself. An
 * unknown code is never hidden: a new backend reason must stay visible until it is mapped.
 */

/** Reasons that mean the same thing in every module. */
const BY_REASON: Record<string, string> = {
  empty_text: 'The post has no text.',
  text_too_short: 'The text is too short to score reliably.',
  unsupported_language: 'The post is in a language the model does not support.',
  unknown_language: 'The post language could not be identified.',
  model_unavailable: 'The model was not available when this post was scored.',
  inference_error: 'The model failed on this post.',
  not_enough_history: 'There is not enough history to score this post.',
  fact_check_publisher:
    'Published by a fact-checker. Its article quotes the claim it debunks, so it gets no misinformation score.',
};

/** Reasons that only one module emits, or that read differently there. */
const BY_CODE: Record<string, string> = {
  'misinfo:fact_check_publisher':
    'Published by a fact-checker. Its article quotes the claim it debunks, so it gets no misinformation score.',
  'laya:fact_check_publisher':
    'Published by a fact-checker. Its article quotes the claim it debunks, so the title gets no misinformation score.',
  'laya:no_title': 'The post has no title, and this model scores titles only.',
  'laya:calibrator_missing':
    'No calibrator was found for this model, so the raw score is withheld.',
  'laya:calibrator_unreadable':
    'The calibrator file could not be read, so the raw score is withheld.',
  'laya:calibrator_rejected': 'The calibrator was rejected, so the raw score is withheld.',
  'laya:calibrator_demo': 'The calibrator is a demo one, so the raw score is withheld.',
  'laya:calibrator_checkpoint_mismatch':
    'The calibrator was fitted for different model weights, so the raw score is withheld.',
  'laya:checkpoint_missing': 'The configured model checkpoint is missing.',
  'laya:unrouted_language': 'No model is configured for the language of this post.',
  'laya:invalid_score': 'The model returned a score outside 0 to 1, so it was discarded.',
  'stance:no_narrative':
    'The post is not in a narrative, so there is no claim to take a stance on.',
  'stance:no_claim_text':
    "The narrative's claim text is not in this data, so stance was not scored.",
  'stance:claim_text_too_short':
    "The narrative's claim text is too short to take a stance against.",
  'stance:claim_unsupported_language':
    "The narrative's claim is in a language the stance model does not support.",
  'stance:is_claim': 'This post is the narrative claim itself, so it has no stance toward it.',
};

/** The reader-facing text for one skip code. Unknown codes come back unchanged. */
export function describeSkipReason(code: string): string {
  const reason = code.includes(':') ? code.slice(code.indexOf(':') + 1) : code;
  return BY_CODE[code] ?? BY_REASON[reason] ?? code;
}
