import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import AuthProvider from './components/AuthProvider'
import Layout from './components/Layout'
import RutaProtegida from './components/RutaProtegida'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Usuarios from './pages/Usuarios'
import EnConstruccion from './pages/EnConstruccion'

// Mapa de pantallas de la app y quién puede entrar a cada una.
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Todo lo de aquí dentro pide sesión iniciada */}
          <Route element={<RutaProtegida />}>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="productos" element={<EnConstruccion titulo="Productos" fase={4} />} />
              <Route path="movimientos" element={<EnConstruccion titulo="Movimientos" fase={5} />} />
              <Route path="alertas" element={<EnConstruccion titulo="Alertas" fase={6} />} />

              {/* Y esto, además, rol admin */}
              <Route element={<RutaProtegida soloAdmin />}>
                <Route path="usuarios" element={<Usuarios />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
