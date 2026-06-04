import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  AreaChart, Area
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(10, 15, 46, 0.95)',
        border: '1px solid rgba(139, 92, 246, 0.4)',
        borderRadius: '12px',
        padding: '12px 16px',
      }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>{label}</p>
        <p style={{ color: '#8b5cf6', fontSize: '18px', fontWeight: '700' }}>
          {typeof payload[0].value === 'number' ? (payload[0].value * 100).toFixed(1) + '%' : payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

export default function BiasCharts({ results }) {
  if (!results) return null;

  const barData = results.chart_data;

  const radarData = [
    { metric: 'Selection Rate', value: results.bias_difference * 100 },
    { metric: 'Dem. Parity', value: Math.abs(results.demographic_parity_diff) * 100 },
    { metric: 'Equal Opp.', value: Math.abs(results.equal_opportunity_diff) * 100 },
    { metric: 'Accuracy', value: results.accuracy * 100 },
    { metric: 'Bias Score', value: results.bias_difference * 100 },
  ];

  const areaData = barData.map(d => ({
    ...d,
    baseline: 0.5,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Bar Chart - Selection Rate */}
      <motion.div
        className="glass-card"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        style={{ padding: '28px' }}
      >
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
            Selection Rate by Group
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Loan approval rates across demographic groups
          </p>
        </div>
        <div style={{ height: '220px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} barSize={60}>
              <defs>
                <linearGradient id="femaleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#4f8ef7" stopOpacity={0.7}/>
                </linearGradient>
                <linearGradient id="maleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.7}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="group"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#8892b0', fontSize: 13, fontWeight: 500 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#8892b0', fontSize: 12 }}
                domain={[0, 1]}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139,92,246,0.08)' }} />
              <Bar
                dataKey="rate"
                fill="url(#femaleGrad)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Radar Chart - Fairness Metrics */}
      <motion.div
        className="glass-card"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.35 }}
        style={{ padding: '28px' }}
      >
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
            Fairness Metrics Overview
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Multi-dimensional fairness analysis
          </p>
        </div>
        <div style={{ height: '220px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fill: '#8892b0', fontSize: 11 }}
              />
              <Radar
                dataKey="value"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.2}
                strokeWidth={2}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(10,15,46,0.95)',
                  border: '1px solid rgba(139,92,246,0.4)',
                  borderRadius: '10px',
                  color: '#f0f4ff',
                }}
                formatter={(v) => [`${v.toFixed(1)}`, '']}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Before vs After - if mitigated */}
      {results.isMitigated && results.before && (
        <motion.div
          className="glass-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          style={{ padding: '28px' }}
        >
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
              Before vs After Mitigation
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Bias difference comparison
            </p>
          </div>
          <div style={{ height: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'Before', bias: results.before.bias_difference * 100 },
                  { name: 'After', bias: results.bias_difference * 100 },
                ]}
                barSize={50}
              >
                <defs>
                  <linearGradient id="beforeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.7}/>
                  </linearGradient>
                  <linearGradient id="afterGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.7}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8892b0', fontSize: 13 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8892b0', fontSize: 12 }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                <Tooltip
                  contentStyle={{ background: 'rgba(10,15,46,0.95)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: '10px', color: '#f0f4ff' }}
                  formatter={(v) => [`${v.toFixed(2)}%`, 'Bias Diff']}
                />
                <Bar dataKey="bias" radius={[6, 6, 0, 0]}
                  fill="url(#beforeGrad)"
                  label={{ position: 'top', fill: '#8892b0', fontSize: 11 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}
    </div>
  );
}
