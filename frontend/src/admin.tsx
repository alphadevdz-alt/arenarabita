import React from 'react';
import { createRoot } from 'react-dom/client';
import { RoleAdmin } from './RoleAdmin';
import './styles.css';

createRoot(document.getElementById('admin-root')!).render(
  <React.StrictMode>
    <RoleAdmin standalone />
  </React.StrictMode>
);
