import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppStoreProvider, useAppState } from './store/AppStore';
import { FxProvider } from './store/FxProvider';
import { ToastProvider } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/Confirm';
import { AppLayout } from './components/layout/AppLayout';
import { useThemeClass } from './hooks/useTheme';
import Welcome from './pages/Welcome';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import StudentProfile from './pages/StudentProfile';
import Badges from './pages/Badges';
import Shop from './pages/Shop';
import Wheel from './pages/Wheel';
import ChallengePage from './pages/Challenge';
import Leaderboard from './pages/Leaderboard';
import Groups from './pages/Groups';
import Reports from './pages/Reports';
import Certificate from './pages/Certificate';
import Celebrate from './pages/Celebrate';
import SettingsPage from './pages/Settings';
import ClassroomMode from './pages/ClassroomMode';

function AppRoutes() {
  const { settings } = useAppState();
  useThemeClass(settings.theme);

  if (!settings.onboarded) return <Welcome />;

  return (
    <Routes>
      <Route path="/classroom" element={<ClassroomMode />} />
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="students" element={<Students />} />
        <Route path="students/:id" element={<StudentProfile />} />
        <Route path="badges" element={<Badges />} />
        <Route path="shop" element={<Shop />} />
        <Route path="wheel" element={<Wheel />} />
        <Route path="challenge" element={<ChallengePage />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="groups" element={<Groups />} />
        <Route path="reports" element={<Reports />} />
        <Route path="certificate" element={<Certificate />} />
        <Route path="celebrate" element={<Celebrate />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppStoreProvider>
        <ConfirmProvider>
          <FxProvider>
            <HashRouter>
              <AppRoutes />
            </HashRouter>
          </FxProvider>
        </ConfirmProvider>
      </AppStoreProvider>
    </ToastProvider>
  );
}
