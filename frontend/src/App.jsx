import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from './pages/Dashboard';

function LoadingScreen() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + Math.random() * 15; // Random increments for realism
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: '#050816',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 9999
      }}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}
      >
        <div style={{
          width: '80px', height: '80px',
          background: 'linear-gradient(135deg, #4f8ef7, #8b5cf6)',
          borderRadius: '24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '40px',
          boxShadow: '0 0 40px rgba(139,92,246,0.5)',
        }} className="pulse-glow">
          🏦
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '8px', background: 'linear-gradient(135deg, #f0f4ff, #8892b0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            FairLoan AI
          </h1>
          <p style={{ fontSize: '13px', color: '#8b5cf6', letterSpacing: '2px', fontWeight: '600', textTransform: 'uppercase' }}>
            Initializing Core Systems
          </p>
        </div>

        <div style={{ width: '240px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden', marginTop: '16px' }}>
          <motion.div 
            style={{ height: '100%', background: 'linear-gradient(90deg, #4f8ef7, #8b5cf6, #06b6d4)', borderRadius: '2px' }}
            initial={{ width: '0%' }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ ease: 'easeOut' }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hold the loading screen for 2.2 seconds
    const timer = setTimeout(() => setLoading(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AnimatePresence mode="wait">
        {loading && <LoadingScreen key="loading" />}
      </AnimatePresence>
      <Dashboard />
    </>
  );
}

export default App;
