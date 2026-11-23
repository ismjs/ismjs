/**
 * `Object.entries` with the keys a record was declared with.
 *
 * The standard library types every key as `string`, because an object may carry
 * properties its type does not mention. The records passed here are the
 * generated rule tables and `Profile` values, whose keys are field names. Each
 * caller would otherwise assert `field as keyof Marking`. Making that claim once,
 * here, keeps it in one reviewed place.
 */
export const entriesOf = <T extends object>(
  record: T,
): Array<[Extract<keyof T, string>, T[Extract<keyof T, string>]]> =>
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the keys are the declared ones; see above
  Object.entries(record) as Array<[Extract<keyof T, string>, T[Extract<keyof T, string>]]>
