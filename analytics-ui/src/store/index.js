import { configureStore } from '@reduxjs/toolkit'
import analyticsReducer from './analyticsSlice'
import authReducer, { startRehydrationTimer } from './authSlice'

export const store = configureStore({
  reducer: {
    analytics: analyticsReducer,
    auth:      authReducer,
  },
})

// If the user refreshed with a still-valid token, schedule logout at its expiry
startRehydrationTimer(store.dispatch)
