import styles from './AppShell.module.css'

const NAV_ITEMS = [
  { section: 'Operations', items: [
    { label: 'Dashboard', icon: dashIcon },
    { label: 'Orders',    icon: ordersIcon },
    { label: 'Drivers',   icon: driversIcon },
  ]},
  { section: 'Insights', items: [
    { label: 'Reports',     icon: reportsIcon, active: true },
    { label: 'AI Insights', icon: aiIcon },
  ]},
  { section: 'System', items: [
    { label: 'Settings', icon: settingsIcon },
  ]},
]

export default function AppShell({ children }) {
  return (
    <div className={styles.shell}>
      <nav className={styles.nav}>
        <div className={styles.navBrand}>
          <span className={styles.navLogo}>S</span>
          <span className={styles.navTitle}>Shipday</span>
        </div>
        <div className={styles.navScroll}>
          {NAV_ITEMS.map(({ section, items }) => (
            <div key={section}>
              <div className={styles.navSection}>{section}</div>
              {items.map(({ label, icon, active }) => (
                <div
                  key={label}
                  className={`${styles.navItem} ${active ? styles.active : ''}`}
                >
                  <span className={styles.navIcon}>{icon}</span>
                  {label}
                </div>
              ))}
            </div>
          ))}
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.topbar}>
          <span className={styles.breadcrumb}>
            Reports <span className={styles.breadSep}>›</span>
            <span className={styles.breadActive}>Analytics</span>
          </span>
        </div>
        <div className={styles.page}>{children}</div>
      </main>
    </div>
  )
}

// ── SVG icons ─────────────────────────────────────────────────────────────────

function dashIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  )
}
function ordersIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 2h10l1 3H2L3 2z" />
      <path d="M2 5v9h12V5" />
      <path d="M6 9h4" strokeLinecap="round" />
    </svg>
  )
}
function driversIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="8" cy="5" r="2.5" />
      <path d="M3 14c0-2.76 2.24-5 5-5s5 2.24 5 5" strokeLinecap="round" />
    </svg>
  )
}
function reportsIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="2" y="2" width="12" height="12" rx="2" />
      <path d="M5 10V8M8 10V6M11 10V4" strokeLinecap="round" />
    </svg>
  )
}
function aiIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M8 2l1.5 4.5H14l-3.7 2.7 1.4 4.3L8 11l-3.7 2.5 1.4-4.3L2 6.5h4.5z" strokeLinejoin="round" />
    </svg>
  )
}
function settingsIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" strokeLinecap="round" />
    </svg>
  )
}
