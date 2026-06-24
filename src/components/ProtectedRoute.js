import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Spinner pendant le chargement
const Spinner = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)' }}>
    <div style={{ textAlign:'center' }}>
      <div style={{ width:40, height:40, border:'3px solid #E8E2D6', borderTopColor:'#C9A84C', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }}/>
      <div style={{ fontSize:13, color:'var(--text2)', fontFamily:'var(--sans)' }}>Chargement...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  </div>
);

// Route protégée pour les clients
export function RequireClient({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== 'client') return <Navigate to="/" replace />;
  return children;
}

// Route protégée pour les admins
export function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}
