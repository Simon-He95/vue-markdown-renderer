export interface CodeBlockNodeProps {
  node: {
    type: 'code_block'
    language: string
    code: string
    raw: string
    diff?: boolean
    originalCode?: string
    updatedCode?: string
    loading?: boolean
  }
  isDark?: boolean
  stream?: boolean
  darkTheme?: any
  lightTheme?: any
  monacoOptions?: Record<string, any>
  enableFontSizeControl?: boolean
  minWidth?: string | number
  maxWidth?: string | number
  themes?: string[]
  showHeader?: boolean
  showCopyButton?: boolean
  showExpandButton?: boolean
  showPreviewButton?: boolean
  showFontSizeButtons?: boolean
  showPreview?: boolean
  onCopy?: (payload: { code: string, language: string }) => void
}

export interface MermaidBlockNodeProps {
  node: {
    type: 'code_block'
    language: string
    code: string
    raw: string
    loading?: boolean
  }
  maxHeight?: string | number | null
  loading?: boolean
  isDark?: boolean
  workerTimeoutMs?: number
  parseTimeoutMs?: number
  renderTimeoutMs?: number
  fullRenderTimeoutMs?: number
  showHeader?: boolean
  showModeToggle?: boolean
  showCopyButton?: boolean
  showExportButton?: boolean
  showFullscreenButton?: boolean
  showCollapseButton?: boolean
  showZoomControls?: boolean
  onCopy?: (payload: { code: string }) => void
  onExport?: (payload: { svgElement: SVGElement | null, svgString: string | null }) => void
  onToggleMode?: (payload: { mode: 'preview' | 'source' }) => void
}

export interface MermaidBlockEvent<TPayload = any> {
  payload?: TPayload
  defaultPrevented: boolean
  preventDefault: () => void
  svgElement?: SVGElement | null
  svgString?: string | null
}

export interface MathBlockNodeProps {
  node: {
    type: 'math_block'
    content: string
    raw: string
    loading?: boolean
  }
}

export interface MathInlineNodeProps {
  node: {
    type: 'math_inline'
    content: string
    raw: string
    loading?: boolean
  }
}
