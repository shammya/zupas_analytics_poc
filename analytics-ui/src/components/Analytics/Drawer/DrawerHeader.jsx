import { useDispatch, useSelector } from 'react-redux'
import { closeDrawer } from '../../../store/analyticsSlice'
import { METRIC_CONFIG } from '../../../constants/metricConfig'
import { TIMEFRAME_OPTIONS } from '../../../constants/companies'
import styles from '../styles/Drawer.module.css'

export default function DrawerHeader() {
  const dispatch  = useDispatch()
  const drawer    = useSelector((s) => s.analytics.drawer)
  const timeframe = useSelector((s) => s.analytics.timeframe)
  const { metric, companyName, stats } = drawer

  const cfg     = metric ? METRIC_CONFIG[metric] : null
  const tfLabel = TIMEFRAME_OPTIONS.find((t) => t.value === timeframe)?.label ?? timeframe

  if (!cfg) return null

  const statItems = stats ? cfg.stats(stats) : null

  return (
    <div className={styles.header}>
      {/* Breadcrumb */}
      <div className={styles.context}>
        <span>Analytics</span>
        <span className={styles.ctxSep}>›</span>
        <span className={styles.ctxActive}>{cfg.label}</span>
      </div>

      {/* Title row */}
      <div className={styles.titleRow}>
        <div className={styles.iconWrap} style={{ background: cfg.paleBg, color: cfg.color }}>
          {cfg.icon}
        </div>
        <div className={styles.titleGroup}>
          <div className={styles.title}>
            {cfg.label}
            {stats && (
              <span className={styles.badge}>{stats.total_count.toLocaleString()}</span>
            )}
          </div>
        </div>
        <button className={styles.closeBtn} onClick={() => dispatch(closeDrawer())}>✕</button>
      </div>

      {/* Scope */}
      <div className={styles.scope}>
        <span className={styles.scopeTag}>
          <LocationIcon />
          {companyName}
        </span>
        <span className={styles.scopeTag}>
          <CalendarIcon />
          {tfLabel}
        </span>
      </div>

      {/* Stats boxes */}
      {statItems && (
        <div className={styles.stats}>
          {statItems.map(({ value, label }) => (
            <div key={label} className={styles.stat}>
              <div className={styles.statVal}>{value}</div>
              <div className={styles.statLbl}>{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LocationIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 1.5C5.51 1.5 3.5 3.51 3.5 6c0 3.75 4.5 8.5 4.5 8.5S12.5 9.75 12.5 6c0-2.49-2.01-4.5-4.5-4.5z"/>
      <circle cx="8" cy="6" r="1.5"/>
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="3" width="12" height="11" rx="1.5"/>
      <path d="M5 1v3M11 1v3M2 7h12" strokeLinecap="round"/>
    </svg>
  )
}
