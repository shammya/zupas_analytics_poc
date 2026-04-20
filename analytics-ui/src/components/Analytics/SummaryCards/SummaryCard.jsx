import styles from '../styles/SummaryCards.module.css'

export default function SummaryCard({ variant, title, value, sub, icon }) {
  return (
    <div className={`${styles.card} ${styles[variant]}`}>
      <div className={styles.cardTop}>
        <span className={styles.cardTitle}>{title}</span>
        <span className={`${styles.iconBg} ${styles[`icon_${variant}`]}`}>{icon}</span>
      </div>
      <div className={`${styles.value} ${styles[`val_${variant}`]} ${value == null ? styles.skel : ''}`}>
        {value ?? ''}
      </div>
      {sub && <div className={styles.sub}>{sub}</div>}
    </div>
  )
}
