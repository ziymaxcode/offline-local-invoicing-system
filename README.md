# 🛒 Ezy Invoice - Offline POS System

Ezy Invoice is a lightning-fast, 100% offline-capable Point of Sale (POS) and invoicing application. Built as a Progressive Web App (PWA), it runs entirely in your browser and can be installed as a standalone desktop application. 

All your data (inventory, customers, invoices) is stored securely on your local device—no internet connection or cloud database required!

🌍 **Live App:** [https://ezyinvoice.vercel.app](https://ezyinvoice.vercel.app)

---

## 🚀 How to Install & Use Offline

Anyone can install Ezy Invoice on their computer or tablet and use it completely offline.

1. Open [ezyinvoice.vercel.app](https://ezyinvoice.vercel.app) in **Google Chrome** or **Microsoft Edge**.
2. Look at the right side of the URL address bar at the top of the browser.
3. Click the **Install icon** (it looks like a computer screen with a downward arrow).
   * *Alternatively, click the three dots menu (`⋮`) in the top right and select **"Install Ezy Invoice"**.*
4. Click **Install**.

The app will now open in its own window and create a shortcut on your desktop. You can now disconnect from the internet, and the app will continue to work flawlessly!

---

## ✨ Features

* **📦 Inventory Management:** Add, edit, and track products with SKUs, categories, and stock levels.
* **👥 Customer Management:** Keep a database of your customers and their contact information.
* **🧾 Invoicing:** Create professional invoices, calculate totals automatically, and generate PDF receipts instantly.
* **🔄 Returns:** Process returns and generate return receipts.
* **📊 Dashboard:** View daily sales, total revenue, and recent transactions at a glance.
* **💾 Backup & Restore:** Export your entire database to a `.json` file for safekeeping, and restore it anytime.
* **🔌 100% Offline:** Uses IndexedDB to store all data locally on your device.

---

## 🔒 Data Privacy & Security

Because this is an offline-first application, **your data never leaves your device**. 
* There is no central server or cloud database.
* If two different people open the link on their own computers, they will each have their own separate, private store.
* **Important:** Do not clear your browser's "Site Data" or "Cookies", as this acts as the hard drive for the application. Always use the **Settings > Export Backup** feature to keep a safe copy of your data on a USB drive or cloud storage.

---

## 🛠️ Tech Stack

* **Frontend:** React 18, Vite, TypeScript
* **Styling:** Tailwind CSS, Lucide React (Icons)
* **Database:** Dexie.js (IndexedDB wrapper for local storage)
* **PDF Generation:** jsPDF, jsPDF-AutoTable
* **PWA:** vite-plugin-pwa

---

## 💻 Local Development

If you want to run the code locally or modify the project:

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```
