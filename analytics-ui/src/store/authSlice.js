import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

const TOKEN_KEY = 'analytics_token'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Decode the JWT exp claim (seconds) → ms timestamp, or null on failure. */
function getTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

/** Returns true if the token is already expired. */
function isExpired(token) {
  const exp = getTokenExpiry(token)
  return exp !== null && Date.now() >= exp
}

// Module-level timer handle so we can cancel it on logout / new login.
let _logoutTimer = null

/** Schedule auto-logout at the token's exp time. Dispatches logout action. */
function scheduleAutoLogout(token, dispatch) {
  clearTimeout(_logoutTimer)
  const exp = getTokenExpiry(token)
  if (exp === null) return
  const delay = exp - Date.now()
  if (delay <= 0) {
    dispatch(logout())
    return
  }
  _logoutTimer = setTimeout(() => dispatch(logout()), delay)
}

// ── Thunks ────────────────────────────────────────────────────────────────────

export const loginThunk = createAsyncThunk(
  'auth/login',
  async ({ username, password }, { dispatch, rejectWithValue }) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        return rejectWithValue(data.detail ?? 'Invalid username or password')
      }
      const { access_token } = await res.json()
      localStorage.setItem(TOKEN_KEY, access_token)
      scheduleAutoLogout(access_token, dispatch)
      return access_token
    } catch {
      return rejectWithValue('Could not reach the server')
    }
  }
)

// ── Slice ─────────────────────────────────────────────────────────────────────

const storedToken = localStorage.getItem(TOKEN_KEY)
// Discard expired tokens immediately on page load
const validToken = storedToken && !isExpired(storedToken) ? storedToken : null
if (!validToken) localStorage.removeItem(TOKEN_KEY)

const slice = createSlice({
  name: 'auth',
  initialState: {
    token:           validToken,
    isAuthenticated: !!validToken,
    loading:         false,
    error:           null,
  },
  reducers: {
    logout(state) {
      clearTimeout(_logoutTimer)
      localStorage.removeItem(TOKEN_KEY)
      state.token           = null
      state.isAuthenticated = false
      state.error           = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.loading = true
        state.error   = null
      })
      .addCase(loginThunk.fulfilled, (state, { payload }) => {
        state.loading         = false
        state.token           = payload
        state.isAuthenticated = true
      })
      .addCase(loginThunk.rejected, (state, { payload }) => {
        state.loading = false
        state.error   = payload
      })
  },
})

export const { logout } = slice.actions
export default slice.reducer

// ── Rehydration timer (page refresh with valid token) ─────────────────────────
// Must run after the store is created; called from store/index.js
export function startRehydrationTimer(dispatch) {
  if (validToken) scheduleAutoLogout(validToken, dispatch)
}
