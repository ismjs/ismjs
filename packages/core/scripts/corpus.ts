/** Why a vector is not part of the v1 target — see docs/roadmap.md. */
export const SkipReason = {
  Sap: 'sap-deferred',
  Nato: 'nato-deferred',
} as const

export type SkipReason = (typeof SkipReason)[keyof typeof SkipReason]

/** One official XSpec scenario and the strings ODNI expects it to render. */
export type Vector = {
  readonly label: string
  /** XSpec file the scenario came from, relative to the XSPEC root. */
  readonly source: string
  /** ISM attributes, with the `ism:` prefix stripped. */
  readonly attributes: Readonly<Record<string, string>>
  readonly expected: {
    readonly portion?: string
    readonly banner?: string
  }
  readonly skip?: SkipReason
}
