import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { getCompanies, getBreakdown, getDrilldown, getOntimeCharts } from '../services/analyticsApi'
import { ALL_COMPANY_IDS } from '../constants/companies'

// ── Thunks ────────────────────────────────────────────────────────────────────

/**
 * Fetches the full company list (once on mount) to populate dropdown names.
 * Uses /companies — no timeframe filter — so the dropdown is always populated.
 * On first load, auto-selects the first 5 companies.
 */
export const loadCompanyList = createAsyncThunk(
  'analytics/loadCompanyList',
  async ({ companyIds }, { rejectWithValue }) => {
    try {
      return await getCompanies({ companyIds })
    } catch (e) {
      return rejectWithValue(e.message)
    }
  }
)

export const loadBreakdown = createAsyncThunk(
  'analytics/loadBreakdown',
  async ({ companyIds, timeframe }, { rejectWithValue }) => {
    try {
      return await getBreakdown({ companyIds, timeframe })
    } catch (e) {
      return rejectWithValue(e.message)
    }
  }
)

export const loadDrilldown = createAsyncThunk(
  'analytics/loadDrilldown',
  async ({ companyId, metric, timeframe, page, pageSize }, { rejectWithValue }) => {
    try {
      return await getDrilldown({ companyId, metric, timeframe, page, pageSize })
    } catch (e) {
      return rejectWithValue(e.message)
    }
  }
)

export const loadOntimeCharts = createAsyncThunk(
  'analytics/loadOntimeCharts',
  async ({ companyIds, timeframe }, { rejectWithValue }) => {
    try {
      return await getOntimeCharts({ companyIds, timeframe })
    } catch (e) {
      return rejectWithValue(e.message)
    }
  }
)

// ── Slice ─────────────────────────────────────────────────────────────────────

const initialState = {
  timeframe:         'this_month',
  selectedLocations: [],   // company_id integers; empty = not yet initialised
  companyList:       [],   // [{company_id, company_name}] — populated once for dropdown

  // Breakdown rows for selected companies only
  breakdownRows: [],

  ontime: {
    isOpen:     false,
    scopeIds:   [],
    scopeLabel: 'All Locations',
    activeTab:  'ontime',
    charts:     [],
  },

  drawer: {
    isOpen:     false,
    metric:     null,
    companyId:  null,
    companyName:'',
    page:       1,
    pageSize:   25,
    totalPages: 0,
    orders:     [],
    stats:      null,
  },

  loading: {
    companyList: false,
    breakdown:   false,
    drawer:      false,
    charts:      false,
  },

  error: null,
}

const slice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    setTimeframe(state, { payload }) {
      state.timeframe = payload
      state.ontime.isOpen = false
      state.drawer.isOpen = false
    },

    setSelectedLocations(state, { payload }) {
      state.selectedLocations = payload
      state.ontime.isOpen = false
      state.drawer.isOpen = false
    },

    openOntimePanel(state, { payload: { scopeIds, scopeLabel } }) {
      const same =
        state.ontime.isOpen &&
        JSON.stringify(state.ontime.scopeIds.sort()) ===
          JSON.stringify([...scopeIds].sort())
      if (same) {
        state.ontime.isOpen = false
      } else {
        state.ontime.isOpen     = true
        state.ontime.scopeIds   = scopeIds
        state.ontime.scopeLabel = scopeLabel
        state.ontime.charts     = []
      }
    },

    closeOntimePanel(state) {
      state.ontime.isOpen = false
    },

    setOntimeTab(state, { payload }) {
      state.ontime.activeTab = payload
    },

    openDrawer(state, { payload: { companyId, companyName, metric } }) {
      state.drawer.isOpen      = true
      state.drawer.companyId   = companyId
      state.drawer.companyName = companyName
      state.drawer.metric      = metric
      state.drawer.page        = 1
      state.drawer.orders      = []
      state.drawer.stats       = null
      state.drawer.totalPages  = 0
    },

    closeDrawer(state) {
      state.drawer.isOpen = false
    },

    setDrawerPage(state, { payload }) {
      state.drawer.page = payload
    },
  },

  extraReducers: (builder) => {
    // ── Company list (once on mount) ──
    builder
      .addCase(loadCompanyList.pending, (state) => {
        state.loading.companyList = true
        state.error = null
      })
      .addCase(loadCompanyList.fulfilled, (state, { payload }) => {
        state.loading.companyList = false
        state.companyList = payload.companies.map((r) => ({
          company_id:   r.company_id,
          company_name: r.company_name,
        }))
        // Auto-select all on first load
        if (state.selectedLocations.length === 0 && state.companyList.length > 0) {
          state.selectedLocations = state.companyList.map((c) => c.company_id)
        }
      })
      .addCase(loadCompanyList.rejected, (state, { payload }) => {
        state.loading.companyList = false
        state.error = payload
      })

    // ── Breakdown (for selected companies) ──
    builder
      .addCase(loadBreakdown.pending, (state) => {
        state.loading.breakdown = true
        state.error = null
      })
      .addCase(loadBreakdown.fulfilled, (state, { payload }) => {
        state.loading.breakdown = false
        state.breakdownRows = payload.rows
      })
      .addCase(loadBreakdown.rejected, (state, { payload }) => {
        state.loading.breakdown = false
        state.error = payload
      })

    // ── Drilldown ──
    builder
      .addCase(loadDrilldown.pending, (state) => {
        state.loading.drawer = true
      })
      .addCase(loadDrilldown.fulfilled, (state, { payload }) => {
        state.loading.drawer    = false
        state.drawer.orders     = payload.orders
        state.drawer.stats      = payload.stats
        state.drawer.totalPages = payload.total_pages
        state.drawer.page       = payload.page
      })
      .addCase(loadDrilldown.rejected, (state, { payload }) => {
        state.loading.drawer = false
        state.error = payload
      })

    // ── Ontime charts ──
    builder
      .addCase(loadOntimeCharts.pending, (state) => {
        state.loading.charts = true
      })
      .addCase(loadOntimeCharts.fulfilled, (state, { payload }) => {
        state.loading.charts = false
        state.ontime.charts  = payload.charts
      })
      .addCase(loadOntimeCharts.rejected, (state, { payload }) => {
        state.loading.charts = false
        state.error = payload
      })
  },
})

