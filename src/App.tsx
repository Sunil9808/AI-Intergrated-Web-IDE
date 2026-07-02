import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { useSettingsStore } from './store/settingsStore';
import { themeService } from './services/themeService';

function App() {
  const { theme } = useSettingsStore();

  useEffect(() => {
    const t = themeService.getTheme(theme);
    themeService.applyTheme(t);
  }, [theme]);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
