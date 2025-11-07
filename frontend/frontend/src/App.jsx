import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import OrganizationsPage from './pages/OrganizationsPage.jsx'
import ChangePasswordPage from './pages/ChangePasswordPage.jsx'
import RegisterOrganizationPage from './pages/RegisterOrganizationPage.jsx'
import OrganizationDashboardPage from "./pages/OrganizationDashboardPage.jsx";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/dashboard" element={<OrganizationDashboardPage/>}/>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/register-organization" element={<RegisterOrganizationPage />} />
            <Route path="/" element={<DashboardPage />} />
            <Route path="/account/password" element={<ChangePasswordPage />} />
            <Route path="/organizations" element={<OrganizationsPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
