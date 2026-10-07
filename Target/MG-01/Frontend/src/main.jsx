import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import keycloak, { initKeycloak, login } from './auth/keycloak';
import { setSessionExpiredHandler } from './services/http';
import './styles/bfsi-theme.css';
import './styles/app.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Simple bypass for local development testing without Keycloak
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
