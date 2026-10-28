import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { api } from '../services/api.js'
import { Loader } from '../components/ui.jsx'
import AdminLayout from './AdminLayout.jsx'
import Login from './Login.jsx'
import Overview from './Overview.jsx'
import Inquiries from './Inquiries.jsx'
import InquiryDetail from './InquiryDetail.jsx'
import Projects from './Projects.jsx'
import Services from './Services.jsx'
import Team from './Team.jsx'
import Users from './Users.jsx'
import Settings from './Settings.jsx'
import Account from './Account.jsx'
import Billing from './Billing.jsx'
import BillingEditor from './BillingEditor.jsx'
import { AdminContext, useAdmin } from './context.js'


function CtoOnly({ children }) {
  const { user } = useAdmin()
  if (user.role !== 'cto') {
    return (
      <div className="neu mx-auto max-w-lg p-8 text-center">
        <p className="font-bold text-slate">Only the CTO can open this page.</p>
        <p className="mt-2 text-sm text-muted">Ask the CTO if something here needs to change.</p>
      </div>
    )
  }
  return children
}

export default function AdminApp() {
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    document.title = 'Admin | Lephas Company Ltd'
    api
      .me()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
  }, [])

  const logout = useCallback(async () => {
    await api.logout().catch(() => {})
    setUser(null)
  }, [])

  if (user === undefined) return <Loader label="Checking your session…" />
  if (!user) return <Login onLogin={setUser} />

  return (
    <AdminContext.Provider value={{ user, setUser, logout, isCto: user.role === 'cto', canManage: user.role !== 'staff' }}>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<Overview />} />
          <Route path="inquiries" element={<Inquiries />} />
          <Route path="inquiries/:id" element={<InquiryDetail />} />
          <Route path="billing" element={<Billing />} />
          <Route path="billing/:id" element={<BillingEditor />} />
          <Route path="projects" element={<Projects />} />
          <Route path="services" element={<Services />} />
          <Route path="team" element={<CtoOnly><Team /></CtoOnly>} />
          <Route path="users" element={<CtoOnly><Users /></CtoOnly>} />
          <Route path="settings" element={<Settings />} />
          <Route path="account" element={<Account />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </AdminContext.Provider>
  )
}
