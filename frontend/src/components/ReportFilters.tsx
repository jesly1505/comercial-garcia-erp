import React from 'react';

interface ReportFiltersProps {
  onFilter: (range: string, customStartDate?: string, customEndDate?: string) => void;
  disabled?: boolean;
}

const ReportFilters: React.FC<ReportFiltersProps> = ({ onFilter, disabled }) => {
  const [range, setRange] = React.useState('monthly');
  
  const handleApply = () => {
    onFilter(range);
  };

  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
      <select 
        value={range} 
        onChange={e => setRange(e.target.value)}
        style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-glass)' }}
        disabled={disabled}
      >
        <option value="daily">Diario (Hoy)</option>
        <option value="monthly">Mensual</option>
        <option value="annual">Anual</option>
        <option value="all">Todo el Histórico</option>
      </select>
      
      <button className="btn-primary" onClick={handleApply} disabled={disabled}>
        Aplicar Filtro
      </button>
    </div>
  );
};

export default ReportFilters;
