import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{
        background: 'rgba(10, 15, 46, 0.95)',
        border: '1px solid rgba(139, 92, 246, 0.4)',
        borderRadius: '12px',
        padding: '12px 16px',
      }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px', textTransform: 'capitalize' }}>
          {label}
        </p>
        <p style={{ color: data.shap_value > 0 ? '#10b981' : '#f43f5e', fontSize: '16px', fontWeight: '700' }}>
          {data.shap_value > 0 ? '+' : ''}{data.shap_value.toFixed(3)} impact
        </p>
        {data.value !== undefined && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px' }}>
            Feature value: {data.value}
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default function ShapChart({ shapData, type = 'local' }) {
  if (!shapData) return null;

  // Local is for a single prediction (waterfall/bar chart)
  // Global is for overall model importance (mean absolute SHAP)
  
  const isGlobal = type === 'global';
  const data = isGlobal ? shapData : shapData.contributions;
  
  if (!data || data.length === 0) return null;

  // Format data for Recharts
  const chartData = data.map(item => ({
    name: item.feature,
    shap_value: isGlobal ? item.importance : item.shap_value,
    value: item.value, // only for local
  })).reverse(); // Reverse so most important is at top of Y-axis

  return (
    <div style={{ height: '300px', width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 10, right: 30, left: 40, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={true} />
          <XAxis 
            type="number" 
            tick={{ fill: '#8892b0', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          />
          <YAxis 
            type="category" 
            dataKey="name" 
            tick={{ fill: '#f0f4ff', fontSize: 12, fontWeight: 500 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={false}
            width={100}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139,92,246,0.08)' }} />
          {!isGlobal && <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" />}
          <Bar 
            dataKey="shap_value" 
            radius={[0, 4, 4, 0]}
            barSize={20}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={isGlobal 
                  ? '#8b5cf6' 
                  : (entry.shap_value > 0 ? '#10b981' : '#f43f5e')} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {!isGlobal && shapData.base_value !== undefined && (
        <div style={{ 
          marginTop: '16px', 
          padding: '12px', 
          background: 'rgba(255,255,255,0.02)', 
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '13px'
        }}>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Base Value:</span>{' '}
            <span style={{ fontWeight: '600' }}>{shapData.base_value.toFixed(3)}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Final Output:</span>{' '}
            <span style={{ fontWeight: '600', color: shapData.prediction_value > 0 ? '#10b981' : '#f43f5e' }}>
              {shapData.prediction_value.toFixed(3)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
