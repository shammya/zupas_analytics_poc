import styles from '../styles/SummaryCards.module.css'

export default function SummaryCard({
  variant,     // 'created' | 'delivered' | 'failed' | 'incomplete' | 'deleted' | 'ontime' | 'avgway' | 'avgplace'
  value,       // displayed value string, null = skeleton
  label,
  sub,
  icon,
  clickable,
  active,
  onClick,
}) {
  return (
    <div
      className={[
        styles.card,
        styles[variant],
        clickable ? styles.clickable : '',
        active    ? styles.activeScope : '',
      ].join(' ')}
      onClick={clickable ? onClick : undefined}
      role={clickable ? 'button' : undefined}
    >
      <div className={styles.iconWrap}>
        <span className={`${styles.iconBg} ${styles[`icon_${variant}`]}`}>{icon}</span>
      </div>
      <div className={`${styles.value} ${value == null ? styles.skel : ''}`}>
        {value ?? ''}
      </div>
      <div className={styles.label}>{label}</div>
      {sub && <div className={styles.sub}>{sub}</div>}
    </div>
  )
}
