import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Customer, type Transaction } from '@/src/db/db';
import { Search, UserPlus, ArrowUpRight, ArrowDownLeft, FileText, Undo2, Edit2, Printer } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { format } from 'date-fns';
import { EditInvoiceModal } from '@/src/components/EditInvoiceModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function Customers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printStartDate, setPrintStartDate] = useState('');
  const [printEndDate, setPrintEndDate] = useState('');

  const customers = useLiveQuery(
    () => {
      if (searchQuery) {
        return db.customers
          .where('name')
          .startsWithIgnoreCase(searchQuery)
          .or('phone')
          .startsWithIgnoreCase(searchQuery)
          .toArray();
      }
      return db.customers.toArray();
    },
    [searchQuery]
  );

  const selectedCustomer = useLiveQuery(
    () => selectedCustomerId ? db.customers.get(selectedCustomerId) : undefined,
    [selectedCustomerId]
  );

  const transactions = useLiveQuery(
    () => {
      if (selectedCustomerId) {
        return db.transactions
          .where('customerId')
          .equals(selectedCustomerId)
          .reverse()
          .sortBy('date');
      }
      return [];
    },
    [selectedCustomerId]
  );

  const handleAddCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const id = await db.customers.add({
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      address: formData.get('address') as string,
      currentBalance: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    setSelectedCustomerId(id);
    setIsCustomerModalOpen(false);
  };

  const handlePrintLedger = () => {
    if (!selectedCustomer) return;
    const doc = new jsPDF();
    
    let filteredTxs = transactions || [];
    if (printStartDate) {
      const start = new Date(printStartDate);
      start.setHours(0,0,0,0);
      filteredTxs = filteredTxs.filter(tx => tx.date >= start);
    }
    if (printEndDate) {
      const end = new Date(printEndDate);
      end.setHours(23,59,59,999);
      filteredTxs = filteredTxs.filter(tx => tx.date <= end);
    }

    doc.setFontSize(20);
    doc.text('CUSTOMER LEDGER', 14, 22);
    
    doc.setFontSize(10);
    doc.text('Ashiq Hardware', 14, 30);
    
    doc.setFontSize(12);
    doc.text(`Customer: ${selectedCustomer.name}`, 14, 45);
    doc.setFontSize(10);
    doc.text(`Phone: ${selectedCustomer.phone}`, 14, 51);
    if (selectedCustomer.address) {
      doc.text(`Address: ${selectedCustomer.address}`, 14, 56);
    }
    
    const balanceText = selectedCustomer.currentBalance > 0 ? 'Customer owes you' : selectedCustomer.currentBalance < 0 ? 'You owe customer' : 'Settled';
    doc.text(`Current Balance: Rs. ${Math.abs(selectedCustomer.currentBalance).toFixed(2)} (${balanceText})`, 140, 45);
    
    let dateRangeText = 'All Time';
    if (printStartDate && printEndDate) dateRangeText = `${format(new Date(printStartDate), 'dd MMM yyyy')} to ${format(new Date(printEndDate), 'dd MMM yyyy')}`;
    else if (printStartDate) dateRangeText = `From ${format(new Date(printStartDate), 'dd MMM yyyy')}`;
    else if (printEndDate) dateRangeText = `Until ${format(new Date(printEndDate), 'dd MMM yyyy')}`;
    doc.text(`Period: ${dateRangeText}`, 140, 51);

    const tableBody = filteredTxs.map(tx => [
      format(tx.date, 'dd MMM yyyy'),
      tx.type === 'invoice' ? 'Sale' : tx.type === 'return' ? 'Return' : 'Payment',
      tx.details,
      tx.type === 'invoice' ? `Rs. ${tx.amount.toFixed(2)}` : '-',
      tx.type !== 'invoice' ? `Rs. ${tx.amount.toFixed(2)}` : '-'
    ]);

    autoTable(doc, {
      startY: 65,
      head: [['Date', 'Type', 'Details', 'Debit (+)', 'Credit (-)']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [24, 24, 27] }
    });

    doc.save(`Ledger_${selectedCustomer.name.replace(/\s+/g, '_')}.pdf`);
    setIsPrintModalOpen(false);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-6">
      {/* Left Column: Customer List */}
      <div className="w-1/3 flex flex-col bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
        <div className="p-4 border-b border-zinc-100 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">Customers</h2>
            <button
              onClick={() => setIsCustomerModalOpen(true)}
              className="p-2 rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
            </button>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-zinc-400" />
            </div>
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-xl border-0 py-2 pl-10 pr-3 text-zinc-900 ring-1 ring-inset ring-zinc-200 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-zinc-900 sm:text-sm sm:leading-6"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {customers?.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              No customers found.
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {customers?.map(customer => (
                <li key={customer.id}>
                  <button
                    onClick={() => setSelectedCustomerId(customer.id!)}
                    className={cn(
                      "w-full text-left px-4 py-4 hover:bg-zinc-50 transition-colors flex items-center justify-between",
                      selectedCustomerId === customer.id ? "bg-zinc-50 border-l-2 border-zinc-900" : ""
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{customer.name}</p>
                      <p className="text-xs text-zinc-500">{customer.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-sm font-semibold",
                        customer.currentBalance > 0 ? "text-red-600" : customer.currentBalance < 0 ? "text-emerald-600" : "text-zinc-900"
                      )}>
                        ₹{Math.abs(customer.currentBalance).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                        {customer.currentBalance > 0 ? 'You will get' : customer.currentBalance < 0 ? 'You will give' : 'Settled'}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right Column: Ledger / Details */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-zinc-100 flex flex-col overflow-hidden">
        {selectedCustomer ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">{selectedCustomer.name}</h2>
                <p className="text-sm text-zinc-500 mt-1">{selectedCustomer.phone} {selectedCustomer.address ? `• ${selectedCustomer.address}` : ''}</p>
              </div>
              <div className="text-right bg-white px-4 py-2 rounded-xl shadow-sm border border-zinc-100">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1">Net Balance</p>
                <p className={cn(
                  "text-2xl font-bold",
                  selectedCustomer.currentBalance > 0 ? "text-red-600" : selectedCustomer.currentBalance < 0 ? "text-emerald-600" : "text-zinc-900"
                )}>
                  ₹{Math.abs(selectedCustomer.currentBalance).toFixed(2)}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {selectedCustomer.currentBalance > 0 ? 'Customer owes you' : selectedCustomer.currentBalance < 0 ? 'You owe customer' : 'Fully settled'}
                </p>
                <button
                  onClick={() => setIsPrintModalOpen(true)}
                  className="mt-3 w-full flex items-center justify-center rounded-lg bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-200 transition-colors"
                >
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  Print Ledger
                </button>
              </div>
            </div>

            {/* Ledger Transactions */}
            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="text-sm font-medium text-zinc-900 mb-4 uppercase tracking-wider">Ledger History</h3>
              
              {transactions?.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-zinc-100 rounded-2xl">
                  <p className="text-sm text-zinc-500">No transactions recorded for this customer yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions?.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between p-4 rounded-2xl border border-zinc-100 hover:shadow-sm transition-shadow bg-white">
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
                            {tx.type === 'invoice' ? 'Sale (Debit)' : 
                             tx.type === 'return' ? 'Return (Credit)' : 
                             'Payment Received (Credit)'}
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">{tx.details}</p>
                          <p className="text-xs text-zinc-400 mt-1">{format(tx.date, 'dd MMM yyyy, hh:mm a')}</p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <p className={cn(
                          "text-base font-semibold",
                          tx.type === 'invoice' ? "text-red-600" : "text-emerald-600"
                        )}>
                          {tx.type === 'invoice' ? '+' : '-'} ₹{tx.amount.toFixed(2)}
                        </p>
                        {tx.type === 'invoice' && tx.invoiceId && (
                          <button
                            onClick={() => setEditingInvoiceId(tx.invoiceId!)}
                            className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center transition-colors"
                          >
                            <Edit2 className="h-3 w-3 mr-1" /> Edit Bill
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            Select a customer from the list to view their ledger.
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/20 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">Add New Customer</h2>
              <button 
                onClick={() => setIsCustomerModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-900 text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAddCustomer} className="p-6 space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-zinc-700">Full Name</label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  className="mt-1 block w-full rounded-xl border-0 py-2 px-3 text-zinc-900 ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-inset focus:ring-zinc-900 sm:text-sm sm:leading-6"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-zinc-700">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  id="phone"
                  required
                  className="mt-1 block w-full rounded-xl border-0 py-2 px-3 text-zinc-900 ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-inset focus:ring-zinc-900 sm:text-sm sm:leading-6"
                />
              </div>
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-zinc-700">Address (Optional)</label>
                <textarea
                  name="address"
                  id="address"
                  rows={2}
                  className="mt-1 block w-full rounded-xl border-0 py-2 px-3 text-zinc-900 ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-inset focus:ring-zinc-900 sm:text-sm sm:leading-6"
                />
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 transition-colors"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Invoice Modal */}
      {editingInvoiceId && (
        <EditInvoiceModal
          invoiceId={editingInvoiceId}
          onClose={() => setEditingInvoiceId(null)}
        />
      )}

      {/* Print Ledger Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/20 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">Print Ledger</h2>
              <button 
                onClick={() => setIsPrintModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-900 text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-zinc-500">Select a date range to print, or leave blank for full history.</p>
              <div>
                <label className="block text-sm font-medium text-zinc-700">Start Date</label>
                <input
                  type="date"
                  value={printStartDate}
                  onChange={(e) => setPrintStartDate(e.target.value)}
                  className="mt-1 block w-full rounded-xl border-0 py-2 px-3 text-zinc-900 ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-inset focus:ring-zinc-900 sm:text-sm sm:leading-6"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">End Date</label>
                <input
                  type="date"
                  value={printEndDate}
                  onChange={(e) => setPrintEndDate(e.target.value)}
                  className="mt-1 block w-full rounded-xl border-0 py-2 px-3 text-zinc-900 ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-inset focus:ring-zinc-900 sm:text-sm sm:leading-6"
                />
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePrintLedger}
                  className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 transition-colors flex items-center"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
