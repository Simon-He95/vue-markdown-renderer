let cachedMermaid: any = null
let importAttempted = false

export async function getMermaid() {
  if (cachedMermaid)
    return cachedMermaid
  if (importAttempted)
    return null
  importAttempted = true
  try {
    const mod = await import('mermaid')
    const candidate = mod?.default || mod
    if (candidate?.default)
      cachedMermaid = candidate.default
    else if (candidate?.mermaidAPI)
      cachedMermaid = candidate
    else if (candidate?.mermaid)
      cachedMermaid = candidate.mermaid
    else
      cachedMermaid = candidate
    if (!cachedMermaid)
      throw new Error('Mermaid module did not export expected API')
    if (typeof cachedMermaid.initialize === 'function')
      cachedMermaid.initialize({ startOnLoad: false, securityLevel: 'loose' })
    else if (cachedMermaid.mermaidAPI?.initialize)
      cachedMermaid.mermaidAPI.initialize({ startOnLoad: false, securityLevel: 'loose' })
    return cachedMermaid
  }
  catch (err) {
    console.warn('[markstream-react] Failed to load mermaid:', err)
    return null
  }
}
