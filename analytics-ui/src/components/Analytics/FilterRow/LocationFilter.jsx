import { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setSelectedLocations } from '../../../store/analyticsSlice'
import styles from '../styles/FilterRow.module.css'

export default function LocationFilter() {
  const dispatch          = useDispatch()
  const companyList       = useSelector((s) => s.analytics.companyList)
  const selectedLocations = useSelector((s) => s.analytics.selectedLocations)

  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = companyList.filter((r) =>
    r.company_name.toLowerCase().includes(search.toLowerCase())
  )

  const isAll = companyList.length > 0 && selectedLocations.length === companyList.length

  function toggleAll() {
    if (isAll) {
      // Deselect all → go back to first 5
      dispatch(setSelectedLocations(companyList.slice(0, 5).map((c) => c.company_id)))
    } else {
      dispatch(setSelectedLocations(companyList.map((c) => c.company_id)))
    }
  }

  function toggleCompany(id) {
    if (selectedLocations.includes(id)) {
      const next = selectedLocations.filter((x) => x !== id)
      if (next.length === 0) return   // keep at least 1 selected
      dispatch(setSelectedLocations(next))
    } else {
      dispatch(setSelectedLocations([...selectedLocations, id]))
    }
  }

  const label =
    isAll
      ? 'All Locations'
      : selectedLocations.length === 1
      ? companyList.find((r) => r.company_id === selectedLocations[0])?.company_name ?? '1 location'
      : `${selectedLocations.length} locations selected`

  return (
    <div className={styles.locWrap} ref={ref}>
      <button
        className={`${styles.locBtn} ${open ? styles.open : ''}`}
        onClick={() => setOpen((v) => !v)}
      >
        <LocationIcon />
        <span>{label}</span>
        <ChevronIcon />
      </button>

      {open && (
        <div className={styles.locDropdown}>
          <div className={styles.locSearch}>
            <SearchIcon />
            <input
              placeholder="Search by store name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>
          <div className={styles.locList}>
            {/* Aggregate option — only shown when not searching */}
            {!search && (
              <label className={styles.locItem}>
                <input
                  type="checkbox"
                  checked={isAll}
                  onChange={toggleAll}
                />
                <span>Aggregate for all stores</span>
              </label>
            )}
            {filtered.map((r) => (
              <label key={r.company_id} className={styles.locItem}>
                <input
                  type="checkbox"
                  checked={selectedLocations.includes(r.company_id)}
                  onChange={() => toggleCompany(r.company_id)}
                />
                <span>{r.company_name}</span>
              </label>
            ))}
            {filtered.length === 0 && (
              <div className={styles.locEmpty}>No stores match</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function LocationIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M8 1.5C5.51 1.5 3.5 3.51 3.5 6c0 3.75 4.5 8.5 4.5 8.5S12.5 9.75 12.5 6c0-2.49-2.01-4.5-4.5-4.5z" />
      <circle cx="8" cy="6" r="1.5" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M2.5 4.5L6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="6.5" cy="6.5" r="4.5" />
      <path d="M10 10l3.5 3.5" strokeLinecap="round" />
    </svg>
  )
}
