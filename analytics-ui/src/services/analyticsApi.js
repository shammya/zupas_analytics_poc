/**
 * Thin wrappers over the FastAPI analytics endpoints.
 * All params use the API's exact query param names.
 * Every request includes the JWT Bearer token from localStorage.
 */

const BASE = '/api/analytics'
const TOKEN_KEY = 'analytics_token'

function buildQS(params) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') q.append(k, v)
  }
  return q.toString()
}

async function get(path, params = {}) {
  const qs  = buildQS(params)
  const token = localStorage.getItem(TOKEN_KEY)

  const res = await fetch(`${BASE}${path}?${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  // Token expired or invalid — force logout by clearing storage
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY)
    window.location.reload()   // Redux state will rehydrate as logged-out
  }

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText)
    throw new Error(`API ${path} → ${res.status}: ${msg}`)
  }
  return res.json()
}

/**
 * GET /api/analytics/companies
 * Returns { companies: [{ company_id, company_name }] } — no timeframe filter.
 * Used to seed the location dropdown.
 */
export function getCompanies({ companyIds }) {
  return get('/companies', { company_ids: companyIds.join(',') })
}

/**
 * GET /api/analytics/breakdown
 */
export function getBreakdown({ companyIds, timeframe }) {
  return get('/breakdown', {
    company_ids: companyIds.join(','),
    timeframe,
  })
}

/**
 * GET /api/analytics/drilldown
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
 */
export function getOntimeCharts({ companyIds, timeframe }) {
  return get('/ontime-charts', {
    company_ids: companyIds.join(','),
    timeframe,
  })
}
