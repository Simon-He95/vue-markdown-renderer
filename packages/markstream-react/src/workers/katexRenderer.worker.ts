import katex from 'katex'
import 'katex/contrib/mhchem'

interface MessageIn {
  type?: 'init' | 'render'
  id?: string
  content?: string
  displayMode?: boolean
  debug?: boolean
}

interface MessageOut {
  id: string
  html?: string
  error?: string
}

let DEBUG = false

;(globalThis as any).addEventListener('message', (ev: MessageEvent<MessageIn>) => {
  const data = ev.data || {}
  if (data.type === 'init') {
    DEBUG = !!data.debug
    try {
      if (DEBUG)
        console.debug('[katexRenderer.worker] debug enabled')
    }
    catch {}
    return
  }

  const id = data.id ?? ''
  const content = data.content ?? ''
  const displayMode = data.displayMode ?? true

  try {
    if (DEBUG)
      console.debug('[katexRenderer.worker] render start', { id, displayMode, content })
    const html = katex.renderToString(content, {
      throwOnError: true,
      displayMode,
      output: 'html',
      strict: 'ignore',
    })
    const out: MessageOut & { content: string, displayMode: boolean } = { id, html, content, displayMode }
    try {
      ;(globalThis as any).postMessage(out)
      if (DEBUG)
        console.debug('[katexRenderer.worker] render success', { id })
    }
    catch (postErr) {
      console.error('[katexRenderer.worker] failed to postMessage result', postErr)
    }
  }
  catch (err: any) {
    const out: MessageOut & { content: string, displayMode: boolean } = { id, error: String(err?.message ?? err), content, displayMode }
    try {
      ;(globalThis as any).postMessage(out)
    }
    catch (postErr) {
      console.error('[katexRenderer.worker] failed to postMessage error', postErr)
    }
  }
})

;(globalThis as any).addEventListener('error', (ev: ErrorEvent) => {
  console.error('[katexRenderer.worker] uncaught error', ev.message, ev.error)
  try {
    ;(globalThis as any).postMessage({ id: '__worker_uncaught__', error: String(ev.message ?? ev.error), content: '', displayMode: true })
  }
  catch {}
})
