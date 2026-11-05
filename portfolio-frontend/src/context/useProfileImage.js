import { useContext } from 'react'
import { ProfileContext } from './profileContextValue.js'

export function useProfileImage() {
  const context = useContext(ProfileContext)
  if (!context) throw new Error('useProfileImage must be used within ProfileProvider')
  return context
}
