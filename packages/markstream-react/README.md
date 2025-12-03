# markstream-react

React renderer that consumes the structured AST output from `stream-markdown-parser` and renders it with lightweight semantic HTML components. This is the React counter-part to the Vue renderer that powers `markstream-vue`.

## Development

```bash
pnpm --filter markstream-react dev
```

## Build

```bash
pnpm --filter markstream-react build
```

## Usage

```tsx
import { NodeRenderer } from 'markstream-react'
import 'markstream-react/index.css'

export default function Article({ markdown }: { markdown: string }) {
  return (
    <NodeRenderer content={markdown} />
  )
}
```

You can also pass a pre-parsed `nodes` array if you already have AST data.
