import React from 'react'

interface ThinkingNodeProps {
  node: {
    type: 'thinking'
    content: string
    loading?: boolean
    attrs?: Array<{ name: string, value: string | boolean }>
  }
}

export function ThinkingNode({ node }: ThinkingNodeProps) {
  const dotsClass = node.loading ? 'thinking-dots visible' : 'thinking-dots hidden'

  return (
    <div className="thinking-node p-4 my-4 bg-blue-50 dark:bg-blue-900/40 rounded-md border-l-4 border-blue-400 flex items-start gap-3">
      <div className="flex-shrink-0 mt-1">
        <div className="w-9 h-9 rounded-full bg-blue-200 dark:bg-blue-700 flex items-center justify-center text-blue-700 dark:text-blue-100">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 3C7.03 3 3 6.58 3 11c0 1.86.66 3.57 1.77 4.98L4 21l5.2-1.9C10.06 19.35 11 19.5 12 19.5c4.97 0 9-3.58 9-8.5S16.97 3 12 3z"
              stroke="currentColor"
              strokeWidth="0.8"
              fill="currentColor"
              opacity="0.9"
            />
          </svg>
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-baseline gap-3">
          <strong className="text-sm">Thinking</strong>
          <span className="text-xs text-slate-500 dark:text-slate-300">(assistant)</span>
          <span className="ml-2" aria-hidden="true">
            <span className={dotsClass} aria-hidden="true">
              <span className="dot dot-1" />
              <span className="dot dot-2" />
              <span className="dot dot-3" />
            </span>
          </span>
        </div>
        <div className="mt-1 text-sm leading-relaxed text-slate-800 dark:text-slate-100">
          {node.loading && <span className="sr-only" aria-live="polite">Thinking…</span>}
          <div className="content-area">
            {node.loading
              ? <div className="partial-content">{node.content}</div>
              : <div className="full-content">{node.content}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ThinkingNode
