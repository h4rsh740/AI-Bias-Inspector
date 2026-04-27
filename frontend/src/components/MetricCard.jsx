import { motion } from 'framer-motion';
import CountUp from 'react-countup';

export default function MetricCard({ title, value, subtitle, icon, colorClass, delay = 0, extra }) {
  // Extract number from string like "85.2%" or "0.123"
  const safeValue = value == null ? '' : String(value);
  const isPercentage = safeValue.includes('%');
  const numValue = parseFloat(safeValue);
  const CountUpComponent = typeof CountUp === 'function' ? CountUp : CountUp?.default;
  const canAnimateCount = typeof CountUpComponent === 'function';
  
  return (
    <motion.div
      className="glass-card metric-card"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      style={{ padding: '24px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {title}
          </p>
        </div>
        <div style={{
          width: '40px', height: '40px',
          borderRadius: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px',
          ...colorClass,
        }}>
          {icon}
        </div>
      </div>
      <div className="stat-number" style={{ fontSize: '36px', fontWeight: '700', marginBottom: '6px' }}>
        {!isNaN(numValue) ? (
          canAnimateCount ? (
            <CountUpComponent
              end={numValue}
              duration={2}
              decimals={isPercentage ? 1 : 3}
              suffix={isPercentage ? "%" : ""}
            />
          ) : (
            `${numValue.toFixed(isPercentage ? 1 : 3)}${isPercentage ? '%' : ''}`
          )
        ) : safeValue}
      </div>
      {subtitle && (
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{subtitle}</p>
      )}
      {extra}
    </motion.div>
  );
}
