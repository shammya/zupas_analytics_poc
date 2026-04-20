import { useDispatch, useSelector } from 'react-redux'
import { setTimeframe } from '../../../store/analyticsSlice'
import { TIMEFRAME_OPTIONS } from '../../../constants/companies'
import styles from '../styles/FilterRow.module.css'

export default function TimeFrameSelector() {
  const dispatch  = useDispatch()
  const timeframe = useSelector((s) => s.analytics.timeframe)

  return (
    <div className={styles.tfTabs}>
      {TIMEFRAME_OPTIONS.map(({ label, value }) => (
        <button
          key={value}
          className={`${styles.tfTab} ${timeframe === value ? styles.active : ''}`}
          onClick={() => dispatch(setTimeframe(value))}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
