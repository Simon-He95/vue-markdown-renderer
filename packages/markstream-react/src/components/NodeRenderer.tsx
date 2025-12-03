import React, { useMemo } from 'react'
import type { ParsedNode } from 'stream-markdown-parser'
import { getMarkdown, parseMarkdownToStructure } from 'stream-markdown-parser'
import { renderNode } from '../renderers/renderNode'
import type { NodeRendererProps, RenderContext } from '../types'

const DEFAULT_PROPS: Required<Pick<NodeRendererProps,
  'codeBlockStream'
  | 'typewriter'
  | 'batchRendering'
  | 'initialRenderBatchSize'
  | 'renderBatchSize'
  | 'renderBatchDelay'
  | 'renderBatchBudgetMs'
  | 'renderBatchIdleTimeoutMs'
  | 'deferNodesUntilVisible'
  | 'maxLiveNodes'
  | 'liveNodeBuffer'
>> = {
  codeBlockStream: true,
  typewriter: true,
  batchRendering: true,
  initialRenderBatchSize: 40,
  renderBatchSize: 80,
  renderBatchDelay: 16,
  renderBatchBudgetMs: 6,
  renderBatchIdleTimeoutMs: 120,
  deferNodesUntilVisible: true,
  maxLiveNodes: 320,
  liveNodeBuffer: 60,
}

const fallbackMarkdown = getMarkdown()

export const NodeRenderer: React.FC<NodeRendererProps> = (rawProps) => {
  const props = { ...DEFAULT_PROPS, ...rawProps }
  const mdInstance = useMemo(() => {
    const base = getMarkdown()
    return props.customMarkdownIt ? props.customMarkdownIt(base) : base
  }, [props.customMarkdownIt])

  const parsedNodes = useMemo<ParsedNode[]>(() => {
    if (Array.isArray(props.nodes) && props.nodes.length)
      return (props.nodes as ParsedNode[]).map(node => ({ ...node }))
    if (props.content)
      return parseMarkdownToStructure(props.content, mdInstance ?? fallbackMarkdown, props.parseOptions)
    return []
  }, [props.content, props.nodes, props.parseOptions, mdInstance])

  const indexPrefix = useMemo(() => {
    return props.indexKey != null ? String(props.indexKey) : 'markdown-renderer'
  }, [props.indexKey])

  const renderCtx = useMemo<RenderContext>(() => ({
    customId: props.customId,
    isDark: props.isDark,
    indexKey: indexPrefix,
    renderCodeBlocksAsPre: props.renderCodeBlocksAsPre,
    codeBlockStream: props.codeBlockStream,
    codeBlockProps: props.codeBlockProps,
    codeBlockThemes: {
      themes: props.themes,
      darkTheme: props.codeBlockDarkTheme,
      lightTheme: props.codeBlockLightTheme,
      monacoOptions: props.codeBlockMonacoOptions,
      minWidth: props.codeBlockMinWidth,
      maxWidth: props.codeBlockMaxWidth,
    },
    events: {
      onCopy: props.onCopy,
      onHandleArtifactClick: props.onHandleArtifactClick,
    },
  }), [
    props.customId,
    props.isDark,
    indexPrefix,
    props.renderCodeBlocksAsPre,
    props.codeBlockStream,
    props.codeBlockProps,
    props.themes,
    props.codeBlockDarkTheme,
    props.codeBlockLightTheme,
    props.codeBlockMonacoOptions,
    props.codeBlockMinWidth,
    props.codeBlockMaxWidth,
    props.onCopy,
    props.onHandleArtifactClick,
  ])

  const handleMouseEvent = (cb?: (event: React.MouseEvent<HTMLElement>) => void) => {
    return (event: React.MouseEvent<HTMLElement>) => {
      if (!cb)
        return
      const target = event.target as HTMLElement | null
      if (!target?.closest('[data-node-index]'))
        return
      cb(event)
    }
  }

  return (
    <div
      className="markdown-renderer"
      onClick={props.onClick}
      onMouseOver={handleMouseEvent(props.onMouseOver)}
      onMouseOut={handleMouseEvent(props.onMouseOut)}
    >
      {parsedNodes.map((node, index) => (
        <div key={`${indexPrefix}-${index}`} className="node-slot" data-node-index={index}>
          {renderNode(node, `${indexPrefix}-${index}`, renderCtx)}
        </div>
      ))}
    </div>
  )
}

export default NodeRenderer
