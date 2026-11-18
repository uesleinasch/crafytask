import { HashRouter, Route, Routes } from 'react-router-dom'
import { TaskListPage } from './pages/TaskListPage'
import { SingleTaskPage } from './pages/SingleTaskPage'
import { ArchivedTasksPage } from './pages/ArchivedTasksPage'
import { FloatTimerPage } from './pages/FloatTimerPage'
import { DashboardPage } from './pages/DashboardPage'
import { SettingsPage } from './pages/SettingsPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { ContextsPage } from './pages/ContextsPage'
import { TagsPage } from './pages/TagsPage'
import { WeeklyReviewPage } from './pages/WeeklyReviewPage'
import { QuickCapturePage } from './pages/QuickCapturePage'
import { TodayPage } from './pages/TodayPage'
import { HorizonsPage } from './pages/HorizonsPage'
import { CalendarPage } from './pages/CalendarPage'
import { NotebooksPage } from './pages/NotebooksPage'
import { AppShell } from './components/shell/AppShell'

function App(): React.JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route
          path="/float"
          element={
            <div className="w-full h-full p-1">
              <FloatTimerPage />
            </div>
          }
        />
        <Route
          path="/quick-capture"
          element={
            <div className="w-full h-full">
              <QuickCapturePage />
            </div>
          }
        />
        <Route element={<AppShell />}>
          <Route path="/" element={<TaskListPage />} />
          <Route path="/task/:id" element={<SingleTaskPage />} />
          <Route path="/archived" element={<ArchivedTasksPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/project/:id" element={<ProjectDetailPage />} />
          <Route path="/contexts" element={<ContextsPage />} />
          <Route path="/tags" element={<TagsPage />} />
          <Route path="/review" element={<WeeklyReviewPage />} />
          <Route path="/today" element={<TodayPage />} />
          <Route path="/horizons" element={<HorizonsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/notebooks" element={<NotebooksPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
