import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { isFirebaseConfigured } from "./firebase";
import { subscribeAppConfig } from "./lib/data";
import { applyTheme } from "./lib/theme";
import KidDashboard from "./pages/KidDashboard";
import AdminPage from "./pages/AdminPage";
import OfflineScreen from "./components/OfflineScreen";
import ConfigWarning from "./components/ConfigWarning";

export default function App() {
  const online = useOnlineStatus();

  // 테마 실시간 적용 (설정에서 바꾸면 자녀·엄마 화면 모두 즉시 반영)
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return subscribeAppConfig((cfg) => applyTheme(cfg.theme));
  }, []);

  // .env 미설정 시 안내
  if (!isFirebaseConfigured) return <ConfigWarning />;

  // 오프라인 시 전체화면 안내 (복구되면 자동으로 정상 화면 진입)
  if (!online) return <OfflineScreen />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<KidDashboard />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
