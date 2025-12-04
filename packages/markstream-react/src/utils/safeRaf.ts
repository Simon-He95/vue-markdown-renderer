export function safeRaf(cb: FrameRequestCallback) {
  try {
    if (typeof globalThis !== 'undefined' && typeof (globalThis as any).requestAnimationFrame === 'function')
      return (globalThis as any).requestAnimationFrame(cb)
  }
  catch {}
  return (globalThis as any).setTimeout(cb as any, 0) as unknown as number
}

export function safeCancelRaf(id: number | null | undefined) {
  if (id == null)
    return
  try {
    if (typeof globalThis !== 'undefined' && typeof (globalThis as any).cancelAnimationFrame === 'function') {
      (globalThis as any).cancelAnimationFrame(id)
      return
    }
  }
  catch {}
  try {
    ;(globalThis as any).clearTimeout(id)
  }
  catch {}
}
