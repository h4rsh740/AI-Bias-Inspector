import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ThreeBackground from '../components/ThreeBackground';
import MetricCard from '../components/MetricCard';
import BiasCharts from '../components/BiasCharts';
import ShapChart from '../components/ShapChart';
import LoanApprovalModule from '../components/LoanApprovalModule';
import { trainModel, mitigateBias, predictLoan, batchPredict, profileData } from '../services/api';
import confetti from 'canvas-confetti';

const getBiasConfig = (level) => {
  if (level === 'Low') return {
    color: '#10b981',
    bg: 'rgba(16,185,129,0.1)',
    border: 'rgba(16,185,129,0.3)',
    icon: '✅',
    label: 'Low Risk',
  };
  if (level === 'Medium') return {
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.3)',
    icon: '⚠️',
    label: 'Medium Risk',
  };
  return {
    color: '#f43f5e',
    bg: 'rgba(244,63,94,0.1)',
    border: 'rgba(244,63,94,0.3)',
    icon: '🚨',
    label: 'High Risk',
  };
};

const RangeSlider = ({ label, value, min, max, step, onChange, format = v => v, color = '#8b5cf6' }) => {
  const percentage = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>{label}</label>
        <span style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>{format(value)}</span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        step={step}
        value={value} 
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ 
          width: '100%', 
          height: '6px',
          borderRadius: '4px',
          appearance: 'none',
          outline: 'none',
          background: `linear-gradient(to right, ${color} ${percentage}%, rgba(255,255,255,0.1) ${percentage}%)`,
          cursor: 'pointer'
        }} 
      />
    </div>
  );
};

