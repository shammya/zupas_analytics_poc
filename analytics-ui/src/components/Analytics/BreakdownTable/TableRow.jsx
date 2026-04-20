import { useRef } from 'react'
import styles from '../styles/BreakdownTable.module.css'

const METRICS = ['created', 'delivered', 'failed', 'incomplete', 'deleted']

export default function TableRow({ row, activeMetric, onCellClick }) {
  return (
    <tr className={styles.tr}>
      <td className={styles.colCompany}>
        <span className={styles.companyName}>{row.company_name || `Company ${row.company_id}`}</span>
      </td>

      <MetricCell
        value={row.total_created}
        metric="created"
        row={row}
        active={activeMetric === 'created'}
        onCellClick={onCellClick}
      />

      <MetricCell
        value={row.total_delivered}
        metric="delivered"
        row={row}
        active={activeMetric === 'delivered'}
        onCellClick={onCellClick}
        sub={`${row.delivered_by_driver}d · ${row.delivered_by_dispatcher}p`}
      />

      <MetricCell
        value={row.total_failed}
        metric="failed"
        row={row}
        active={activeMetric === 'failed'}
        onCellClick={onCellClick}
      />

      <MetricCell
        value={row.total_incomplete}
        metric="incomplete"
        row={row}
        active={activeMetric === 'incomplete'}
        onCellClick={onCellClick}
      />

      <MetricCell
        value={row.total_deleted}
        metric="deleted"
        row={row}
        active={activeMetric === 'deleted'}
        onCellClick={onCellClick}
      />

      {/* On-time % — display only */}
      <td className={styles.pctCell}>
        <span className={styles.pctVal}>{row.ontime_percentage.toFixed(1)}%</span>
      </td>

      <td className={styles.avgCell}>
        {row.avg_drive_time_minutes.toFixed(0)} min
      </td>
    </tr>
  )
}

function MetricCell({ value, metric, row, active, onCellClick, sub }) {
  const ref = useRef(null)

  function handleClick(e) {
    // Ripple effect
    const el = ref.current
    if (el) {
      const r = document.createElement('span')
      r.className = styles.ripple
      const rect = el.getBoundingClientRect()
      r.style.left = `${e.clientX - rect.left}px`
      r.style.top  = `${e.clientY - rect.top}px`
      el.appendChild(r)
      setTimeout(() => r.remove(), 500)
    }
    onCellClick({ companyId: row.company_id, companyName: row.company_name, metric })
  }

  return (
    <td
      ref={ref}
      className={`${styles.metricCell} ${styles[`cell_${metric}`]} ${active ? styles.activeCell : ''}`}
      onClick={handleClick}
    >
      <span className={styles.cellVal}>{value.toLocaleString()}</span>
      {sub && <span className={styles.cellSub}>{sub}</span>}
    </td>
  )
}
