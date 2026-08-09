/**
 * The three cross-field tables, as TypeScript.
 *
 * `cross-field.ts` reads the rules into rows. This writes those rows out. The
 * split is the same one `emit.ts` draws for the vocabularies: reading a
 * specification and emitting a module are separate jobs, and only the second one
 * cares about quoting.
 */
import { quote } from './emit.ts'
import type { CrossField } from './cross-field.ts'

const list = (values: readonly string[]): string => `[${values.map((v) => quote(v)).join(', ')}]`

export const emitRequires = ({ requires: rows }: CrossField): string =>
  `// Cross-field requirements — ${rows.length} rules in the projection.\n` +
  '/**\n' +
  ' * If `field` holds any of `tokens`, or any token matching one of `patterns`,\n' +
  ' * then `requires` must hold one of `allowed`. A rule names tokens or patterns,\n' +
  ' * never both.\n' +
  ' */\n' +
  'export const REQUIRES = [\n' +
  rows
    .map(
      (r) =>
        `  { id: ${quote(r.id)}, field: ${quote(r.field)}, ` +
        `tokens: ${list(r.tokens)}, patterns: ${list(r.patterns)}, ` +
        `requires: ${quote(r.requires)}, allowed: ${list(r.allowed)} },`,
    )
    .join('\n') +
  '\n] as const satisfies readonly (FieldRule & {\n' +
  '  readonly tokens: readonly string[]\n' +
  '  readonly patterns: readonly string[]\n' +
  '  readonly requires: keyof Marking\n' +
  '  readonly allowed: readonly string[]\n' +
  '})[]\n'

export const emitForbids = ({ forbids: rows }: CrossField): string =>
  `// Cross-field exclusions — ${rows.length} rules in the projection.\n` +
  '/**\n' +
  ' * If `field` holds any of `tokens`, or any token matching one of `patterns`,\n' +
  ' * then `forbids` must hold none of `forbidden`.\n' +
  ' */\n' +
  'export const FORBIDS = [\n' +
  rows
    .map(
      (r) =>
        `  { id: ${quote(r.id)}, field: ${quote(r.field)}, ` +
        `tokens: ${list(r.tokens)}, patterns: ${list(r.patterns)}, ` +
        `forbids: ${quote(r.forbids)}, forbidden: ${list(r.forbidden)} },`,
    )
    .join('\n') +
  '\n] as const satisfies readonly (FieldRule & {\n' +
  '  readonly tokens: readonly string[]\n' +
  '  readonly patterns: readonly string[]\n' +
  '  readonly forbids: keyof Marking\n' +
  '  readonly forbidden: readonly string[]\n' +
  '})[]\n'

export const emitPresence = ({ presence: rows }: CrossField): string =>
  `// Field presence — ${rows.length} rules in the projection.\n` +
  '/**\n' +
  ' * Whether a field may be there at all, decided by another field.\n' +
  ' *\n' +
  ' * `REL` requires a `releasableTo`, and no `REL` forbids one. ODNI states each\n' +
  ' * direction as its own rule, so both are carried with their own ISM-ID rather\n' +
  ' * than folded into one.\n' +
  ' */\n' +
  'export const FIELD_PRESENCE = [\n' +
  rows
    .map(
      (r) =>
        `  { id: ${quote(r.id)}, field: ${quote(r.field)}, tokens: ${list(r.tokens)}, ` +
        `whenPresent: ${String(r.whenPresent)}, requires: ${quote(r.requires)}, ` +
        `mustExist: ${String(r.mustExist)} },`,
    )
    .join('\n') +
  '\n] as const satisfies readonly (FieldRule & {\n' +
  '  readonly tokens: readonly string[]\n' +
  '  readonly whenPresent: boolean\n' +
  '  readonly requires: keyof Marking\n' +
  '  readonly mustExist: boolean\n' +
  '})[]\n'
