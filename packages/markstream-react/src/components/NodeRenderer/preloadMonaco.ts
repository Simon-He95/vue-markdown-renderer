let isPreloaded = false

export async function preload(mod: any) {
  if (isPreloaded)
    return
  isPreloaded = true
  if (mod?.preloadMonacoWorkers)
    await mod.preloadMonacoWorkers()
}
