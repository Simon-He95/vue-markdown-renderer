type Theme = 'light' | 'dark'

let worker: Worker | null = null
let workerInitError: any = null

interface Pending {
  resolve: (v: any) => void
  reject: (e: any) => void
}

const rpcMap = new Map<string, Pending>()
const MAX_CONCURRENCY_DEFAULT = 5
let maxConcurrency = MAX_CONCURRENCY_DEFAULT
let DEBUG_CLIENT = false

export function setMermaidWorkerClientDebug(enabled: boolean) {
  DEBUG_CLIENT = !!enabled
}

export function setMermaidWorkerMaxConcurrency(n: number) {
  if (Number.isFinite(n) && n > 0)
    maxConcurrency = Math.floor(n)
}

export function getMermaidWorkerLoad() {
  return { inFlight: rpcMap.size, max: maxConcurrency }
}

export const MERMAID_WORKER_BUSY_CODE = 'WORKER_BUSY'

export function setMermaidWorker(w: Worker) {
  worker = w
  workerInitError = null
  const current = w
  worker.onmessage = (e: MessageEvent) => {
    if (worker !== current)
      return
    const { id, ok, result, error } = e.data
    const p = rpcMap.get(id)
    if (!p)
      return
    if (ok === false || error)
      p.reject(new Error(error || 'Unknown error'))
    else
      p.resolve(result)
  }
  worker.onerror = (e: ErrorEvent) => {
    if (worker !== current)
      return
    if (rpcMap.size === 0) {
      console.debug?.('[mermaidWorkerClient] Worker error (no pending):', e?.message || e)
      return
    }
    try {
      if (DEBUG_CLIENT)
        console.error('[mermaidWorkerClient] Worker error:', e?.message || e)
      else
        console.debug?.('[mermaidWorkerClient] Worker error:', e?.message || e)
    }
    catch {}
    for (const [_id, p] of rpcMap.entries())
      p.reject(new Error(`Worker error: ${e.message}`))
    rpcMap.clear()
  }
  ;(worker as any).onmessageerror = (ev: MessageEvent) => {
    if (worker !== current)
      return
    if (rpcMap.size === 0) {
      console.debug?.('[mermaidWorkerClient] Worker messageerror (no pending):', ev)
      return
    }
    try {
      if (DEBUG_CLIENT)
        console.error('[mermaidWorkerClient] Worker messageerror:', ev)
      else
        console.debug?.('[mermaidWorkerClient] Worker messageerror:', ev)
    }
    catch {}
    for (const [_id, p] of rpcMap.entries())
      p.reject(new Error('Worker messageerror'))
    rpcMap.clear()
  }
}

export function clearMermaidWorker() {
  if (worker) {
    try {
      for (const [_id, p] of rpcMap.entries())
        p.reject(new Error('Worker cleared'))
      rpcMap.clear()
      worker.terminate?.()
    }
    catch {}
  }
  worker = null
  workerInitError = null
}

function ensureWorker() {
  if (!worker) {
    workerInitError = new Error('[mermaidWorkerClient] No worker instance set. Please inject a Worker via setMermaidWorker().')
    ;(workerInitError as any).name = 'WORKER_INIT_ERROR'
    ;(workerInitError as any).code = 'WORKER_INIT_ERROR'
    return null
  }
  return worker
}

function callWorker<T>(action: 'canParse' | 'findPrefix', payload: any, timeout = 1400): Promise<T> {
  if (workerInitError)
    return Promise.reject(workerInitError)
  const wk = ensureWorker()
  if (!wk)
    return Promise.reject(workerInitError)
  if (rpcMap.size >= maxConcurrency) {
    const err: any = new Error('Worker busy')
    err.name = 'WorkerBusy'
    err.code = MERMAID_WORKER_BUSY_CODE
    err.inFlight = rpcMap.size
    err.max = maxConcurrency
    return Promise.reject(err)
  }
  return new Promise<T>((resolve, reject) => {
    const id = Math.random().toString(36).slice(2)
    let settled = false
    let timeoutId: any
    const cleanup = () => {
      if (settled)
        return
      settled = true
      if (timeoutId != null)
        (globalThis as any).clearTimeout(timeoutId)
      rpcMap.delete(id)
    }
    const pending: Pending = {
      resolve: (v) => {
        cleanup()
        resolve(v)
      },
      reject: (e) => {
        cleanup()
        reject(e)
      },
    }
    rpcMap.set(id, pending)
    try {
      wk.postMessage({ id, action, payload })
    }
    catch (err) {
      rpcMap.delete(id)
      reject(err)
      return
    }
    timeoutId = (globalThis as any).setTimeout(() => {
      const err: any = new Error('Worker call timed out')
      err.name = 'WorkerTimeout'
      err.code = 'WORKER_TIMEOUT'
      const p = rpcMap.get(id)
      p?.reject(err)
    }, timeout)
  })
}

export async function canParseOffthread(code: string, theme: Theme, timeout = 1400) {
  try {
    return await callWorker<boolean>('canParse', { code, theme }, timeout)
  }
  catch (e) {
    throw e
  }
}

export async function findPrefixOffthread(code: string, theme: Theme, timeout = 2400) {
  return callWorker<string | null>('findPrefix', { code, theme }, timeout)
}

export function terminateWorker() {
  worker?.terminate?.()
  worker = null
  workerInitError = null
  rpcMap.clear()
}
