import { useSelector } from 'react-redux'
import { selectAggregateSummary } from '../../../store/analyticsSlice'
import SummaryCard from './SummaryCard'
import styles from '../styles/SummaryCards.module.css'

const fmt      = (v) => (v == null ? '—' : v.toLocaleString())
const fmtDec   = (v, unit = '') => (v == null ? '—' : `${v.toFixed(1)}${unit}`)
const fmtDuration = (v) => {
  if (v == null) return '—'
  if (v < 60) return `${Math.round(v)} min`
  const h = Math.floor(v / 60)
  const m = Math.round(v % 60)
  return `${h}h ${m}m`
}

export default function SummaryCardsRow() {
  const summary = useSelector(selectAggregateSummary)
  const loading = useSelector(
    (s) => s.analytics.loading.breakdown || s.analytics.loading.companyList
  )
  const s = summary

  const deliveredSub = s ? (
    <span>
      <span style={{ color: '#1B9970', fontWeight: 600 }}>{fmt(s.delivered_by_driver)} via driver</span>
      {' · '}
      <span style={{ color: '#E07020', fontWeight: 600 }}>{fmt(s.delivered_by_dispatcher)} by dispatcher</span>
    </span>
  ) : null

  return (
    <div className={styles.sectionsWrap}>
      {/* ORDER LIFECYCLE */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Order Lifecycle</div>
        <div className={styles.cards}>
          <SummaryCard
            variant="created"
            title="Created orders"
            value={loading ? null : fmt(s?.total_created)}
            sub="orders placed this period"
            icon={<PlusCircleIcon />}
          />
          <SummaryCard
            variant="delivered"
            title="Delivered orders"
            value={loading ? null : fmt(s?.total_delivered)}
            sub={deliveredSub}
            icon={<CheckIcon />}
          />
          <SummaryCard
            variant="failed"
            title="Failed orders"
            value={loading ? null : fmt(s?.total_failed)}
            sub="rejected or cancelled by driver"
            icon={<AlertIcon />}
          />
          <SummaryCard
            variant="incomplete"
            title="Incomplete orders"
            value={loading ? null : fmt(s?.total_incomplete)}
            sub="never assigned to a driver"
            icon={<ClockIcon />}
          />
          <SummaryCard
            variant="deleted"
            title="Deleted orders"
            value={loading ? null : fmt(s?.total_deleted)}
            sub="deleted this period"
            icon={<TrashIcon />}
          />
        </div>
      </div>

      {/* QUALITY METRICS */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Quality Metrics</div>
        <div className={styles.cards}>
          <SummaryCard
            variant="ontime"
            title="% On-time deliveries"
            value={loading ? null : fmtDec(s?.ontime_percentage, '%')}
            icon={<ChartIcon />}
          />
          <SummaryCard
            variant="avgway"
            title="Avg. on the way"
            value={loading ? null : fmtDuration(s?.avg_drive_time_minutes)}
            icon={<RouteIcon />}
          />
          <SummaryCard
            variant="avgplace"
            title="Avg. placement → delivery"
            value={loading ? null : fmtDuration(s?.avg_delivery_time_minutes)}
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
