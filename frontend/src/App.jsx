import { Navigate, Route, Routes } from 'react-router-dom'

import Layout from './components/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Archives from './pages/Archives.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ElectricBorderLab from './pages/ElectricBorderLab.jsx'
import Login from './pages/Login.jsx'
import Logs from './pages/Logs.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Protected, authenticated area */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="logs" element={<Logs />} />
          <Route path="archives" element={<Archives />} />
          <Route path="electric-border" element={<ElectricBorderLab />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
