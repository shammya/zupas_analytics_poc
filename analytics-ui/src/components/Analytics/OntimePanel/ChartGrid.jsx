import { useSelector } from 'react-redux'
import { CHART_ORDER, CHART_TITLES } from '../../../constants/companies'
import PanelChart from './PanelChart'
import styles from '../styles/OntimePanel.module.css'

export default function ChartGrid() {
  const loading = useSelector((s) => s.analytics.loading.charts)
  const charts  = useSelector((s) => s.analytics.ontime.charts)

  // Build a map: chart_type → ChartData
  const chartMap = Object.fromEntries(charts.map((c) => [c.chart_type, c]))

  return (
    <div className={styles.grid}>
      {CHART_ORDER.map((type) => {
        const data = chartMap[type]
        return (
          <div key={type} className={styles.chartItem}>
            {loading || !data ? (
              <div className={styles.placeholder} />
            ) : (
              <PanelChart chartData={data} />
            )}
            <div className={styles.chartTitle}>{CHART_TITLES[type]}</div>
          </div>
        )
      })}
    </div>
  )
}
