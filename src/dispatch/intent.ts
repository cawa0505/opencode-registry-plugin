/**
 * IntentDispatcher — maps user context/intent to capability tag profiles.
 *
 * Analyzes the current chat input (first user message of the turn) to
 * determine which capability categories are relevant, then produces a
 * FilterConfig that selectively enables only the needed MCP tools.
 *
 * Used by the "chat.params" hook to dynamically slim the tools list
 * before each LLM call, reducing prompt token waste.
 */

import type { CapabilityTag } from "../registry/types.js";
import type { FilterConfig } from "./filter.js";

// ── Intent → Tag heuristics ───────────────────────────────────────────
// Keywords in user input hint at which capabilities are needed.
// The dispatcher scores each tag and returns the top matches.

interface IntentRule {
  keywords: RegExp[];
  tags: CapabilityTag[];
  weight: number;
}

const INTENT_RULES: IntentRule[] = [
  // Code/review/refactor
  { keywords: [/review/i, /refactor/i, /analyze/i, /audit/i, /simplif/i], tags: ["code", "read"], weight: 2 },
  { keywords: [/bug/i, /fix/i, /error/i, /crash/i, /broken/i], tags: ["code", "debug", "search"], weight: 2 },
  { keywords: [/implement/i, /create/i, /add\s/, /write/i, /feat\b/i], tags: ["code", "write", "search"], weight: 2 },

  // Search/lookup
  { keywords: [/search/i, /find/i, /locate/i, /where/i, /grep/i], tags: ["search", "nav"], weight: 1.5 },
  { keywords: [/explain/i, /what is/i, /how does/i, /document/i], tags: ["read", "code", "search"], weight: 1.5 },

  // Web/document reading
  { keywords: [/web/i, /http/i, /fetch/i, /url/i, /scrape/i], tags: ["web", "read"], weight: 2 },
  { keywords: [/read.*doc/i, /open.*file/i, /show.*content/i], tags: ["read", "nav"], weight: 1.5 },

  // Debug
  { keywords: [/debug/i, /trace/i, /log/i, /diagnos/i], tags: ["debug", "search", "nav"], weight: 2 },

  // Media/file processing
  { keywords: [/image/i, /video/i, /audio/i, /pdf/i, /convert/i], tags: ["media"], weight: 2 },

  // Config/utility
  { keywords: [/config/i, /setup/i, /install/i, /init/i], tags: ["utility", "nav"], weight: 1 },
];

const DEFAULT_THRESHOLD = 1.0;

/** Score each tag against the user input. */
function scoreIntents(input: string): Map<CapabilityTag, number> {
  const scores = new Map<CapabilityTag, number>();

  for (const rule of INTENT_RULES) {
    const match = rule.keywords.some((kw) => kw.test(input));
    if (!match) continue;

    for (const tag of rule.tags) {
      scores.set(tag, (scores.get(tag) ?? 0) + rule.weight);
    }
  }

  return scores;
}

/**
 * Always-included baseline tags — these are useful for almost every turn.
 * Intent scoring can add more tags on top.
 */
const BASELINE_TAGS: CapabilityTag[] = ["read", "search"];

/**
 * Analyze user input and produce a FilterConfig.
 *
 * @param input   The chat input text (first user message).
 * @param threshold  Minimum score to include a tag (default 1.0).
 * @returns FilterConfig for the current turn.
 */
export function dispatchIntent(
  input: string,
  threshold: number = DEFAULT_THRESHOLD,
): FilterConfig {
  const scores = scoreIntents(input);

  // Start with baseline
  const tags = new Set<CapabilityTag>(BASELINE_TAGS);

  for (const [tag, score] of scores) {
    if (score >= threshold) {
      tags.add(tag);
    }
  }

  return {
    strategy: "tag-allow",
    tags: Array.from(tags),
  };
}
