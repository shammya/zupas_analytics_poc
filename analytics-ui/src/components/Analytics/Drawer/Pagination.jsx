import { useSelector } from 'react-redux'
import styles from '../styles/Drawer.module.css'

export default function Pagination({ onPageChange }) {
  const { page, totalPages, orders, pageSize, stats } = useSelector((s) => s.analytics.drawer)
  const loading = useSelector((s) => s.analytics.loading.drawer)

  if (!totalPages) return null

  const total = stats?.total_count ?? 0
  const from  = (page - 1) * pageSize + 1
  const to    = Math.min(page * pageSize, total)

  // Build visible page numbers: show up to 5, with ellipsis
  const pages = buildPageRange(page, totalPages)

  return (
    <div className={styles.pagination}>
      <span className={styles.pgInfo}>
        {loading ? 'Loading…' : `Showing ${from}–${to} of ${total.toLocaleString()}`}
      </span>
      <div className={styles.pgBtns}>
        <button
          className={styles.pgBtn}
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(page - 1)}
        >
          ‹
        </button>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className={styles.pgEllipsis}>…</span>
          ) : (
            <button
              key={p}
              className={`${styles.pgBtn} ${p === page ? styles.pgCur : ''}`}
              disabled={loading}
              onClick={() => p !== page && onPageChange(p)}
            >
              {p}
            </button>
          )
        )}
        <button
          className={styles.pgBtn}
          disabled={page >= totalPages || loading}
          onClick={() => onPageChange(page + 1)}
        >
          ›
        </button>
      </div>
    </div>
  )
}

function buildPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages = []
  if (current <= 4) {
    pages.push(1, 2, 3, 4, 5, '…', total)
  } else if (current >= total - 3) {
    pages.push(1, '…', total - 4, total - 3, total - 2, total - 1, total)
  } else {
    pages.push(1, '…', current - 1, current, current + 1, '…', total)
  }
  return pages
}
