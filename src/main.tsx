import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import './index.css';
import { App } from './App';
import { applyPrefs, loadPrefs } from './lib/prefs';

applyPrefs(loadPrefs());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion={loadPrefs().reduceMotion ? 'always' : 'user'}>
      <App />
    </MotionConfig>
  </StrictMode>,
);
