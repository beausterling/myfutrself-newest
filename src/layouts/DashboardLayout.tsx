import { Outlet } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { UserButton, useUser } from '@clerk/clerk-react';
import { Menu, Home, Settings, User, BarChart3, Sun, Moon, X, DollarSign } from 'lucide-react';
import { useState, useEffect } from 'react';

interface DashboardLayoutProps {
  theme: string;
  toggleTheme: () => void;
}

const DashboardLayout = ({ theme, toggleTheme }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user } = useUser();

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

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-bg-primary to-bg-secondary">
      {/* Blur effect overlay */}
      <div className={`fixed top-0 left-0 right-0 h-20 z-40 pointer-events-none transition-all duration-300 ${
        isScrolled 
          ? 'backdrop-filter backdrop-blur-xl bg-gradient-to-b from-bg-primary/30 via-bg-primary/20 to-transparent' 
          : 'backdrop-filter backdrop-blur-0'
      }`} />
      
      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-transparent">
          <nav className="container mx-auto px-4 h-20 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img 
                src="/icon_nobackground_small copy.png" 
                alt="MyFutrSelf" 
                className="w-8 h-8 rounded-lg"
              />
              <span className="gradient-text font-heading text-xl font-bold">MyFutrSelf</span>
            </Link>

            <div className="hidden md:flex items-center space-x-4">
              <button 
                onClick={toggleMenu}
                className="btn btn-ghost p-2"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button 
                onClick={toggleMenu}
                className="btn btn-ghost p-2"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </nav>
        </header>

        {/* Right-Side Menu (Mobile and Desktop) */}
        {isMenuOpen && (
          <>
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => setIsMenuOpen(false)}
            />
            <div className="fixed top-0 right-0 h-full w-80 bg-bg-primary/95 backdrop-blur-xl border-l border-white/10 z-50">
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <span className="gradient-text font-heading text-lg font-bold">Menu</span>
                  <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-white/10 rounded-lg">
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  {/* User Profile Section */}
                  <div className="flex gap-3 mb-6">
                    <UserButton 
                      afterSignOutUrl="/" 
                      appearance={{
                        elements: {
                          userButtonAvatarBox: "w-10 h-10"
                        }
                      }}
                    />
                    <div className="flex-1">
                      <div className="text-white font-medium font-heading">Profile Settings</div>
                      <p className="text-white/60 text-sm font-body">{user?.firstName || 'User'}</p>
                    </div>
                  </div>

                  {/* Dashboard Link */}
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="w-10 h-10 bg-gradient-to-r from-primary-aqua to-primary-blue rounded-full flex items-center justify-center text-white">
                      <Home className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium font-heading">Dashboard</span>
                      </div>
                      <p className="text-white/60 text-sm font-body">View your goals</p>
                    </div>
                  </Link>
                  
                  {/* Pricing Link */}
                  <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="w-10 h-10 bg-gradient-to-r from-primary-aqua to-primary-blue rounded-full flex items-center justify-center text-white">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link 
                          to="/pricing" 
                          className="text-white font-medium font-heading hover:text-primary-aqua transition-colors"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Pricing
                        </Link>
                      </div>
                      <p className="text-white/60 text-sm font-body">View plans and pricing</p>
                    </div>
                  </div>
                  
                  {/* Theme Toggle */}
                  <button
                    onClick={toggleTheme}
                    className="flex items-center gap-3 p-4 w-full text-left bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="w-10 h-10 bg-gradient-to-r from-primary-aqua to-primary-blue rounded-full flex items-center justify-center text-white">
                      {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="text-white font-medium font-heading">
                        {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                      </div>
                      <p className="text-white/60 text-sm font-body">
                        {theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto pt-20 bg-gradient-to-br from-bg-primary to-bg-secondary">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

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