export default function Dashboard() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [useGender, setUseGender] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('simulator'); // Default to simulator now
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const fileInputRef = useRef(null);

  // Simulator State
  const [applicant, setApplicant] = useState({
    income: 65000,
    age: 32,
    gender: 'Male',
    credit_score: 720,
    loan_amount: 150000,
    employment_years: 6,
  });
  const [simulationResult, setSimulationResult] = useState(null);

  // Batch State
  const [batchFile, setBatchFile] = useState(null);
  const [batchResults, setBatchResults] = useState(null);
  const [dataProfile, setDataProfile] = useState(null);
  const batchFileInputRef = useRef(null);

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);
      setError(null);
      // Profile data on drop
      setLoading(true);
      setLoadingMsg('Profiling dataset for potential faults...');
      try {
        const profile = await profileData(droppedFile);
        setDataProfile(profile);
      } catch (err) {
        console.error('Profiling error:', err);
      }
      setLoading(false);
    } else {
      setError('Please drop a valid CSV file.');
    }
  };

  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (f) { 
      setFile(f); 
      setError(null);
      // Automatically profile data on upload
      setLoading(true);
      setLoadingMsg('Profiling dataset for potential faults...');
      try {
        const profile = await profileData(f);
        setDataProfile(profile);
      } catch (err) {
        console.error('Profiling error:', err);
      }
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!file) { setError('Upload a CSV dataset first.'); return; }
    setError(null);
    setLoading(true);
    setLoadingMsg('Training model pipeline...');
    try {
      const data = await trainModel(file, useGender);
      setResults({ ...data, isMitigated: false });
      setActiveTab('results');
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    }
    setLoading(false);
  };

  const handleMitigate = async () => {
    if (!file) { setError('Upload a CSV dataset first.'); return; }
    setError(null);
    setLoading(true);
    setLoadingMsg('Applying fairness constraints...');
    try {
      const before = results;
      const data = await mitigateBias(file, useGender);
      setResults({ ...data, isMitigated: true, before });
      setActiveTab('results');
      
      // Trigger confetti on successful mitigation
      if (data.bias_level === 'Low' || data.bias_difference < before.bias_difference) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#06b6d4', '#4f8ef7']
        });
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    }
    setLoading(false);
  };

  const handleSimulate = async (e) => {
    e.preventDefault();
    await runSinglePrediction();
  };

  const runSinglePrediction = async () => {
    setError(null);
    setLoading(true);
    setLoadingMsg('Evaluating application...');
    try {
      const data = await predictLoan({ ...applicant, use_gender: useGender });
      setSimulationResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    }
    setLoading(false);
  };

  const handleBatchPredict = async () => {
    if (!batchFile) { setError('Upload a CSV of applicants first.'); return; }
    setError(null);
    setLoading(true);
    setLoadingMsg('Processing batch predictions...');
    try {
      const data = await batchPredict(batchFile, useGender);
      setBatchResults(data.results);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    }
    setLoading(false);
  };

  const handleDownload = () => {
    if (!results) return;
    
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(79, 142, 247); // Primary blue
    doc.text('FairLoan AI: Bias Analysis Report', 20, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${timestamp}`, 20, 30);
    doc.text(`Model Type: ${results.isMitigated ? 'Fairness-Mitigated' : 'Standard'}`, 20, 35);
    
    // Line separator
    doc.setDrawColor(200);
    doc.line(20, 40, 190, 40);
    
    // Summary Metrics
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('1. Executive Summary', 20, 55);
    
    const metricsData = [
      ['Metric', 'Value', 'Status'],
      ['Model Accuracy', `${(results.accuracy * 100).toFixed(1)}%`, 'Pass'],
      ['Bias Level', results.bias_level, results.bias_level === 'Low' ? 'Good' : 'Needs Attention'],
      ['Bias Score (Disparity)', results.bias_difference.toFixed(4), '-'],
      ['Female Approval Rate', `${(results.female_rate * 100).toFixed(1)}%`, '-'],
      ['Male Approval Rate', `${(results.male_rate * 100).toFixed(1)}%`, '-'],
    ];
    
    autoTable(doc, {
      startY: 65,
      head: [metricsData[0]],
      body: metricsData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [79, 142, 247] },
    });
    
    // Detailed Fairness Metrics
    doc.setFontSize(16);
    const finalY1 = doc.lastAutoTable?.finalY || 130;
    doc.text('2. Fairness Breakdown', 20, finalY1 + 15);
    
    const fairnessData = [
      ['Metric', 'Score', 'Interpretation'],
      ['Demographic Parity Diff', results.demographic_parity_diff.toFixed(4), 'Difference in selection rates'],
      ['Equal Opportunity Diff', results.equal_opportunity_diff.toFixed(4), 'Difference in true positive rates'],
    ];
    
    autoTable(doc, {
      startY: finalY1 + 20,
      head: [fairnessData[0]],
      body: fairnessData.slice(1),
      theme: 'striped',
    });
    
    // Features
    doc.setFontSize(16);
    const finalY2 = doc.lastAutoTable?.finalY || 180;
    doc.text('3. Dataset Features', 20, finalY2 + 15);
    doc.setFontSize(11);
    doc.text(`Features analyzed: ${results.features_used.join(', ')}`, 20, finalY2 + 25);

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`FairLoan AI - Ensuring Fair Access to Credit - Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
    }
    
    doc.save('fairloan_ai_report.pdf');
  };

  const biasConfig = results ? getBiasConfig(results.bias_level) : null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', position: 'relative' }}>
      <ThreeBackground />

      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(ellipse at 20% 20%, rgba(79,142,247,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(139,92,246,0.08) 0%, transparent 60%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <div className="content-layer" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <header className="header-container" style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
          background: 'rgba(5,8,22,0.6)',
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '40px', height: '40px',
              background: 'linear-gradient(135deg, #4f8ef7, #8b5cf6)',
              borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px',
              boxShadow: '0 0 20px rgba(139,92,246,0.4)',
            }}>🏦</div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '-0.3px' }}>
                FairLoan AI
              </h1>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', letterSpacing: '1px' }}>
                ENSURING FAIR ACCESS TO CREDIT
              </p>
            </div>
          </div>

          <nav className="desktop-nav">
            {[
              { id: 'simulator', label: '👤 Simulator' },
              { id: 'batch', label: '👥 Batch Shortlist' },
              { id: 'upload', label: '📂 Biased Data Inspector' },
              { id: 'results', label: '📊 Bias Report' },
            ].map(tab => (
              <button
                key={tab.id}
                className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                style={{ background: 'none', border: 'none' }}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="api-badge" style={{
              padding: '6px 16px',
              borderRadius: '20px',
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.3)',
              fontSize: '12px',
              fontWeight: '600',
              color: '#10b981',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}
                className="pulse-glow" />
              API LIVE
            </div>
            <button 
              className="mobile-menu-btn" 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? '✕' : '☰'}
            </button>
          </div>

          {/* Mobile Dropdown Menu */}
          <div className={`mobile-nav-dropdown ${isMenuOpen ? 'open' : ''}`}>
            {[
              { id: 'simulator', label: '👤 Simulator' },
              { id: 'batch', label: '👥 Batch Shortlist' },
              { id: 'upload', label: '📂 Biased Data Inspector' },
              { id: 'results', label: '📊 Bias Report' },
            ].map(tab => (
              <button
                key={tab.id}
                className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsMenuOpen(false);
                }}
                style={{ background: 'none', border: 'none', textAlign: 'left', padding: '12px 16px', width: '100%', fontSize: '16px' }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <main className="main-container" style={{ flex: 1, maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
          <AnimatePresence mode="wait">

            {/* ─── SIMULATOR TAB ─── */}
            {activeTab === 'simulator' && (
              <motion.div
                key="simulator"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                  <h2 style={{ fontSize: '42px', fontWeight: '800', lineHeight: 1.1, marginBottom: '16px', letterSpacing: '-1px' }}>
                    Individual Loan <span className="gradient-text">Simulation</span>
                  </h2>
                  <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
                    Test individual applications in real-time. See AI decisions and explore exactly why a decision was made using SHAP explainability.
                  </p>
                </div>

                <div className="responsive-grid">
                  
                  {/* Applicant Form */}
                  <div className="glass-card" style={{ padding: '32px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      📋 Applicant Details
                    </h3>
                    
                    <form onSubmit={handleSimulate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div className="responsive-grid-inner" style={{ display: 'grid', gap: '20px' }}>
                        
                        <RangeSlider 
                          label="Annual Income" 
                          min={20000} max={250000} step={1000} 
                          value={applicant.income} 
                          onChange={v => setApplicant({...applicant, income: v})} 
                          format={v => `$${v.toLocaleString()}`}
                          color="#10b981"
                        />

                        <RangeSlider 
                          label="Credit Score" 
                          min={300} max={850} step={5} 
                          value={applicant.credit_score} 
                          onChange={v => setApplicant({...applicant, credit_score: v})} 
                          format={v => v}
                          color={applicant.credit_score < 580 ? '#f43f5e' : applicant.credit_score < 670 ? '#f59e0b' : '#10b981'}
                        />

                        <RangeSlider 
                          label="Loan Amount" 
                          min={10000} max={1000000} step={5000} 
                          value={applicant.loan_amount} 
                          onChange={v => setApplicant({...applicant, loan_amount: v})} 
                          format={v => `$${v.toLocaleString()}`}
                          color="#4f8ef7"
                        />

                        <RangeSlider 
                          label="Employment (Years)" 
                          min={0} max={40} step={1} 
                          value={applicant.employment_years} 
                          onChange={v => setApplicant({...applicant, employment_years: v})} 
                          format={v => `${v} years`}
                          color="#8b5cf6"
                        />

                        <RangeSlider 
                          label="Age" 
                          min={18} max={85} step={1} 
                          value={applicant.age} 
                          onChange={v => setApplicant({...applicant, age: v})} 
                          format={v => `${v} yrs`}
                          color="#06b6d4"
                        />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>Gender</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {['Male', 'Female'].map(g => (
                              <button 
                                key={g} 
                                type="button"
                                onClick={() => setApplicant({...applicant, gender: g})}
                                style={{ 
                                  flex: 1, padding: '10px', borderRadius: '8px', 
                                  background: applicant.gender === g ? 'rgba(139,92,246,0.2)' : 'rgba(0,0,0,0.3)',
                                  border: `1px solid ${applicant.gender === g ? '#8b5cf6' : 'rgba(255,255,255,0.1)'}`,
                                  color: applicant.gender === g ? 'white' : 'var(--text-secondary)',
                                  fontWeight: applicant.gender === g ? '600' : '400',
                                  transition: 'all 0.2s',
                                  cursor: 'pointer'
                                }}
                              >
                                {g}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginTop: '8px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                        <input
                          type="checkbox"
                          checked={useGender}
                          onChange={(e) => setUseGender(e.target.checked)}
                        />
                        <div>
                          <p style={{ fontWeight: '500', fontSize: '14px' }}>Include Gender in Model</p>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Test for direct discrimination
                          </p>
                        </div>
                      </label>

                      <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                        <button
                          type="submit"
                          className="btn-primary"
                          disabled={loading}
                          style={{ flex: 1, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                        >
                          {loading ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Analyzing...</> : '⚡ Evaluate Application'}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => {
                            setApplicant({
                              income: 65000,
                              age: 32,
                              gender: 'Male',
                              credit_score: 720,
                              loan_amount: 150000,
                              employment_years: 6,
                            });
                            setSimulationResult(null);
                          }}
                          style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                        >
                          🔄 Clear All
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Results & SHAP */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {simulationResult ? (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card" 
                        style={{ 
                          padding: '32px', 
                          background: simulationResult.approved ? 'rgba(16,185,129,0.05)' : 'rgba(244,63,94,0.05)',
                          border: `1px solid ${simulationResult.approved ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                          <div>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
                              Decision
                            </p>
                            <h3 style={{ fontSize: '32px', fontWeight: '800', color: simulationResult.approved ? '#10b981' : '#f43f5e', marginTop: '4px' }}>
                              {simulationResult.approved ? 'APPROVED ✅' : 'DENIED ❌'}
                            </h3>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Confidence</p>
                            <p style={{ fontSize: '24px', fontWeight: '700', color: 'white' }}>
                              {(simulationResult.probability_approved * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>

                        {/* SHAP Explanation */}
                        {simulationResult.shap && (
                          <div style={{ marginTop: '32px' }}>
                            <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              🔬 Why this decision? <span style={{ fontSize: '11px', background: 'rgba(139,92,246,0.2)', color: '#8b5cf6', padding: '2px 8px', borderRadius: '10px' }}>SHAP Analysis</span>
                            </h4>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                              Feature contributions to the final prediction (positive values increase approval chances).
                            </p>
                            <ShapChart shapData={simulationResult.shap} type="local" />
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <div className="glass-card" style={{ padding: '60px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100%' }}>
                        <div style={{ fontSize: '48px', opacity: 0.5, marginBottom: '16px' }}>⚖️</div>
                        <h3 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-secondary)' }}>Waiting for evaluation</h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', opacity: 0.7, marginTop: '8px', maxWidth: '300px' }}>
                          Submit the applicant form to see the AI decision and SHAP explainability breakdown.
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              </motion.div>
            )}

            {/* ─── BATCH TAB ─── */}
            {activeTab === 'batch' && (
              <motion.div
                key="batch"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                  <h2 style={{ fontSize: '42px', fontWeight: '800', lineHeight: 1.1, marginBottom: '16px', letterSpacing: '-1px' }}>
                    Batch <span className="gradient-text">Shortlisting</span>
                  </h2>
                  <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
                    Upload a CSV of new applicants. Our AI will evaluate all of them instantly and provide a clean shortlist of approved candidates.
                  </p>
                </div>

                <div className="responsive-grid-sidebar">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div
                      className={`upload-zone glass-card ${isDragging ? 'drag-over' : ''}`}
                      style={{ padding: '40px', textAlign: 'center', cursor: 'pointer', borderRadius: '20px' }}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const droppedFile = e.dataTransfer.files[0];
                        if (droppedFile && droppedFile.name.endsWith('.csv')) setBatchFile(droppedFile);
                      }}
                      onClick={() => batchFileInputRef.current?.click()}
                    >
                      <input ref={batchFileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={(e) => setBatchFile(e.target.files[0])} />
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>{batchFile ? '✅' : '📄'}</div>
                      {batchFile ? (
                        <>
                          <p style={{ fontSize: '18px', fontWeight: '600', color: '#10b981', marginBottom: '8px' }}>{batchFile.name}</p>
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Ready to process. Click to change.</p>
                        </>
                      ) : (
                        <>
                          <p style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Drop new applicants CSV</p>
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>or click to browse files</p>
                        </>
                      )}
                    </div>
                    
                    <button className="btn-primary" onClick={handleBatchPredict} disabled={loading || !batchFile} style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      {loading && loadingMsg.includes('batch') ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Processing...</> : '⚡ Run Batch Shortlist'}
                    </button>
                    
                    <AnimatePresence>
                      {error && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '12px', padding: '14px', color: '#f43f5e', fontSize: '14px' }}>
                          🚨 {error}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '600px', overflowY: 'auto' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
                      📋 Results {batchResults && `(${batchResults.filter(r => r.approved).length} Approved)`}
                    </h3>
                    
                    {!batchResults ? (
                      <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.5 }}>
                        <div style={{ fontSize: '40px', marginBottom: '12px' }}>⏳</div>
                        <p style={{ fontSize: '14px' }}>Upload a file and run to see results.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {batchResults.map((res, i) => (
                          <div key={i} style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', borderLeft: `4px solid ${res.approved ? '#10b981' : '#f43f5e'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Applicant ID: #{res.id}</p>
                              <p style={{ fontSize: '14px', fontWeight: '600' }}>Income: ${Number(res.income).toLocaleString()} | Score: {res.credit_score}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <p style={{ fontSize: '14px', fontWeight: '700', color: res.approved ? '#10b981' : '#f43f5e' }}>{res.approved ? 'APPROVED' : 'DENIED'}</p>
                              <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{(res.probability * 100).toFixed(1)}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─── UPLOAD TAB ─── */}
            {activeTab === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <div style={{ textAlign: 'center', marginBottom: '60px', position: 'relative' }}>
                  <div style={{ 
                    position: 'absolute', top: '-100px', left: '50%', transform: 'translateX(-50%)', 
                    width: '600px', height: '300px', opacity: 0.15, zIndex: 0, pointerEvents: 'none'
                  }}>
                    <img src="/fairness-scale.png" alt="Fairness Scale" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <motion.div className="float" style={{ width: '80px', height: '80px', margin: '0 auto 24px', borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(139,92,246,0.4)', boxShadow: '0 0 30px rgba(139,92,246,0.2)' }}>
                      <img src="/fairness-scale.png" alt="Fairness" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </motion.div>
                    <h2 style={{ fontSize: '48px', fontWeight: '800', lineHeight: 1.1, marginBottom: '16px', letterSpacing: '-1px' }}>
                      Detect Systemic Bias{' '}
                      <span className="gradient-text">Before It Harms</span>
                    </h2>
                    <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '560px', margin: '0 auto' }}>
                      Upload your global dataset, run fairness analysis, and apply mitigation — all in one powerful platform.
                    </p>
                  </div>
                </div>

                <div className="responsive-grid-sidebar">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div
                      className={`upload-zone glass-card ${isDragging ? 'drag-over' : ''}`}
                      style={{ padding: '60px 40px', textAlign: 'center', cursor: 'pointer', borderRadius: '20px' }}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileChange} />
                      <motion.div animate={{ scale: isDragging ? 1.1 : 1 }} style={{ fontSize: '56px', marginBottom: '20px' }}>
                        {file ? '✅' : '📁'}
                      </motion.div>
                      {file ? (
                        <>
                          <p style={{ fontSize: '20px', fontWeight: '600', color: '#10b981', marginBottom: '8px' }}>{file.name}</p>
                          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{(file.size / 1024).toFixed(1)} KB · Click to change</p>
                        </>
                      ) : (
                        <>
                          <p style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Drop your CSV dataset here</p>
                          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>or click to browse files</p>
                          <div style={{ marginTop: '20px', padding: '8px 20px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '20px', display: 'inline-block', fontSize: '12px', color: '#8b5cf6', fontWeight: '600' }}>
                            Supports: CSV with income, age, gender, credit_score, loan_amount, loan_approved
                          </div>
                        </>
                      )}
                    </div>

                    <div className="glass-card" style={{ padding: '24px' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Model Configuration</h3>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={useGender} onChange={(e) => setUseGender(e.target.checked)} />
                        <div>
                          <p style={{ fontWeight: '600', fontSize: '15px' }}>Include sensitive feature (Gender)</p>
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>Demonstrates direct bias from sensitive attributes</p>
                        </div>
                      </label>
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '12px', padding: '14px 18px', display: 'flex', gap: '10px', alignItems: 'center', color: '#f43f5e', fontSize: '14px' }}>
                          🚨 {error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <button className="btn-primary" onClick={handleAnalyze} disabled={loading || !file} style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        {loading && loadingMsg.includes('Training') ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Training...</> : '🔍 Analyze Bias'}
                      </button>
                      <button className="btn-secondary" onClick={handleMitigate} disabled={loading || !results} style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        {loading && loadingMsg.includes('fairness') ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Mitigating...</> : '🛡️ Mitigate Bias'}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="glass-card" style={{ padding: '24px' }}>
                      <div style={{ fontSize: '28px', marginBottom: '12px' }}>🧠</div>
                      <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '10px' }}>Key Insight</h3>
                      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                        Even after removing sensitive features like gender, models can still learn bias through <strong style={{ color: '#8b5cf6' }}>proxy variables</strong> like income or age.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {dataProfile && (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-card" 
                        style={{ padding: '24px', background: 'rgba(255,255,255,0.02)' }}
                      >
                        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          🔍 Dataset Health Check
                        </h3>
                        
                        {dataProfile.suggestions.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                            {dataProfile.suggestions.map((s, i) => (
                              <div key={i} style={{ 
                                padding: '12px', 
                                borderRadius: '10px', 
                                background: s.type === 'critical' ? 'rgba(244,63,94,0.1)' : 'rgba(245,158,11,0.1)',
                                border: `1px solid ${s.type === 'critical' ? 'rgba(244,63,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
                                color: s.type === 'critical' ? '#f43f5e' : '#f59e0b',
                                fontSize: '13px',
                                display: 'flex',
                                gap: '10px'
                              }}>
                                <span>{s.type === 'critical' ? '🚨' : '⚠️'}</span>
                                <span>{s.message}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontSize: '13px', marginBottom: '20px' }}>
                            ✅ No immediate structural faults detected in dataset.
                          </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                          <div className="glass-card" style={{ padding: '16px', background: 'rgba(0,0,0,0.2)' }}>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Missing Values</p>
                            {Object.entries(dataProfile.missing_values).map(([col, val]) => (
                              <div key={col} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0' }}>
                                <span>{col}</span>
                                <span style={{ color: val > 0 ? '#f43f5e' : 'inherit' }}>{val}</span>
                              </div>
                            ))}
                          </div>

                          {dataProfile.sensitive_distribution && (
                            <div className="glass-card" style={{ padding: '16px', background: 'rgba(0,0,0,0.2)' }}>
                              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase' }}>Gender Representation</p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {Object.entries(dataProfile.sensitive_distribution).map(([label, ratio]) => (
                                  <div key={label}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                                      <span>{label}</span>
                                      <span>{(ratio * 100).toFixed(1)}%</span>
                                    </div>
                                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                      <div style={{ height: '100%', width: `${ratio * 100}%`, background: '#8b5cf6' }} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {dataProfile.target_distribution && (
                            <div className="glass-card" style={{ padding: '16px', background: 'rgba(0,0,0,0.2)' }}>
                              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase' }}>Target Distribution (Loan Approved)</p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {Object.entries(dataProfile.target_distribution).map(([label, ratio]) => (
                                  <div key={label}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                                      <span>{label === '1.0' || label === '1' ? 'Approved' : 'Denied'}</span>
                                      <span>{(ratio * 100).toFixed(1)}%</span>
                                    </div>
                                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                      <div style={{ height: '100%', width: `${ratio * 100}%`, background: '#10b981' }} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                    
                    <div className="glass-card" style={{ padding: '24px' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Bias Scoring</h3>
                      {[
                        { level: 'Low', range: '< 0.05', color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' },
                        { level: 'Medium', range: '0.05 – 0.15', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
                        { level: 'High', range: '> 0.15', color: '#f43f5e', bg: 'rgba(244,63,94,0.1)', border: 'rgba(244,63,94,0.3)' },
                      ].map(b => (
                        <div key={b.level} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: b.bg, border: `1px solid ${b.border}`, marginBottom: '8px' }}>
                          <span style={{ color: b.color, fontWeight: '600', fontSize: '14px' }}>{b.level}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'monospace' }}>{b.range}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─── RESULTS TAB ─── */}
            {activeTab === 'results' && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                {!results ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '64px', opacity: 0.3 }}>📊</div>
                    <h3 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-secondary)' }}>No Results Yet</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Upload a dataset and run analysis first.</p>
                    <button className="btn-primary" onClick={() => setActiveTab('upload')} style={{ padding: '14px 32px' }}>Go to Upload →</button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <h2 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px' }}>Analysis Results</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                          {results.isMitigated ? '🛡️ Fairness-mitigated model' : '🔍 Standard model'} · Features: {results.features_used?.join(', ')}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="btn-secondary" onClick={handleDownload} style={{ padding: '12px 24px', fontSize: '14px' }}>⬇️ Export Report</button>
                        <button className="btn-primary" onClick={() => setActiveTab('upload')} style={{ padding: '12px 24px', fontSize: '14px' }}>← New Analysis</button>
                      </div>
                    </div>

                    <motion.div className="glass-card animated-border" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ padding: '32px 40px', marginBottom: '24px', background: biasConfig.bg, border: `1px solid ${biasConfig.border}`, display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '56px' }}>{biasConfig.icon}</div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Overall Bias Assessment</p>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', flexWrap: 'wrap' }}>
                          <span className="stat-number" style={{ fontSize: '48px', fontWeight: '800', color: biasConfig.color }}>{results.bias_level}</span>
                          <span style={{ fontSize: '20px', color: 'var(--text-secondary)' }}>Bias Score: <strong style={{ color: biasConfig.color }}>{results.bias_difference.toFixed(4)}</strong></span>
                        </div>
                      </div>
                      <div style={{ minWidth: '200px' }}>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Bias level indicator</p>
                        <div className="progress-bar">
                          <motion.div className="progress-fill" initial={{ width: 0 }} animate={{ width: `${Math.min(results.bias_difference * 500, 100)}%` }} transition={{ duration: 1.2, ease: 'easeOut' }} style={{ background: `linear-gradient(90deg, ${biasConfig.color}, ${biasConfig.color}88)` }} />
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', textAlign: 'right' }}>{(results.bias_difference * 100).toFixed(1)}% disparity</p>
                      </div>
                    </motion.div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                      <MetricCard title="Model Accuracy" value={`${(results.accuracy * 100).toFixed(1)}%`} subtitle="Overall prediction accuracy" icon="🎯" colorClass={{ background: 'rgba(79,142,247,0.15)', color: '#4f8ef7' }} delay={0} />
                      <MetricCard title="Female Approval" value={`${(results.female_rate * 100).toFixed(1)}%`} subtitle="Selection rate" icon="♀️" colorClass={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }} delay={0.1} />
                      <MetricCard title="Male Approval" value={`${(results.male_rate * 100).toFixed(1)}%`} subtitle="Selection rate" icon="♂️" colorClass={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4' }} delay={0.2} />
                      <MetricCard title="Dem. Parity Diff" value={results.demographic_parity_diff.toFixed(3)} subtitle="Lower is fairer" icon="⚖️" colorClass={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }} delay={0.3} />
                      <MetricCard title="Equal Opp. Diff" value={results.equal_opportunity_diff.toFixed(3)} subtitle="True positive parity" icon="🎓" colorClass={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e' }} delay={0.4} />
                    </div>

                    <div className="responsive-grid-results">
                      <BiasCharts results={results} />

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        
                        {/* Global Feature Importance (SHAP) */}
                        {results.shap_importance && results.shap_importance.length > 0 && (
                          <motion.div className="glass-card" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} style={{ padding: '24px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>
                              Global Feature Importance
                            </h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                              Average impact on model output magnitude
                            </p>
                            <ShapChart shapData={results.shap_importance} type="global" />
                          </motion.div>
                        )}

                        {!results.isMitigated && (
                          <motion.div className="glass-card" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} style={{ padding: '24px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '10px' }}>🛡️ Apply Mitigation</h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.7 }}>Use Fairlearn's ExponentiatedGradient with demographic parity constraints to reduce bias in a data-driven way.</p>
                            <button className="btn-secondary" onClick={handleMitigate} disabled={loading} style={{ padding: '14px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                              {loading ? '⟳ Applying...' : '🛡️ Mitigate Bias'}
                            </button>
                          </motion.div>
                        )}

                        {results.isMitigated && results.before && (
                          <motion.div className="glass-card" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ padding: '24px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#10b981', marginBottom: '16px' }}>✅ Mitigation Applied</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {[ { label: 'Bias Difference', before: results.before.bias_difference, after: results.bias_difference }, { label: 'Accuracy', before: results.before.accuracy, after: results.accuracy } ].map(item => {
                                const improved = item.label === 'Bias Difference' ? item.after < item.before : item.after >= item.before;
                                return (
                                  <div key={item.label} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '12px 14px' }}>
                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{item.label}</p>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                      <span style={{ fontFamily: 'monospace', fontSize: '14px', color: '#f43f5e' }}>{item.before.toFixed(3)}</span>
                                      <span style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>→</span>
                                      <span style={{ fontFamily: 'monospace', fontSize: '14px', color: '#10b981' }}>{item.after.toFixed(3)}</span>
                                      <span style={{ marginLeft: 'auto', fontSize: '16px' }}>{improved ? '✅' : '⚠️'}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <LoanApprovalModule
                              applicant={applicant}
                              setApplicant={setApplicant}
                              useGender={useGender}
                              setUseGender={setUseGender}
                              onPredict={runSinglePrediction}
                              loading={loading && loadingMsg.includes('Evaluating')}
                              prediction={simulationResult}
                              onOpenSimulator={() => setActiveTab('simulator')}
                            />
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '20px 48px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(5,8,22,0.4)',
          fontSize: '13px', color: 'var(--text-secondary)',
        }}>
          <span>FairLoan AI · Built with React + FastAPI + Three.js</span>
          <span>Backend: <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" style={{ color: '#8b5cf6', textDecoration: 'none' }}>FastAPI Docs →</a></span>
        </footer>
      </div>
    </div>
  );
}
