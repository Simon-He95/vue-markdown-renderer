import React, { createContext, useContext, useMemo, useRef } from 'react'

export interface VisibilityHandle {
  isVisible: () => boolean
  whenVisible: Promise<void>
  destroy: () => void
}

export type RegisterViewportFn = (el: HTMLElement, opts?: { rootMargin?: string, threshold?: number }) => VisibilityHandle

type GetRootFn = () => HTMLElement | null
type EnabledFn = () => boolean

const ViewportPriorityContext = createContext<RegisterViewportFn | null>(null)

function createViewportRegistrar(getRoot: GetRootFn, enabled: EnabledFn): RegisterViewportFn {
  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined'
  let observer: IntersectionObserver | null = null
  let currentRoot: Element | null = null
  const targets = new Map<Element, { resolve: () => void, state: { current: boolean } }>()

  const handleEntries = (entries: IntersectionObserverEntry[]) => {
    for (const entry of entries) {
      const target = targets.get(entry.target)
      if (!target)
        continue
      const isVisible = entry.isIntersecting || entry.intersectionRatio > 0
      if (!isVisible)
        continue
      target.state.current = true
      try {
        target.resolve()
      }
      catch {}
      observer?.unobserve(entry.target)
      targets.delete(entry.target)
    }
  }

  const ensureObserver = () => {
    if (!isBrowser)
      return null
    if (typeof IntersectionObserver === 'undefined')
      return null
    const root = getRoot() ?? null
    if (observer && root === currentRoot)
      return observer
    if (observer) {
      try {
        observer.disconnect()
      }
      catch {}
      observer = null
    }
    observer = new IntersectionObserver(handleEntries, {
      root,
      rootMargin: '300px',
      threshold: 0,
    })
    currentRoot = root
    for (const element of targets.keys()) {
      observer.observe(element)
    }
    return observer
  }

  const register: RegisterViewportFn = (el) => {
    const state = { current: false }
    let settled = false
    let resolve!: () => void
    const whenVisible = new Promise<void>((res) => {
      resolve = () => {
        if (settled)
          return
        settled = true
        res()
      }
    })
    const destroy = () => {
      targets.delete(el)
      try {
        observer?.unobserve(el)
      }
      catch {}
    }

    if (!isBrowser || !enabled()) {
      state.current = true
      resolve()
      return {
        isVisible: () => true,
        whenVisible,
        destroy,
      }
    }

    const obs = ensureObserver()
    if (!obs) {
      state.current = true
      resolve()
      return {
        isVisible: () => true,
        whenVisible,
        destroy,
      }
    }

    targets.set(el, { resolve, state })
    obs.observe(el)
    return {
      isVisible: () => state.current,
      whenVisible,
      destroy,
    }
  }

  return register
}

const fallbackRegister = createViewportRegistrar(() => null, () => true)

export interface ViewportPriorityProviderProps {
  getRoot: () => HTMLElement | null
  enabled?: boolean
  children: React.ReactNode
}

export function ViewportPriorityProvider({ getRoot, enabled = true, children }: ViewportPriorityProviderProps) {
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled
  const getRootRef = useRef(getRoot)
  getRootRef.current = getRoot

  const registrar = useMemo(() => {
    return createViewportRegistrar(() => getRootRef.current?.() ?? null, () => enabledRef.current)
  }, [])

  return (
    <ViewportPriorityContext.Provider value={registrar}>
      {children}
    </ViewportPriorityContext.Provider>
  )
}

export function useViewportPriority(): RegisterViewportFn {
  return useContext(ViewportPriorityContext) ?? fallbackRegister
}
