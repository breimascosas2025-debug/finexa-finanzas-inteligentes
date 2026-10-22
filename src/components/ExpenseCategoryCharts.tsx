import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { formatCRC } from '../utils/formatters';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface ExpenseCategoryChartsProps {
  transactions: Transaction[];
  compact?: boolean;
  onSelectCategory?: (category: string | null) => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; hex: string; icon: string }> = {
  'Comida': { bg: 'bg-[#ff7b00]/20', border: 'border-[#ff7b00]', hex: '#ff7b00', icon: 'restaurant' },
  'Transporte': { bg: 'bg-[#4285F4]/20', border: 'border-[#4285F4]', hex: '#4285F4', icon: 'directions_car' },
  'Servicios': { bg: 'bg-[#a855f7]/20', border: 'border-[#a855f7]', hex: '#a855f7', icon: 'receipt_long' },
  'Personal': { bg: 'bg-[#ec4899]/20', border: 'border-[#ec4899]', hex: '#ec4899', icon: 'person' },
  'Deudas': { bg: 'bg-[#ff5c5c]/20', border: 'border-[#ff5c5c]', hex: '#ff5c5c', icon: 'credit_card' },
  'Iglesia': { bg: 'bg-[#10b981]/20', border: 'border-[#10b981]', hex: '#10b981', icon: 'church' },
  'Ahorro': { bg: 'bg-[#06b6d4]/20', border: 'border-[#06b6d4]', hex: '#06b6d4', icon: 'savings' },
  'Salarios': { bg: 'bg-[#84cc16]/20', border: 'border-[#84cc16]', hex: '#84cc16', icon: 'payments' },
  'Otros': { bg: 'bg-[#64748b]/20', border: 'border-[#64748b]', hex: '#94a3b8', icon: 'category' },
};

export const ExpenseCategoryCharts: React.FC<ExpenseCategoryChartsProps> = ({
  transactions,
  compact = false,
  onSelectCategory,
}) => {
  const [timeFilter, setTimeFilter] = useState<'all' | '30days' | 'month'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filtrar solo transacciones de tipo gasto
  const expenseTransactions = useMemo(() => {
    return transactions.filter((t) => t.type === 'gasto');
  }, [transactions]);

  // Agrupar por categoría
  const categoryData = useMemo(() => {
    const totals: Record<string, number> = {};
    let grandTotal = 0;

    expenseTransactions.forEach((tx) => {
      const cat = tx.category || 'Otros';
      totals[cat] = (totals[cat] || 0) + tx.amount;
      grandTotal += tx.amount;
    });

    const items = Object.keys(totals).map((cat) => {
      const amount = totals[cat];
      const percentage = grandTotal > 0 ? (amount / grandTotal) * 100 : 0;
      const config = CATEGORY_COLORS[cat] || CATEGORY_COLORS['Otros'];
      return {
        name: cat,
        value: amount,
        percentage,
        color: config.hex,
        icon: config.icon,
      };
    });

    // Ordenar de mayor a menor
    items.sort((a, b) => b.value - a.value);

    return {
      items,
      grandTotal,
    };
  }, [expenseTransactions]);

  const handleCategoryClick = (cat: string) => {
    const next = selectedCategory === cat ? null : cat;
    setSelectedCategory(next);
    if (onSelectCategory) {
      onSelectCategory(next);
    }
  };

  if (categoryData.items.length === 0) {
    return (
      <div className="p-5 rounded-3xl bg-[#181c24] border border-[#3c4a42]/50 text-center space-y-2">
        <span className="material-symbols-outlined text-3xl text-[#86948a]">pie_chart</span>
        <h4 className="text-xs font-bold text-white">Sin datos de gastos aún</h4>
        <p className="text-[10px] text-[#86948a]">
          Registra tus salidas de dinero para visualizar gráficos estadísticos por categoría.
        </p>
      </div>
    );
  }

  const topCategory = categoryData.items[0];

  return (
    <div className={`space-y-4 ${compact ? '' : 'p-4 rounded-3xl bg-[#181c24] border border-[#3c4a42]/50 shadow-xl'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#ff7b00]/20 text-[#ff7b00] flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[18px]">donut_large</span>
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Gastos por Categoría
            </h3>
            <p className="text-[10px] text-[#86948a]">
              Total Egresos: {formatCRC(categoryData.grandTotal)}
            </p>
          </div>
        </div>

        {selectedCategory && (
          <button
            type="button"
            onClick={() => handleCategoryClick(selectedCategory)}
            className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#262a33] text-[#86948a] hover:text-white border border-[#3c4a42]"
          >
            Limpiar filtro ✕
          </button>
        )}
      </div>

      {/* Top Insight Badge */}
      {topCategory && (
        <div className="p-2.5 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/40 flex items-center gap-2.5 text-xs">
          <span className="text-lg">💡</span>
          <p className="text-[#dfe2ee] text-[11px]">
            Tu mayor egreso es <strong className="text-white">{topCategory.name}</strong> con{' '}
            <strong className="text-[#ff7b00]">{formatCRC(topCategory.value)}</strong> ({topCategory.percentage.toFixed(1)}% del total).
          </p>
        </div>
      )}

      {/* Donut Chart and Interactive Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
        {/* Visual Donut Chart */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center relative min-h-[170px]">
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie
                data={categoryData.items}
                cx="50%"
                cy="50%"
                innerRadius={46}
                outerRadius={68}
                paddingAngle={3}
                dataKey="value"
                onClick={(entry: any) => {
                  if (entry && entry.name) {
                    handleCategoryClick(String(entry.name));
                  }
                }}
                cursor="pointer"
              >
                {categoryData.items.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={entry.color}
                    stroke={selectedCategory === entry.name ? '#ffffff' : '#181c24'}
                    strokeWidth={selectedCategory === entry.name ? 3 : 1.5}
                    opacity={selectedCategory && selectedCategory !== entry.name ? 0.4 : 1}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(val: any) => [formatCRC(Number(val)), 'Total']}
                contentStyle={{
                  backgroundColor: '#181c24',
                  borderColor: '#3c4a42',
                  borderRadius: '12px',
                  fontSize: '11px',
                  color: '#ffffff',
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Centered Donut Summary Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-[#86948a] uppercase font-bold">Total</span>
            <span className="text-xs font-black text-white">{formatCRC(categoryData.grandTotal)}</span>
          </div>
        </div>

        {/* Category List with Linear Progress Bars */}
        <div className="sm:col-span-7 space-y-2">
          {categoryData.items.map((item) => {
            const isSelected = selectedCategory === item.name;
            return (
              <div
                key={item.name}
                onClick={() => handleCategoryClick(item.name)}
                className={`p-2 rounded-xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-[#262a33] border-[#10b981]'
                    : 'bg-[#0f131c]/60 border-[#3c4a42]/30 hover:border-[#3c4a42]'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-semibold text-white text-[11px]">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white text-[11px]">{formatCRC(item.value)}</span>
                    <span className="text-[10px] font-mono text-[#86948a] min-w-[32px] text-right">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-[#181c24] overflow-hidden">
                  <div
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                    }}
                    className="h-full rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
