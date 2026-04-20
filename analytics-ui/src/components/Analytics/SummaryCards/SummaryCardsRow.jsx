import { useSelector } from 'react-redux'
import { selectAggregateSummary } from '../../../store/analyticsSlice'
import SummaryCard from './SummaryCard'
import styles from '../styles/SummaryCards.module.css'

const fmt = (v) => (v == null ? '—' : v.toLocaleString())
const fmtDec = (v, unit = '') => (v == null ? '—' : `${v.toFixed(1)}${unit}`)
const fmtDuration = (v) => {
  if (v == null) return '—'
  if (v < 60) return `${v.toFixed(1)} min`
  const h = Math.floor(v / 60)
  const m = Math.round(v % 60)
  return `${h}h ${m}m`
}

export default function SummaryCardsRow({ onOntimeClick }) {
  const summary  = useSelector(selectAggregateSummary)
  const loading  = useSelector(
    (s) => s.analytics.loading.breakdown || s.analytics.loading.companyList
  )
  const timeframe         = useSelector((s) => s.analytics.timeframe)
  const selectedLocations = useSelector((s) => s.analytics.selectedLocations)
  const breakdownRows     = useSelector((s) => s.analytics.breakdownRows)

  const s = summary

  function handleOntimeCardClick() {
    const ids = selectedLocations.length
      ? selectedLocations
      : breakdownRows.map((r) => r.company_id)
    const label = selectedLocations.length === 0
      ? 'All Locations'
      : selectedLocations.length === 1
      ? (breakdownRows.find((r) => r.company_id === selectedLocations[0])?.company_name ?? '1 store')
      : `${selectedLocations.length} locations`
    onOntimeClick({ scopeIds: ids, scopeLabel: label })
  }

  return (
    <div className={styles.zonesWrap}>
      {/* Zone 1 — Order Lifecycle */}
      <div className={styles.zone}>
        <div className={styles.cards}>
          <SummaryCard
            variant="created"
            value={loading ? null : fmt(s?.total_created)}
            label="orders placed this period"
            icon={<PlusCircleIcon />}
          />
          <SummaryCard
            variant="delivered"
            value={loading ? null : fmt(s?.total_delivered)}
            label="orders fulfilled"
            sub={
              s
                ? `${fmt(s.delivered_by_driver)} via driver · ${fmt(s.delivered_by_dispatcher)} by dispatcher`
                : null
            }
            icon={<CheckIcon />}
          />
          <SummaryCard
            variant="failed"
            value={loading ? null : fmt(s?.total_failed)}
            label="rejected or cancelled by driver"
            icon={<AlertIcon />}
          />
          <SummaryCard
            variant="incomplete"
            value={loading ? null : fmt(s?.total_incomplete)}
            label="never assigned to a driver"
            icon={<ClockIcon />}
          />
          <SummaryCard
            variant="deleted"
            value={loading ? null : fmt(s?.total_deleted)}
            label="removed this period"
            icon={<TrashIcon />}
          />
        </div>
      </div>

      {/* Zone 2 — Quality */}
      <div className={styles.zone}>
        <div className={styles.cards}>
          <SummaryCard
            variant="ontime"
            value={loading ? null : fmtDec(s?.ontime_percentage, '%')}
            label="% on-time deliveries"
            sub="click to see breakdown"
            clickable
            onClick={handleOntimeCardClick}
            icon={<ChartIcon />}
          />
          <SummaryCard
            variant="avgway"
            value={loading ? null : fmtDuration(s?.avg_drive_time_minutes)}
            label="avg. on the way"
            sub="pickup → delivery transit"
            icon={<RouteIcon />}
          />
          <SummaryCard
            variant="avgplace"
            value={loading ? null : fmtDuration(s?.avg_delivery_time_minutes)}
            label="avg. placement → delivery"
            sub="end-to-end per order"
            icon={<TimerIcon />}
          />
        </div>
      </div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const si = { viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: '1.75' }

function PlusCircleIcon()  { return <svg {...si}><circle cx="8" cy="8" r="6.5"/><path d="M8 5v6M5 8h6" strokeLinecap="round"/></svg> }
function CheckIcon()       { return <svg {...si}><path d="M2.5 8.5l3.5 3.5 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function AlertIcon()       { return <svg {...si}><circle cx="8" cy="8" r="6.5"/><path d="M8 5v3.5" strokeLinecap="round"/><circle cx="8" cy="11" r=".7" fill="currentColor" stroke="none"/></svg> }
function ClockIcon()       { return <svg {...si}><circle cx="8" cy="8" r="6.5"/><path d="M8 5v3.5l2 2" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function TrashIcon()       { return <svg {...si}><path d="M3 4h10M6 4V2.5h4V4M5 4l.5 9h5L11 4" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function ChartIcon()       { return <svg {...si}><rect x="2" y="2" width="12" height="12" rx="2"/><path d="M5 10V7M8 10V5M11 10V8" strokeLinecap="round"/></svg> }
function RouteIcon()       { return <svg {...si}><path d="M2 12c2-4 4-6 6-6s4 2 6-4" strokeLinecap="round"/></svg> }
function TimerIcon()       { return <svg {...si}><circle cx="8" cy="9" r="5.5"/><path d="M8 6v3.5l2 1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 2h4" strokeLinecap="round"/></svg> }
