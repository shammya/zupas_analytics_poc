import { useSelector } from 'react-redux'
import { selectVisibleRows } from '../../../store/analyticsSlice'
import TableRow from './TableRow'
import styles from '../styles/BreakdownTable.module.css'

export default function BreakdownTable({ onCellClick }) {
  const rows    = useSelector(selectVisibleRows)
  const loading = useSelector(
    (s) => s.analytics.loading.breakdown || s.analytics.loading.companyList
  )
  const drawer  = useSelector((s) => s.analytics.drawer)

  return (
    <div className={styles.tableCard}>
      <div className={styles.sectionTitle}>Breakdown by Companies</div>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.colCompany}>Company</th>
              <th className={`${styles.metricHead} ${styles.blue}`}>
                <span className={styles.dot} style={{ background: '#2563EB' }} />
                Created
              </th>
              <th className={`${styles.metricHead} ${styles.teal}`}>
                <span className={styles.dot} style={{ background: '#1B9970' }} />
                Delivered
              </th>
              <th className={`${styles.metricHead} ${styles.red}`}>
                <span className={styles.dot} style={{ background: '#D94040' }} />
                Failed
              </th>
              <th className={`${styles.metricHead} ${styles.orange}`}>
                <span className={styles.dot} style={{ background: '#E07020' }} />
                Incomplete
              </th>
              <th className={`${styles.metricHead} ${styles.slate}`}>
                <span className={styles.dot} style={{ background: '#6B7A8D' }} />
                Deleted
              </th>
              <th className={styles.pctHead}>% On-time</th>
              <th className={styles.avgHead}>Avg. on the way</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j}><div className={styles.skelCell} /></td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.empty}>
                  No data for selected filters
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.company_id}
                  row={row}
                  activeMetric={
                    drawer.isOpen && drawer.companyId === row.company_id
                      ? drawer.metric
                      : null
                  }
                  onCellClick={onCellClick}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
