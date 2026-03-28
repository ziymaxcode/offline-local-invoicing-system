import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Undo2, Package, Users, Settings } from 'lucide-react';
import { cn } from '@/src/lib/utils';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Invoice', href: '/invoice', icon: FileText },
  { name: 'Returns', href: '/returns', icon: Undo2 },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Layout() {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-zinc-50 text-zinc-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-zinc-200 flex flex-col">
        <div className="p-6 flex items-center justify-center">
  <img 
    src="/ezyinvoice.png" 
    alt="Ezy Invoice" 
    className="h-15 w-auto object-contain"
  />
</div>
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || (item.href === '/' && location.pathname === '');
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-colors",
                  isActive 
                    ? "bg-zinc-100 text-zinc-900" 
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                )}
              >
                <item.icon className={cn("mr-3 h-5 w-5", isActive ? "text-zinc-900" : "text-zinc-400")} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-zinc-100">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-sm font-medium text-zinc-600">
              EZ
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-zinc-900">Admin</p>
              <p className="text-xs text-zinc-500">Offline Mode</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
