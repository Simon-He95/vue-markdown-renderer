import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import type { MermaidBlockNodeProps } from '../../types/component-props'
import { useViewportPriority } from '../../context/viewportPriority'
import type { VisibilityHandle } from '../../context/viewportPriority'
import { showTooltipForAnchor, hideTooltip } from '../../tooltip/singletonTooltip'
import { canParseOffthread, findPrefixOffthread, terminateWorker as terminateMermaidWorker } from '../../workers/mermaidWorkerClient'
import { safeRaf } from '../../utils/safeRaf'
import { getMermaid } from './mermaid'

type Theme = 'light' | 'dark'

const DEFAULTS = {
  maxHeight: '500px',
  loading: true,
  workerTimeoutMs: 1400,
  parseTimeoutMs: 1800,
  renderTimeoutMs: 2500,
  fullRenderTimeoutMs: 4000,
  showHeader: true,
  showModeToggle: true,
  showCopyButton: true,
  showExportButton: true,
  showFullscreenButton: true,
  showCollapseButton: true,
  showZoomControls: true,
}

export function MermaidBlockNode(rawProps: MermaidBlockNodeProps) {
  const props = { ...DEFAULTS, ...rawProps }
  const baseCode = props.node?.code ?? ''
  const baseFixedCode = useMemo(() => {
    return baseCode
      .replace(/\]::([^:])/g, ']:::$1')
      .replace(/:::subgraphNode$/gm, '::subgraphNode')
  }, [baseCode])

  const workerTimeout = props.workerTimeoutMs ?? DEFAULTS.workerTimeoutMs
  const parseTimeout = props.parseTimeoutMs ?? DEFAULTS.parseTimeoutMs
  const renderTimeout = props.renderTimeoutMs ?? DEFAULTS.renderTimeoutMs
  const fullRenderTimeout = props.fullRenderTimeoutMs ?? DEFAULTS.fullRenderTimeoutMs

  const [mermaidAvailable, setMermaidAvailable] = useState(false)
  const [showSource, setShowSource] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [copying, setCopying] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [rendering, setRendering] = useState(Boolean(props.node?.loading ?? props.loading))
  const [hasRenderedOnce, setHasRenderedOnce] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalHtml, setModalHtml] = useState<string | null>(null)
  const [containerHeight, setContainerHeight] = useState<string>(() => {
    if (props.maxHeight == null)
      return '360px'
    if (typeof props.maxHeight === 'number')
      return `${props.maxHeight}px`
    return props.maxHeight
  })
  const [viewportReady, setViewportReady] = useState(typeof window === 'undefined')

  const mermaidRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const modeContainerRef = useRef<HTMLDivElement | null>(null)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const renderTokenRef = useRef(0)
  const svgCacheRef = useRef<{ light?: string, dark?: string }>({})
  const lastRenderedCodeRef = useRef('')
  const userToggledRef = useRef(false)
  const viewportHandleRef = useRef<VisibilityHandle | null>(null)
  const hasRenderedOnceRef = useRef(false)
  const savedTransformRef = useRef({
    zoom: 1,
    translateX: 0,
    translateY: 0,
    containerHeight: containerHeight || '360px',
  })

  const registerViewport = useViewportPriority()
  const streaming = Boolean(props.node?.loading ?? props.loading)
  const theme: Theme = props.isDark ? 'dark' : 'light'

  useEffect(() => {
    hasRenderedOnceRef.current = hasRenderedOnce
  }, [hasRenderedOnce])

  useEffect(() => {
    setRendering(streaming)
  }, [streaming])

  useEffect(() => {
    svgCacheRef.current = {}
  }, [theme, baseFixedCode])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const instance = await getMermaid()
      if (cancelled)
        return
      mermaidRef.current = instance
      setMermaidAvailable(Boolean(instance))
      if (!userToggledRef.current)
        setShowSource(!instance)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el)
      return
    const handle = registerViewport(el, { rootMargin: '400px' })
    viewportHandleRef.current = handle
    if (handle.isVisible())
      setViewportReady(true)
    handle.whenVisible.then(() => setViewportReady(true))
    return () => {
      handle.destroy()
      viewportHandleRef.current = null
    }
  }, [registerViewport])

  useEffect(() => {
    if (!modalOpen)
      return
    if (contentRef.current)
      setModalHtml(contentRef.current.innerHTML)
  }, [modalOpen, baseFixedCode, theme])

  useEffect(() => {
    if (typeof document === 'undefined')
      return
    if (!modalOpen)
      return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [modalOpen])

  const updateContainerHeight = useCallback((newWidth?: number) => {
    const container = containerRef.current
    const content = contentRef.current
    if (!container || !content)
      return
    const svgElement = content.querySelector('svg')
    if (!svgElement)
      return
    let intrinsicWidth = 0
    let intrinsicHeight = 0
    const viewBox = svgElement.getAttribute('viewBox')
    if (viewBox) {
      const parts = viewBox.split(' ')
      if (parts.length === 4) {
        intrinsicWidth = Number.parseFloat(parts[2])
        intrinsicHeight = Number.parseFloat(parts[3])
      }
    }
    if ((!intrinsicWidth || !intrinsicHeight) && svgElement.hasAttribute('width') && svgElement.hasAttribute('height')) {
      intrinsicWidth = Number.parseFloat(svgElement.getAttribute('width') || '0')
      intrinsicHeight = Number.parseFloat(svgElement.getAttribute('height') || '0')
    }
    if (!intrinsicWidth || !intrinsicHeight || Number.isNaN(intrinsicWidth) || Number.isNaN(intrinsicHeight)) {
      try {
        const bbox = svgElement.getBBox()
        intrinsicWidth = bbox.width
        intrinsicHeight = bbox.height
      }
      catch {
        return
      }
    }
    if (!(intrinsicWidth > 0 && intrinsicHeight > 0))
      return
    const containerWidth = newWidth ?? container.clientWidth
    const aspect = intrinsicHeight / intrinsicWidth
    const target = containerWidth * aspect
    const resolved = Number.isFinite(target) && target > 0 ? target : intrinsicHeight
    setContainerHeight(`${Math.min(resolved, intrinsicHeight)}px`)
  }, [])

  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === 'undefined')
      return
    const observer = new ResizeObserver((entries) => {
      if (!entries.length)
        return
      const width = entries[0].contentRect.width
      safeRaf(() => updateContainerHeight(width))
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [updateContainerHeight])

  useEffect(() => {
    return () => {
      terminateMermaidWorker()
    }
  }, [])

  const renderFull = useCallback(async (code: string, t: Theme, signal?: AbortSignal) => {
    if (!mermaidRef.current || !contentRef.current)
      return false
    setRendering(true)
    try {
      const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const themed = applyThemeTo(code, t)
      const result = await withTimeoutSignal(
        () => (mermaidRef.current as any).render(id, themed),
        { timeoutMs: fullRenderTimeout, signal },
      )
      if (!result?.svg)
        return false
      contentRef.current.innerHTML = result.svg
      result.bindFunctions?.(contentRef.current)
      updateContainerHeight()
      svgCacheRef.current[t] = result.svg
      setHasRenderedOnce(true)
      setError(null)
      return true
    }
    catch (err) {
      if (!streaming) {
        setError(err instanceof Error ? err.message : String(err))
      }
      return false
    }
    finally {
      if (!streaming)
        setRendering(false)
    }
  }, [fullRenderTimeout, streaming, updateContainerHeight])

  const renderPartial = useCallback(async (code: string, t: Theme, signal?: AbortSignal) => {
    if (!mermaidRef.current || !contentRef.current)
      return
    setRendering(true)
    try {
      const id = `mermaid-preview-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const safePrefix = getSafePrefixCandidate(code)
      const themed = applyThemeTo(safePrefix || code, t)
      const res = await withTimeoutSignal(
        () => (mermaidRef.current as any).render(id, themed),
        { timeoutMs: renderTimeout, signal },
      )
      if (res?.svg) {
        contentRef.current.innerHTML = res.svg
        res.bindFunctions?.(contentRef.current)
        updateContainerHeight()
      }
    }
    catch {
      // swallow partial errors
    }
    finally {
      if (!streaming)
        setRendering(false)
    }
  }, [renderTimeout, streaming, updateContainerHeight])

  const progressiveRender = useCallback(async (code: string, signal?: AbortSignal) => {
    if (!code.trim()) {
      if (contentRef.current)
        contentRef.current.innerHTML = ''
      setHasRenderedOnce(false)
      lastRenderedCodeRef.current = ''
      return
    }
    const normalized = code.replace(/\s+/g, '')
    if (normalized === lastRenderedCodeRef.current && hasRenderedOnceRef.current)
      return
    const token = ++renderTokenRef.current
    try {
      await canParseWithFallback(code, theme, {
        workerTimeout,
        parseTimeout,
        mermaid: mermaidRef.current,
        signal,
      })
      if (signal?.aborted || renderTokenRef.current !== token)
        return
      const ok = await renderFull(code, theme, signal)
      if (ok)
        lastRenderedCodeRef.current = normalized
      return
    }
    catch (err) {
      if ((err as any)?.name === 'AbortError')
        return
    }
    try {
      const prefix = await findPrefixCandidate(code, theme, { workerTimeout, signal })
      if (!prefix || signal?.aborted || renderTokenRef.current !== token)
        return
      await renderPartial(prefix, theme, signal)
    }
    catch {}
  }, [parseTimeout, renderFull, renderPartial, theme, workerTimeout])

  useEffect(() => {
    if (!viewportReady || showSource || isCollapsed)
      return
    const controller = new AbortController()
    progressiveRender(baseFixedCode, controller.signal)
    return () => controller.abort()
  }, [baseFixedCode, isCollapsed, progressiveRender, showSource, viewportReady])

  const handleTooltip = useCallback((event: React.MouseEvent<HTMLElement>, text: string) => {
    const origin = { x: event.clientX, y: event.clientY }
    showTooltipForAnchor(event.currentTarget, text, 'top', false, origin, props.isDark)
  }, [props.isDark])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard?.writeText(baseFixedCode)
      setCopying(true)
      props.onCopy?.({ code: baseFixedCode })
      setTimeout(() => setCopying(false), 1000)
    }
    catch {}
  }, [baseFixedCode, props.onCopy])

  const handleExport = useCallback(() => {
    const svgElement = contentRef.current?.querySelector('svg') ?? null
    if (!svgElement)
      return
    const svgString = serializeSvg(svgElement)
    props.onExport?.({ svgElement, svgString })
    exportSvg(svgElement, svgString)
  }, [props.onExport])

  const openModal = useCallback(() => {
    const html = contentRef.current?.innerHTML ?? null
    if (!html)
      return
    setModalHtml(html)
    setModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
  }, [])

  const handleSwitchMode = useCallback((target: 'preview' | 'source') => {
    userToggledRef.current = true
    if (target === 'preview') {
      setShowSource(false)
      props.onToggleMode?.({ mode: 'preview' })
      const saved = savedTransformRef.current
      setZoom(saved.zoom)
      setTranslate({ x: saved.translateX, y: saved.translateY })
      setContainerHeight(saved.containerHeight)
      if (hasRenderedOnceRef.current && svgCacheRef.current[theme] && contentRef.current) {
        contentRef.current.innerHTML = svgCacheRef.current[theme]!
        updateContainerHeight()
      }
      else {
        progressiveRender(baseFixedCode)
      }
    }
    else {
      savedTransformRef.current = {
        zoom,
        translateX: translate.x,
        translateY: translate.y,
        containerHeight,
      }
      setShowSource(true)
      props.onToggleMode?.({ mode: 'source' })
    }
  }, [
    baseFixedCode,
    containerHeight,
    progressiveRender,
    props.onToggleMode,
    theme,
    translate.x,
    translate.y,
    updateContainerHeight,
    zoom,
  ])

  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey)
      return
    event.preventDefault()
    const container = containerRef.current
    if (!container)
      return
    const rect = container.getBoundingClientRect()
    const offsetX = event.clientX - rect.left - translate.x
    const offsetY = event.clientY - rect.top - translate.y
    const delta = -event.deltaY * 0.01
    const nextZoom = clamp(zoom + delta, 0.5, 3)
    if (nextZoom === zoom)
      return
    const scaleRatio = nextZoom / zoom
    setTranslate({
      x: translate.x - offsetX * (scaleRatio - 1),
      y: translate.y - offsetY * (scaleRatio - 1),
    })
    setZoom(nextZoom)
  }, [translate, zoom])

  const startDrag = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true)
    dragStartRef.current = {
      x: clientX - translate.x,
      y: clientY - translate.y,
    }
  }, [translate.x, translate.y])

  const onDrag = useCallback((clientX: number, clientY: number) => {
    if (!isDragging)
      return
    setTranslate({
      x: clientX - dragStartRef.current.x,
      y: clientY - dragStartRef.current.y,
    })
  }, [isDragging])

  const stopDrag = useCallback(() => {
    setIsDragging(false)
  }, [])

  const previewContent = (
    <div className="relative">
      {props.showZoomControls && (
        <div className="absolute top-2 right-2 z-10 rounded-lg">
          <div className="flex items-center gap-2 backdrop-blur rounded-lg">
            <button
              type="button"
              className={clsx(
                'p-2 text-xs rounded transition-colors',
                props.isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200',
              )}
              onMouseEnter={event => handleTooltip(event, 'Zoom in')}
              onMouseLeave={() => hideTooltip()}
              onClick={() => setZoom(clamp(zoom + 0.1, 0.5, 3))}
            >
              +
            </button>
            <button
              type="button"
              className={clsx(
                'p-2 text-xs rounded transition-colors',
                props.isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200',
              )}
              onMouseEnter={event => handleTooltip(event, 'Zoom out')}
              onMouseLeave={() => hideTooltip()}
              onClick={() => setZoom(clamp(zoom - 0.1, 0.5, 3))}
            >
              −
            </button>
            <button
              type="button"
              className={clsx(
                'p-2 text-xs rounded transition-colors',
                props.isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200',
              )}
              onMouseEnter={event => handleTooltip(event, 'Reset zoom')}
              onMouseLeave={() => hideTooltip()}
              onClick={() => {
                setZoom(1)
                setTranslate({ x: 0, y: 0 })
              }}
            >
              {Math.round(zoom * 100)}%
            </button>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className={clsx(
          'min-h-[360px] relative transition-all duration-100 overflow-hidden block',
          props.isDark ? 'bg-gray-900' : 'bg-gray-50',
        )}
        style={{ height: containerHeight, maxHeight: props.maxHeight ?? undefined }}
        onWheel={handleWheel}
        onMouseDown={(event) => {
          if (event.button !== 0)
            return
          event.preventDefault()
          startDrag(event.clientX, event.clientY)
        }}
        onMouseMove={event => onDrag(event.clientX, event.clientY)}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onTouchStart={(event) => {
          const touch = event.touches[0]
          if (!touch)
            return
          startDrag(touch.clientX, touch.clientY)
        }}
        onTouchMove={(event) => {
          const touch = event.touches[0]
          if (!touch)
            return
          onDrag(touch.clientX, touch.clientY)
        }}
        onTouchEnd={stopDrag}
      >
        <div
          ref={wrapperRef}
          data-mermaid-wrapper
          className={clsx('absolute inset-0 cursor-grab', { 'cursor-grabbing': isDragging })}
          style={{ transform: `translate(${translate.x}px, ${translate.y}px) scale(${zoom})` }}
        >
          <div
            ref={contentRef}
            className="_mermaid w-full text-center flex items-center justify-center min-h-full"
          />
        </div>
        {(rendering || streaming) && (
          <div className="mermaid-loading">
            <span className="mermaid-spinner" />
            <span>Rendering diagram…</span>
          </div>
        )}
      </div>
    </div>
  )

  const header = props.showHeader && (
    <div
      className={clsx(
        'mermaid-block-header flex justify-between items-center px-4 py-2.5 border-b',
        props.isDark ? 'bg-gray-800 border-gray-700/30' : 'bg-gray-50 border-gray-200',
      )}
    >
      <div className="flex items-center space-x-2 overflow-hidden">
        <span className="text-sm font-medium font-mono truncate" style={{ color: props.isDark ? '#d1d5db' : '#4b5563' }}>
          Mermaid
        </span>
      </div>
      {props.showModeToggle && mermaidAvailable && (
        <div className={clsx('flex items-center space-x-1 rounded-md p-0.5', props.isDark ? 'bg-gray-700' : 'bg-gray-100')}>
          <button
            type="button"
            className={clsx(
              'px-2.5 py-1 text-xs rounded transition-colors',
              !showSource
                ? (props.isDark ? 'bg-gray-600 text-gray-200 shadow-sm' : 'bg-white text-gray-700 shadow-sm')
                : (props.isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'),
            )}
            onClick={() => handleSwitchMode('preview')}
            onMouseEnter={event => handleTooltip(event, 'Preview')}
            onMouseLeave={() => hideTooltip()}
          >
            Preview
          </button>
          <button
            type="button"
            className={clsx(
              'px-2.5 py-1 text-xs rounded transition-colors',
              showSource
                ? (props.isDark ? 'bg-gray-600 text-gray-200 shadow-sm' : 'bg-white text-gray-700 shadow-sm')
                : (props.isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'),
            )}
            onClick={() => handleSwitchMode('source')}
            onMouseEnter={event => handleTooltip(event, 'Source')}
            onMouseLeave={() => hideTooltip()}
          >
            Source
          </button>
        </div>
      )}
      <div className="flex items-center space-x-1">
        {props.showCollapseButton && (
          <button
            type="button"
            className={clsx(
              'p-2 text-xs rounded transition-colors',
              props.isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200',
            )}
            onClick={() => setIsCollapsed(value => !value)}
            onMouseEnter={event => handleTooltip(event, isCollapsed ? 'Expand' : 'Collapse')}
            onMouseLeave={() => hideTooltip()}
          >
            {isCollapsed ? '▸' : '▾'}
          </button>
        )}
        {props.showCopyButton && (
          <button
            type="button"
            className={clsx(
              'p-2 text-xs rounded transition-colors',
              props.isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200',
            )}
            onClick={handleCopy}
            onMouseEnter={event => handleTooltip(event, copying ? 'Copied' : 'Copy')}
            onMouseLeave={() => hideTooltip()}
          >
            {copying ? '✓' : '⧉'}
          </button>
        )}
        {props.showExportButton && (
          <button
            type="button"
            className={clsx(
              'p-2 text-xs rounded transition-colors',
              props.isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200',
            )}
            disabled={!mermaidAvailable || showSource}
            onClick={handleExport}
            onMouseEnter={event => handleTooltip(event, 'Export SVG')}
            onMouseLeave={() => hideTooltip()}
          >
            ⤓
          </button>
        )}
        {props.showFullscreenButton && (
          <button
            type="button"
            className={clsx(
              'p-2 text-xs rounded transition-colors',
              props.isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200',
            )}
            disabled={!mermaidAvailable || showSource}
            onClick={openModal}
            onMouseEnter={event => handleTooltip(event, 'Fullscreen')}
            onMouseLeave={() => hideTooltip()}
          >
            ⧉
          </button>
        )}
      </div>
    </div>
  )

  const body = (
    <div>
      {showSource ? (
        <div className={clsx('p-4', props.isDark ? 'bg-gray-900 text-gray-300' : 'bg-gray-50 text-gray-700')}>
          <pre className="text-sm font-mono whitespace-pre-wrap">
            {baseFixedCode}
          </pre>
        </div>
      ) : (
        previewContent
      )}
      {error && (
        <div className="mermaid-error">{error}</div>
      )}
    </div>
  )

  return (
    <>
      <div
        className={clsx(
          'my-4 rounded-lg border overflow-hidden shadow-sm mermaid-block',
          props.isDark ? 'border-gray-700/30' : 'border-gray-200',
          { 'is-rendering': streaming },
        )}
      >
        {header}
        {!isCollapsed && (
          <div ref={modeContainerRef}>
            {body}
          </div>
        )}
      </div>
      {modalOpen && modalHtml && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 bg-black/60 z-[9998] flex flex-col"
          onClick={closeModal}
        >
          <div className="relative max-w-5xl w-full mx-auto my-8 bg-white dark:bg-gray-900 rounded-lg shadow-xl overflow-hidden" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium">Mermaid Preview</span>
              <button type="button" className="text-sm px-2 py-1" onClick={closeModal}>Close</button>
            </div>
            <div className="overflow-auto max-h-[80vh] p-4">
              <div
                className="w-full flex justify-center"
                dangerouslySetInnerHTML={{ __html: modalHtml }}
              />
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

async function canParseWithFallback(
  code: string,
  theme: Theme,
  opts: { workerTimeout: number, parseTimeout: number, mermaid: any, signal?: AbortSignal },
) {
  try {
    const ok = await canParseOffthread(code, theme, opts.workerTimeout)
    if (ok)
      return true
  }
  catch (err) {
    if ((err as any)?.name === 'AbortError')
      throw err
  }
  if (!opts.mermaid)
    throw new Error('Mermaid not available')
  const themed = applyThemeTo(code, theme)
  const anyMermaid = opts.mermaid as any
  if (typeof anyMermaid.parse === 'function') {
    await withTimeoutSignal(() => anyMermaid.parse(themed), { timeoutMs: opts.parseTimeout, signal: opts.signal })
    return true
  }
  const id = `mermaid-parse-${Math.random().toString(36).slice(2, 9)}`
  await withTimeoutSignal(() => anyMermaid.render(id, themed), { timeoutMs: opts.parseTimeout, signal: opts.signal })
  return true
}

async function findPrefixCandidate(
  code: string,
  theme: Theme,
  opts: { workerTimeout: number, signal?: AbortSignal },
) {
  try {
    const workerPrefix = await findPrefixOffthread(code, theme, opts.workerTimeout)
    if (workerPrefix)
      return workerPrefix
  }
  catch (err) {
    if ((err as any)?.name === 'AbortError')
      throw err
  }
  return getSafePrefixCandidate(code)
}

function applyThemeTo(code: string, theme: Theme) {
  const trimmed = code.trimStart()
  if (trimmed.startsWith('%%{'))
    return code
  const themeValue = theme === 'dark' ? 'dark' : 'default'
  return `%%{init: {"theme": "${themeValue}"}}%%\n${code}`
}

function getSafePrefixCandidate(code: string) {
  const lines = code.split('\n')
  while (lines.length > 0) {
    const lastRaw = lines[lines.length - 1]
    const last = lastRaw.trimEnd()
    if (last === '') {
      lines.pop()
      continue
    }
    const looksDangling = /^[-=~>|<\s]+$/.test(last.trim())
      || /(?:--|==|~~|->|<-|-\||-\)|-x|o-|\|-|\.-)\s*$/.test(last)
      || /[-|><]$/.test(last)
      || /(?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt)\s*$/i.test(last)
    if (looksDangling) {
      lines.pop()
      continue
    }
    break
  }
  return lines.join('\n')
}

async function withTimeoutSignal<T>(
  run: () => Promise<T>,
  opts: { timeoutMs?: number, signal?: AbortSignal } = {},
): Promise<T> {
  const { timeoutMs, signal } = opts
  if (signal?.aborted)
    return Promise.reject(new DOMException('Aborted', 'AbortError'))
  return new Promise((resolve, reject) => {
    let settled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const cleanup = () => {
      if (timer != null)
        clearTimeout(timer)
      if (signal && abortHandler)
        signal.removeEventListener('abort', abortHandler)
    }
    const abortHandler = () => {
      if (settled)
        return
      settled = true
      cleanup()
      reject(new DOMException('Aborted', 'AbortError'))
    }
    if (signal)
      signal.addEventListener('abort', abortHandler)
    if (timeoutMs && timeoutMs > 0) {
      timer = setTimeout(() => {
        if (settled)
          return
        settled = true
        cleanup()
        reject(new Error('Operation timed out'))
      }, timeoutMs)
    }
    run()
      .then((res) => {
        if (settled)
          return
        settled = true
        cleanup()
        resolve(res)
      })
      .catch((err) => {
        if (settled)
          return
        settled = true
        cleanup()
        reject(err)
      })
  })
}

function serializeSvg(svg: SVGElement) {
  return new XMLSerializer().serializeToString(svg)
}

function exportSvg(svgElement: SVGElement, svgString: string | null) {
  const data = svgString ?? serializeSvg(svgElement)
  const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `mermaid-${Date.now()}.svg`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
