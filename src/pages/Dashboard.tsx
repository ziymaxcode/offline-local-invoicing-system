import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/src/db/db';
import { Users, Package, TrendingUp, TrendingDown, FileText, Undo2, ArrowDownLeft } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { format } from 'date-fns';

export function Dashboard() {
  const customers = useLiveQuery(() => db.customers.toArray());
  const products = useLiveQuery(() => db.products.toArray());
  const recentTransactions = useLiveQuery(() => 
    db.transactions.orderBy('date').reverse().limit(5).toArray()
  );

  const stats = {
    totalCustomers: customers?.length || 0,
    totalProducts: products?.length || 0,
    receivables: customers?.reduce((sum, c) => c.currentBalance > 0 ? sum + c.currentBalance : sum, 0) || 0,
    payables: customers?.reduce((sum, c) => c.currentBalance < 0 ? sum + Math.abs(c.currentBalance) : sum, 0) || 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">Overview of your hardware business.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-500">Total Receivables</h3>
            <div className="p-2 bg-red-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-red-600" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-zinc-900 mt-4">₹{stats.receivables.toFixed(2)}</p>
          <p className="text-xs text-zinc-500 mt-1">Customers owe you</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-500">Total Payables</h3>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <TrendingDown className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-zinc-900 mt-4">₹{stats.payables.toFixed(2)}</p>
          <p className="text-xs text-zinc-500 mt-1">You owe customers</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-500">Total Products</h3>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-zinc-900 mt-4">{stats.totalProducts}</p>
          <p className="text-xs text-zinc-500 mt-1">Items in inventory</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-500">Total Customers</h3>
            <div className="p-2 bg-purple-50 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-zinc-900 mt-4">{stats.totalCustomers}</p>
          <p className="text-xs text-zinc-500 mt-1">Registered accounts</p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
        <div className="p-6 border-b border-zinc-100">
          <h2 className="text-lg font-medium text-zinc-900">Recent Transactions</h2>
        </div>
        <div className="p-6">
          {recentTransactions?.length === 0 ? (
            <div className="text-center py-8 text-sm text-zinc-500">
              No recent transactions.
            </div>
          ) : (
            <div className="space-y-4">
              {recentTransactions?.map(tx => {
                const customer = customers?.find(c => c.id === tx.customerId);
                return (
                  <div key={tx.id} className="flex items-center justify-between p-4 rounded-2xl border border-zinc-100 hover:shadow-sm transition-shadow bg-zinc-50/50">
                    <div className="flex items-center space-x-4">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        tx.type === 'invoice' ? "bg-red-50 text-red-600" : 
                        tx.type === 'return' ? "bg-emerald-50 text-emerald-600" : 
                        "bg-blue-50 text-blue-600"
                      )}>
                        {tx.type === 'invoice' ? <FileText className="h-5 w-5" /> : 
                         tx.type === 'return' ? <Undo2 className="h-5 w-5" /> : 
                         <ArrowDownLeft className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900">
                          {customer?.name || 'Unknown Customer'}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">{tx.details}</p>
                        <p className="text-xs text-zinc-400 mt-1">{format(tx.date, 'dd MMM yyyy, hh:mm a')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-base font-semibold",
                        tx.type === 'invoice' ? "text-red-600" : "text-emerald-600"
                      )}>
                        {tx.type === 'invoice' ? '+' : '-'} ₹{tx.amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
