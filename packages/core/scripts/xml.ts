/**
 * A wrapper over fast-xml-parser for the three XML inputs codegen reads: the
 * generated XSDs, `BannerMapping.xml`, and the root attributes of the CVE
 * documents.
 *
 * Namespace prefixes are removed. `xsd:pattern` reads as `pattern`, and
 * `cve:Term` as `Term`.
 */
import { readFileSync } from 'node:fs'
import { XMLParser, XMLValidator } from 'fast-xml-parser'

export type XmlNode = Record<string, unknown>

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  removeNSPrefix: true,
  // Values are compared and emitted as strings. The parser must not make
  // `202111` a number or `true` a boolean.
  parseAttributeValue: false,
  parseTagValue: false,
  // Attribute values are data: an ISM attribute holds a token list separated by
  // whitespace, and trimming changes it. `textOf` trims element text instead.
  trimValues: false,
  // XML 1.0 §3.3.3 replaces every tab, carriage return and line feed in an
  // attribute value with a space. fast-xml-parser keeps them. Without this, an
  // attribute that wraps in the source differs from the same attribute written
  // on one line.
  attributeValueProcessor: (_name: string, value: string) =>
    value.replaceAll('\t', ' ').replaceAll('\r\n', ' ').replaceAll('\r', ' ').replaceAll('\n', ' '),
})

export const readXml = (file: string): XmlNode => {
  const source = readFileSync(file, 'utf8')
  const valid = XMLValidator.validate(source)
  if (valid !== true) {
    throw new Error(
      `${file}: malformed XML at line ${valid.err.line}, column ${valid.err.col}: ${valid.err.msg}`,
    )
  }
  return parser.parse(source) as XmlNode
}

/** Every node in the tree carrying the given tag name, at any depth. */
export const findAll = (root: unknown, tag: string): XmlNode[] => {
  const found: XmlNode[] = []

  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) {
        walk(item)
      }
      return
    }
    if (node === null || typeof node !== 'object') {
      return
    }

    for (const [key, value] of Object.entries(node)) {
      if (key === tag) {
        for (const match of Array.isArray(value) ? value : [value]) {
          if (match !== null && typeof match === 'object') {
            found.push(match as XmlNode)
          } else {
            found.push({ '#text': match })
          }
        }
      }
      walk(value)
    }
  }

  walk(root)
  return found
}

/** An attribute off a parsed node, as a string. */
export const attribute = (node: XmlNode, name: string): string | undefined => {
  const value = node[`@${name}`]
  return value === undefined || value === null ? undefined : String(value)
}

/** The text content of a parsed node, with surrounding whitespace removed. */
export const textOf = (node: XmlNode): string => String(node['#text'] ?? '').trim()
