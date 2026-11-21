import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from '@descope/react-sdk';
import './index.css';
import App from './App.tsx';

const descopeProjectId =
  import.meta.env.VITE_DESCOPE_PROJECT_ID || 'P3MHZdzcXDlJn2gOSo59IpPaIGJn';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider projectId={descopeProjectId}>
      <App />
    </AuthProvider>
  </StrictMode>,
);

