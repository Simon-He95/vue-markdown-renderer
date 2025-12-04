import { Icon } from '@iconify/react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NodeRenderer, setCustomComponents, setKaTeXWorker, setMermaidWorker } from 'markstream-react'
import KatexWorker from 'markstream-react/workers/katexRenderer.worker?worker&inline'
import MermaidWorker from 'markstream-react/workers/mermaidParser.worker?worker&inline'
import type { ParseOptions } from 'stream-markdown-parser'
import { ThinkingNode } from './components/ThinkingNode'
import { streamContent } from './markdown'

setKaTeXWorker(new KatexWorker())
setMermaidWorker(new MermaidWorker())
const PLAYGROUND_CUSTOM_ID = 'playground-demo'
setCustomComponents(PLAYGROUND_CUSTOM_ID, {
  thinking: ThinkingNode,
})

const MemoizedNodeRenderer = memo(NodeRenderer)

const THINKING_PARSE_OPTIONS: ParseOptions = {
  preTransformTokens: (tokens: any[]) => tokens.flatMap((token: any) => {
    if (token?.type === 'html_block' && typeof token.content === 'string' && token.content.trim().startsWith('<thinking')) {
      const transformed = {
        type: 'thinking',
        loading: token.loading,
        attrs: extractThinkingAttributes(token.content),
        content: extractThinkingContent(token.content),
      }
      return [transformed]
    }
    if (token?.type !== 'inline' || !Array.isArray(token.children))
      return token
    let touched = false
    const nextChildren = token.children.map((child: any) => {
      if (child?.type === 'thinking') {
        touched = true
        return child
      }
      return child
    })
    return touched ? { ...token, children: nextChildren } : token
  }),
}

function extractThinkingAttributes(source: string) {
  const match = source.match(/<thinking([^>]*)>/)
  if (!match)
    return []
  const attrString = match[1] || ''
  const attrRegex = /([^\s=]+)(?:="([^"]*)")?/g
  const attrs: Array<{ name: string, value: string | boolean }> = []
  let attrMatch: RegExpExecArray | null
  while ((attrMatch = attrRegex.exec(attrString)) !== null) {
    attrs.push({
      name: attrMatch[1],
      value: attrMatch[2] ?? true,
    })
  }
  return attrs
}

