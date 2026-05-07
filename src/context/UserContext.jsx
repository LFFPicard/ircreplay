import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from '@clerk/react'

const UserContext = createContext()

export function UserProvider({ children }) {
  const { isSignedIn, userId } = useAuth()
  const [userRecord,  setUserRecord ] = useState(null)
  const [isPremium,   setIsPremium  ] = useState(false)
  const [userLoading, setUserLoading] = useState(false)

  useEffect(() => {
    if (!isSignedIn || !userId) {
      setUserRecord(null)
      setIsPremium(false)
      return
    }

    const fetchUser = async () => {
      setUserLoading(true)
      try {
        const res = await fetch('/api/user', {
          headers: { 'X-User-Id': userId },
        })
        if (res.ok) {
          const data = await res.json()
          setUserRecord(data)
          setIsPremium(data.isPremium || false)
        }
      } catch (err) {
        console.error('Failed to fetch user record:', err)
      } finally {
        setUserLoading(false)
      }
    }

    fetchUser()
  }, [isSignedIn, userId])

  return (
    <UserContext.Provider value={{ userRecord, isPremium, userLoading }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}