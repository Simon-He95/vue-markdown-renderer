let katex: any = null
let importAttempted = false

export async function getKatex() {
  if (katex)
    return katex
  if (importAttempted)
    return null
  try {
    katex = await import('katex')
    await import('katex/contrib/mhchem')
    return katex
  }
  catch {
    importAttempted = true
    return null
  }
}