function extractThinkingContent(source: string) {
  return source
    .replace(/<thinking[^>]*>/, '')
    // eslint-disable-next-line regexp/no-super-linear-backtracking
    .replace(/<\/*t*h*i*n*k*i*n*g*>*\n*$/, '')
    .trim()
}

const THEMES = [
  'andromeeda',
  'aurora-x',
  'ayu-dark',
  'catppuccin-frappe',
  'catppuccin-latte',
  'catppuccin-macchiato',
  'catppuccin-mocha',
  'dark-plus',
  'dracula',
  'dracula-soft',
  'everforest-dark',
  'everforest-light',
  'github-dark',
  'github-dark-default',
  'github-dark-dimmed',
  'github-dark-high-contrast',
  'github-light',
  'github-light-default',
  'github-light-high-contrast',
  'gruvbox-dark-hard',
  'gruvbox-dark-medium',
  'gruvbox-dark-soft',
  'gruvbox-light-hard',
  'gruvbox-light-medium',
  'gruvbox-light-soft',
  'houston',
  'kanagawa-dragon',
  'kanagawa-lotus',
  'kanagawa-wave',
  'laserwave',
  'light-plus',
  'material-theme',
  'material-theme-darker',
  'material-theme-lighter',
  'material-theme-ocean',
  'material-theme-palenight',
  'min-dark',
  'min-light',
  'monokai',
  'night-owl',
  'nord',
  'one-dark-pro',
  'one-light',
  'plastic',
  'poimandres',
  'red',
  'rose-pine',
  'rose-pine-dawn',
  'rose-pine-moon',
  'slack-dark',
  'slack-ochin',
  'snazzy-light',
  'solarized-dark',
  'solarized-light',
  'synthwave-84',
  'tokyo-night',
  'vesper',
  'vitesse-black',
  'vitesse-dark',
  'vitesse-light',
] as const

const STREAM_DELAY_KEY = 'vmr-settings-stream-delay'
const STREAM_CHUNK_KEY = 'vmr-settings-stream-chunk-size'
const THEME_KEY = 'vmr-settings-selected-theme'
const DARK_MODE_KEY = 'vueuse-color-scheme'

const clampDelay = (value: number) => {
  if (!Number.isFinite(value))
    return 16
  return Math.min(200, Math.max(4, Math.round(value)))
}

const clampChunk = (value: number) => {
  if (!Number.isFinite(value))
    return 1
  return Math.min(16, Math.max(1, Math.floor(value)))
}

const formatThemeName = (theme: string) => {
  return theme
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const readNumber = (key: string, fallback: number) => {
  if (typeof window === 'undefined')
    return fallback
  const raw = window.localStorage.getItem(key)
  if (!raw)
    return fallback
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

const readString = (key: string, fallback: string) => {
  if (typeof window === 'undefined')
    return fallback
  return window.localStorage.getItem(key) ?? fallback
}

export default function App() {
  const [content, setContent] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState(() => readString(THEME_KEY, 'vitesse-dark'))
  const [streamDelay, setStreamDelay] = useState(() => clampDelay(readNumber(STREAM_DELAY_KEY, 16)))
  const [streamChunkSize, setStreamChunkSize] = useState(() => clampChunk(readNumber(STREAM_CHUNK_KEY, 1)))
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined')
      return false
    const stored = window.localStorage.getItem(DARK_MODE_KEY)
    if (stored)
      return stored === 'dark'
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  })

  const normalizedChunkSize = useMemo(() => clampChunk(streamChunkSize), [streamChunkSize])
  const themeOptions = useMemo(() => Array.from(THEMES), [])
  const messagesRef = useRef<HTMLDivElement | null>(null)
  const frameRef = useRef<number | null>(null)
  const settingsRootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (typeof document === 'undefined')
      return
    document.documentElement.classList.toggle('dark', isDark)
    if (typeof window !== 'undefined')
      window.localStorage.setItem(DARK_MODE_KEY, isDark ? 'dark' : 'light')
  }, [isDark])

  useEffect(() => {
    const bounded = clampDelay(streamDelay)
    if (bounded !== streamDelay) {
      setStreamDelay(bounded)
      return
    }
    if (typeof window !== 'undefined')
      window.localStorage.setItem(STREAM_DELAY_KEY, String(bounded))
  }, [streamDelay])

  useEffect(() => {
    const bounded = clampChunk(streamChunkSize)
    if (bounded !== streamChunkSize) {
      setStreamChunkSize(bounded)
      return
    }
    if (typeof window !== 'undefined')
      window.localStorage.setItem(STREAM_CHUNK_KEY, String(bounded))
  }, [streamChunkSize])

  useEffect(() => {
    if (typeof window !== 'undefined')
      window.localStorage.setItem(THEME_KEY, selectedTheme)
  }, [selectedTheme])

  const scheduleCheckMinHeight = useCallback(() => {
    if (typeof window === 'undefined')
      return
    if (frameRef.current != null)
      return
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null
      const container = messagesRef.current
      if (!container)
        return
      const renderer = container.querySelector('.markdown-renderer') as HTMLElement | null
      if (!renderer)
        return
      const shouldDisable = renderer.scrollHeight > container.clientHeight
      if (shouldDisable) {
        renderer.classList.add('disable-min-height')
      }
      else {
        renderer.classList.remove('disable-min-height')
      }
    })
  }, [])

  useEffect(() => {
    const container = messagesRef.current
    if (!container)
      return
    scheduleCheckMinHeight()

    const roContainer = new ResizeObserver(scheduleCheckMinHeight)
    roContainer.observe(container)

    let roContent: ResizeObserver | null = null
    const observeContent = () => {
      const renderer = container.querySelector('.markdown-renderer')
      if (!renderer)
        return
      if (roContent)
        roContent.disconnect()
      roContent = new ResizeObserver(scheduleCheckMinHeight)
      roContent.observe(renderer)
    }
    observeContent()

    const mo = new MutationObserver(() => {
      observeContent()
      scheduleCheckMinHeight()
    })
    mo.observe(container, { childList: true, subtree: true })

    return () => {
      roContainer.disconnect()
      roContent?.disconnect()
      mo.disconnect()
    }
  }, [scheduleCheckMinHeight])

  useEffect(() => {
    scheduleCheckMinHeight()
  }, [content, scheduleCheckMinHeight])

  useEffect(() => {
    return () => {
      if (frameRef.current != null)
        window.cancelAnimationFrame(frameRef.current)
    }
  }, [])

  useEffect(() => {
    if (!showSettings)
      return
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const root = settingsRootRef.current
      if (!root)
        return
      if (root.contains(event.target as Node))
        return
      setShowSettings(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [showSettings])

  useEffect(() => {
    if (typeof window === 'undefined')
      return
    let timer: number | null = null
    const startStreaming = () => {
      timer = window.setInterval(() => {
        setContent((current) => {
          if (current.length >= streamContent.length) {
            if (timer != null) {
              window.clearInterval(timer)
              timer = null
            }
            return current
          }
          const nextChunk = streamContent.slice(current.length, current.length + normalizedChunkSize)
          return current + nextChunk
        })
      }, streamDelay)
    }
    startStreaming()
    return () => {
      if (timer != null)
        window.clearInterval(timer)
    }
  }, [streamDelay, normalizedChunkSize])

  const goToTest = () => {
    try {
      window.location.href = '/test'
    }
    catch {
      // noop
    }
  }

  return (
    <div className="flex items-center justify-center p-4 app-container h-full bg-gray-50 dark:bg-gray-900">
      <div ref={settingsRootRef} className="fixed top-4 right-4 z-10 pointer-events-none flex flex-col items-end gap-2">
        <button
          type="button"
          className={`pointer-events-auto settings-toggle w-10 h-10 rounded-full bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 shadow-lg dark:shadow-gray-900/20 transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${showSettings ? 'ring-2 ring-blue-500/50' : ''}`}
          onClick={() => setShowSettings(value => !value)}
        >
          <Icon
            icon="carbon:settings"
            className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform duration-200 ${showSettings ? 'rotate-90' : ''}`}
          />
        </button>

        {showSettings && (
          <div
            className="pointer-events-auto settings-panel absolute top-12 right-0 mt-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-xl dark:shadow-gray-900/30 p-4 space-y-4 min-w-[220px] origin-top-right transition-all duration-200 ease-out"
          >
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Code Theme
              </label>
              <div className="relative theme-selector">
                <select
                  value={selectedTheme}
                  onChange={event => setSelectedTheme(event.target.value)}
                  className="w-full appearance-none px-3 py-2 pr-8 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 cursor-pointer"
                >
                  {THEMES.map(theme => (
                    <option key={theme} value={theme}>
                      {formatThemeName(theme)}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <Icon icon="carbon:chevron-down" className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Stream Delay
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={4}
                  max={200}
                  step={4}
                  value={streamDelay}
                  onChange={event => setStreamDelay(Number(event.target.value))}
                  className="flex-1 cursor-pointer"
                />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-12 text-right">
                  {streamDelay}ms
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Chunk Size
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={16}
                  step={1}
                  value={streamChunkSize}
                  onChange={event => setStreamChunkSize(Number(event.target.value))}
                  className="flex-1 cursor-pointer"
                />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-12 text-right">
                  {normalizedChunkSize}
                </span>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700" />

            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Dark Mode
              </label>
              <button
                type="button"
                className="relative w-12 h-6 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:shadow-lg active:scale-95 transition-all duration-200 ease-out"
                style={{
                  backgroundColor: isDark ? '#3b82f6' : '#e5e7eb',
                  transition: 'background-color 0.35s ease-out, box-shadow 0.2s ease, transform 0.1s ease',
                }}
                onClick={() => setIsDark(value => !value)}
              >
                <div
                  className="absolute top-0.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md"
                  style={{
                    left: isDark ? '26px' : '2px',
                    transform: `scale(${isDark ? 1.02 : 1})`,
                    transition: 'left 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.2s ease-out, box-shadow 0.2s ease',
                  }}
                >
                  {isDark
                    ? <Icon icon="carbon:moon" className="w-3 h-3 text-blue-600 drop-shadow-sm" />
                    : <Icon icon="carbon:sun" className="w-3 h-3 text-yellow-500 drop-shadow-sm" />}
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="chatbot-container max-w-5xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl dark:shadow-gray-900/50 flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="chatbot-header px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Icon icon="carbon:chat" className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  markstream-react
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Streaming markdown demo
                </p>
              </div>
            </div>

            <div className="flex">
              <a
                href="https://github.com/Simon-He95/markstream-vue"
                target="_blank"
                rel="noreferrer"
                className="github-star-btn flex items-center gap-2 px-3 py-1.5 bg-gray-800 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <Icon icon="carbon:star" className="w-4 h-4" />
                <span>Star</span>
              </a>
              <button
                type="button"
                className="ml-2 test-page-btn flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                title="Go to Test page"
                onClick={goToTest}
              >
                <Icon icon="carbon:rocket" className="w-4 h-4" />
                <span>Test</span>
              </button>
            </div>
          </div>
        </div>

        <main ref={messagesRef} className="chatbot-messages flex-1 overflow-y-auto mr-[1px] mb-4 flex flex-col-reverse">
          <div className="p-6">
            <MemoizedNodeRenderer
              content={content}
              parseOptions={THINKING_PARSE_OPTIONS}
              codeBlockDarkTheme={selectedTheme}
              codeBlockLightTheme={selectedTheme}
              themes={themeOptions}
              isDark={isDark}
              customId={PLAYGROUND_CUSTOM_ID}
              deferNodesUntilVisible={false}
              maxLiveNodes={2000}
              liveNodeBuffer={200}
              viewportPriority={false}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
