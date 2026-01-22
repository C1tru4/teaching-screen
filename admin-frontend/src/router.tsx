// 功能：管理端路由配置。
import { createBrowserRouter } from 'react-router-dom'
import TimetableAdmin from './pages/TimetableAdmin'
import ProjectsAdmin from './pages/ProjectsAdmin'
import GlobalAdmin from './pages/GlobalAdmin'
import VisualizationAdmin from './pages/VisualizationAdmin'
import ClassesAdmin from './pages/ClassesAdmin'
import UserGuide from './pages/UserGuide'
import App from './App'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <TimetableAdmin /> },
      { path: 'projects', element: <ProjectsAdmin /> },
      { path: 'classes', element: <ClassesAdmin /> },
      { path: 'global', element: <GlobalAdmin /> },
      { path: 'visualization', element: <VisualizationAdmin /> },
      { path: 'guide', element: <UserGuide /> },
    ]
  }
], { basename: '/admin' })