import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Dashboard } from '@/pages/Dashboard'
import { ItemDetail } from '@/pages/ItemDetail'
import { ItemForm } from '@/pages/ItemForm'
import { Archive } from '@/pages/Archive'
import { Login } from '@/pages/Login'
import { hasAuthToken, onAuthChange } from '@/lib/auth'
import { hasRequiredConnectionConfig } from '@/lib/connection'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => (
    USE_MOCK || (hasRequiredConnectionConfig() && hasAuthToken())
  ))

  useEffect(() => {
    if (USE_MOCK) return undefined
    return onAuthChange(() => (
      setIsAuthenticated(hasRequiredConnectionConfig() && hasAuthToken())
    ))
  }, [])

  if (!isAuthenticated) {
    return <Login onAuthenticated={() => setIsAuthenticated(true)} />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/item/:id" element={<ItemDetail />} />
          <Route path="/add" element={<ItemForm />} />
          <Route path="/edit/:id" element={<ItemForm />} />
          <Route path="/archive" element={<Archive />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
