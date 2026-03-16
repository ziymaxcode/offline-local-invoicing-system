import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Product, type Customer } from '@/src/db/db';
import { Plus, Search, Trash2, Printer, UserPlus, ShoppingCart } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';

interface CartItem {
  product: Product;
  quantity: number;
  price: number;
}

export function Invoice() {
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const customers = useLiveQuery(() => db.customers.toArray());
  const products = useLiveQuery(
    () => {
      if (searchQuery) {
        return db.products
          .where('name')
          .startsWithIgnoreCase(searchQuery)
          .or('sku')
          .startsWithIgnoreCase(searchQuery)
          .toArray();
      }
      return db.products.limit(10).toArray(); // Show top 10 by default
    },
    [searchQuery]
  );

  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

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

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, price: product.price }];
    });
    setSearchQuery(''); // Clear search after adding
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity < 1) return;
    setCart(prev => prev.map(item => 
      item.product.id === productId ? { ...item, quantity } : item
    ));
  };

  const updatePrice = (productId: number, price: number) => {
    if (price < 0) return;
    setCart(prev => prev.map(item => 
      item.product.id === productId ? { ...item, price } : item
    ));
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const generatePDF = (invoiceId: number, customer: Customer) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('INVOICE', 14, 22);
    
    doc.setFontSize(10);
    doc.text('Ashiq Hardware', 14, 30);
    doc.text('Offline POS System', 14, 35);
    
    // Invoice Details
    doc.text(`Invoice #: INV-${invoiceId.toString().padStart(6, '0')}`, 140, 22);
    doc.text(`Date: ${format(new Date(), 'dd MMM yyyy')}`, 140, 27);
    
    // Customer Details
    doc.setFontSize(12);
    doc.text('Bill To:', 14, 50);
    doc.setFontSize(10);
    doc.text(customer.name, 14, 56);
    doc.text(`Phone: ${customer.phone}`, 14, 61);
    if (customer.address) doc.text(`Address: ${customer.address}`, 14, 66);

    // Items Table
    const tableBody = cart.map(item => [
      item.product.name,
      item.quantity.toString(),
      `Rs. ${item.price.toFixed(2)}`,
      `Rs. ${(item.quantity * item.price).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 75,
      head: [['Item Description', 'Qty', 'Unit Price', 'Total']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [24, 24, 27] }, // zinc-900
      foot: [['', '', 'Grand Total:', `Rs. ${totalAmount.toFixed(2)}`]],
      footStyles: { fillColor: [250, 250, 250], textColor: [24, 24, 27], fontStyle: 'bold' }
    });

    doc.save(`Invoice_${customer.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const handleCompleteSale = async () => {
    if (!selectedCustomerId || cart.length === 0) {
      alert('Please select a customer and add items to the cart.');
      return;
    }

    const customer = await db.customers.get(Number(selectedCustomerId));
    if (!customer) return;

    try {
      await db.transaction('rw', db.invoices, db.transactions, db.customers, db.products, async () => {
        // 1. Create Invoice
        const invoiceId = await db.invoices.add({
          customerId: customer.id!,
          totalAmount,
          date: new Date(),
          items: cart.map(item => ({
            productId: item.product.id!,
            quantity: item.quantity,
            price: item.price
          }))
        });

        // 2. Create Ledger Transaction (Debit)
        const itemNames = cart.map(i => i.product.name);
        const detailsText = `Sale: ${itemNames.slice(0, 2).join(', ')}${itemNames.length > 2 ? '...' : ''}`;
        
        await db.transactions.add({
          customerId: customer.id!,
          type: 'invoice',
          amount: totalAmount, // Debit increases balance (customer owes you)
          details: detailsText,
          date: new Date()
        });

        // 3. Update Customer Balance
        await db.customers.update(customer.id!, {
          currentBalance: (customer.currentBalance || 0) + totalAmount,
          updatedAt: new Date()
        });

        // 4. Update Product Stock
        for (const item of cart) {
          const product = await db.products.get(item.product.id!);
          if (product) {
            await db.products.update(product.id!, {
              stock: product.stock - item.quantity,
              updatedAt: new Date()
            });
          }
        }

        // Generate PDF outside transaction but using the ID
        generatePDF(invoiceId as number, customer);
        
        // Reset form
        setCart([]);
        setSelectedCustomerId('');
        setSearchQuery('');
      });
    } catch (error) {
      console.error('Failed to complete sale:', error);
      alert('An error occurred while completing the sale. Please try again.');
    }
  };

  // UPI QR Code Data (Replace with actual UPI ID in settings later)
  const upiId = "merchant@upi"; 
  const upiUrl = `upi://pay?pa=${upiId}&pn=Ashiq%20Hardware&am=${totalAmount.toFixed(2)}&cu=INR`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Create Invoice</h1>
        <p className="text-sm text-zinc-500 mt-1">Record a sale, update ledger, and generate a PDF invoice.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form & Cart */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Customer Selection */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-zinc-900">1. Select Customer</h2>
              <button
                onClick={() => setIsCustomerModalOpen(true)}
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900 flex items-center transition-colors"
              >
                <UserPlus className="h-4 w-4 mr-1" />
                New Customer
              </button>
            </div>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value === '' ? '' : Number(e.target.value))}
              className="block w-full rounded-xl border-0 py-2.5 pl-3 pr-10 text-zinc-900 ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-zinc-900 sm:text-sm sm:leading-6"
            >
              <option value="">-- Select a Customer --</option>
              {customers?.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.phone}) - Bal: ₹{c.currentBalance.toFixed(2)}</option>
              ))}
            </select>
          </div>

          {/* Product Search & Add */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
            <h2 className="text-lg font-medium text-zinc-900 mb-4">2. Add Products</h2>
            <div className="relative mb-4">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-zinc-400" />
              </div>
              <input
                type="text"
                placeholder="Search products by name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full rounded-xl border-0 py-2.5 pl-10 pr-3 text-zinc-900 ring-1 ring-inset ring-zinc-200 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-zinc-900 sm:text-sm sm:leading-6"
              />
            </div>
            
            {/* Search Results */}
            {searchQuery && products && products.length > 0 && (
              <div className="border border-zinc-100 rounded-xl overflow-hidden mb-6">
                <ul className="divide-y divide-zinc-100 max-h-48 overflow-y-auto">
                  {products.map(product => (
                    <li key={product.id} className="flex items-center justify-between p-3 hover:bg-zinc-50 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{product.name}</p>
                        <p className="text-xs text-zinc-500">Stock: {product.stock} | ₹{product.price}</p>
                      </div>
                      <button
                        onClick={() => addToCart(product)}
                        disabled={product.stock <= 0}
                        className="p-1.5 rounded-lg bg-zinc-100 text-zinc-600 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Cart Table */}
            <div className="mt-6">
              <h3 className="text-sm font-medium text-zinc-900 mb-3 flex items-center">
                <ShoppingCart className="h-4 w-4 mr-2 text-zinc-500" />
                Current Cart
              </h3>
              {cart.length === 0 ? (
                <div className="text-center py-8 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                  <p className="text-sm text-zinc-500">Cart is empty. Search and add products above.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-zinc-100 rounded-xl">
                  <table className="min-w-full divide-y divide-zinc-200">
                    <thead className="bg-zinc-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Item</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase w-24">Price</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase w-24">Qty</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">Total</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 bg-white">
                      {cart.map((item) => (
                        <tr key={item.product.id}>
                          <td className="px-4 py-3 text-sm font-medium text-zinc-900">{item.product.name}</td>
                          <td className="px-4 py-3 text-sm">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.price}
                              onChange={(e) => updatePrice(item.product.id!, Number(e.target.value))}
                              className="w-full rounded-md border-0 py-1 px-2 text-zinc-900 ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-zinc-900 sm:text-sm"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.product.id!, Number(e.target.value))}
                              className="w-full rounded-md border-0 py-1 px-2 text-zinc-900 ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-zinc-900 sm:text-sm"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-zinc-900">
                            ₹{(item.price * item.quantity).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => removeFromCart(item.product.id!)}
                              className="text-zinc-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Summary & Actions */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 sticky top-6">
            <h2 className="text-lg font-medium text-zinc-900 mb-6">Summary</h2>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm text-zinc-500">
                <span>Items ({cart.length})</span>
                <span>₹{totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-zinc-500">
                <span>Tax</span>
                <span>₹0.00</span>
              </div>
              <div className="pt-3 border-t border-zinc-100 flex justify-between items-center">
                <span className="text-base font-medium text-zinc-900">Total</span>
                <span className="text-2xl font-semibold text-zinc-900">₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* UPI QR Code */}
            {totalAmount > 0 && (
              <div className="mb-6 flex flex-col items-center justify-center p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Scan to Pay</p>
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <QRCodeSVG value={upiUrl} size={120} />
                </div>
                <p className="text-xs text-zinc-400 mt-2 text-center">Supports GPay, PhonePe, Paytm</p>
              </div>
            )}

            <button
              onClick={handleCompleteSale}
              disabled={!selectedCustomerId || cart.length === 0}
              className="w-full flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Printer className="mr-2 h-4 w-4" />
              Complete & Print
            </button>
          </div>
        </div>
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
    </div>
  );
}
