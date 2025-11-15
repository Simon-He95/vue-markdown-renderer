# vue-renderer-markdown

> Fast, streaming-friendly Markdown rendering for Vue 3 — progressive Mermaid, streaming diff code blocks, and real-time previews optimized for large documents.

[![NPM version](https://img.shields.io/npm/v/vue-renderer-markdown?color=a1b858&label=)](https://www.npmjs.com/package/vue-renderer-markdown)
[![中文版](https://img.shields.io/badge/docs-中文文档-blue)](README.zh-CN.md)
[![NPM downloads](https://img.shields.io/npm/dm/vue-renderer-markdown)](https://www.npmjs.com/package/vue-renderer-markdown)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/vue-renderer-markdown)](https://bundlephobia.com/package/vue-renderer-markdown)
[![License](https://img.shields.io/npm/l/vue-renderer-markdown)](./LICENSE)

## Table of Contents

- [Why use it?](#why-use-it)
- [Compared to traditional Markdown renderers](#compared-to-traditional-markdown-renderers)
- [Live Demo](#-live-demo)
- [Features](#features)
- [Install](#install)
  - [Peer Dependencies](#peer-dependencies)
- [Server-Side Rendering (SSR)](#server-side-rendering-ssr)
- [Math rendering options](#math-rendering-options)
- [Quick Start](#quick-start)
  - [Choose Your Code Block Style](#choose-your-code-block-style)
- [TypeScript Usage](#typescript-usage)
- [Why vue-renderer-markdown?](#why-vue-renderer-markdown)
- [Usage](#usage)
- [Performance Features](#performance-features)
- [Performance Tips](#performance-tips)
  - [Props](#props)
- [New prop: `renderCodeBlocksAsPre`](#new-prop-rendercodeblocksaspre)
- [Advanced customization](#advanced)
- [Monaco Editor Integration](#monaco-editor-integration)
- [Code block header customization](#code-block-header-customization)
- [Mermaid: Progressive Rendering Example](#mermaid-progressive-rendering-example)
- [Tailwind (e.g. shadcn) — fix style ordering issues](#tailwind-eg-shadcn--fix-style-ordering-issues)
- [Troubleshooting](#troubleshooting)
- [Thanks](#thanks)
- [Star History](#star-history)
- [License](#license)

## Why use it?

- Progressive Mermaid: diagrams render incrementally so users see results earlier.
- Streaming diff code blocks: show diffs as they arrive for instant feedback.
- Built for scale: optimized DOM updates and memory usage for very large documents.

## Compared to traditional Markdown renderers

Traditional Markdown renderers typically convert a finished Markdown string into a static HTML tree. This library is designed for streaming and interactive workflows and therefore provides capabilities you won't find in a classic renderer:

- Streaming-first rendering: render partial or incrementally-updated Markdown content without re-parsing the whole document each time. This enables live previews for AI outputs or editors that emit tokens progressively.
- Streaming-aware code blocks and "code-jump" UX: large code blocks are updated incrementally and the renderer can maintain cursor/selection context and fine-grained edits. This enables smooth code-editing experiences and programmatic "jump to" behaviors that traditional renderers do not support.
- Built-in diff/code-stream components: show diffs as they arrive (line-by-line or token-by-token) with minimal reflow. This is ideal for streaming AI edits or progressive code reviews — functionality that is not available in plain Markdown renderers.
- Progressive diagrams and editors: Mermaid diagrams and Monaco-based previews update progressively and render as soon as they become valid.
- Flexible code block rendering: Choose between full Monaco Editor integration for interactive editing or lightweight Shiki-based syntax highlighting for display-only scenarios.
- Smooth, interactive UI: the renderer is optimized for minimal DOM churn and silky interactions (e.g. streaming diffs, incremental diagram updates, and editor integrations) so UX remains responsive even with very large documents.

These features make the library especially suited for real-time, AI-driven, and large-document scenarios where a conventional, static Markdown-to-HTML conversion would lag or break the user experience.

## 🚀 Live Demo

- [Streaming playground](https://vue-markdown-renderer.simonhe.me/) — try large Markdown files and progressive diagrams to feel the difference.
- [Markdown vs v-html comparison](https://vue-markdown-renderer.simonhe.me/markdown) — contrast the library's reactive rendering with a traditional static pipeline.

### Interactive Test Page

- Try the interactive test page for quick verification and debugging: https://vue-markdown-renderer.simonhe.me/test

  This page provides a left-side editor and right-side live preview powered by the library. It also includes a "生成并复制分享链接" action that encodes your input into the URL for easy sharing, and a fallback flow to open or prefill a GitHub issue when the input is too long for URL embedding.

  Use this page to reproduce rendering issues, verify math/mermaid/code block behaviour, and quickly produce a shareable link or an issue with prefilled reproduction steps.

### Intro Video

This short video introduces the vue-renderer-markdown component library and highlights key features and usage patterns.

[![Watch the intro on YouTube](https://i1.hdslb.com/bfs/archive/f073718bd0e51acaea436d7197880478213113c6.jpg)](https://youtu.be/qUggGP5bWNw)

Watch the intro on YouTube: [Open in YouTube](https://youtu.be/qUggGP5bWNw)

## Features

- ⚡ **Ultra-High Performance**: Optimized for real-time streaming with minimal re-renders and efficient DOM updates
- 🌊 **Streaming-First Design**: Built specifically to handle incomplete, rapidly updating, and tokenized Markdown content
- 🧠 **Monaco Streaming Updates**: High-performance Monaco integration with smooth, incremental updates for large code blocks
- 🪄 **Progressive Mermaid Rendering**: Diagrams render as they become valid and update incrementally without jank
- 🧩 **Custom Components**: Seamlessly integrate your Vue components within Markdown content
- 📝 **Complete Markdown Support**: Tables, math formulas, emoji, checkboxes, code blocks, and more
- 🔄 **Real-Time Updates**: Handles partial content and incremental updates without breaking formatting
- 📦 **TypeScript First**: Full type definitions with intelligent auto-completion
- 🔌 **Zero Configuration**: Drop-in component that works with any Vue 3 project out of the box
- 🎨 **Flexible Code Rendering**: Choose between Monaco Editor integration (`CodeBlockNode`) or lightweight markdown-style syntax highlighting (`MarkdownCodeBlockNode`)

## Install

```bash
pnpm add vue-renderer-markdown
# or
npm install vue-renderer-markdown
# or
yarn add vue-renderer-markdown
```

### Peer Dependencies

### Custom parse hooks

For advanced use-cases you can inject hooks into the parsing pipeline via `parseMarkdownToStructure`'s `options` argument or by calling the utility directly when you need an AST. Internally we now rely on [`markdown-it-ts`](https://www.npmjs.com/package/markdown-it-ts), a TypeScript-first fork of markdown-it, but the hook API and plugin ecosystem remain compatible.

- `preTransformTokens?: (tokens: MarkdownToken[]) => MarkdownToken[]` — called immediately after `markdown-it-ts` produces tokens. Use this to rewrite or replace tokens before library parsing.
- `postTransformTokens?: (tokens: MarkdownToken[]) => MarkdownToken[]` — called after internal fixes; if you return a different token array instance it will be re-processed into nodes.
- `postTransformNodes?: (nodes: ParsedNode[]) => ParsedNode[]` — operate directly on the parsed node tree. This is often the simplest and most efficient way to adjust the final output.

Token-level example (preTransformTokens):

```ts
import { getMarkdown, parseMarkdownToStructure } from 'vue-renderer-markdown'

const md = getMarkdown()

function pre(tokens) {
  return tokens.map((t) => {
    if (t.type === 'html_block' && /<thinking>/.test(t.content || '')) {
      return { ...t, type: 'thinking_block', content: (t.content || '').replace(/<\/?thinking>/g, '') }
    }
    return t
  })
}

const nodes = parseMarkdownToStructure(markdownString, md, { preTransformTokens: pre })
```

Node-level example (postTransformNodes):

```ts
function postNodes(nodes) {
  if (!nodes || nodes.length === 0)
    return nodes
  const first = nodes[0]
  if (first.type === 'paragraph') {
    return [{ type: 'thinking', content: 'Auto-thought', children: [first] }, ...nodes.slice(1)]
  }
  return nodes
}

const nodes2 = parseMarkdownToStructure(markdownString, md, { postTransformNodes: postNodes })
```

Playground demo

The included playground demonstrates a small, scoped custom component mapping example: `playground/src/components/ThinkingNode.vue` renders `type: 'thinking'` nodes. The playground registers this mapping with `setCustomComponents('playground-demo', { thinking: ThinkingNode })` and the `MarkdownRender` instance in `playground/src/pages/index.vue` uses `custom-id="playground-demo"`. You can toggle the demo at runtime in the playground's settings panel.

This package requires **Vue 3**. Math (LaTeX) rendering is optional and requires installing `katex` as a peer dependency — KaTeX is not bundled or auto-injected. Additional optional peer dependencies enable advanced features and are lazy-loaded at runtime when available.

#### Required Peer Dependencies

**Vue 3** (required for all features):

```bash
# pnpm (recommended)
pnpm add vue

# npm
npm install vue

# yarn
yarn add vue
```

#### Optional Peer Dependencies

Install these to enable advanced features. The library will gracefully degrade if they are not available.

**Full install** (recommended if you want all features):

```bash
# pnpm
pnpm add mermaid stream-monaco shiki

# npm
npm install mermaid stream-monaco shiki

# yarn
yarn add mermaid stream-monaco shiki
```

**Individual optional features:**

| Peer Dependency | Version | Enables | Fallback if missing |
|----------------|---------|---------|---------------------|
| `mermaid` | >=11 | Progressive Mermaid diagram rendering | Shows code block source |
| `stream-monaco` | >=0.0.33 | Monaco Editor for interactive code editing | Plain text display |
| `stream-markdown` | >=0.0.2 | Streaming renderer used by `MarkdownCodeBlockNode` | Plain text display |
| `shiki` | ^3.13.0 | Syntax highlighting for `MarkdownCodeBlockNode` | Plain text display |
| `vue-i18n` | >=9 | Internationalization support | Built-in fallback translator |

**Important Notes:**

⚠️ KaTeX is not bundled or auto-injected. To enable LaTeX math rendering install `katex` and import its CSS in your application. Example:

```bash
pnpm add katex
# or
npm install katex
```

Then import the stylesheet in your app entry (for example `main.ts`):

```ts
import 'katex/dist/katex.min.css'
```

🖼️ Toolbar icons ship as local SVGs—no additional icon libraries required
- The exact peer version ranges are declared in this package's `package.json`
- Optional peers are lazy-loaded at runtime, so you can start with minimal dependencies and add features later
- For monorepos or pnpm workspaces, install peers at the workspace root to ensure they are available to consuming packages

## Server-Side Rendering (SSR)

This library is designed to be import-safe in SSR builds. Heavy dependencies (Monaco, Mermaid) are lazy-loaded at runtime and browser-only features are properly guarded. However, some advanced features (Monaco editor, progressive Mermaid rendering, Web Workers) require browser APIs and must be rendered client-side only.

### Quick Start: Nuxt 3

Use Nuxt's `<client-only>` wrapper:

```vue
<template>
  <client-only>
    <MarkdownRender :content="markdown" />
  </client-only>
</template>
```

For detailed Nuxt 3 setup, see: [docs/nuxt-ssr.md](docs/nuxt-ssr.md)

### Vite SSR / Custom SSR

Use a client-only wrapper with Vue lifecycle hooks:

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import MarkdownRender from 'vue-renderer-markdown'

const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})
</script>

<template>
  <div v-if="mounted">
    <MarkdownRender :content="markdown" />
  </div>
  <div v-else>
    <!-- SSR fallback: lightweight preformatted text -->
    <pre>{{ markdown }}</pre>
  </div>
</template>
```

### SSR Testing

Run the SSR smoke test to verify import safety:

```bash
pnpm run check:ssr
```

This test ensures the library can be imported in a Node environment without throwing errors.

### Notes

- Optional peers (Mermaid, Monaco, icons) are lazy-loaded only in the browser
-- Math rendering (KaTeX) works during SSR when `katex` is installed and available to the build. Since KaTeX is not bundled, ensure you add `katex` as a dependency if you need server-side math rendering.
- For pre-rendered diagrams/code, generate static HTML server-side and pass it as raw HTML or AST
- If you encounter `window is not defined` errors, please [open an issue](https://github.com/Simon-He95/vue-markdown-render/issues) with the stack trace

## Math rendering options

This library includes a lightweight math inline/block plugin that attempts to normalize common KaTeX/TeX commands and accidental control characters (for example when `"\b"` was interpreted as a backspace character by JS).

You can customize the behavior via `getMarkdown`'s `mathOptions` parameter:

```ts
import { getMarkdown } from './src/utils/markdown/getMarkdown'

const md = getMarkdown({
  mathOptions: {
    // override which words should be auto-prefixed with a backslash
    commands: ['in', 'perp', 'alpha'],
    // whether to escape standalone '!' (default: true)
    escapeExclamation: true,
  }
})
```

There are also two exported helpers you can use directly:

- `KATEX_COMMANDS` — default list of command words the plugin will auto-escape when missing a leading `\`.
- `normalizeStandaloneBackslashT(s, opts?)` — the normalization helper used internally. You can call it yourself if you need to pre-process math content before handing it to KaTeX.

Example:

```ts
import { KATEX_COMMANDS, normalizeStandaloneBackslashT } from 'vue-renderer-markdown'

const raw = 'a\tb + infty'
const normalized = normalizeStandaloneBackslashT(raw, { commands: KATEX_COMMANDS })
// normalized is now safe to pass to KaTeX
```

### Plugin install example (global defaults)

You can set global math options when installing the Vue plugin so all markdown instances created by the library inherit the same defaults.

```ts
import { createApp } from 'vue'
import MarkdownRender, { VueRendererMarkdown } from 'vue-renderer-markdown'

const app = createApp(App)

// Set global math options during plugin install
app.use(VueRendererMarkdown, {
  mathOptions: {
    commands: ['in', 'perp', 'alpha'],
    escapeExclamation: false,
  }
})

app.mount('#app')
```

Alternatively, you can programmatically set the global defaults by importing `setDefaultMathOptions`:

```ts
import { setDefaultMathOptions } from 'vue-renderer-markdown'

setDefaultMathOptions({ commands: ['infty', 'perp'], escapeExclamation: true })
```

## Internationalization (i18n)

By default, `getMarkdown` uses English text for UI elements (e.g., "Copy" button in code blocks). You can customize these texts by providing an `i18n` option:

**Using a translation map:**

```ts
import { getMarkdown } from 'vue-renderer-markdown'

const md = getMarkdown('editor-1', {
  i18n: {
    'common.copy': '复制',
  }
})
```

**Using a translation function:**

```ts
import { useI18n } from 'vue-i18n' // or any i18n library
import { getMarkdown } from 'vue-renderer-markdown'

const { t } = useI18n()

const md = getMarkdown('editor-1', {
  i18n: (key: string) => t(key)
})
```

**Default translations:**

- `common.copy`: "Copy" — Used in code block copy buttons

This design keeps the markdown utilities pure and free from global side effects, allowing you to integrate with any i18n solution or provide static translations.

## Quick Start

### 1. Install

```bash
pnpm add vue-renderer-markdown vue
# or
npm install vue-renderer-markdown vue
# or
yarn add vue-renderer-markdown vue
```

### 2. Basic Usage

```vue
<script setup lang="ts">
import MarkdownRender from 'vue-renderer-markdown'
import 'vue-renderer-markdown/index.css'

const content = `
# Hello World

This is **bold** and this is *italic*.

- List item 1
- List item 2

\`\`\`javascript
console.log('Code block!')
\`\`\`
`
</script>

<template>
  <MarkdownRender :content="content" />
</template>
```

### 3. Enable Optional Features

**Mermaid Diagrams:**
```bash

### NodeRenderer prop: `parseOptions`

The `<MarkdownRender />` component (a.k.a. `NodeRenderer`) now accepts a `parseOptions` prop which is forwarded to the internal `parseMarkdownToStructure` call when you pass `content` to the component. This lets you inject token- or node-level transforms from the component usage without calling the parser yourself.

Type shape (re-exported from the library):

- `preTransformTokens?: (tokens: MarkdownToken[]) => MarkdownToken[]` — called immediately after `markdown-it` produces tokens. Use to rewrite or replace tokens before the library processes them.
- `postTransformTokens?: (tokens: MarkdownToken[]) => MarkdownToken[]` — called after internal token fixes; if you return a different array it will be re-processed into nodes.
- `postTransformNodes?: (nodes: ParsedNode[]) => ParsedNode[]` — operate directly on the parsed node tree.

Why use the prop? Passing `parseOptions` is convenient when you want to support custom inline syntax or lightweight HTML-like tokens that should be mapped to custom node types and rendered with your own Vue components. Combine `parseOptions` with `setCustomComponents` (or the `custom-id` / per-instance custom components mechanism) to map custom node `type` values to Vue components.

Token-level example (pass as component prop):

```vue
<script setup lang="ts">
import MarkdownRender, { getMarkdown } from 'vue-renderer-markdown'

const md = getMarkdown()

function pre(tokens: any[]) {
  return tokens.map((t) => {
    if (t.type === 'html_block' && /<thinking>/.test(t.content || '')) {
      return { ...t, type: 'thinking_block', content: (t.content || '').replace(/<\/?thinking>/g, '') }
    }
    return t
  })
}

const parseOptions = { preTransformTokens: pre }
</script>

<template>
  <MarkdownRender :content="markdownString" :parseOptions="parseOptions" custom-id="playground-demo" />
</template>
```

Node-level example (postTransformNodes as a component prop):

```vue
<script setup lang="ts">
import MarkdownRender from 'vue-renderer-markdown'

function postNodes(nodes) {
  if (!nodes || nodes.length === 0)
    return nodes
  const first = nodes[0]
  if (first.type === 'paragraph') {
    return [{ type: 'thinking', content: 'Auto-thought', children: [first] }, ...nodes.slice(1)]
  }
  return nodes
}

const parseOptions = { postTransformNodes: postNodes }
</script>

<template>
  <MarkdownRender :content="markdownString" :parse-options="parseOptions" />
</template>
```

Notes:

- When you create custom node types via token transforms, register the corresponding Vue component with `setCustomComponents('your-id', { your_node_type: YourComponent })` and pass `custom-id="your-id"` to the `MarkdownRender` instance so it can look up and render your component.
- If you already call `parseMarkdownToStructure` yourself and pass `nodes` to the component, `parseOptions` is ignored — it only applies when `content` is provided and the component does the parsing.

pnpm add mermaid
```
### NodeRenderer prop: `typewriter`

The `<MarkdownRender />` component (a.k.a. `NodeRenderer`) accepts a `typewriter` boolean prop which controls whether non-`code_block` nodes are wrapped with the small "typewriter" enter transition used by the demo and tests. This transition only affects the enter animation (opacity fade) for nodes rendered by the component — `code_block` nodes are never wrapped in this transition to avoid touching Monaco internals.

- Type: `boolean`
- Default: `true`

Why expose it? In some environments (large documents, instant rendering UI, or when you render server-side snapshots) you may prefer deterministic output without the enter animation. Set `:typewriter="false"` on the component to disable the transition.

Example:

```vue
<template>
  <!-- disable enter animation -->
  <MarkdownRender :content="markdownString" :typewriter="false" />
</template>
```

Note: The animation duration and easing can be tuned with the CSS custom properties used by the component:

- `--typewriter-fade-duration` (default `900ms`)
- `--typewriter-fade-ease` (default `ease-out`)

**Monaco Editor (Interactive Code Editing):**
```bash
pnpm add stream-monaco
# Also configure vite-plugin-monaco-editor-esm (see Monaco section)
```

**Syntax Highlighting (Lightweight Alternative to Monaco):**
```bash
pnpm add shiki
```

### Choose Your Code Block Style

The library offers flexible code block rendering:

| Mode | Component | Best for | Dependencies |
|------|-----------|----------|---------------|
| **Monaco Editor (default)** | `CodeBlockNode` | Rich editing, streaming diffs, toolbar actions | `stream-monaco` |
| **Shiki Syntax Highlighting** | `MarkdownCodeBlockNode` | Lightweight read-only views, SSR friendly output | `shiki` |
| **Plain Text** | `PreCodeNode` | Minimal dependencies, AI reasoning traces, logging output | _None_ |

**Default: Monaco Editor Integration** (full-featured)
- Interactive editing
- Advanced features (copy, expand, preview)
- Requires `stream-monaco` peer dependency

**Alternative: Shiki Syntax Highlighting** (lightweight)
```vue
<script setup lang="ts">
import { MarkdownCodeBlockNode, setCustomComponents } from 'vue-renderer-markdown'

// Override globally to use lightweight rendering
setCustomComponents({
  code_block: MarkdownCodeBlockNode,
})
</script>
```

**Minimal: Plain Text** (no dependencies)
```vue
<MarkdownRender :content="content" :render-code-blocks-as-pre="true" />
```

That's it! See the sections below for advanced features and customization.

## TypeScript Usage

### Typed AST rendering

```vue
<script setup lang="ts">
import type { BaseNode } from 'vue-renderer-markdown'
import { ref, watchEffect } from 'vue'
import MarkdownRender, { parseMarkdownToStructure } from 'vue-renderer-markdown'

const content = ref<string>('# Hello \n\n```ts\nconsole.log(1)\n```')
const nodes = ref<BaseNode[]>([])

watchEffect(() => {
  nodes.value = parseMarkdownToStructure(content.value)
})
</script>

<template>
  <MarkdownRender :nodes="nodes" />
</template>
```

### Strongly typed custom components

```vue
<!-- components/CustomCodeBlock.vue -->
<script setup lang="ts">
import type { CodeBlockNode } from 'vue-renderer-markdown'

const props = defineProps<{ node: CodeBlockNode }>()
</script>

<template>
  <pre class="custom-code">
    <code :data-lang="props.node.language">{{ props.node.code }}</code>
  </pre>
</template>
```

```ts
// main.ts
import { createApp } from 'vue'
import { setCustomComponents, VueRendererMarkdown } from 'vue-renderer-markdown'
import App from './App.vue'
import CustomCodeBlock from './components/CustomCodeBlock.vue'

const app = createApp(App)

setCustomComponents('docs', {
  code_block: CustomCodeBlock,
})

app.use(VueRendererMarkdown, {
  mathOptions: {
    commands: ['infty', 'perp', 'alpha'],
    escapeExclamation: true,
  },
  getLanguageIcon(lang) {
    return lang === 'shell' ? '<span>sh</span>' : undefined
  },
})

app.mount('#app')
```

## Why vue-renderer-markdown?

Streaming Markdown content from AI models, live editors, or real-time updates presents unique challenges:

- **Incomplete syntax blocks** can break traditional parsers
- **Rapid content changes** cause excessive re-renders and performance issues
- **Cursor positioning** becomes complex with dynamic content
- **Partial tokens** need graceful handling without visual glitches

vue-renderer-markdown solves these challenges with a streaming-optimized architecture that maintains perfect formatting and performance, even with the most demanding real-time scenarios.

## Usage

### Streaming Markdown (Recommended)

Perfect for AI model responses, live content updates, or any scenario requiring real-time Markdown rendering:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import MarkdownRender from 'vue-renderer-markdown'

const content = ref('')
const fullContent = `# Streaming Content\n\nThis text appears character by character...`

// Simulate streaming content
let index = 0
const interval = setInterval(() => {
  if (index < fullContent.length) {
    content.value += fullContent[index]
    index++
  }
  else {
    clearInterval(interval)
  }
}, 50)
</script>

<template>
  <MarkdownRender :content="content" />
</template>
```

### Basic Usage

For static or pre-generated Markdown content:

```vue
<script setup lang="ts">
import MarkdownRender from 'vue-renderer-markdown'

const markdownContent = `
# Hello Vue Markdown

This is **markdown** rendered as HTML!

- Supports lists
- [x] Checkboxes
- :smile: Emoji
`
</script>

<template>
  <MarkdownRender :content="markdownContent" />
</template>
```

## Performance Features

The streaming-optimized engine delivers:

- **Incremental Parsing Code Blocks**: Only processes changed content, not the entire code block
- **Efficient DOM Updates**: Minimal re-renders
- **Monaco Streaming**: Fast, incremental updates for large code snippets without blocking the UI
- **Progressive Mermaid**: Diagrams render as soon as syntax is valid and refine as content streams in
- **Memory Optimized**: Intelligent cleanup prevents memory leaks during long streaming sessions
- **Animation Frame Based**: Smooth animations
- **Graceful Degradation**: Handles malformed or incomplete Markdown without breaking

## Performance Tips

- Stream long documents in chunks to avoid blocking the main thread; the renderer incrementally patches the DOM.
- Prefer `MarkdownCodeBlockNode` or `render-code-blocks-as-pre` when you only need read-only output — this skips Monaco initialization.
- Scope custom component overrides with `setCustomComponents(id, mapping)` so unused components can be garbage-collected.
- Use the built-in `setDefaultMathOptions` helper once during app bootstrap to avoid repeatedly computing math config per render.
- When Mermaid diagrams are heavy, pre-validate or pre-render them server-side and feed the resulting HTML as cached content.

### Props

| Name               | Type                  | Required | Description                                        |
| ------------------ | --------------------- | -------- | -------------------------------------------------- |
| `content`          | `string`              | ✓        | Markdown string to render                          |
| `nodes`            | `BaseNode[]`          |          | Parsed markdown AST nodes (alternative to content) |
| `renderCodeBlocksAsPre` | `boolean` | | When true, render all `code_block` nodes as simple `<pre><code>` blocks (uses `PreCodeNode`) instead of the full `CodeBlockNode`. Useful for lightweight, dependency-free rendering of multi-line text such as AI "thinking" outputs. Defaults to `false`. |
| `codeBlockStream`  | `boolean`             |          | Controls streaming behavior for `code_block` nodes. When `true` (default), code blocks update progressively as content streams in. When `false`, code blocks stay in a lightweight loading state and render only once when the final code is ready (defers Monaco creation). |
| `viewportPriority` | `boolean`             |          | When enabled (default), heavy nodes (e.g. Mermaid, Monaco) prioritize rendering for content within or near the viewport, deferring offscreen work to improve responsiveness. Set to `false` to render everything eagerly (useful for print/export or when you need immediate layout for all nodes). Defaults to `true`. |

> Either `content` or `nodes` must be provided.

Note: when using the component in a Vue template, camelCase prop names should be written in kebab-case (for example, `renderCodeBlocksAsPre` -> `render-code-blocks-as-pre`).

## New prop: `renderCodeBlocksAsPre`

- Type: `boolean`
- Default: `false`

Description:
- When set to `true`, all parsed `code_block` nodes are rendered as a simple `<pre><code>` (the library's internal `PreCodeNode`) instead of the full `CodeBlockNode` which may depend on optional peers such as Monaco or mermaid.
- Use case: enable this when you need lightweight, preformatted text rendering (for example AI "thinking" outputs or multi-line reasoning steps) and want to avoid depending on optional peer libraries while preserving original formatting.

Notes:
- When `renderCodeBlocksAsPre: true`, props passed to `CodeBlockNode` such as `codeBlockDarkTheme`, `codeBlockMonacoOptions`, `themes`, `minWidth`, `maxWidth`, etc. will not take effect because `CodeBlockNode` is not used.
- If you need the full code block feature set (syntax highlighting, folding, copy button, etc.), keep the default `false` and install the optional peers (`mermaid`, `stream-monaco`).

Example (Vue usage):
```vue
<script setup lang="ts">
import MarkdownRender from 'vue-renderer-markdown'

const markdown = `Here is an AI thinking output:\n\n\`\`\`text\nStep 1...\nStep 2...\n\`\`\`\n`
</script>

<template>
  <MarkdownRender :content="markdown" :render-code-blocks-as-pre="true" />
</template>
```

## New prop: `codeBlockStream`

- Type: `boolean`
- Default: `true`

Description:
- When set to `false`, `code_block` nodes won't stream intermediate updates. Instead, they remain in a loading state and render once when the final code is available. This can reduce layout churn and avoid initializing Monaco repeatedly for partially complete content, which may improve performance in certain scenarios.

Notes:
- This option only applies when `CodeBlockNode` is used (i.e., `renderCodeBlocksAsPre` is `false`).
- While loading, the component shows a lightweight placeholder to keep the layout stable. Monaco editor initialization is deferred until loading becomes `false`.

Example (Vue usage):
```vue
<MarkdownRender :content="markdown" :code-block-stream="false" />
```

## New prop: `viewportPriority`

- Type: `boolean`
- Default: `true`

Description:
- When enabled (default), the renderer defers expensive work for offscreen nodes and prioritizes rendering for elements in or near the viewport. This reduces time-to-interactive for long documents and streaming content, especially with heavy components like Mermaid and Monaco.
- Set to `false` to render all nodes eagerly. This can be helpful for print/export, pre-measuring layouts offscreen, or scenarios where you explicitly want all content rendered immediately.

Example:
```vue
<script setup lang="ts">
import MarkdownRender from 'vue-renderer-markdown'

const markdown = `# Long document with many diagrams and code blocks...`
</script>

<template>
  <!-- Disable prioritized/lazy rendering when preparing a printable/exportable view -->
  <MarkdownRender :content="markdown" :viewport-priority="false" />
  <!-- Note: in templates, use kebab-case: viewport-priority -->
  <!-- Default behavior (omit the prop) keeps it enabled -->
</template>
```

### Advanced

Custom Components

You can override how internal node types are rendered by supplying a mapping from node keys
to your Vue components. This library supports two approaches:

- Scoped per-instance mappings (recommended): provide a `customId` prop to `MarkdownRender`
  and call `setCustomComponents(id, mapping)` to scope overrides to that renderer instance.
- Legacy global mapping: call `setCustomComponents(mapping)` with a single argument. This
  remains supported for backward compatibility but is less flexible and is considered
  deprecated in new code.

Scoped example (recommended):

```ts
import { createApp } from 'vue'
import MarkdownRender, { setCustomComponents } from 'vue-renderer-markdown'
import App from './App.vue'
import MyCustomNode from './components/MyCustomNode.vue'

const app = createApp(App)

// Scope this mapping to instances that use customId="docs-page"
setCustomComponents('docs-page', {
  admonition: MyCustomNode,
  // ...other overrides
})

app.mount('#app')
```

Then, pass the matching `customId` prop to the `MarkdownRender` instance you want to affect:

```vue
<MarkdownRender :content="markdownContent" custom-id="docs-page" />
```

If you create scoped mappings dynamically (for example in a single-page app that mounts/unmounts
multiple different renderers), you can remove a mapping to free memory or avoid stale overrides:

```ts
import { removeCustomComponents } from 'vue-renderer-markdown'

removeCustomComponents('docs-page')
```

Legacy/global example (backwards compatible):

```ts
// Deprecated-style global mapping (still supported)
setCustomComponents({
  code_block: MarkdownCodeBlockNode,
})
```

#### MarkdownCodeBlockNode: Alternative Code Block Renderer

The library now includes `MarkdownCodeBlockNode` - an alternative code block component that provides markdown-style syntax highlighting instead of Monaco Editor integration. This gives you the flexibility to choose between two rendering approaches for code blocks:

- **CodeBlockNode** (default): Full-featured code blocks with Monaco Editor integration, copy buttons, expand/collapse, and advanced features
- **MarkdownCodeBlockNode**: Lightweight markdown-style rendering with syntax highlighting using Shiki

Required peers when using MarkdownCodeBlockNode:

- `stream-markdown` (>=0.0.2)
- `shiki` (^3.13.0)

Install examples:

```bash
# pnpm
pnpm add stream-markdown shiki

# npm
npm install stream-markdown shiki

# yarn
yarn add stream-markdown shiki
```

**When to use MarkdownCodeBlockNode:**
- You want syntax-highlighted code blocks without Monaco Editor dependencies
- You prefer a lighter-weight solution for code display
- You need consistent markdown-style rendering across your application
- You don't need Monaco's editing capabilities

**Usage Example:**

```ts
import { createApp } from 'vue'
import MarkdownRender, { MarkdownCodeBlockNode, setCustomComponents } from 'vue-renderer-markdown'
import App from './App.vue'

const app = createApp(App)

// Override code_block to use markdown-style rendering
setCustomComponents({
  code_block: MarkdownCodeBlockNode,
})

app.mount('#app')
```

**MarkdownCodeBlockNode Props:**

| Name | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `node` | `CodeBlockNode` | - | The code block node object |
| `loading` | `boolean` | `true` | Whether to show loading state |
| `darkTheme` | `string` | `'vitesse-dark'` | Dark theme for syntax highlighting |
| `lightTheme` | `string` | `'vitesse-light'` | Light theme for syntax highlighting |
| `isDark` | `boolean` | `false` | Whether to use dark theme |
| `themes` | `string[]` | - | Array of [darkTheme, lightTheme] for highlighting |
| `showHeader` | `boolean` | `true` | Whether to show the code block header |

The component automatically handles Mermaid diagrams and provides clean syntax highlighting for all other languages using Shiki themes.

Notes:

Notes:

- Use the scoped API when you need different component mappings for different renderer instances — e.g. one mapping for a docs site and another for an editor preview. Call `setCustomComponents('my-id', mapping)` and pass `custom-id="my-id"` to the `MarkdownRender` instance.
- The single-argument form `setCustomComponents(mapping)` continues to work as a global fallback but is deprecated for new usage.
- When using `MarkdownCodeBlockNode`, Monaco Editor related props won't have any effect since that component uses Shiki for highlighting instead.
- When using `MarkdownCodeBlockNode`, Monaco Editor related props won't have any effect since this component uses Shiki for highlighting instead.

**TypeScript**:
  Full type support. Import types as needed:
  ```ts
  import type { MyMarkdownProps } from 'vue-renderer-markdown/dist/types'
  ```

## Vite Configuration & Worker Usage (Important!)

If you're using Vite, you only need the following minimal configuration:

```typescript
import vue from '@vitejs/plugin-vue'
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  worker: {
    format: 'es',
  },
})
```

## Using Web Workers for KaTeX and Mermaid (Important!)

You must import the worker using Vite's `?worker` syntax and inject it into the library via the API:

```ts
// main.ts or your app entry
import KatexWorker from 'vue-renderer-markdown/workers/katexRenderer.worker?worker'
import { setKaTeXWorker } from 'vue-renderer-markdown/workers/katexWorkerClient'

// For Mermaid:
import MermaidWorker from 'vue-renderer-markdown/workers/mermaidParser.worker?worker'
import { setMermaidWorker } from 'vue-renderer-markdown/workers/mermaidWorkerClient'

setKaTeXWorker(new KatexWorker())

setMermaidWorker(new MermaidWorker())
```

### ImageNode slots (placeholder / error)

`ImageNode` now supports two named slots so you can customize the loading and error states:

- Slot name: `placeholder`
- Slot name: `error`

Both slots receive the same set of reactive slot props:

- `node` — the original ImageNode object ({ type: 'image', src, alt, title, raw })
- `displaySrc` — the current src used for rendering (will be `fallbackSrc` if a fallback was applied)
- `imageLoaded` — boolean, whether the image has finished loading
- `hasError` — boolean, whether the image is in an error state
- `fallbackSrc` — string, the fallback src passed to the component (if any)
- `lazy` — boolean, whether lazy loading is used
- `isSvg` — boolean, whether the current `displaySrc` is an SVG

Default behavior: if you don't provide the slots the component shows a built-in CSS spinner for placeholder and a simple error placeholder for error.

Example: customize loading and error slots

```vue
<ImageNode :node="node" :fallback-src="fallback" :lazy="true">
  <template #placeholder="{ node, displaySrc, imageLoaded }">
    <div class="p-4 bg-gray-50 rounded shadow-sm flex items-center justify-center">
      <div class="animate-pulse w-full h-24 bg-gray-200"></div>
      <span class="sr-only">Loading image</span>
    </div>
  </template>

  <template #error="{ node, displaySrc }">
    <div class="p-4 text-sm text-red-600 flex items-center gap-2">
      <strong>Failed to load image</strong>
      <span class="truncate">{{ displaySrc }}</span>
    </div>
  </template>
</ImageNode>
```

Tip: to avoid layout shift when switching from placeholder to the image, keep the placeholder's width/height similar to the final image (or use `aspect-ratio` / min-height). This lets the image fade/transform without triggering layout reflow.

### TableNode loading slot

`TableNode` ships with a lightweight shimmer skeleton + spinner overlay that activates while `node.loading` is `true`. You can replace the overlay content without losing the shimmer effect by providing the named `loading` slot.

- Slot name: `loading`
- Slot props: `{ isLoading: boolean }`

If you omit the slot the default spinner remains. The shimmer stays active either way because it is driven by the table cell CSS, so your custom slot can focus on messaging or branding.

Example: custom loading slot

```vue
<TableNode :node="node" index-key="demo">
  <template #loading="{ isLoading }">
    <div class="flex items-center gap-2 text-slate-500">
      <svg
        class="animate-spin h-5 w-5 text-slate-400"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
          fill="none"
        />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
      <span>
        {{ isLoading ? 'Fetching table rows…' : 'Loaded' }}
      </span>
    </div>
  </template>
</TableNode>
```

### LinkNode: underline animation & color customization

`LinkNode` (the internal node used to render anchors) now supports runtime customization of underline animation and color via props — no need to override global CSS. Defaults preserve the previous appearance.

Available props (pass to the component that renders `LinkNode`):

| Name | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `color` | `string` | `#0366d6` | Link text color (any valid CSS color). The underline uses `currentColor`, so it follows this color. |
| `underlineHeight` | `number` | `2` | Underline thickness in pixels. |
| `underlineBottom` | `number \| string` | `-3px` | Offset from the text baseline; accepts px or any CSS length (e.g., `0.2rem`). |
| `animationDuration` | `number` | `0.8` | Total animation duration in seconds. |
| `animationOpacity` | `number` | `0.9` | Underline opacity. |
| `animationTiming` | `string` | `linear` | CSS timing function (e.g., `linear`, `ease`, `ease-in-out`). |
| `animationIteration` | `string \| number` | `infinite` | Animation iteration count or `'infinite'`. |
| `showTooltip` | `boolean` | `true` | Whether to show the custom singleton tooltip on hover/focus. When `false`, the link `title` attribute is set to the link href/title/text (for native browser tooltip). |

Example:

```vue
<template>
  <!-- Default styling -->
  <LinkNode :node="node" />

  <!-- Custom color and underline styling -->
  <LinkNode
    :node="node"
    color="#e11d48"
    :underline-height="3"
    underline-bottom="-4px"
    :animation-duration="1.2"
    :animation-opacity="0.8"
    animation-timing="ease-in-out"
    :show-tooltip="false"
  />
</template>
```

Notes:
- The underline color uses `currentColor`, so by default it matches the `color` prop. If you need an independent underline color, consider a small local CSS override or opening an issue to discuss exposing an `underlineColor` prop.
- All props are optional; when omitted, sensible defaults are used to preserve backward compatibility.

- `showTooltip` defaults to `true`. When enabled, hovering or focusing a link opens the library's singleton tooltip that shows the link href (or title/text). If you prefer the browser's native tooltip instead (or need accessibility behavior relying on `title`), set `:show-tooltip="false"` — the component will expose the link href/title/text via the `title` attribute in that case.

### Override Language Icons

Override how code language icons are resolved via the plugin option `getLanguageIcon`.
This keeps your usage unchanged and centralizes customization.

Plugin usage:

```ts
import { createApp } from 'vue'
import { VueRendererMarkdown } from 'vue-renderer-markdown'
import App from './App.vue'

const app = createApp(App)

// Example 1: replace shell/Shellscript icon with a remote SVG URL
const SHELL_ICON_URL = 'https://raw.githubusercontent.com/catppuccin/vscode-icons/refs/heads/main/icons/mocha/bash.svg'
app.use(VueRendererMarkdown, {
  getLanguageIcon(lang) {
    const l = (lang || '').toLowerCase()
    if (
      l === 'shell'
      || l === 'shellscript'
      || l === 'sh'
      || l === 'bash'
      || l === 'zsh'
      || l === 'powershell'
      || l === 'ps1'
      || l === 'bat'
      || l === 'batch'
    ) {
      return `<img src="${SHELL_ICON_URL}" alt="${l}" />`
    }
    // return empty/undefined to use the library default icon
    return undefined
  },
})
```

Local file example (import inline SVG):

```ts
import { createApp } from 'vue'
import { VueRendererMarkdown } from 'vue-renderer-markdown'
import App from './App.vue'
import JsIcon from './assets/javascript.svg?raw'

const app = createApp(App)

app.use(VueRendererMarkdown, {
  getLanguageIcon(lang) {
    const l = (lang || '').toLowerCase()
    if (l === 'javascript' || l === 'js')
      return JsIcon // inline SVG string
    return undefined
  },
})
```

Notes:
- The resolver returns a raw HTML/SVG string. Returning `undefined`/empty value defers to the built-in mapping.
- Works across all code blocks without changing component usage.
- Alignment: icons render inside a fixed-size slot; both `<svg>` and `<img>` align consistently, no inline styles needed.
- For local files, import with `?raw` and ensure the file is a pure SVG (not an HTML page). Download the raw SVG instead of GitHub’s HTML preview.
- The resolver receives the raw language string (e.g., `tsx:src/components/file.tsx`). The built-in fallback mapping uses only the base segment before `:`.

## Monaco Editor Integration

If you are using Monaco Editor in your project, configure `vite-plugin-monaco-editor-esm` to handle global injection of workers. Our renderer is optimized for streaming updates to large code blocks—when content changes incrementally, only the necessary parts are updated for smooth, responsive rendering. On Windows, you may encounter issues during the build process. To resolve this, configure `customDistPath` to ensure successful packaging.

> Note: If you only need to render a Monaco editor (for editing or previewing code) and don't require this library's full Markdown rendering pipeline, you can integrate Monaco directly using `stream-monaco` for a lighter, more direct integration.

```bash
pnpm add vite-plugin-monaco-editor-esm monaco-editor -d
```

npm equivalent:

```bash
npm install vite-plugin-monaco-editor-esm monaco-editor --save-dev
```

yarn equivalent:

```bash
yarn add vite-plugin-monaco-editor-esm monaco-editor -d
```

### Example Configuration

```ts
import path from 'node:path'
import monacoEditorPlugin from 'vite-plugin-monaco-editor-esm'

export default {
  plugins: [
    monacoEditorPlugin({
      languageWorkers: [
        'editorWorkerService',
        'typescript',
        'css',
        'html',
        'json',
      ],
      customDistPath(root, buildOutDir, base) {
        return path.resolve(buildOutDir, 'monacoeditorwork')
      },
    }),
  ],
}
```

### Tip: Preload Monaco workers for smoother first code-block rendering

If your application uses the Monaco editor for editable code blocks, you can call `getUseMonaco()` during app initialization or on page mount to proactively import `stream-monaco` and preload the required workers. This helps avoid a noticeable delay or flicker when the first `code_block` renders. Example:

```ts
// Call during app init or on page mount
import { getUseMonaco } from './src/components/CodeBlockNode/monaco'

// Trigger dynamic import + preload (failures are handled gracefully)
getUseMonaco()
```

Internally, `getUseMonaco()` will attempt to dynamically import `stream-monaco` and call the library's preload helper to register/load Monaco workers; if the module is unavailable (not installed or during SSR) the function returns `null` and the renderer falls back safely.

### Internationalization / Fallback translations

If you don't want to install or use `vue-i18n`, the library ships with a small synchronous fallback translator used for common UI strings (copy, preview, image loading, etc.). You can replace the default English fallback map with your preferred language by calling `setDefaultI18nMap` at app startup:

```ts
import { setDefaultI18nMap } from 'vue-renderer-markdown'

setDefaultI18nMap({
  'common.copy': '复制',
  'common.copySuccess': '已复制',
  'common.decrease': '减少',
  'common.reset': '重置',
  'common.increase': '增加',
  'common.expand': '展开',
  'common.collapse': '折叠',
  'common.preview': '预览',
  'image.loadError': '图片加载失败',
  'image.loading': '正在加载图片...',
})
```

This is purely optional — if you do install `vue-i18n`, the library will prefer it at runtime and use the real translations provided by your i18n setup.
## Code block header customization

The code block component now exposes a flexible header API so consumers can:

- Toggle the entire header on/off.
- Show or hide built-in toolbar buttons (copy, expand, preview, font-size controls).
- Fully replace the left or right header content via named slots.

This makes it easy to adapt the header to your application's UX or to inject custom controls.

Props (new)

| Name | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `showHeader` | `boolean` | `true` | Toggle rendering of the header bar. |
| `showCopyButton` | `boolean` | `true` | Show the built-in copy button. |
| `showExpandButton` | `boolean` | `true` | Show the built-in expand/collapse button. |
| `showPreviewButton` | `boolean` | `true` | Show the built-in preview button (when preview is available). |
| `showFontSizeButtons` | `boolean` | `true` | Show the built-in font-size controls (also requires `enableFontSizeControl`). |

Slots

- `header-left` — Replace the left side of the header (language icon + label by default).
- `header-right` — Replace the right side of the header (built-in action buttons by default).
- `loading` — Customize the loading placeholder shown when `stream={false}` and `loading={true}`. Receives slot props: `{ loading: boolean, stream: boolean }`.

Example: hide the header

```vue
<CodeBlockNode
  :node="{ type: 'code_block', language: 'javascript', code: 'console.log(1)', raw: 'console.log(1)' }"
  :showHeader="false"
  :loading="false"
/>
```

Example: custom header via slots

```vue
<CodeBlockNode
  :node="{ type: 'code_block', language: 'html', code: '<div>Hello</div>', raw: '<div>Hello</div>' }"
  :loading="false"
  :showCopyButton="false"
>
  <template #header-left>
    <div class="flex items-center space-x-2">
      <!-- custom icon or label -->
      <span class="text-sm font-medium">My HTML</span>
    </div>
  </template>

  <template #header-right>
    <div class="flex items-center space-x-2">
      <button class="px-2 py-1 bg-blue-600 text-white rounded">Run</button>
      <button class="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">Inspect</button>
    </div>
  </template>
</CodeBlockNode>
```

Example: custom loading placeholder

```vue
<CodeBlockNode
  :node="{ type: 'code_block', language: 'python', code: code, raw: code }"
  :stream="false"
  :loading="isLoading"
>
  <template #loading="{ loading, stream }">
    <div v-if="loading && !stream" class="p-4 text-center">
      <div class="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full" />
      <p class="mt-2 text-sm text-gray-500">Initializing editor...</p>
    </div>
  </template>
</CodeBlockNode>
```

Notes

- The new `showFontSizeButtons` prop provides an additional toggle; the existing `enableFontSizeControl` prop still controls whether the font-size feature is enabled at all. Keep both in mind when hiding/showing font controls.
- Existing behavior is unchanged by default — all new props default to `true` to preserve the original UI.

This configuration ensures that Monaco Editor workers are correctly packaged and accessible in your project.

### Webpack — monaco-editor-webpack-plugin

If your project uses Webpack instead of Vite, you can use the official `monaco-editor-webpack-plugin` to bundle and inject Monaco's worker files. Here's a minimal example for Webpack 5:

Install:

```bash
# pnpm (dev)
pnpm add -D monaco-editor monaco-editor-webpack-plugin
```

```bash
# npm (dev)
npm install --save-dev monaco-editor monaco-editor-webpack-plugin
```

```bash
# yarn (dev)
yarn add -D monaco-editor monaco-editor-webpack-plugin
```

Note: `pnpm add -D` and `yarn add -D` are equivalent to `npm install --save-dev` and install the packages as development dependencies.

Example `webpack.config.js`:

```js
const path = require('node:path')
const MonacoEditorPlugin = require('monaco-editor-webpack-plugin')

module.exports = {
  // ...your other config...
  output: {
    // Ensure worker files are placed correctly; adjust publicPath/filename as needed
    publicPath: '/',
  },
  plugins: [
    new MonacoEditorPlugin({
      // Limit to required languages/features to reduce bundle size
      languages: ['javascript', 'typescript', 'css', 'html', 'json'],
      // Optional: customize worker filename pattern
      filename: 'static/[name].worker.js',
    }),
  ],
}
```

Notes:
- For projects using `monaco-editor`, make sure the plugin handles the workers; otherwise the browser will try to load missing worker files at runtime (similar to Vite dep optimizer issues).
- If you see "file does not exist" errors after building (for example some workers are missing from the optimized deps directory), ensure the worker files are packaged into an accessible location via the plugin or build output.

## Mermaid: Progressive Rendering Example

Mermaid diagrams can be streamed progressively. The diagram renders as soon as the syntax becomes valid and refines as more content arrives.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import MarkdownRender from 'vue-renderer-markdown'

const content = ref('')
const steps = [
  '```mermaid\n',
  'graph TD\n',
  'A[Start]-->B{Is valid?}\n',
  'B -- Yes --> C[Render]\n',
  'B -- No  --> D[Wait]\n',
  '```\n',
]

let i = 0
const id = setInterval(() => {
  content.value += steps[i] || ''
  i++
  if (i >= steps.length)
    clearInterval(id)
}, 120)
</script>

<template>
  <MarkdownRender :content="content" />
  <!-- Diagram progressively appears as content streams in -->
  <!-- Mermaid must be installed as a peer dependency -->
</template>
```

## Tailwind (e.g. shadcn) — fix style ordering issues

If your project uses a Tailwind component library like shadcn you may run into style ordering/override issues. We recommend importing the library CSS into a controlled Tailwind layer in your global stylesheet. For example, in your main stylesheet (e.g. `src/styles/index.css` or `src/main.css`):

```css
/* main.css or index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Recommended: place library styles into the components layer so your app components can override them */
@layer components {
  @import 'vue-renderer-markdown/index.css';
}

/* Alternative: place into the base layer if you want the library styles to be more foundational and harder to override:
@layer base {
  @import 'vue-renderer-markdown/index.css';
}
*/
```

Pick `components` (common) or `base` (when you want library styles to be more foundational) based on your desired override priority. After changing, run your dev/build command (e.g. `pnpm dev`) to verify the stylesheet ordering.

## Troubleshooting

### Monaco Editor workers not found

**Symptom:** Console errors like `Could not load worker` or `Failed to load Monaco worker` in production builds.

**Solution:** Configure `vite-plugin-monaco-editor-esm` in your `vite.config.ts`:

```ts
import path from 'node:path'
import monacoEditorPlugin from 'vite-plugin-monaco-editor-esm'

export default {
  plugins: [
    monacoEditorPlugin({
      languageWorkers: ['editorWorkerService', 'typescript', 'css', 'html', 'json'],
      customDistPath(root, buildOutDir, base) {
        return path.resolve(buildOutDir, 'monacoeditorwork')
      },
    }),
  ],
}
```

See the [Monaco Editor Integration](#monaco-editor-integration) section for more details.

### Mermaid diagrams not rendering

**Symptom:** Code blocks with `mermaid` language show plain text instead of rendered diagrams.

**Solutions:**

1. Install the `mermaid` peer dependency:
   ```bash
   pnpm add mermaid
   ```

2. Ensure your code block syntax is valid Mermaid:
   ````markdown
   ```mermaid
   graph TD
     A[Start] --> B[End]
   ```
   ````

3. Check the browser console for Mermaid errors. The library shows the source text if Mermaid rendering fails.

### Syntax highlighting not working with MarkdownCodeBlockNode

**Symptom:** Code blocks show plain text without syntax highlighting when using `MarkdownCodeBlockNode`.

**Solution:** Install the required peers for `MarkdownCodeBlockNode`:

```bash
pnpm add stream-markdown shiki
```

### TypeScript errors about missing types

**Symptom:** TypeScript errors like `Cannot find module 'vue-renderer-markdown'` or missing type definitions.

**Solutions:**

1. Import types from the correct path:
   ```ts
   import type { BaseNode, CodeBlockNode } from 'vue-renderer-markdown'
   ```

2. For specific type definitions:
   ```ts
   import type { MarkdownRenderProps } from 'vue-renderer-markdown/dist/types'
   ```

3. Ensure `moduleResolution` in `tsconfig.json` is set to `"bundler"` or `"node16"`:
   ```json
   {
     "compilerOptions": {
       "moduleResolution": "bundler"
     }
   }
   ```

### Tailwind CSS styles are conflicting

**Symptom:** Component styles are overridden by Tailwind utility classes or vice versa.

**Solution:** Import library CSS into a Tailwind layer in your main stylesheet:

```css
/* main.css or index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  @import 'vue-renderer-markdown/index.css';
}
```

See the [Tailwind section](#tailwind-eg-shadcn--fix-style-ordering-issues) for more details.

### SSR: "window is not defined" errors

**Symptom:** Errors like `ReferenceError: window is not defined` during server-side rendering.

**Solutions:**

1. **Nuxt 3**: Wrap component in `<client-only>`:
   ```vue
   <template>
     <client-only>
       <MarkdownRender :content="markdown" />
     </client-only>
   </template>
   ```

2. **Vite SSR**: Use a client-only wrapper with lifecycle hooks:
   ```vue
   <script setup lang="ts">
   import { onMounted, ref } from 'vue'
   import MarkdownRender from 'vue-renderer-markdown'

   const mounted = ref(false)
   onMounted(() => {
     mounted.value = true
   })
   </script>

   <template>
     <div v-if="mounted">
       <MarkdownRender :content="markdown" />
     </div>
     <div v-else>
       <!-- SSR fallback: lightweight preformatted text -->
       <pre>{{ markdown }}</pre>
     </div>
   </template>
   ```

3. See the [SSR section](#server-side-rendering-ssr) for complete setup guides.

### Icons not showing

**Symptom:** Toolbar buttons show fallback elements instead of icons.

**Solutions:**

1. Ensure you are importing the library styles (`import 'vue-renderer-markdown/index.css'`).
2. Confirm your bundler includes static asset imports (SVG files) from dependencies.
3. If you override icon components, verify your custom replacements render the expected SVG output.

### Performance issues with large documents

**Symptoms:** Slow rendering, high memory usage, or UI lag with large Markdown files (>10k lines).

**Solutions:**

1. **Use streaming rendering** to update content incrementally instead of replacing the entire content at once.

2. **Enable pre-rendering for code blocks** if you don't need the Monaco editor:
   ```vue
   <MarkdownRender :content="markdown" :render-code-blocks-as-pre="true" />
   ```

3. **Limit Mermaid diagram complexity** or consider pre-rendering complex diagrams server-side.

4. **Use `MarkdownCodeBlockNode`** instead of `CodeBlockNode` for lighter syntax highlighting:
   ```ts
   import { MarkdownCodeBlockNode, setCustomComponents } from 'vue-renderer-markdown'

   setCustomComponents({
     code_block: MarkdownCodeBlockNode
   })
   ```

### Math formulas not rendering correctly

**Symptom:** Math formulas show raw LaTeX or render incorrectly.

**Solutions:**

1. LaTeX math rendering is optional and requires `katex` to be installed by the host application. If you need math rendering, install `katex` and import its stylesheet (see the "Important Notes" above). Ensure you're using valid LaTeX syntax:
  - Inline math: `$a^2 + b^2 = c^2$`
  - Block math: `$$\int_0^\infty e^{-x^2} dx$$`

2. For advanced customization, configure math options:
   ```ts
   import { setDefaultMathOptions } from 'vue-renderer-markdown'

   setDefaultMathOptions({
     commands: ['infty', 'perp', 'alpha'],
     escapeExclamation: true
   })
   ```

3. See the [Math rendering options](#math-rendering-options) section for detailed configuration.

### Still having issues?

- Check the [GitHub Issues](https://github.com/Simon-He95/vue-markdown-render/issues) to see if someone else has encountered the same problem
- [Open a new issue](https://github.com/Simon-He95/vue-markdown-render/issues/new) with:
  - Your environment (Node version, framework, bundler)
  - Minimal reproduction code
  - Console errors or screenshots
  - Steps to reproduce the issue

## Thanks

This project is built with the help of these awesome libraries:

- [stream-monaco](https://github.com/Simon-He95/stream-monaco) — A framework-agnostic library for integrating Monaco Editor with Shiki highlighting, optimized for streaming updates
- [stream-markdown](https://github.com/Simon-He95/stream-markdown) — Streaming code/markdown highlighter utilities (Shiki-based)
- [mermaid](https://mermaid-js.github.io/mermaid) — Diagramming and charting tool that uses Markdown-inspired syntax
- [shiki](https://github.com/shikijs/shiki) — Syntax highlighter powered by TextMate grammars and VS Code themes

Thanks to the authors and contributors of these projects!

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Simon-He95/vue-markdown-render&type=Date)](https://www.star-history.com/#Simon-He95/vue-markdown-render&Date)

## License

[MIT](./LICENSE) © [Simon He](https://github.com/Simon-He95)
