/**
 * Thin wrappers over the FastAPI analytics endpoints.
 * All params use the API's exact query param names.
 */

const BASE = '/api/analytics'

/**
 * GET /api/analytics/companies
 * Returns { companies: [{ company_id, company_name }] } — no timeframe filter.
 * Used to seed the location dropdown.
 */
export function getCompanies({ companyIds }) {
  return get('/companies', { company_ids: companyIds.join(',') })
}

function buildQS(params) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') q.append(k, v)
  }
  return q.toString()
}

async function get(path, params = {}) {
  const qs = buildQS(params)
  const res = await fetch(`${BASE}${path}?${qs}`)
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText)
    throw new Error(`API ${path} → ${res.status}: ${msg}`)
  }
  return res.json()
}

/**
 * GET /api/analytics/breakdown
 * Returns { rows: [{ company_id, company_name, total_created, total_delivered,
 *   delivered_by_driver, delivered_by_dispatcher, total_failed, total_incomplete,
 *   total_deleted, ontime_percentage, avg_drive_time_minutes, avg_delivery_time_minutes }] }
 */
export function getBreakdown({ companyIds, timeframe }) {
  return get('/breakdown', {
    company_ids: companyIds.join(','),
    timeframe,
  })
}

/**
 * GET /api/analytics/drilldown
 * Returns { metric, stats, page, page_size, total_pages,
 *   orders: [DrilldownOrder] }
 */
export function getDrilldown({ companyId, metric, timeframe, page = 1, pageSize = 25 }) {
  return get('/drilldown', {
    company_id: companyId,
    metric,
    timeframe,
    page,
    page_size: pageSize,
  })
}

/**
 * GET /api/analytics/ontime-charts
 * Returns { charts: [{ chart_type, total_orders, buckets: [BucketEntry] }] }
 * chart_type ∈ { pickup, delivery, drive, ontime }
 */
export function getOntimeCharts({ companyIds, timeframe }) {
  return get('/ontime-charts', {
    company_ids: companyIds.join(','),
    timeframe,
  })
}
