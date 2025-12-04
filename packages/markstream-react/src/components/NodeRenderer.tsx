import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ParsedNode } from 'stream-markdown-parser'
import { getMarkdown, parseMarkdownToStructure } from 'stream-markdown-parser'
import { renderNode } from '../renderers/renderNode'
import type { NodeRendererProps, RenderContext } from '../types'
import { ViewportPriorityProvider, useViewportPriority } from '../context/viewportPriority'
import type { VisibilityHandle } from '../context/viewportPriority'

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

type ResolvedProps = NodeRendererProps & typeof DEFAULT_PROPS

interface IdleDeadlineLike {
  timeRemaining?: () => number
}

interface NodeRendererInnerProps {
  props: ResolvedProps
  parsedNodes: ParsedNode[]
  renderCtx: RenderContext
  indexPrefix: string
  containerRef: React.RefObject<HTMLDivElement | null>
}

const DEFAULT_NODE_HEIGHT = 32

const NodeRendererInner: React.FC<NodeRendererInnerProps> = ({
  props,
  parsedNodes,
  renderCtx,
  indexPrefix,
  containerRef,
}) => {
  const registerNodeVisibility = useViewportPriority()
  const isClient = typeof window !== 'undefined'
  const hasIdleCallback = typeof window !== 'undefined' && typeof (window as any).requestIdleCallback === 'function'
  const resolvedBatchSize = Math.max(0, Math.trunc(props.renderBatchSize ?? 80))
  const resolvedInitialBatch = Math.max(
    0,
    Math.trunc(props.initialRenderBatchSize ?? (resolvedBatchSize || parsedNodes.length)),
  )
  const batchingEnabled = props.batchRendering !== false && resolvedBatchSize > 0 && isClient
  const virtualizationEnabled = (props.maxLiveNodes ?? 0) > 0
  const liveNodeBufferResolved = Math.max(0, props.liveNodeBuffer ?? 60)
  const maxLiveNodesResolved = Math.max(1, props.maxLiveNodes ?? 320)
  const deferNodes = props.deferNodesUntilVisible !== false && props.viewportPriority !== false

  const [renderedCount, setRenderedCount] = useState(() => {
    if (!batchingEnabled)
      return parsedNodes.length
    return Math.min(parsedNodes.length, resolvedInitialBatch)
  })
  const renderedCountRef = useRef(renderedCount)
  useEffect(() => {
    renderedCountRef.current = renderedCount
  }, [renderedCount])

  const [focusIndex, setFocusIndex] = useState(0)
  const [liveRange, setLiveRange] = useState({ start: 0, end: parsedNodes.length })
  const nodeHeightsRef = useRef(new Map<number, number>())
  const [heightsVersion, setHeightsVersion] = useState(0)
  const nodeVisibilityStateRef = useRef<Record<number, boolean>>({})
  const nodeVisibilityHandlesRef = useRef(new Map<number, VisibilityHandle>())
  const nodeSlotElementsRef = useRef(new Map<number, HTMLElement | null>())
  const nodeSeenRef = useRef(new Set<number>())
  const prevRenderedRef = useRef(renderedCount)
  const batchRafRef = useRef<number | null>(null)
  const batchTimeoutRef = useRef<number | null>(null)
  const batchIdleRef = useRef<number | null>(null)
  const batchPendingRef = useRef(false)
  const pendingIncrementRef = useRef<number | null>(null)
  const adaptiveBatchSizeRef = useRef(Math.max(1, resolvedBatchSize || 1))
  const desiredRenderedCountRef = useRef(parsedNodes.length)
  const previousDatasetRef = useRef<{ key: typeof props.indexKey, total: number }>({
    key: props.indexKey,
    total: parsedNodes.length,
  })
  const previousBatchConfigRef = useRef({
    batchSize: resolvedBatchSize,
    initial: resolvedInitialBatch,
    delay: props.renderBatchDelay ?? 16,
    enabled: batchingEnabled,
  })

  const renderLimit = Math.min(renderedCount, parsedNodes.length)
  const shouldObserveSlots = deferNodes || virtualizationEnabled

  const averageNodeHeight = useMemo(() => {
    const map = nodeHeightsRef.current
    if (!map.size)
      return DEFAULT_NODE_HEIGHT
    let total = 0
    for (const height of map.values())
      total += height
    return Math.max(16, total / map.size)
  }, [heightsVersion])

  const visibleNodes = useMemo(() => {
    if (!virtualizationEnabled)
      return parsedNodes.map((node, index) => ({ node, index }))
    const total = parsedNodes.length
    const start = Math.max(0, Math.min(liveRange.start, total))
    const end = Math.max(start, Math.min(liveRange.end, total))
    return parsedNodes.slice(start, end).map((node, idx) => ({
      node,
      index: start + idx,
    }))
  }, [parsedNodes, liveRange, virtualizationEnabled])

  const desiredRenderedCount = useMemo(() => {
    if (!virtualizationEnabled)
      return parsedNodes.length
    const overscanEnd = Math.max(liveRange.end + liveNodeBufferResolved, resolvedInitialBatch)
    const target = Math.min(parsedNodes.length, overscanEnd)
    return Math.max(renderedCount, target)
  }, [
    parsedNodes.length,
    virtualizationEnabled,
    liveRange.end,
    liveNodeBufferResolved,
    resolvedInitialBatch,
    renderedCount,
  ])
  desiredRenderedCountRef.current = desiredRenderedCount

  const estimateHeightRange = useCallback((start: number, end: number) => {
    if (start >= end)
      return 0
    const map = nodeHeightsRef.current
    let total = 0
    for (let i = start; i < end; i++)
      total += map.get(i) ?? averageNodeHeight
    return total
  }, [averageNodeHeight])

  const topSpacerHeight = virtualizationEnabled
    ? estimateHeightRange(0, Math.min(liveRange.start, parsedNodes.length))
    : 0
  const bottomSpacerHeight = virtualizationEnabled
    ? estimateHeightRange(Math.min(liveRange.end, parsedNodes.length), parsedNodes.length)
    : 0

  const cancelBatchTimers = useCallback(() => {
    if (batchRafRef.current != null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(batchRafRef.current)
      batchRafRef.current = null
    }
    if (batchTimeoutRef.current != null) {
      window.clearTimeout(batchTimeoutRef.current)
      batchTimeoutRef.current = null
    }
    if (batchIdleRef.current != null && typeof (window as any).cancelIdleCallback === 'function') {
      ;(window as any).cancelIdleCallback(batchIdleRef.current)
      batchIdleRef.current = null
    }
    batchPendingRef.current = false
    pendingIncrementRef.current = null
  }, [])

  const adjustAdaptiveBatchSize = useCallback((elapsed: number) => {
    if (!batchingEnabled)
      return
    const budget = Math.max(2, props.renderBatchBudgetMs ?? 6)
    const maxSize = Math.max(1, resolvedBatchSize || 1)
    const minSize = Math.max(1, Math.floor(maxSize / 4))
    if (elapsed > budget * 1.2)
      adaptiveBatchSizeRef.current = Math.max(minSize, Math.floor(adaptiveBatchSizeRef.current * 0.7))
    else if (elapsed < budget * 0.5 && adaptiveBatchSizeRef.current < maxSize)
      adaptiveBatchSizeRef.current = Math.min(maxSize, Math.ceil(adaptiveBatchSizeRef.current * 1.2))
  }, [batchingEnabled, props.renderBatchBudgetMs, resolvedBatchSize])

  const scheduleBatch = useCallback((increment: number, opts: { immediate?: boolean } = {}) => {
    if (!batchingEnabled)
      return
    const target = desiredRenderedCountRef.current
    if (renderedCountRef.current >= target)
      return
    const amount = Math.max(1, increment)
    const applyIncrement = (size: number) => {
      const start = typeof performance !== 'undefined' ? performance.now() : Date.now()
      setRenderedCount((prev) => {
        const next = Math.min(desiredRenderedCountRef.current, prev + Math.max(1, size))
        renderedCountRef.current = next
        return next
      })
      const end = typeof performance !== 'undefined' ? performance.now() : Date.now()
      adjustAdaptiveBatchSize(end - start)
    }
    const queueNextBatch = () => {
      const dynamicSize = Math.max(1, Math.round(adaptiveBatchSizeRef.current))
      scheduleBatch(dynamicSize)
    }
    const run = (deadline?: IdleDeadlineLike) => {
      batchRafRef.current = null
      batchTimeoutRef.current = null
      batchIdleRef.current = null
      batchPendingRef.current = false
      const pending = pendingIncrementRef.current
      pendingIncrementRef.current = null
      const initialSize = pending != null ? pending : amount
      applyIncrement(initialSize)
      if (renderedCountRef.current >= desiredRenderedCountRef.current)
        return
      if (!deadline) {
        queueNextBatch()
        return
      }
      const budget = Math.max(2, props.renderBatchBudgetMs ?? 6)
      while (renderedCountRef.current < desiredRenderedCountRef.current) {
        const remaining = typeof deadline.timeRemaining === 'function' ? deadline.timeRemaining() : 0
        if (remaining <= budget * 0.5)
          break
        applyIncrement(Math.max(1, Math.round(adaptiveBatchSizeRef.current)))
      }
      if (renderedCountRef.current < desiredRenderedCountRef.current)
        queueNextBatch()
    }

    if (!isClient || opts.immediate) {
      run()
      return
    }
    const delay = Math.max(0, props.renderBatchDelay ?? 16)
    pendingIncrementRef.current = pendingIncrementRef.current != null
      ? Math.max(pendingIncrementRef.current, amount)
      : amount
    if (batchPendingRef.current)
      return
    batchPendingRef.current = true
    if (hasIdleCallback) {
      const timeout = Math.max(0, props.renderBatchIdleTimeoutMs ?? 120)
      batchIdleRef.current = (window as any).requestIdleCallback((deadline: IdleDeadlineLike) => run(deadline), { timeout })
      return
    }
    if (typeof requestAnimationFrame !== 'function') {
      batchTimeoutRef.current = window.setTimeout(() => run(), delay)
      return
    }
    batchRafRef.current = requestAnimationFrame(() => {
      if (delay === 0) {
        run()
        return
      }
      batchTimeoutRef.current = window.setTimeout(() => run(), delay)
    })
  }, [
    adjustAdaptiveBatchSize,
    batchingEnabled,
    hasIdleCallback,
    isClient,
    props.renderBatchDelay,
    props.renderBatchBudgetMs,
    props.renderBatchIdleTimeoutMs,
  ])

  useEffect(() => {
    const datasetKey = props.indexKey
    const total = parsedNodes.length
    const prevCtx = previousDatasetRef.current
    const datasetChanged = datasetKey !== undefined
      ? datasetKey !== prevCtx.key
      : total !== prevCtx.total
    previousDatasetRef.current = { key: datasetKey, total }
    const prevBatch = previousBatchConfigRef.current
    const currentDelay = props.renderBatchDelay ?? 16
    const batchConfigChanged
      = prevBatch.batchSize !== resolvedBatchSize
        || prevBatch.initial !== resolvedInitialBatch
        || prevBatch.delay !== currentDelay
        || prevBatch.enabled !== batchingEnabled
    previousBatchConfigRef.current = {
      batchSize: resolvedBatchSize,
      initial: resolvedInitialBatch,
      delay: currentDelay,
      enabled: batchingEnabled,
    }

    if (datasetChanged || batchConfigChanged || !batchingEnabled)
      cancelBatchTimers()
    if (datasetChanged || batchConfigChanged) {
      adaptiveBatchSizeRef.current = Math.max(1, resolvedBatchSize || 1)
      nodeSeenRef.current.clear()
    }

    if (!total) {
      renderedCountRef.current = 0
      setRenderedCount(0)
      return
    }

    const target = desiredRenderedCountRef.current

    if (!batchingEnabled) {
      renderedCountRef.current = target
      setRenderedCount(target)
      return
    }

    if (datasetChanged || batchConfigChanged) {
      const initial = Math.min(target, resolvedInitialBatch)
      renderedCountRef.current = initial
      setRenderedCount(initial)
      if (initial < target)
        scheduleBatch(Math.max(1, resolvedInitialBatch), { immediate: !isClient })
      return
    }

    const capped = Math.min(renderedCountRef.current, target)
    if (capped !== renderedCountRef.current) {
      renderedCountRef.current = capped
      setRenderedCount(capped)
    }
    if (renderedCountRef.current < target)
      scheduleBatch(Math.max(1, resolvedBatchSize || 1))
  }, [
    batchingEnabled,
    cancelBatchTimers,
    isClient,
    parsedNodes.length,
    props.indexKey,
    props.renderBatchDelay,
    resolvedBatchSize,
    resolvedInitialBatch,
    scheduleBatch,
  ])

  useEffect(() => {
    if (!virtualizationEnabled) {
      setLiveRange({ start: 0, end: parsedNodes.length })
      return
    }
    const total = parsedNodes.length
    if (!total) {
      setLiveRange({ start: 0, end: 0 })
      return
    }
    const focus = Math.max(0, Math.min(focusIndex, total - 1))
    let start = Math.max(0, focus - liveNodeBufferResolved)
    let end = Math.min(total, focus + liveNodeBufferResolved + 1)
    const size = end - start
    if (size > maxLiveNodesResolved) {
      const excess = size - maxLiveNodesResolved
      start += Math.ceil(excess / 2)
      end -= Math.floor(excess / 2)
    }
    else if (size < maxLiveNodesResolved) {
      const missing = maxLiveNodesResolved - size
      start = Math.max(0, start - Math.ceil(missing / 2))
      end = Math.min(total, end + Math.floor(missing / 2))
    }
    setLiveRange({ start, end })
  }, [focusIndex, liveNodeBufferResolved, maxLiveNodesResolved, parsedNodes.length, virtualizationEnabled])

  useEffect(() => {
    return () => {
      cancelBatchTimers()
      for (const handle of nodeVisibilityHandlesRef.current.values())
        handle.destroy()
      nodeVisibilityHandlesRef.current.clear()
    }
  }, [cancelBatchTimers])

  const cleanupAfterTruncate = useCallback((limit: number) => {
    for (const [index, handle] of nodeVisibilityHandlesRef.current.entries()) {
      if (index >= limit) {
        handle.destroy()
        nodeVisibilityHandlesRef.current.delete(index)
        delete nodeVisibilityStateRef.current[index]
        nodeSlotElementsRef.current.delete(index)
      }
    }
  }, [])

  useEffect(() => {
    cleanupAfterTruncate(renderLimit)
  }, [cleanupAfterTruncate, renderLimit])

  useEffect(() => {
    const total = parsedNodes.length
    let changed = false
    for (const key of Array.from(nodeHeightsRef.current.keys())) {
      if (key >= total) {
        nodeHeightsRef.current.delete(key)
        changed = true
      }
    }
    if (changed)
      setHeightsVersion(v => v + 1)
    for (const key of Object.keys(nodeVisibilityStateRef.current)) {
      if (Number(key) >= total)
        delete nodeVisibilityStateRef.current[key]
    }
    for (const index of Array.from(nodeSeenRef.current)) {
      if (index >= total)
        nodeSeenRef.current.delete(index)
    }
  }, [parsedNodes.length])

  const markNodeVisible = useCallback((index: number, visible: boolean) => {
    if (deferNodes && visible)
      nodeVisibilityStateRef.current[index] = true
    if (visible && virtualizationEnabled) {
      setFocusIndex((prev) => (index > prev ? index : prev))
    }
  }, [deferNodes, virtualizationEnabled])

  const destroyNodeHandle = useCallback((index: number) => {
    const handle = nodeVisibilityHandlesRef.current.get(index)
    if (handle) {
      handle.destroy()
      nodeVisibilityHandlesRef.current.delete(index)
    }
  }, [])

  const setNodeSlotElement = useCallback((index: number, el: HTMLElement | null) => {
    const slots = nodeSlotElementsRef.current
    if (el)
      slots.set(index, el)
    else
      slots.delete(index)

    if (!shouldObserveSlots || !el) {
      destroyNodeHandle(index)
      if (deferNodes && !el)
        delete nodeVisibilityStateRef.current[index]
      if (el)
        markNodeVisible(index, true)
      return
    }

    if (index < resolvedInitialBatch && !virtualizationEnabled) {
      destroyNodeHandle(index)
      markNodeVisible(index, true)
      return
    }

    destroyNodeHandle(index)
    const handle = registerNodeVisibility(el, { rootMargin: '400px' })
    nodeVisibilityHandlesRef.current.set(index, handle)
    if (handle.isVisible())
      markNodeVisible(index, true)
    handle.whenVisible.then(() => markNodeVisible(index, true)).catch(() => {})
  }, [
    deferNodes,
    destroyNodeHandle,
    markNodeVisible,
    registerNodeVisibility,
    resolvedInitialBatch,
    shouldObserveSlots,
    virtualizationEnabled,
  ])

  const setNodeContentRef = useCallback((index: number, el: HTMLDivElement | null) => {
    if (!el) {
      if (nodeHeightsRef.current.has(index)) {
        nodeHeightsRef.current.delete(index)
        setHeightsVersion(v => v + 1)
      }
      return
    }
    const measure = () => {
      const height = el.offsetHeight
      if (!height)
        return
      const prev = nodeHeightsRef.current.get(index)
      if (prev !== height) {
        nodeHeightsRef.current.set(index, height)
        setHeightsVersion(v => v + 1)
      }
    }
    if (typeof queueMicrotask === 'function')
      queueMicrotask(measure)
    else
      Promise.resolve().then(measure)
  }, [])

  const shouldRenderNode = useCallback((index: number) => {
    if (index >= renderLimit)
      return false
    if (!deferNodes)
      return true
    if (index < resolvedInitialBatch)
      return true
    return nodeVisibilityStateRef.current[index] === true
  }, [deferNodes, renderLimit, resolvedInitialBatch])

  const handleMouseEvent = useCallback((cb?: (event: React.MouseEvent<HTMLElement>) => void) => {
    return (event: React.MouseEvent<HTMLElement>) => {
      if (!cb)
        return
      const target = event.target as HTMLElement | null
      if (!target?.closest('[data-node-index]'))
        return
      cb(event)
    }
  }, [])

  useEffect(() => {
    for (const [index, el] of nodeSlotElementsRef.current.entries()) {
      if (el)
        setNodeSlotElement(index, el)
    }
  }, [setNodeSlotElement])

  useEffect(() => {
    if (virtualizationEnabled && renderedCount > prevRenderedRef.current)
      setFocusIndex(renderedCount - 1)
    prevRenderedRef.current = renderedCount
  }, [renderedCount, virtualizationEnabled])

  const topSpacer = virtualizationEnabled
    ? <div className="node-spacer" style={{ height: `${topSpacerHeight}px` }} aria-hidden="true" />
    : null
  const bottomSpacer = virtualizationEnabled
    ? <div className="node-spacer" style={{ height: `${bottomSpacerHeight}px` }} aria-hidden="true" />
    : null

  return (
    <div
      ref={containerRef}
      className="markdown-renderer"
      onClick={props.onClick}
      onMouseOver={handleMouseEvent(props.onMouseOver)}
      onMouseOut={handleMouseEvent(props.onMouseOut)}
    >
      {topSpacer}
      {visibleNodes.map(({ node, index }) => {
        const canRender = shouldRenderNode(index)
        const placeholderHeight = nodeHeightsRef.current.get(index) ?? averageNodeHeight
        const shouldAnimate = props.typewriter !== false
          && node.type !== 'code_block'
          && !nodeSeenRef.current.has(index)
          && canRender
        if (shouldAnimate)
          nodeSeenRef.current.add(index)
        return (
          <div
            key={`${indexPrefix}-${index}`}
            ref={el => setNodeSlotElement(index, el)}
            className="node-slot"
            data-node-index={index}
            data-node-type={node.type}
          >
            {canRender ? (
              <div
                ref={el => setNodeContentRef(index, el)}
                className={`node-content${shouldAnimate ? ' typewriter-node' : ''}`}
              >
                {renderNode(node, `${indexPrefix}-${index}`, renderCtx)}
              </div>
            ) : (
              <div className="node-placeholder" style={{ height: `${placeholderHeight}px` }} />
            )}
          </div>
        )
      })}
      {bottomSpacer}
    </div>
  )
}

export const NodeRenderer: React.FC<NodeRendererProps> = (rawProps) => {
  const props = { ...DEFAULT_PROPS, ...rawProps } as ResolvedProps
  const containerRef = useRef<HTMLDivElement | null>(null)
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

  return (
    <ViewportPriorityProvider
      getRoot={() => containerRef.current}
      enabled={props.viewportPriority !== false}
    >
      <NodeRendererInner
        props={props}
        parsedNodes={parsedNodes}
        renderCtx={renderCtx}
        indexPrefix={indexPrefix}
        containerRef={containerRef}
      />
    </ViewportPriorityProvider>
  )
}

export default NodeRenderer
