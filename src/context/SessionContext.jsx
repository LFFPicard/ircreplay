import { createContext, useContext, useState } from 'react'

const SessionContext = createContext()

export function SessionProvider({ children }) {
  const [session,  setSession ] = useState(null)
  const [stats,    setStats   ] = useState(null)

  return (
    <SessionContext.Provider value={{ session, setSession, stats, setStats }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  return useContext(SessionContext)
}