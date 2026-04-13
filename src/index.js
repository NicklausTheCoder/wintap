import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
// remove the line below - it's a duplicate
// import { createRoot } from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();