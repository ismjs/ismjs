/**
 * Project-local lint rules, as an oxlint JS plugin.
 *
 * oxlint has no `no-restricted-syntax`, so the assertion restrictions this
 * project needs are written as visitors instead. The plugin API is ESLint's, so
 * the first rule is the direct equivalent of the selector
 * `TSAsExpression[typeAnnotation.type='TSNeverKeyword']`.
 */

/**
 * `as never` is not a narrowing — it is the type checker being told to stop
 * asking. Every value is assignable to a parameter of type `never`, so an
 * assertion to it accepts anything at all, which is the opposite of what an
 * assertion is meant to prove. `parse.ts` accumulated twenty-one of them by
 * pushing unchecked strings into typed fields; the fix was to make the
 * intermediate type honest and check the values, not to keep asserting.
 */
const noAsNever = {
  meta: {
    type: 'problem',
    docs: { description: 'disallow asserting a value to `never`' },
    messages: {
      asNever:
        'Casting as `never` accepts any value at all. Make the type honest and check the value instead.',
    },
  },
  create(context) {
    return {
      TSAsExpression(node) {
        if (node.typeAnnotation.type === 'TSNeverKeyword') {
          context.report({ node, messageId: 'asNever' })
        }
      },
    }
  },
}

/**
 * `x as unknown as T` is the escape hatch that defeats every other check here.
 * A single assertion is at least a downcast the checker agrees is possible;
 * routing through `unknown` first says nothing at all, which is how a whole
 * unchecked object once became a `MarkingInput`. Where a claim genuinely cannot
 * be derived — the phantom brand in `canonical.ts` — a plain downcast is enough.
 */
const noDoubleAssertion = {
  meta: {
    type: 'problem',
    docs: { description: 'disallow asserting through `unknown`' },
    messages: {
      viaUnknown:
        'Asserting through `unknown` discards every check. Derive the type — draw the value out of its vocabulary, or rebuild it from parts.',
    },
  },
  create(context) {
    return {
      TSAsExpression(node) {
        if (
          node.expression.type === 'TSAsExpression' &&
          node.expression.typeAnnotation.type === 'TSUnknownKeyword'
        ) {
          context.report({ node, messageId: 'viaUnknown' })
        }
      },
    }
  },
}

export default {
  meta: { name: 'ism' },
  rules: { 'no-as-never': noAsNever, 'no-double-assertion': noDoubleAssertion },
}
