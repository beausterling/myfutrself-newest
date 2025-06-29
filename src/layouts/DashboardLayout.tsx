import { Outlet } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { Menu, Home, Settings, User, BarChart3, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';

interface DashboardLayoutProps {
  theme: string;
  toggleTheme: () => void;
}

const DashboardLayout = ({ theme, toggleTheme }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll effect for blur
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-bg-primary to-bg-secondary">
      {/* Blur effect overlay */}
      <div className={`fixed top-0 left-0 right-0 h-20 z-40 pointer-events-none transition-all duration-300 ${
        isScrolled 
          ? 'backdrop-filter backdrop-blur-xl bg-gradient-to-b from-bg-primary/30 via-bg-primary/20 to-transparent' 
          : 'backdrop-filter backdrop-blur-0'
      }`} />
      
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 transform bg-white/5 backdrop-blur-lg border-r border-white/10
        transition-transform duration-300 ease-in-out lg:static lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
          <span className="text-xl font-semibold text-white font-heading">My Future Self</span>
          <button 
            onClick={toggleSidebar}
            className="p-1 rounded-md lg:hidden hover:bg-white/10"
          >
            <Menu size={20} className="text-white" />
          </button>
        </div>
        
        <nav className="px-2 py-4">
          <ul className="space-y-1">
            <li>
              <a href="/dashboard" className="flex items-center px-4 py-2 text-white/70 rounded-md hover:bg-white/10 hover:text-white transition-colors">
                <Home className="w-5 h-5 mr-3" />
                <span>Dashboard</span>
              </a>
            </li>
            <li>
              <a href="/dashboard/progress" className="flex items-center px-4 py-2 text-white/70 rounded-md hover:bg-white/10 hover:text-white transition-colors">
                <BarChart3 className="w-5 h-5 mr-3" />
                <span>Progress</span>
              </a>
            </li>
            <li>
              <a href="/dashboard/profile" className="flex items-center px-4 py-2 text-white/70 rounded-md hover:bg-white/10 hover:text-white transition-colors">
                <User className="w-5 h-5 mr-3" />
                <span>Profile</span>
              </a>
            </li>
            <li>
              <a href="/dashboard/settings" className="flex items-center px-4 py-2 text-white/70 rounded-md hover:bg-white/10 hover:text-white transition-colors">
                <Settings className="w-5 h-5 mr-3" />
                <span>Settings</span>
              </a>
            </li>
            <li>
              <button
                onClick={toggleTheme}
                className="w-full flex items-center px-4 py-2 text-white/70 rounded-md hover:bg-white/10 hover:text-white transition-colors"
              >
                {theme === 'light' ? (
                  <>
                    <Moon className="w-5 h-5 mr-3" />
                    <span>Dark Mode</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-5 h-5 mr-3" />
                    <span>Light Mode</span>
                  </>
                )}
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex items-center justify-between h-16 px-4 border-b border-white/10 bg-white/5 backdrop-blur-lg">
          <button 
            onClick={toggleSidebar}
            className="p-1 mr-4 rounded-md lg:hidden hover:bg-white/10"
          >
            <Menu size={20} className="text-white" />
          </button>
          
          <div className="ml-auto flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-white/10 text-white"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 bg-gradient-to-br from-bg-primary to-bg-secondary">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;