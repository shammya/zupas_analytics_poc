import { useEffect } from 'react'
import ReactDOM from 'react-dom'
import { useDispatch, useSelector } from 'react-redux'
import { closeDrawer } from '../../../store/analyticsSlice'
import DrawerHeader from './DrawerHeader'
import DrawerTable from './DrawerTable'
import Pagination from './Pagination'
import styles from '../styles/Drawer.module.css'

export default function Drawer({ onPageChange }) {
  const dispatch = useDispatch()
  const drawer   = useSelector((s) => s.analytics.drawer)
  const { isOpen } = drawer

  // Close on Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && isOpen) dispatch(closeDrawer())
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [dispatch, isOpen])

  return ReactDOM.createPortal(
    <>
      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayShow : ''}`}
        onClick={() => dispatch(closeDrawer())}
      />
      <aside className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}>
        <DrawerHeader />
        <div className={styles.body}>
          <DrawerTable />
        </div>
        <div className={styles.footer}>
          <Pagination onPageChange={onPageChange} />
        </div>
      </aside>
    </>,
    document.body
  )
}
