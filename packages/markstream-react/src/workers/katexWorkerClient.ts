interface Pending {
  resolve: (val: string) => void
  reject: (err: any) => void
  timeoutId: number
}

let worker: Worker | null = null
let workerInitError: any = null

let DEBUG_KATEX_WORKER = false
const pending = new Map<string, Pending>()
const cache = new Map<string, string>()
const CACHE_MAX = 200
let MAX_CONCURRENCY = 5
const drainWaiters = new Set<() => void>()

function notifyDrainIfBelowCap() {
  if (pending.size < MAX_CONCURRENCY && drainWaiters.size) {
    const copy = Array.from(drainWaiters)
    drainWaiters.clear()
    for (const fn of copy) {
      try {
        fn()
      }
      catch {}
    }
  }
}

let perfMonitor: any = null
try {
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    import('../utils/performanceMonitor').then((a) => {
      perfMonitor = a.perfMonitor
    })
  }
}
catch {}

export function setKaTeXWorker(w: Worker) {
  worker = w
  workerInitError = null
  worker.onmessage = (e: MessageEvent) => {
    const { id, html, error } = e.data
    const p = pending.get(id)
    if (!p)
      return
    pending.delete(id)
    clearTimeout(p.timeoutId)
    notifyDrainIfBelowCap()
    if (error) {
      p.reject(new Error(error))
    }
    else {
      const { content, displayMode } = e.data
      if (content) {
        const cacheKey = `${displayMode ? 'd' : 'i'}:${content}`
        cache.set(cacheKey, html)
        if (cache.size > CACHE_MAX) {
          const firstKey = cache.keys().next().value
          cache.delete(firstKey)
        }
      }
      p.resolve(html)
    }
  }
  worker.onerror = (e: ErrorEvent) => {
    console.error('[katexWorkerClient] Worker error:', e)
    for (const [_id, p] of pending.entries()) {
      clearTimeout(p.timeoutId)
      p.reject(new Error(`Worker error: ${e.message}`))
    }
    pending.clear()
    notifyDrainIfBelowCap()
  }
}

export function clearKaTeXWorker() {
  if (worker)
    worker.terminate?.()
  worker = null
  workerInitError = null
}

function ensureWorker() {
  if (!worker) {
    workerInitError = new Error('[katexWorkerClient] No worker instance set. Please inject a Worker via setKaTeXWorker().')
    ;(workerInitError as any).name = 'WORKER_INIT_ERROR'
    ;(workerInitError as any).code = 'WORKER_INIT_ERROR'
    return null
  }
  return worker
}

export function setKaTeXWorkerDebug(enabled: boolean) {
  DEBUG_KATEX_WORKER = !!enabled
  if (worker)
    (worker as any).postMessage({ type: 'init', debug: DEBUG_KATEX_WORKER })
}

export const WORKER_BUSY_CODE = 'WORKER_BUSY'

export async function renderKaTeXInWorker(content: string, displayMode = true, timeout = 2000, signal?: AbortSignal): Promise<string> {
  const startTime = performance.now()
  if (workerInitError)
    return Promise.reject(workerInitError)
  const cacheKey = `${displayMode ? 'd' : 'i'}:${content}`
  const cached = cache.get(cacheKey)
  if (cached) {
    if (perfMonitor) {
      perfMonitor.recordRender({
        type: 'cache-hit',
        duration: performance.now() - startTime,
        formulaLength: content.length,
        timestamp: Date.now(),
        success: true,
      })
    }
    return Promise.resolve(cached)
  }
  const wk = ensureWorker()
  if (!wk)
    return Promise.reject(workerInitError)
  if (pending.size >= MAX_CONCURRENCY) {
    const err = new Error('Worker busy')
    ;(err as any).name = 'WorkerBusy'
    ;(err as any).code = WORKER_BUSY_CODE
    ;(err as any).busy = true
    ;(err as any).inFlight = pending.size
    ;(err as any).max = MAX_CONCURRENCY
    if (perfMonitor) {
      perfMonitor.recordRender({
        type: 'worker',
        duration: performance.now() - startTime,
        formulaLength: content.length,
        timestamp: Date.now(),
        success: false,
        error: 'busy',
      })
    }
    return Promise.reject(err)
  }

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      const err = new Error('Aborted')
      ;(err as any).name = 'AbortError'
      reject(err)
      return
    }
    const id = Math.random().toString(36).slice(2)
    const timeoutId = (globalThis as any).setTimeout(() => {
      pending.delete(id)
      const err = new Error('Worker render timed out')
      ;(err as any).name = 'WorkerTimeout'
      ;(err as any).code = 'WORKER_TIMEOUT'
      if (perfMonitor) {
        perfMonitor.recordRender({
          type: 'worker',
          duration: performance.now() - startTime,
          formulaLength: content.length,
          timestamp: Date.now(),
          success: false,
          error: 'timeout',
        })
      }
      reject(err)
      notifyDrainIfBelowCap()
    }, timeout)

    const onDrain = () => {}
    const abortListener = () => {
      pending.delete(id)
      clearTimeout(timeoutId)
      drainWaiters.delete(onDrain)
      const err = new Error('Aborted')
      ;(err as any).name = 'AbortError'
      reject(err)
      notifyDrainIfBelowCap()
    }

    if (signal)
      signal.addEventListener('abort', abortListener, { once: true })

    pending.set(id, {
      resolve: (html: string) => {
        if (signal)
          signal.removeEventListener('abort', abortListener)
        if (perfMonitor) {
          perfMonitor.recordRender({
            type: 'worker',
            duration: performance.now() - startTime,
            formulaLength: content.length,
            timestamp: Date.now(),
            success: true,
          })
        }
        resolve(html)
      },
      reject: (err: any) => {
        if (signal)
          signal.removeEventListener('abort', abortListener)
        if (perfMonitor) {
          perfMonitor.recordRender({
            type: 'worker',
            duration: performance.now() - startTime,
            formulaLength: content.length,
            timestamp: Date.now(),
            success: false,
            error: err?.code || err?.message,
          })
        }
        reject(err)
      },
      timeoutId,
    })

    try {
      wk.postMessage({ id, content, displayMode, debug: DEBUG_KATEX_WORKER })
    }
    catch (err) {
      pending.delete(id)
      clearTimeout(timeoutId)
      if (signal)
        signal.removeEventListener('abort', abortListener)
      reject(err)
      notifyDrainIfBelowCap()
    }
  })
}

