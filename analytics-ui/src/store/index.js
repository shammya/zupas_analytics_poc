import { configureStore } from '@reduxjs/toolkit'
import analyticsReducer from './analyticsSlice'

export const store = configureStore({
  reducer: {
    analytics: analyticsReducer,
  },
})
