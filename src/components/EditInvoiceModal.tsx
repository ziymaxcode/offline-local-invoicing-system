import { useState, useEffect, useMemo } from 'react';
import { db, type Invoice, type Product, type Customer, type Transaction } from '@/src/db/db';
import { Plus, Search, Trash2, ShoppingCart } from 'lucide-react';

interface EditInvoiceModalProps {
  invoiceId: number;
  onClose: () => void;
}

interface CartItem {
  product: Product;
  quantity: number;
  price: number;
}

export function EditInvoiceModal({ invoiceId, onClose }: EditInvoiceModalProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [originalCart, setOriginalCart] = useState<CartItem[]>([]);
  const [originalTotal, setOriginalTotal] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      const inv = await db.invoices.get(invoiceId);
      if (!inv) return;
      setInvoice(inv);
      setOriginalTotal(inv.totalAmount);

      const cust = await db.customers.get(inv.customerId);
      if (cust) setCustomer(cust);

      const loadedCart: CartItem[] = [];
      for (const item of inv.items) {
        const product = await db.products.get(item.productId);
        if (product) {
          loadedCart.push({ product, quantity: item.quantity, price: item.price });
        }
      }
      setCart(loadedCart);
      setOriginalCart(JSON.parse(JSON.stringify(loadedCart))); // Deep copy
    };
    loadData();
  }, [invoiceId]);

  useEffect(() => {
    const searchProducts = async () => {
      if (searchQuery) {
        const results = await db.products
          .where('name')
          .startsWithIgnoreCase(searchQuery)
          .or('sku')
          .startsWithIgnoreCase(searchQuery)
          .toArray();
        setProducts(results);
      } else {
        const results = await db.products.limit(10).toArray();
        setProducts(results);
      }
    };
    searchProducts();
  }, [searchQuery]);

  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

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
    setSearchQuery('');
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

  const handleSave = async () => {
    if (!invoice || !customer) return;

    try {
      await db.transaction('rw', db.invoices, db.transactions, db.customers, db.products, async () => {
        // 1. Calculate stock differences
        // For each product, difference = originalQuantity - newQuantity
        // If difference > 0, we return stock to inventory.
        // If difference < 0, we take more stock from inventory.
        
        const stockDiffs: Record<number, number> = {};
        
        for (const orig of originalCart) {
          stockDiffs[orig.product.id!] = (stockDiffs[orig.product.id!] || 0) + orig.quantity;
        }
        for (const curr of cart) {
          stockDiffs[curr.product.id!] = (stockDiffs[curr.product.id!] || 0) - curr.quantity;
        }

        // Update product stocks
        for (const productIdStr of Object.keys(stockDiffs)) {
          const productId = Number(productIdStr);
          const diff = stockDiffs[productId];
          if (diff !== 0) {
            const product = await db.products.get(productId);
            if (product) {
              await db.products.update(productId, {
                stock: product.stock + diff,
                updatedAt: new Date()
              });
            }
          }
        }

        // 2. Update Invoice
        await db.invoices.update(invoiceId, {
          totalAmount,
          items: cart.map(item => ({
            productId: item.product.id!,
            quantity: item.quantity,
            price: item.price
          }))
        });

        // 3. Update Transaction
        const itemNames = cart.map(i => i.product.name);
        const detailsText = `Sale (Edited): ${itemNames.slice(0, 2).join(', ')}${itemNames.length > 2 ? '...' : ''}`;
        
        const tx = await db.transactions.where({ invoiceId }).first();
        if (tx) {
          await db.transactions.update(tx.id!, {
            amount: totalAmount,
            details: detailsText
          });
        }

        // 4. Update Customer Balance
        const balanceDiff = totalAmount - originalTotal;
        await db.customers.update(customer.id!, {
          currentBalance: (customer.currentBalance || 0) + balanceDiff,
          updatedAt: new Date()
        });

      });
      onClose();
    } catch (error) {
      console.error('Failed to update invoice:', error);
      alert('An error occurred while updating the invoice.');
    }
  };

  if (!invoice || !customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/20 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Edit Invoice INV-{invoiceId.toString().padStart(6, '0')}</h2>
            <p className="text-sm text-zinc-500">Customer: {customer.name}</p>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-900 text-2xl leading-none"
          >
            &times;
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Product Search & Add */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
            <h2 className="text-lg font-medium text-zinc-900 mb-4">Add Products</h2>
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
                        className="p-1.5 rounded-lg bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors"
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
                Current Items
              </h3>
              {cart.length === 0 ? (
                <div className="text-center py-8 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                  <p className="text-sm text-zinc-500">Invoice is empty.</p>
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

        <div className="px-6 py-4 border-t border-zinc-100 flex items-center justify-between bg-zinc-50">
          <div className="text-lg font-semibold text-zinc-900">
            Total: ₹{totalAmount.toFixed(2)}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
