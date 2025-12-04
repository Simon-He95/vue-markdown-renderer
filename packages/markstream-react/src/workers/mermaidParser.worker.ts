/// <reference lib="webworker" />
import mermaid from 'mermaid'

declare const self: DedicatedWorkerGlobalScope

mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' })

type Theme = 'light' | 'dark'

interface Req {
  id: string
  action: 'canParse' | 'findPrefix' | (string & {})
  payload: { code: string, theme: Theme }
}

type Res
  = | { id: string, ok: true, result: any }
    | { id: string, ok: false, error: string }

function applyThemeTo(code: string, theme: Theme) {
  const themeValue = theme === 'dark' ? 'dark' : 'default'
  const themeConfig = `%%{init: {"theme": "${themeValue}"}}%%\n`
  const trimmed = code.trimStart()
  if (trimmed.startsWith('%%{'))
    return code
  return themeConfig + code
}

function findHeaderIndex(lines: string[]) {
  const headerRe
    = /^(?:graph|flowchart|flowchart\s+tb|flowchart\s+lr|sequenceDiagram|gantt|classDiagram|stateDiagram(?:-v2)?|erDiagram|journey|pie|quadrantChart|timeline|xychart(?:-beta)?)\b/
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim()
    if (!l)
      continue
    if (l.startsWith('%%'))
      continue
    if (headerRe.test(l))
      return i
  }
  return -1
}

async function canParse(code: string, theme: Theme) {
  const themed = applyThemeTo(code, theme)
  const anyMermaid = mermaid as any
  if (typeof anyMermaid.parse === 'function') {
    await anyMermaid.parse?.(themed)
    return true
  }
  throw new Error('mermaid.parse not available in worker')
}

async function findLastRenderablePrefix(baseCode: string, theme: Theme) {
  const lines = baseCode.split('\n')
  const headerIdx = findHeaderIndex(lines)
  if (headerIdx === -1)
    return null
  const head = lines.slice(0, headerIdx + 1)
  await canParse(head.join('\n'), theme)

  let low = headerIdx + 1
  let high = lines.length
  let lastGood = headerIdx + 1
  let tries = 0
  const MAX_TRIES = 12

  while (low <= high && tries < MAX_TRIES) {
    const mid = Math.floor((low + high) / 2)
    const candidate = [...head, ...lines.slice(headerIdx + 1, mid)].join('\n')
    tries++
    try {
      await canParse(candidate, theme)
      lastGood = mid
      low = mid + 1
    }
    catch {
      high = mid - 1
    }
  }

  return [...head, ...lines.slice(headerIdx + 1, lastGood)].join('\n')
}

self.onmessage = async (ev: MessageEvent<Req>) => {
  const msg = ev.data
  const send = (res: Res) => self.postMessage(res)
  const id = msg.id

  try {
    if (msg.action === 'canParse') {
      const ok = await canParse(msg.payload.code, msg.payload.theme as Theme)
      send({ id, ok: true, result: ok })
      return
    }
    if (msg.action === 'findPrefix') {
      const res = await findLastRenderablePrefix(
        msg.payload.code,
        msg.payload.theme as Theme,
      )
      send({ id, ok: true, result: res })
      return
    }
    send({ id, ok: false, error: 'Unknown action' })
  }
  catch (e: any) {
    send({ id, ok: false, error: e?.message ?? String(e) })
  }
}

export {}
