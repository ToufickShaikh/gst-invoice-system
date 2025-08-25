// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import './index.css'
// import App from './App.jsx'

// createRoot(document.getElementById('root')).render(
//   <StrictMode>
//     <App />
//   </StrictMode>,
// )


// Entry point for React frontend
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Render the App component into the root div
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Expose the configured base (from Vite) to runtime code that uses window.__basename
// e.g., some components fall back to window.__basename when constructing absolute URLs.
try {
  window.__basename = import.meta.env.BASE_URL || '';
} catch (e) {
  // Ignore in non-browser environments
}