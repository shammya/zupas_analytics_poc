import { useSelector } from 'react-redux'
import { METRIC_CONFIG } from '../../../constants/metricConfig'
import styles from '../styles/Drawer.module.css'

export default function DrawerTable() {
  const drawer  = useSelector((s) => s.analytics.drawer)
  const loading = useSelector((s) => s.analytics.loading.drawer)
  const { metric, orders } = drawer

  const cfg = metric ? METRIC_CONFIG[metric] : null
  if (!cfg) return null

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          {cfg.columns.map((col) => (
            <th key={col.key}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <tr key={i}>
              {cfg.columns.map((col) => (
                <td key={col.key}><div className={styles.skelRow} /></td>
              ))}
            </tr>
          ))
        ) : orders.length === 0 ? (
          <tr>
            <td colSpan={cfg.columns.length} className={styles.empty}>No orders found</td>
          </tr>
        ) : (
          orders.map((order, i) => (
            <tr key={order.order_number ?? i}>
              {cfg.columns.map((col) => (
                <td key={col.key}>
                  <CellValue col={col} order={order} />
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}

function CellValue({ col, order }) {
  const raw = order[col.key]

  switch (col.type) {
    case 'datetime':
      return <span className={styles.dtVal}>{formatDatetime(raw)}</span>

    case 'badge':
      return <StatusBadge value={raw} />

    case 'ontime': {
      const promised  = order.promised_delivery_time
      const delivered = order.delivery_time

      if (promised && delivered) {
        // Compute delta: positive = late, negative = early
        const diffMins = Math.round(
          (new Date(delivered.replace(' ', 'T')) - new Date(promised.replace(' ', 'T'))) / 60000
        )
        if (diffMins <= 0) {
          const early = Math.abs(diffMins)
          return early === 0
            ? <span className={`${styles.badge} ${styles.badgeOntime}`}>On-time</span>
            : <span className={`${styles.badge} ${styles.badgeOntime}`}>{early} min early</span>
        }
        return <span className={`${styles.badge} ${styles.badgeLate}`}>{diffMins} min late</span>
      }

      // Fallback if timestamps are missing
      const mins = Number(raw)
      return mins <= 0
        ? <span className={`${styles.badge} ${styles.badgeOntime}`}>On-time</span>
        : <span className={`${styles.badge} ${styles.badgeLate}`}>{mins} min late</span>
    }

    case 'waiting': {
      const mins = Number(raw)
      const cls  = mins > 180 ? styles.ageCrit : mins > 60 ? styles.ageWarn : styles.ageFresh
      return <span className={cls}>{mins} min</span>
    }

    default:
      return <span>{raw || '—'}</span>
  }
}

function StatusBadge({ value }) {
  if (!value) return <span>—</span>

  const v   = String(value).toLowerCase()
  const map = {
    delivered:  styles.badgeDelivered,
    driver:     styles.badgeDriver,
    dispatcher: styles.badgeDispatcher,
    deleted:    styles.badgeDeleted,
    failed:     styles.badgeFailed,
    incomplete: styles.badgeIncomplete,
    not_assigned: styles.badgeUnassigned,
    assigned:   styles.badgeAssigned,
    dispatcher_delivery: styles.badgeDispatcher,
    driver_delivery:     styles.badgeDriver,
  }

  // Normalize known patterns
  let cls = map[v]
  if (!cls) {
    if (v.includes('driver'))     cls = styles.badgeDriver
    else if (v.includes('disp'))  cls = styles.badgeDispatcher
    else if (v.includes('delete')) cls = styles.badgeDeleted
    else                           cls = styles.badgeDefault
  }

  return <span className={`${styles.badge} ${cls}`}>{value}</span>
}

function formatDatetime(val) {
  if (!val) return '—'
  try {
    const d = new Date(val)
    if (isNaN(d)) return val
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    })
  } catch {
    return val
  }
}