export function setKaTeXCache(content: string, displayMode: boolean, html: string) {
  const cacheKey = `${displayMode ? 'd' : 'i'}:${content}`
  cache.set(cacheKey, html)
  if (cache.size > CACHE_MAX) {
    const firstKey = cache.keys().next().value
    cache.delete(firstKey)
  }
}

export function clearKaTeXCache() {
  cache.clear()
}

export function setKaTeXConcurrencyLimit(limit: number) {
  MAX_CONCURRENCY = Math.max(1, Math.floor(limit))
  notifyDrainIfBelowCap()
}

export function waitForKaTeXWorkerSlot(timeout = 1500, signal?: AbortSignal) {
  if (pending.size < MAX_CONCURRENCY)
    return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      const err = new Error('Aborted')
      ;(err as any).name = 'AbortError'
      reject(err)
      return
    }
    const onDrain = () => {
      drainWaiters.delete(onDrain)
      if (timer)
        (globalThis as any).clearTimeout(timer)
      if (signal)
        signal.removeEventListener('abort', onAbort)
      resolve()
    }
    const timer = timeout > 0
      ? (globalThis as any).setTimeout(() => {
        drainWaiters.delete(onDrain)
        if (signal)
          signal.removeEventListener('abort', onAbort)
        reject(new Error('Timeout waiting for worker slot'))
      }, timeout)
      : null

    const onAbort = () => {
      drainWaiters.delete(onDrain)
      if (timer)
        (globalThis as any).clearTimeout(timer)
      const err = new Error('Aborted')
      ;(err as any).name = 'AbortError'
      reject(err)
    }

    if (signal)
      signal.addEventListener('abort', onAbort, { once: true })

    drainWaiters.add(onDrain)
  })
}

export interface BackpressureOptions {
  timeout?: number
  waitTimeout?: number
  backoffMs?: number
  maxRetries?: number
  signal?: AbortSignal
}

const defaultBackpressure = {
  timeout: 2000,
  waitTimeout: 1500,
  backoffMs: 30,
  maxRetries: 1,
}

export function setKaTeXBackpressureDefaults(opts: Partial<typeof defaultBackpressure>) {
  if (opts.timeout != null)
    defaultBackpressure.timeout = Math.max(0, Math.floor(opts.timeout))
  if (opts.waitTimeout != null)
    defaultBackpressure.waitTimeout = Math.max(0, Math.floor(opts.waitTimeout))
  if (opts.backoffMs != null)
    defaultBackpressure.backoffMs = Math.max(0, Math.floor(opts.backoffMs))
  if (opts.maxRetries != null)
    defaultBackpressure.maxRetries = Math.max(0, Math.floor(opts.maxRetries))
}

export function getKaTeXBackpressureDefaults() {
  return { ...defaultBackpressure }
}

export async function renderKaTeXWithBackpressure(content: string, displayMode = true, opts: BackpressureOptions = {}) {
  const timeout = opts.timeout ?? defaultBackpressure.timeout
  const waitTimeout = opts.waitTimeout ?? defaultBackpressure.waitTimeout
  const backoffMs = opts.backoffMs ?? defaultBackpressure.backoffMs
  const maxRetries = opts.maxRetries ?? defaultBackpressure.maxRetries
  const signal = opts.signal

  let attempt = 0
  for (;;) {
    if (signal?.aborted) {
      const err = new Error('Aborted')
      ;(err as any).name = 'AbortError'
      throw err
    }
    try {
      return await renderKaTeXInWorker(content, displayMode, timeout, signal)
    }
    catch (err: any) {
      if (err?.code !== WORKER_BUSY_CODE || attempt >= maxRetries)
        throw err
      attempt++
      await waitForKaTeXWorkerSlot(waitTimeout, signal).catch(() => {})
      if (signal?.aborted) {
        const e = new Error('Aborted')
        ;(e as any).name = 'AbortError'
        throw e
      }
      if (backoffMs > 0)
        await new Promise(r => (globalThis as any).setTimeout(r, backoffMs * attempt))
    }
  }
}
