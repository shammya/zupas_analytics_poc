import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  loadCompanyList, loadBreakdown, loadDrilldown, loadOntimeCharts,
  selectActiveCompanyIds,
  openDrawer, setDrawerPage,
  openOntimePanel,
} from '../../store/analyticsSlice'
import { ALL_COMPANY_IDS } from '../../constants/companies'
import FilterRow from './FilterRow/FilterRow'
import SummaryCardsRow from './SummaryCards/SummaryCardsRow'
import OntimePanel from './OntimePanel/OntimePanel'
import BreakdownTable from './BreakdownTable/BreakdownTable'
import Drawer from './Drawer/Drawer'

export default function AnalyticsPage() {
  const dispatch           = useDispatch()
  const timeframe          = useSelector((s) => s.analytics.timeframe)
  const selectedLocations  = useSelector((s) => s.analytics.selectedLocations)
  const activeIds          = useSelector(selectActiveCompanyIds)
  const drawer             = useSelector((s) => s.analytics.drawer)
  const ontimeState        = useSelector((s) => s.analytics.ontime)

  // Load full company list once on mount (to populate the dropdown with names).
  // Uses a fixed timeframe so we always get names even if today has no orders.
  useEffect(() => {
    dispatch(loadCompanyList({ companyIds: ALL_COMPANY_IDS }))
  }, [dispatch]) // eslint-disable-line

  // Load breakdown when selectedLocations or timeframe changes.
  // Skip until selectedLocations is populated by loadCompanyList.
  useEffect(() => {
    if (!selectedLocations.length) return
    dispatch(loadBreakdown({ companyIds: selectedLocations, timeframe }))
  }, [dispatch, timeframe, selectedLocations.join(',')])  // eslint-disable-line

  // Load charts when ontime panel opens or scope/timeframe changes
  useEffect(() => {
    if (!ontimeState.isOpen) return
    const ids = ontimeState.scopeIds.length ? ontimeState.scopeIds : activeIds
    dispatch(loadOntimeCharts({ companyIds: ids, timeframe }))
  }, [dispatch, ontimeState.isOpen, ontimeState.scopeIds.join(','), timeframe]) // eslint-disable-line

  // Load drilldown when drawer opens or page changes
  useEffect(() => {
    if (!drawer.isOpen || !drawer.companyId || !drawer.metric) return
    dispatch(loadDrilldown({
      companyId: drawer.companyId,
      metric:    drawer.metric,
      timeframe,
      page:      drawer.page,
      pageSize:  drawer.pageSize,
    }))
  }, [dispatch, drawer.isOpen, drawer.companyId, drawer.metric, drawer.page, timeframe])

  function handleCellClick({ companyId, companyName, metric }) {
    dispatch(openDrawer({ companyId, companyName, metric }))
  }

  function handleOntimeClick({ scopeIds, scopeLabel }) {
    dispatch(openOntimePanel({ scopeIds, scopeLabel }))
  }

  function handleDrawerPageChange(page) {
    dispatch(setDrawerPage(page))
  }

  return (
    <>
      <FilterRow />
      <SummaryCardsRow onOntimeClick={handleOntimeClick} />
      <OntimePanel />
      <BreakdownTable
        onCellClick={handleCellClick}
        onOntimeClick={handleOntimeClick}
      />
      <Drawer onPageChange={handleDrawerPageChange} />
    </>
  )
}
