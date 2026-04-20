import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { loginThunk } from '../../store/authSlice'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const dispatch  = useDispatch()
  const loading   = useSelector((s) => s.auth.loading)
  const error     = useSelector((s) => s.auth.error)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!username || !password) return
    dispatch(loginThunk({ username, password }))
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <LogoIcon />
        </div>
        <h1 className={styles.title}>Shipday Analytics</h1>
        <p className={styles.subtitle}>Sign in to continue</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Username</label>
            <input
              className={styles.input}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

function LogoIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="10" fill="#2563EB" />
      <path
        d="M10 24l6-8 4 5 3-4 3 7"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