export const {
  setTimeframe, setSelectedLocations,
  openOntimePanel, closeOntimePanel, setOntimeTab,
  openDrawer, closeDrawer, setDrawerPage,
} = slice.actions

export default slice.reducer

// ── Selectors ─────────────────────────────────────────────────────────────────

/**
 * Company IDs in scope for charts / drilldown.
 * Falls back to all known companies when nothing specific is selected.
 */
export const selectActiveCompanyIds = (state) => {
  const { selectedLocations, companyList } = state.analytics
  return selectedLocations.length > 0
    ? selectedLocations
    : companyList.map((c) => c.company_id)
}

/**
 * breakdownRows already contains only the selected companies' data,
 * so no additional filtering is needed.
 */
export const selectVisibleRows = (state) => state.analytics.breakdownRows

/**
 * Aggregate summary computed from visible rows.
 * Weighted averages by total_delivered for percentages and times.
 */
export const selectAggregateSummary = (state) => {
  const rows = selectVisibleRows(state)
  if (!rows.length) return null

  const totals = rows.reduce(
    (acc, r) => ({
      total_created:           acc.total_created           + r.total_created,
      total_delivered:         acc.total_delivered         + r.total_delivered,
      delivered_by_driver:     acc.delivered_by_driver     + r.delivered_by_driver,
      delivered_by_dispatcher: acc.delivered_by_dispatcher + r.delivered_by_dispatcher,
      total_failed:            acc.total_failed            + r.total_failed,
      total_incomplete:        acc.total_incomplete        + r.total_incomplete,
      total_deleted:           acc.total_deleted           + r.total_deleted,
      _wOntime: acc._wOntime + r.ontime_percentage        * r.total_delivered,
      _wDrive:  acc._wDrive  + r.avg_drive_time_minutes   * r.total_delivered,
      _wDeliv:  acc._wDeliv  + r.avg_delivery_time_minutes * r.total_delivered,
    }),
    {
      total_created: 0, total_delivered: 0, delivered_by_driver: 0,
      delivered_by_dispatcher: 0, total_failed: 0, total_incomplete: 0,
      total_deleted: 0, _wOntime: 0, _wDrive: 0, _wDeliv: 0,
    }
  )

  const d = totals.total_delivered || 1
  return {
    ...totals,
    ontime_percentage:         parseFloat((totals._wOntime / d).toFixed(1)),
    avg_drive_time_minutes:    parseFloat((totals._wDrive  / d).toFixed(1)),
    avg_delivery_time_minutes: parseFloat((totals._wDeliv  / d).toFixed(1)),
  }
}
