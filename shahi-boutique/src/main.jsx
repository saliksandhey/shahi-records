import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { supabase } from "@/lib/supabaseClient";

console.log("Supabase connected:", supabase);

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
