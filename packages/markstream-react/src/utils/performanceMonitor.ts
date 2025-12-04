/**
 * Lightweight performance monitoring helper for KaTeX rendering.
 * Only used during development to understand Worker/cache benefits.
 */
interface RenderMetrics {
  type: 'worker' | 'direct' | 'cache-hit'
  duration: number
  formulaLength: number
  timestamp: number
  success: boolean
  error?: string
}

class PerformanceMonitor {
  private metrics: RenderMetrics[] = []
  private enabled = false
  private maxMetrics = 1000

  enable() {
    this.enabled = true
  }

  disable() {
    this.enabled = false
  }

  recordRender(metrics: RenderMetrics) {
    if (!this.enabled)
      return
    this.metrics.push(metrics)
    if (this.metrics.length > this.maxMetrics)
      this.metrics.shift()
  }

  private averages(kind: RenderMetrics['type']) {
    const rows = this.metrics.filter(m => m.type === kind && m.success)
    if (!rows.length)
      return 0
    return rows.reduce((sum, cur) => sum + cur.duration, 0) / rows.length
  }

  getStats() {
    if (!this.metrics.length) {
      return {
        totalRenders: 0,
        cacheHits: 0,
        cacheHitRate: '0.0',
        workerCalls: 0,
        directCalls: 0,
        averageWorkerTime: '0.00',
        averageDirectTime: '0.00',
        averageCacheHitTime: '0.000',
        workerSavings: '0.00',
        recommendation: 'Insufficient data',
      }
    }
    const workerAvg = this.averages('worker')
    const directAvg = this.averages('direct')
    const cacheHits = this.metrics.filter(m => m.type === 'cache-hit')
    const cacheAvg = cacheHits.length
      ? cacheHits.reduce((sum, cur) => sum + cur.duration, 0) / cacheHits.length
      : 0
    const totalRenders = this.metrics.length
    const estimatedDirect = totalRenders * directAvg
    const actualTime = (
      this.metrics.reduce((sum, cur) => sum + cur.duration, 0)
    )
    const workerSavings = estimatedDirect - actualTime
    const cacheHitRate = cacheHits.length / totalRenders * 100

    let recommendation = '✅ Worker prevents main thread blocking'
    if (cacheHitRate > 70 && workerAvg < directAvg * 2)
      recommendation = '✅ Worker + cache is highly beneficial'
    else if (cacheHitRate > 50)
      recommendation = '✅ Worker + cache is beneficial'
    else if (workerAvg > directAvg * 3 && directAvg > 0)
      recommendation = '⚠️ Worker overhead too high; consider direct rendering'
    else if (directAvg > 0 && directAvg < 5)
      recommendation = '⚠️ Formulas are trivial; worker may be unnecessary'

    return {
      totalRenders,
      cacheHits: cacheHits.length,
      cacheHitRate: cacheHitRate.toFixed(1),
      workerCalls: this.metrics.filter(m => m.type === 'worker').length,
      directCalls: this.metrics.filter(m => m.type === 'direct').length,
      averageWorkerTime: workerAvg.toFixed(2),
      averageDirectTime: directAvg.toFixed(2),
      averageCacheHitTime: cacheAvg.toFixed(3),
      workerSavings: workerSavings.toFixed(2),
      recommendation,
    }
  }

  printReport() {
    const stats = this.getStats()
    console.group('KaTeX Performance Report')
    console.log(`Total renders: ${stats.totalRenders}`)
    console.log(`Cache hits: ${stats.cacheHits} (${stats.cacheHitRate}%)`)
    console.log(`Worker average: ${stats.averageWorkerTime}ms`)
    console.log(`Direct average: ${stats.averageDirectTime}ms`)
    console.log(`Cache hit average: ${stats.averageCacheHitTime}ms`)
    console.log(`Estimated savings: ${stats.workerSavings}ms`)
    console.log(`Recommendation: ${stats.recommendation}`)
    console.groupEnd()
    return stats
  }

  reset() {
    this.metrics = []
  }

  exportMetrics() {
    return {
      metrics: [...this.metrics],
      stats: this.getStats(),
      timestamp: Date.now(),
    }
  }
}

export const perfMonitor = new PerformanceMonitor()

export function enablePerfMonitoring() {
  perfMonitor.enable()
}

export function disablePerfMonitoring() {
  perfMonitor.disable()
}

export function getPerfReport() {
  return perfMonitor.printReport()
}

if (typeof window !== 'undefined') {
  (window as any).__katexPerfMonitor = perfMonitor
  ;(window as any).__katexPerfReport = getPerfReport
}
