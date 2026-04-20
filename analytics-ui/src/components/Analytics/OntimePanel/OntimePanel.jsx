import { useDispatch, useSelector } from 'react-redux'
import { closeOntimePanel, setOntimeTab } from '../../../store/analyticsSlice'
import { TIMEFRAME_OPTIONS } from '../../../constants/companies'
import ChartGrid from './ChartGrid'
import styles from '../styles/OntimePanel.module.css'

export default function OntimePanel() {
  const dispatch   = useDispatch()
  const ontime     = useSelector((s) => s.analytics.ontime)
  const timeframe  = useSelector((s) => s.analytics.timeframe)
  const tfLabel    = TIMEFRAME_OPTIONS.find((t) => t.value === timeframe)?.label ?? timeframe

  const { isOpen, scopeLabel, activeTab } = ontime

  return (
    <div className={`${styles.panel} ${isOpen ? styles.open : ''}`}>
      <div className={styles.inner}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.breadcrumb}>
            <span>Analytics</span>
            <span className={styles.sep}>›</span>
            <span className={styles.breadActive}>{tfLabel}</span>
            <span className={styles.sep}>›</span>
            <span className={styles.breadActive}>On-time Delivery Breakdown</span>
          </div>
          <button className={styles.closeBtn} onClick={() => dispatch(closeOntimePanel())}>✕</button>
        </div>

        {/* Scope */}
        <div className={styles.scope}>
          <span className={styles.scopeTag}>
            <LocationIcon />
            {scopeLabel}
          </span>
          <span className={styles.scopeTag}>
            <CalendarIcon />
            {tfLabel}
          </span>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'ontime' ? styles.activeTab : ''}`}
            onClick={() => dispatch(setOntimeTab('ontime'))}
          >
            On-time Deliveries
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'delivery' ? styles.activeTab : ''} ${styles.disabled}`}
            title="Coming soon"
            disabled
          >
            Delivery Times
          </button>
        </div>

        {/* Charts */}
        <ChartGrid />
      </div>
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
