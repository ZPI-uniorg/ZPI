import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext.jsx'
import ProtectedRoute from './auth/ProtectedRoute.jsx'
import LoginPage from './modules/login/pages/LoginPage.jsx'
import ChangePasswordPage from './modules/login/pages/ChangePasswordPage.jsx'
import RegisterOrganizationPage from './modules/organization/pages/RegisterOrganizationPage.jsx'
import OrganizationsPage from './modules/organization/pages/OrganizationsPage.jsx'
import DashboardPage from './modules/dashboard/pages/DashboardPage.jsx'
import OrganizationDashboardPage from './modules/dashboard/pages/OrganizationDashboardPage.jsx'
import OrganizationPage from './modules/organization/pages/OrganizationPage.jsx'
import ProjectEditPage from './modules/organization/pages/ProjectEditPage.jsx'
import TagEditPage from './modules/organization/pages/TagEditPage.jsx'
import ChatCreatePage from './modules/chats/pages/ChatCreatePage.jsx'
import CalendarPage from './modules/calendar/pages/CalendarPage.jsx'
import KanbanPage from './modules/kanban/pages/KanbanPage.jsx'
import TaskEditPage from './modules/kanban/pages/TaskEditPage.jsx'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/dashboard" element={<OrganizationDashboardPage/>}/>
          <Route path="/login" element={<LoginPage />} />
          {/* <Route element={<ProtectedRoute />}> */}
            <Route path="/register-organization" element={<RegisterOrganizationPage />} />
            <Route path="/" element={<DashboardPage />} />
            <Route path="/account/password" element={<ChangePasswordPage />} />
            <Route path="/organizations" element={<OrganizationsPage />} />
            <Route path="/organization" element={<OrganizationPage/>} />
            <Route path="/organization/project/new" element={<ProjectEditPage/>} />
            <Route path="/organization/tag/new" element={<TagEditPage/>} />
            <Route path="/chat/new" element={<ChatCreatePage/>} />
            <Route path="/calendar" element={<CalendarPage/>} />
            <Route path="/kanban" element={<KanbanPage/>} />
            <Route path="/kanban/task/new" element={<TaskEditPage/>} />
            <Route path="/kanban/task/edit" element={<TaskEditPage/>} />
          {/* </Route> */}
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
