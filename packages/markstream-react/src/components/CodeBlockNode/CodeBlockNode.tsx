import { useEffect, useMemo, useRef, useState } from 'react'
import type { CodeBlockNodeProps } from '../../types/component-props'
import { getUseMonaco } from './monaco'
import { PreCodeNode } from './PreCodeNode'

export function CodeBlockNode(props: CodeBlockNodeProps) {
  const {
    node,
    stream = true,
    showHeader = true,
    showCopyButton = true,
    showExpandButton = true,
    darkTheme,
    lightTheme,
    monacoOptions,
    themes,
    minWidth,
    maxWidth,
    isDark,
    onCopy,
  } = props

  const editorRef = useRef<HTMLDivElement | null>(null)
  const helpersRef = useRef<any>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const [fallback, setFallback] = useState(false)
  const [editorReady, setEditorReady] = useState(false)
  const [language, setLanguage] = useState(() => node.language || 'plaintext')
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(Boolean(node.loading))

  useEffect(() => {
    return () => {
      cleanupRef.current?.()
      cleanupRef.current = null
    }
  }, [])

  const resolvedCode = useMemo(() => {
    if (node.diff)
      return node.updatedCode ?? node.code ?? ''
    return node.code ?? ''
  }, [node.code, node.diff, node.updatedCode])

  useEffect(() => {
    let mounted = true
    if (typeof window === 'undefined')
      return () => {}
    ;(async () => {
      try {
        const mod = await getUseMonaco()
        if (!mounted) return
        if (!mod) {
          setFallback(true)
          return
        }
        const useMonaco = (mod as any).useMonaco
        const detectLanguage = (mod as any).detectLanguage
        if (typeof detectLanguage === 'function') {
          const detected = detectLanguage(node.code || '')
          if (detected && !node.language)
            setLanguage(detected)
        }
        if (typeof useMonaco !== 'function') {
          setFallback(true)
          return
        }
        const systemTheme = isDark ? darkTheme ?? lightTheme : lightTheme ?? darkTheme
        const helpers = useMonaco({
          wordWrap: 'on',
          wrappingIndent: 'same',
          themes,
          theme: systemTheme,
          ...(monacoOptions || {}),
        })
        helpersRef.current = helpers
        setEditorReady(true)
      }
      catch {
        if (mounted)
          setFallback(true)
      }
    })()
    return () => {
      mounted = false
    }
  }, [
    node.code,
    node.language,
    themes,
    monacoOptions,
    darkTheme,
    lightTheme,
    isDark,
  ])

  useEffect(() => {
    if (fallback)
      return () => {}
    if (!editorReady)
      return () => {}
    const helpers = helpersRef.current
    const el = editorRef.current
    if (!helpers || !el)
      return () => {}
    if (cleanupRef.current)
      cleanupRef.current()

    if (node.diff && helpers.createDiffEditor) {
      helpers.createDiffEditor(el, node.originalCode ?? '', node.updatedCode ?? node.code ?? '', language)
    }
    else if (helpers.createEditor) {
      helpers.createEditor(el, node.code ?? '', language)
    }

    cleanupRef.current = helpers.cleanupEditor || helpers.safeClean || null
    setLoading(Boolean(node.loading))

    return () => {
      cleanupRef.current?.()
      cleanupRef.current = null
    }
  }, [
    editorReady,
    fallback,
    node.diff,
    node.originalCode,
    node.updatedCode,
    node.code,
    node.loading,
    language,
  ])

  useEffect(() => {
    if (fallback)
      return
    if (!editorReady)
      return
    const helpers = helpersRef.current
    if (!helpers)
      return
    if (node.diff && helpers.updateDiff) {
      helpers.updateDiff(node.originalCode ?? '', node.updatedCode ?? node.code ?? '', language)
    }
    else if (helpers.updateCode) {
      helpers.updateCode(node.code ?? '', language)
    }
  }, [node.code, node.originalCode, node.updatedCode, node.diff, language, editorReady, fallback])

  useEffect(() => {
    if (!node.loading)
      setLoading(false)
  }, [node.loading])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(resolvedCode)
      setCopied(true)
      onCopy?.({ code: resolvedCode, language })
      setTimeout(() => setCopied(false), 1200)
    }
    catch {}
  }

  if (fallback)
    return <PreCodeNode node={node} />

  const codeBody = (
    <div className={`code-block-body${expanded ? ' code-block-body--expanded' : ''}`} style={{ minWidth, maxWidth }}>
      <div ref={editorRef} className="code-block-monaco" />
      {!stream && node.loading && (
        <div className="code-block-overlay">
          <span className="code-block-spinner" />
        </div>
      )}
    </div>
  )

  return (
    <div className={`code-block${expanded ? ' code-block--expanded' : ''}`}>
      {showHeader && (
        <div className="code-block-header">
          <div className="code-block-meta">
            <span className="code-block-language">{(node.language || language || 'text').toUpperCase()}</span>
            {node.diff && <span className="code-block-badge">Diff</span>}
          </div>
          <div className="code-block-actions">
            {showCopyButton && (
              <button type="button" className="code-block-btn" onClick={handleCopy}>
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
            {showExpandButton && (
              <button type="button" className="code-block-btn" onClick={() => setExpanded(expanded => !expanded)}>
                {expanded ? 'Collapse' : 'Expand'}
              </button>
            )}
          </div>
        </div>
      )}
      {codeBody}
      {loading && stream && (
        <div className="code-block-footer text-xs text-gray-500">
          Streaming code…
        </div>
      )}
    </div>
  )
}
