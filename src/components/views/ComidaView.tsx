import React, { useState } from 'react';
import { Account, Transaction } from '../../types';
import { formatCRC } from '../../utils/formatters';

interface ComidaViewProps {
  accounts: Account[];
  transactions: Transaction[];
  onOpenQuickAdd: (mode?: any) => void;
  onDeleteTransaction?: (txId: string) => void;
}

export const ComidaView: React.FC<ComidaViewProps> = ({
  accounts,
  transactions,
  onOpenQuickAdd,
  onDeleteTransaction,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('todos');

  // Filter regular expenses and debt payments
  const expenseTransactions = transactions.filter((t) => t.type === 'gasto' || t.type === 'pago_deuda');

  const filteredTransactions = expenseTransactions.filter((tx) => {
    const matchesCategory = selectedCategory === 'todos' || tx.category === selectedCategory;
    const matchesAccount = selectedAccountId === 'todos' || tx.accountId === selectedAccountId;
    return matchesCategory && matchesAccount;
  });

  const totalExpense = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  // Group by categories
  const categoriesList = ['Comida', 'Transporte', 'Servicios', 'Personal', 'Deudas', 'Otros'];
  const categoryTotals: Record<string, number> = {};
  categoriesList.forEach((c) => {
    categoryTotals[c] = expenseTransactions
      .filter((tx) => tx.category === c)
      .reduce((sum, tx) => sum + tx.amount, 0);
  });

  return (
    <div className="space-y-4 pb-28 select-none">
      {/* Hero Card: Total de Gastos */}
      <section className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-[#181c24] via-[#1c2028] to-[#0a0e16] border border-[#3c4a42]/40 shadow-xl">
        <div className="absolute -right-10 -top-10 w-36 h-36 bg-[#ffb95f]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#86948a]">
                Gastos Registrados
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#ffb95f]/15 text-[#ffb95f] text-[10px] font-bold">
                {selectedCategory === 'todos' ? 'Total' : selectedCategory}
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-white tracking-tight">
                {formatCRC(totalExpense)}
              </span>
            </div>
            <p className="text-[11px] text-[#86948a] mt-0.5">
              {filteredTransactions.length} salidas registradas
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenQuickAdd('gasto')}
            className="w-10 h-10 rounded-2xl bg-[#ffb95f] text-[#3e2800] flex items-center justify-center font-bold shadow-lg shadow-[#ffb95f]/20 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[24px]">add</span>
          </button>
        </div>
      </section>

      {/* Filtros de Categoría */}
      <section className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setSelectedCategory('todos')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
            selectedCategory === 'todos'
              ? 'bg-[#10b981] text-[#003824] shadow'
              : 'bg-[#181c24] border border-[#3c4a42]/40 text-[#86948a] hover:text-white'
          }`}
        >
          Todas las categorías
        </button>
        {categoriesList.map((cat) => {
          const isSelected = selectedCategory === cat;
          const catTotal = categoryTotals[cat] || 0;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-[#ffb95f] text-[#3e2800] shadow'
                  : 'bg-[#181c24] border border-[#3c4a42]/40 text-[#86948a] hover:text-white'
              }`}
            >
              <span>{cat}</span>
              {catTotal > 0 && (
                <span className="text-[10px] opacity-80 font-mono">
                  {formatCRC(catTotal)}
                </span>
              )}
            </button>
          );
        })}
      </section>

      {/* Lista de Gastos */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-white tracking-tight">
            Movimientos de Gasto
          </h3>
          <button
            type="button"
            onClick={() => onOpenQuickAdd('gasto')}
            className="text-[11px] text-[#ffb95f] font-bold hover:underline flex items-center gap-0.5"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            <span>Nuevo Gasto</span>
          </button>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#181c24] border border-[#3c4a42]/40 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#ffb95f]/15 text-[#ffb95f] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
            </div>
            <h4 className="text-xs font-bold text-white">No hay gastos registrados</h4>
            <p className="text-[11px] text-[#86948a] max-w-xs mx-auto">
              Registra tus compras del supermercado, transporte o salidas para ver cómo se descuentan de tus cuentas.
            </p>
            <button
              type="button"
              onClick={() => onOpenQuickAdd('gasto')}
              className="px-3.5 py-2 rounded-xl bg-[#ffb95f] text-[#3e2800] font-bold text-xs inline-flex items-center gap-1 active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Registrar mi primer gasto</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTransactions.map((tx) => {
              const account = accounts.find((a) => a.id === tx.accountId);
              return (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-2xl bg-[#181c24] border border-[#3c4a42]/40 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#ffb95f]/20 text-[#ffb95f] flex items-center justify-center font-bold">
                      <span className="material-symbols-outlined text-[18px]">
                        {tx.category === 'Comida'
                          ? 'restaurant'
                          : tx.category === 'Transporte'
                          ? 'directions_car'
                          : tx.category === 'Servicios'
                          ? 'lightbulb'
                          : tx.category === 'Deudas'
                          ? 'credit_card'
                          : 'shopping_bag'}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{tx.title}</h4>
                      <div className="flex items-center gap-1.5 text-[10px] text-[#86948a]">
                        <span>{tx.date}</span>
                        {account && (
                          <>
                            <span>•</span>
                            <span className="text-[#ffb95f] font-semibold">
                              De: {account.name}
                            </span>
                          </>
                        )}
                        <span>• {tx.category}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-[#ffb4ab]">
                      -{formatCRC(tx.amount)}
                    </span>
                    {onDeleteTransaction && (
                      <button
                        type="button"
                        onClick={() => onDeleteTransaction(tx.id)}
                        className="text-[#86948a] hover:text-rose-400 transition-colors p-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
