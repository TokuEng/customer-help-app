'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, RefreshCw, BarChart3, 
  Users, ChevronRight, Home, LogOut, User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCurrentUser, clearAuth } from '@/lib/auth-token';

interface AdminUser {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  role: string;
}

const sidebarItems = [
  {
    title: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Ingestion',
    href: '/admin/ingestion',
    icon: RefreshCw,
  },
  {
    title: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
  },
  {
    title: 'Work Submissions',
    href: '/admin/work-submissions',
    icon: Users,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      clearAuth();
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 shadow-sm">
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="p-6 border-b">
            <Link href="/admin/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="font-bold text-xl">Admin Panel</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-1">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                        "hover:bg-gray-100 group",
                        isActive && "bg-primary/10 text-primary hover:bg-primary/20"
                      )}
                    >
                      <Icon className={cn(
                        "h-5 w-5 transition-colors",
                        isActive ? "text-primary" : "text-gray-500 group-hover:text-gray-700"
                      )} />
                      <span className={cn(
                        "font-medium",
                        isActive ? "text-primary" : "text-gray-700"
                      )}>
                        {item.title}
                      </span>
                      {isActive && (
                        <ChevronRight className="h-4 w-4 ml-auto text-primary" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t space-y-3">
            {user && (
              <div className="flex items-center space-x-3 px-2 py-1">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.full_name || user.username}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            )}
            
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center space-x-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </span>
            </button>
            
            <Link href="/" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
              <Home className="h-4 w-4" />
              <span className="text-sm">Back to Help Center</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}