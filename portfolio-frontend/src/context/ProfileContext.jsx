import { useMemo, useState } from 'react'
import { aboutProfile } from '../data/aboutProfile.js'
import { ProfileContext } from './profileContextValue.js'

export function ProfileProvider({ children }) {
  const [profileImage, setProfileImage] = useState(aboutProfile.profileImage)
  const value = useMemo(() => ({ profileImage, setProfileImage }), [profileImage])

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}
