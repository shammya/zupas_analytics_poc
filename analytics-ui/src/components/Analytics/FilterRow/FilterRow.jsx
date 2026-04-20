import LocationFilter from './LocationFilter'
import TimeFrameSelector from './TimeFrameSelector'
import styles from '../styles/FilterRow.module.css'

export default function FilterRow() {
  return (
    <div className={styles.filterRow}>
      <LocationFilter />
      <TimeFrameSelector />
    </div>
  )
}
