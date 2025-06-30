import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut, UserButton, useUser, useAuth, useClerk, SignInButton, SignUpButton } from '@clerk/clerk-react';
import { Menu, X, Settings, DollarSign } from 'lucide-react';
import { createAuthenticatedSupabaseClient } from '../lib/supabase';

const Header = ({ theme, toggleTheme }: { theme: string; toggleTheme: () => void }) => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);
  const location = useLocation();

  // Check onboarding status for signed-in users
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user?.id) {
        setIsOnboardingComplete(null);
        return;
      }

      try {
        const token = await getToken({ template: 'supabase' });
        if (!token) {
          console.warn('No Clerk token available for onboarding check');
          setIsOnboardingComplete(null);
          return;
        }

        const supabase = createAuthenticatedSupabaseClient(token);
        const { data: userProfile, error } = await supabase
          .from('user_profiles')
          .select('onboarding_completed')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking onboarding status:', error);
          setIsOnboardingComplete(null);
          return;
        }

        setIsOnboardingComplete(userProfile?.onboarding_completed ?? false);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setIsOnboardingComplete(null);
      }
    };

    checkOnboardingStatus();
  }, [user?.id, getToken]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const isScrolled = false;

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-gradient-to-b from-bg-primary/90 via-bg-primary/70 to-transparent backdrop-blur-xl' 
          : 'bg-transparent'
      }`}
    >
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
          <SignedIn>
            <button 
              onClick={toggleMenu}
              className="btn btn-ghost p-2"
            >
              <Menu className="w-6 h-6" />
            </button>
          </SignedIn>
          <SignedOut>
            <button 
              onClick={toggleMenu}
              className="btn btn-ghost p-2"
            >
              <Menu className="w-6 h-6" />
            </button>
          </SignedOut>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <SignedIn>
            <button 
              onClick={toggleMenu}
              className="btn btn-ghost p-2"
            >
              <Menu className="w-6 h-6" />
            </button>
          </SignedIn>
          <SignedOut>
            <button 
              onClick={toggleMenu}
              className="btn btn-ghost p-2"
            >
              <Menu className="w-6 h-6" />
            </button>
          </SignedOut>
        </div>
      </nav>

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
              
              <SignedIn>
                <div className="space-y-4">
                  {/* Sign In/Sign Up buttons at top for signed in users - these would be profile actions */}
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
                      <p className="text-white/60 text-sm font-body">Manage your account</p>
                    </div>
                  </div>

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
                  
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="w-10 h-10 bg-gradient-to-r from-primary-aqua to-primary-blue rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {isOnboardingComplete === false ? '📝' : '📊'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium font-heading">
                          {isOnboardingComplete === false ? 'Finish Onboarding' : 'Dashboard'}
                        </span>
                      </div>
                      <p className="text-white/60 text-sm font-body">
                        {isOnboardingComplete === false ? 'Complete your setup' : 'View your progress'}
                      </p>
                    </div>
                  </Link>
                  
                </div>
                
                {/* Sign Out Button - Moved to bottom */}
                <button
                  onClick={() => {
                    console.log('🔄 Signing out user');
                    signOut();
                    setIsMenuOpen(false);
                  }}
                  className="text-white border border-white rounded px-4 py-2 hover:bg-white/10 transition-colors mt-6"
                >
                  Sign Out
                </button>
              </SignedIn>
              
              <SignedOut>
                <div className="space-y-4">
                  {/* Sign In/Sign Up buttons at top */}
                  <div className="flex gap-3 mb-6">
                    <SignInButton mode="modal">
                      <button className="flex-1 btn btn-outline font-heading">
                        Sign In
                      </button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <button className="flex-1 btn btn-primary font-heading">
                        Sign Up
                      </button>
                    </SignUpButton>
                  </div>

                  <Link 
                    to="/pricing" 
                    className="block p-4 bg-white/5 rounded-xl border border-white/10 text-white hover:bg-white/10 transition-colors font-body"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-primary-aqua to-primary-blue rounded-full flex items-center justify-center text-white">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-white font-medium font-heading">Pricing</div>
                        <p className="text-white/60 text-sm font-body">View plans and pricing</p>
                      </div>
                    </div>
                  </Link>
                  
                </div>
              </SignedOut>
            </div>
          </div>
        </>
      )}
    </header>
  );
};

export default Header;