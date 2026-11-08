import { recentTransactions as defaultTransactions } from '@/lib/data';
import { formatCurrency, cn } from '@/lib/utils';
import { ArrowUpRight } from 'lucide-react';

const statusColors: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700',
  unpaid: 'bg-rose-50 text-rose-600',
  received: 'bg-purple-50 text-purple-700',
  partial: 'bg-amber-50 text-amber-700',
};

const typeColors: Record<string, string> = {
  sale: 'text-indigo-600 bg-indigo-50',
  purchase: 'text-purple-600 bg-purple-50',
};

interface Transaction {
  id: string;
  type: 'sale' | 'purchase';
  party: string;
  date: string;
  amount: number;
  status: string;
}

export default function RecentTransactions({
  transactions = defaultTransactions,
}: {
  transactions?: Transaction[];
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Recent Transactions</h3>
          <p className="text-xs text-slate-400 mt-0.5">Latest activity across all invoices</p>
        </div>
        <button className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
          View all <ArrowUpRight size={12} />
        </button>
      </div>

      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-medium text-slate-400 pb-3 px-1">Invoice</th>
              <th className="text-left text-xs font-medium text-slate-400 pb-3 px-1">Type</th>
              <th className="text-left text-xs font-medium text-slate-400 pb-3 px-1">Party</th>
              <th className="text-left text-xs font-medium text-slate-400 pb-3 px-1">Date</th>
              <th className="text-right text-xs font-medium text-slate-400 pb-3 px-1">Amount</th>
              <th className="text-center text-xs font-medium text-slate-400 pb-3 px-1">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                  No transactions recorded yet for this business. Create your first sale invoice or purchase bill!
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="py-3 px-1 font-mono text-xs font-semibold text-slate-700">{tx.id}</td>
                  <td className="py-3 px-1">
                    <span
                      className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded capitalize',
                        typeColors[tx.type] || 'text-slate-600 bg-slate-50'
                      )}
                    >
                      {tx.type}
                    </span>
                  </td>
                  <td className="py-3 px-1 text-slate-700 font-medium">{tx.party}</td>
                  <td className="py-3 px-1 text-slate-400 text-xs">{tx.date}</td>
                  <td className="py-3 px-1 text-right font-semibold text-slate-800">
                    {formatCurrency(tx.amount)}
                  </td>
                  <td className="py-3 px-1 text-center">
                    <span
                      className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded capitalize',
                        statusColors[tx.status] || 'bg-slate-100 text-slate-600'
                      )}
                    >
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
