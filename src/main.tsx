import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import { useAuthStore } from './stores/authStore';
import { initializeSubscriptions } from './lib/subscriptions';

useAuthStore.getState().initialize();

useAuthStore.subscribe((state, prev) => {
  if (state.user?.id && state.user.id !== prev.user?.id) {
    void initializeSubscriptions(state.user.id);
  }
});

void initializeSubscriptions(useAuthStore.getState().user?.id);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
