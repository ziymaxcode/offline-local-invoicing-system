import Dexie, { type EntityTable } from 'dexie';

export interface Product {
  id?: number;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id?: number;
  name: string;
  phone: string;
  address: string;
  currentBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id?: number;
  customerId: number;
  type: 'invoice' | 'return' | 'payment';
  amount: number;
  details: string;
  date: Date;
}

export interface Invoice {
  id?: number;
  customerId: number;
  totalAmount: number;
  date: Date;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  productId: number;
  quantity: number;
  price: number;
}

const db = new Dexie('AshiqHardwareDB') as Dexie & {
  products: EntityTable<Product, 'id'>;
  customers: EntityTable<Customer, 'id'>;
  transactions: EntityTable<Transaction, 'id'>;
  invoices: EntityTable<Invoice, 'id'>;
};

db.version(1).stores({
  products: '++id, name, sku, category',
  customers: '++id, name, phone',
  transactions: '++id, customerId, type, date',
  invoices: '++id, customerId, date'
});

export { db };
