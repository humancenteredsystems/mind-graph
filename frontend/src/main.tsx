import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { UIProvider } from './context/UIContext';
import { ContextMenuProvider } from './context/ContextMenuContext';
import { TenantProvider } from './context/TenantContext';
import ContextMenu from './components/ContextMenu';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TenantProvider>
      <UIProvider>
        <ContextMenuProvider>
          <App />
          <ContextMenu />
        </ContextMenuProvider>
      </UIProvider>
    </TenantProvider>
  </StrictMode>,
)
