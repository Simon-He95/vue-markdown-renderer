import type React from 'react'
import type { BaseNode, MarkdownIt, ParsedNode, ParseOptions } from 'stream-markdown-parser'

export interface NodeRendererProps {
  content?: string
  nodes?: BaseNode[]
  parseOptions?: ParseOptions
  customMarkdownIt?: (md: MarkdownIt) => MarkdownIt
  viewportPriority?: boolean
  codeBlockStream?: boolean
  codeBlockDarkTheme?: any
  codeBlockLightTheme?: any
  codeBlockMonacoOptions?: Record<string, any>
  renderCodeBlocksAsPre?: boolean
  codeBlockMinWidth?: string | number
  codeBlockMaxWidth?: string | number
  codeBlockProps?: Record<string, any>
  themes?: string[]
  isDark?: boolean
  customId?: string
  indexKey?: number | string
  typewriter?: boolean
  batchRendering?: boolean
  initialRenderBatchSize?: number
  renderBatchSize?: number
  renderBatchDelay?: number
  renderBatchBudgetMs?: number
  renderBatchIdleTimeoutMs?: number
  deferNodesUntilVisible?: boolean
  maxLiveNodes?: number
  liveNodeBuffer?: number
  onCopy?: (payload: any) => void
  onHandleArtifactClick?: (payload: any) => void
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void
  onMouseOver?: (event: React.MouseEvent<HTMLElement>) => void
  onMouseOut?: (event: React.MouseEvent<HTMLElement>) => void
}

export interface RenderContext {
  customId?: string
  isDark?: boolean
  indexKey?: string
  codeBlockProps?: Record<string, any>
  codeBlockStream?: boolean
  renderCodeBlocksAsPre?: boolean
  codeBlockThemes?: {
    themes?: string[]
    darkTheme?: any
    lightTheme?: any
    monacoOptions?: Record<string, any>
    minWidth?: string | number
    maxWidth?: string | number
  }
  events: {
    onCopy?: (payload: any) => void
    onHandleArtifactClick?: (payload: any) => void
  }
}

export type RenderNodeFn = (node: ParsedNode, key: React.Key, ctx: RenderContext) => React.ReactNode
