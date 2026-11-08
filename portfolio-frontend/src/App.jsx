import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { ProfileProvider } from './context/ProfileContext.jsx'
import { PublicLayout } from './layouts/PublicLayout.jsx'
import { HomePage } from './pages/HomePage.jsx'
import { AboutPage } from './pages/AboutPage.jsx'
import { ProjectsPage } from './pages/ProjectsPage.jsx'
import { ProjectDetailsPage } from './pages/ProjectDetailsPage.jsx'
import { ContactPage } from './pages/ContactPage.jsx'
import { NotFoundPage } from './pages/NotFoundPage.jsx'
import { AdminLayout } from './layouts/AdminLayout.jsx'
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage.jsx'
import { AdminProjectsPage } from './pages/admin/AdminProjectsPage.jsx'
import { AdminProjectEditorPage } from './pages/admin/AdminProjectEditorPage.jsx'
import { AdminMessagesPage } from './pages/admin/AdminMessagesPage.jsx'
import { AdminAboutPage } from './pages/admin/AdminAboutPage.jsx'
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage.jsx'
import { AdminLoginPage } from './pages/admin/AdminLoginPage.jsx'
import { AdminAuthProvider } from './context/AdminAuthContext.jsx'
import './App.css'

function App() {
  return (
    <ThemeProvider>
      <ProfileProvider>
       <BrowserRouter>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:slug" element={<ProjectDetailsPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          <Route element={<AdminAuthProvider />}>
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminOverviewPage />} />
              <Route path="projects" element={<AdminProjectsPage />} />
              <Route path="projects/new" element={<AdminProjectEditorPage />} />
              <Route path="projects/:id/edit" element={<AdminProjectEditorPage />} />
              <Route path="messages" element={<AdminMessagesPage />} />
              <Route path="about" element={<AdminAboutPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>
          </Route>
        </Routes>
       </BrowserRouter>
      </ProfileProvider>
    </ThemeProvider>
  )
}

export default App
