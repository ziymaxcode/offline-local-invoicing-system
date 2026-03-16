import { useState, useRef } from 'react';
import { db } from '@/src/db/db';
import { Download, Upload, AlertTriangle, CheckCircle2 } from 'lucide-react';
import 'dexie-export-import';

export function Settings() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setMessage(null);
      
      const blob = await db.export();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `AshiqHardware_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Database exported successfully. Save this file to a USB drive.' });
    } catch (error) {
      console.error('Export failed:', error);
      setMessage({ type: 'error', text: 'Failed to export database.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    if (window.confirm('WARNING: Importing a backup will OVERWRITE all your current data. Are you sure you want to proceed?')) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setMessage(null);
      
      // Clear existing data before import
      await db.delete();
      await db.open();
      
      await db.import(file);
      
      setMessage({ type: 'success', text: 'Database restored successfully! Please refresh the page.' });
      
      // Optional: reload the page to ensure all live queries update correctly
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Import failed:', error);
      setMessage({ type: 'error', text: 'Failed to restore database. The file might be corrupted or invalid.' });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage your application data and backups.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-start space-x-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
          {message.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" /> : <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />}
          <div>
            <h3 className={`text-sm font-medium ${message.type === 'success' ? 'text-emerald-800' : 'text-red-800'}`}>
              {message.type === 'success' ? 'Success' : 'Error'}
            </h3>
            <p className={`mt-1 text-sm ${message.type === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>
              {message.text}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
        <div className="p-6 border-b border-zinc-100">
          <h2 className="text-lg font-medium text-zinc-900">Backup & Restore</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Since this is an offline-first application, all your data is stored locally on this computer. 
            It is highly recommended to regularly export your database to a USB drive.
          </p>
        </div>
        
        <div className="p-6 space-y-8">
          {/* Export Section */}
          <div className="flex items-start justify-between">
            <div className="space-y-1 pr-6">
              <h3 className="text-base font-medium text-zinc-900">Export Database</h3>
              <p className="text-sm text-zinc-500">
                Download a complete copy of your inventory, customers, and ledger history.
              </p>
            </div>
            <button
              onClick={handleExport}
              disabled={isExporting || isImporting}
              className="flex-shrink-0 inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? 'Exporting...' : 'Export Backup'}
            </button>
          </div>

          <div className="border-t border-zinc-100"></div>

          {/* Import Section */}
          <div className="flex items-start justify-between">
            <div className="space-y-1 pr-6">
              <h3 className="text-base font-medium text-zinc-900">Restore from Backup</h3>
              <p className="text-sm text-zinc-500">
                Upload a previously exported .json backup file. <strong className="text-red-600 font-medium">Warning: This will overwrite all current data.</strong>
              </p>
            </div>
            <div>
              <input 
                type="file" 
                accept=".json" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <button
                onClick={handleImportClick}
                disabled={isExporting || isImporting}
                className="flex-shrink-0 inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                <Upload className="mr-2 h-4 w-4" />
                {isImporting ? 'Restoring...' : 'Restore Backup'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
