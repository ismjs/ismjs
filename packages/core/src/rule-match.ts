/** Match the token and XPath-regex trigger forms emitted by the rule harvester. */
export const matchesRuleTrigger = (
  value: string,
  tokens: readonly string[],
  patterns: readonly string[],
): boolean =>
  tokens.includes(value) || patterns.some((pattern) => new RegExp(pattern, 'u').test(value))

export const triggeringValues = (
  values: readonly string[],
  tokens: readonly string[],
  patterns: readonly string[],
): readonly string[] => values.filter((value) => matchesRuleTrigger(value, tokens, patterns))
