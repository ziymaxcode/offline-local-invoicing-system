import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Product } from '@/src/db/db';
import { Plus, Search, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export function Inventory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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
      return db.products.toArray();
    },
    [searchQuery]
  );

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const productData = {
      name: formData.get('name') as string,
      sku: formData.get('sku') as string,
      category: formData.get('category') as string,
      price: Number(formData.get('price')),
      stock: Number(formData.get('stock')),
      minStock: Number(formData.get('minStock')),
      updatedAt: new Date(),
    };

    if (editingProduct?.id) {
      await db.products.update(editingProduct.id, productData);
    } else {
      await db.products.add({
        ...productData,
        createdAt: new Date(),
      });
    }

    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      await db.products.delete(id);
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Manage Products</h1>
          <p className="text-sm text-zinc-500 mt-1">View and manage your hardware inventory.</p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center space-x-4 bg-white p-4 rounded-2xl shadow-sm border border-zinc-100">
        <div className="relative flex-1 max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-zinc-400" />
          </div>
          <input
            type="text"
            placeholder="Search products by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-xl border-0 py-2 pl-10 pr-3 text-zinc-900 ring-1 ring-inset ring-zinc-200 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-zinc-900 sm:text-sm sm:leading-6"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50/50">
              <tr>
                <th scope="col" className="py-3.5 pl-6 pr-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Product</th>
                <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">SKU</th>
                <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Category</th>
                <th scope="col" className="px-3 py-3.5 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Price</th>
                <th scope="col" className="px-3 py-3.5 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Stock</th>
                <th scope="col" className="relative py-3.5 pl-3 pr-6">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {products?.map((product) => (
                <tr key={product.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium text-zinc-900">
                    {product.name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500">{product.sku}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500">
                    <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 ring-1 ring-inset ring-zinc-500/10">
                      {product.category}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-900 text-right font-medium">
                    ₹{product.price.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {product.stock <= product.minStock && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className={cn(
                        "font-medium",
                        product.stock <= product.minStock ? "text-red-600" : "text-zinc-900"
                      )}>
                        {product.stock}
                      </span>
                    </div>
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => openEditModal(product)}
                        className="text-zinc-400 hover:text-zinc-900 transition-colors p-1"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => product.id && handleDelete(product.id)}
                        className="text-zinc-400 hover:text-red-600 transition-colors p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products?.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-zinc-500">
                    No products found. Add your first product to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/20 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-900 text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-zinc-700">Product Name</label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  defaultValue={editingProduct?.name}
                  className="mt-1 block w-full rounded-xl border-0 py-2 px-3 text-zinc-900 ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-inset focus:ring-zinc-900 sm:text-sm sm:leading-6"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sku" className="block text-sm font-medium text-zinc-700">SKU</label>
                  <input
                    type="text"
                    name="sku"
                    id="sku"
                    required
                    defaultValue={editingProduct?.sku}
                    className="mt-1 block w-full rounded-xl border-0 py-2 px-3 text-zinc-900 ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-inset focus:ring-zinc-900 sm:text-sm sm:leading-6"
                  />
                </div>
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-zinc-700">Category</label>
                  <input
                    type="text"
                    name="category"
                    id="category"
                    required
                    defaultValue={editingProduct?.category}
                    className="mt-1 block w-full rounded-xl border-0 py-2 px-3 text-zinc-900 ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-inset focus:ring-zinc-900 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-zinc-700">Price (₹)</label>
                <input
                  type="number"
                  name="price"
                  id="price"
                  step="0.01"
                  required
                  defaultValue={editingProduct?.price}
                  className="mt-1 block w-full rounded-xl border-0 py-2 px-3 text-zinc-900 ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-inset focus:ring-zinc-900 sm:text-sm sm:leading-6"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="stock" className="block text-sm font-medium text-zinc-700">Current Stock</label>
                  <input
                    type="number"
                    name="stock"
                    id="stock"
                    required
                    defaultValue={editingProduct?.stock}
                    className="mt-1 block w-full rounded-xl border-0 py-2 px-3 text-zinc-900 ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-inset focus:ring-zinc-900 sm:text-sm sm:leading-6"
                  />
                </div>
                <div>
                  <label htmlFor="minStock" className="block text-sm font-medium text-zinc-700">Min Stock Alert</label>
                  <input
                    type="number"
                    name="minStock"
                    id="minStock"
                    required
                    defaultValue={editingProduct?.minStock}
                    className="mt-1 block w-full rounded-xl border-0 py-2 px-3 text-zinc-900 ring-1 ring-inset ring-zinc-200 focus:ring-2 focus:ring-inset focus:ring-zinc-900 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 transition-colors"
                >
                  {editingProduct ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
