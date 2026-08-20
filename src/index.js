import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n';

// Polices bundlées localement (pas de CDN) : Capacitor packages l'app en fichiers
// locaux, donc une police chargée depuis Google Fonts/jsdelivr à l'exécution peut
// échouer si le réseau est lent ou coupé au premier lancement — on l'embarque.
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/700.css';
import '@fontsource/dm-sans/300.css';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
