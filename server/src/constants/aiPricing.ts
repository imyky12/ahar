export const AI_PRICING = {
  promptTokensPerUsd: 0.000005,
  completionTokensPerUsd: 0.000015,
} as const;

export const estimateCostUsd = (
  promptTokens: number,
  completionTokens: number,
): number =>
  promptTokens * AI_PRICING.promptTokensPerUsd +
  completionTokens * AI_PRICING.completionTokensPerUsd;
