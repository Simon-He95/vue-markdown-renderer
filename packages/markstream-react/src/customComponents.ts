import type { ComponentType } from 'react'

export type CustomComponentMap = Record<string, ComponentType<any>>

const GLOBAL_KEY = '__global__'
const scopedComponents: Record<string, CustomComponentMap> = {}

export function setCustomComponents(id: string, mapping: CustomComponentMap): void
export function setCustomComponents(mapping: CustomComponentMap): void
export function setCustomComponents(idOrMapping: string | CustomComponentMap, maybeMapping?: CustomComponentMap) {
  if (typeof idOrMapping === 'string')
    scopedComponents[idOrMapping] = { ...(maybeMapping || {}) }
  else
    scopedComponents[GLOBAL_KEY] = { ...idOrMapping }
}

export function getCustomNodeComponents(customId?: string): CustomComponentMap {
  if (!customId)
    return scopedComponents[GLOBAL_KEY] || {}
  return scopedComponents[customId] || scopedComponents[GLOBAL_KEY] || {}
}

export function removeCustomComponents(id: string) {
  if (id === GLOBAL_KEY)
    throw new Error('removeCustomComponents: cannot delete global mapping; call clearGlobalCustomComponents instead.')
  delete scopedComponents[id]
}

export function clearGlobalCustomComponents() {
  delete scopedComponents[GLOBAL_KEY]
}
