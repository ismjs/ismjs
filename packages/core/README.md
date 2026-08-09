# @ismjs/core

A dependency-free TypeScript codec for Information Security Markings: Banner Lines and
Portion Marks used to label classified and controlled information in U.S. government
systems.

```text
SECRET//NOFORN      Banner Line
(S//NF)             Portion Mark
```

It reads, writes, canonicalizes, and validates classic IC, CUI, and Commingled Markings.
The package ships as ESM, CommonJS, and a self-contained browser file for air-gapped
networks.

## Install

```sh
npm install @ismjs/core
```

## Example

```ts
import { format, parse, RenderMode, validate } from '@ismjs/core'

const parsed = parse('SECRET//NOFORN')

if (parsed.ok) {
  parsed.marking.classification // 'S'
  format(parsed.marking, RenderMode.Portion) // '(S//NF) '
  validate(parsed.marking) // []
}
```

For the complete API guide, supported scope, known risks, architecture, and roadmap, see
the [project documentation](https://github.com/ismjs/ismjs#readme).

> This library implements ODNI ISM.XML rendering. DoD CUI marking guidance differs,
> especially for Banner Lines. Review the project's known risks before relying on its
> output.

## License

MIT. See [LICENSE](./LICENSE).
