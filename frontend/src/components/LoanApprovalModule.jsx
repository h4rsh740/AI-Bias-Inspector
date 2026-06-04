import { motion } from 'framer-motion';

export default function LoanApprovalModule({
  applicant,
  setApplicant,
  useGender,
  setUseGender,
  onPredict,
  loading,
  prediction,
  onOpenSimulator,
}) {
  return (
    <motion.div
      className="glass-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{ padding: '24px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Loan Approval Module</h3>
        <span style={{
          fontSize: '11px',
          padding: '4px 10px',
          borderRadius: '999px',
          background: 'rgba(79,142,247,0.12)',
          border: '1px solid rgba(79,142,247,0.35)',
          color: '#4f8ef7',
          fontWeight: '600',
          letterSpacing: '0.3px',
        }}>
          Modular
        </span>
      </div>

      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '18px', lineHeight: 1.6 }}>
        Quickly evaluate one applicant from the Global Data page without leaving your dataset workflow.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Income</span>
          <input
            type="number"
            value={applicant.income}
            onChange={(e) => setApplicant({ ...applicant, income: Number(e.target.value) })}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Credit Score</span>
          <input
            type="number"
            min={300}
            max={850}
            value={applicant.credit_score}
            onChange={(e) => setApplicant({ ...applicant, credit_score: Number(e.target.value) })}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Loan Amount</span>
          <input
            type="number"
            value={applicant.loan_amount}
            onChange={(e) => setApplicant({ ...applicant, loan_amount: Number(e.target.value) })}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Gender</span>
          <select
            value={applicant.gender}
            onChange={(e) => setApplicant({ ...applicant, gender: e.target.value })}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </label>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '14px', color: 'var(--text-secondary)' }}>
        <input type="checkbox" checked={useGender} onChange={(e) => setUseGender(e.target.checked)} />
        Include gender in decision model
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: prediction ? '14px' : 0 }}>
        <button className="btn-primary" onClick={onPredict} disabled={loading} style={{ padding: '12px' }}>
          {loading ? 'Running...' : 'Run Decision'}
        </button>
        <button className="btn-secondary" onClick={onOpenSimulator} style={{ padding: '12px' }}>
          Open Full Simulator
        </button>
      </div>

      {prediction && (
        <div style={{
          marginTop: '14px',
          background: prediction.approved ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)',
          border: prediction.approved ? '1px solid rgba(16,185,129,0.35)' : '1px solid rgba(244,63,94,0.35)',
          borderRadius: '10px',
          padding: '12px',
        }}>
          <p style={{ fontSize: '13px', marginBottom: '6px', color: 'var(--text-secondary)' }}>Latest decision</p>
          <p style={{ fontSize: '15px', fontWeight: '700', color: prediction.approved ? '#10b981' : '#f43f5e' }}>
            {prediction.approved ? 'APPROVED' : 'DENIED'}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Probability: {(prediction.probability_approved * 100).toFixed(1)}%
          </p>
          {!prediction.approved && prediction.rejection_tips && prediction.rejection_tips.length > 0 && (
            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(244,63,94,0.2)' }}>
              <p style={{ fontSize: '12px', fontWeight: '700', color: '#f43f5e', marginBottom: '4px' }}>AI Suggestion:</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', lineHeight: 1.4 }}>
                "{prediction.rejection_tips[0]}"
              </p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
