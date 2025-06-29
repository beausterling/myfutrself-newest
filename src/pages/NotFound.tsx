import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Home } from 'lucide-react';

const NotFound = () => {
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

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${isScrolled ? 'scrolled' : ''}`}>
      {/* Blur effect overlay */}
      <div className={`fixed top-0 left-0 right-0 h-20 z-40 pointer-events-none transition-all duration-300 ${
        isScrolled 
          ? 'backdrop-filter backdrop-blur-xl bg-gradient-to-b from-bg-primary/30 via-bg-primary/20 to-transparent' 
          : 'backdrop-filter backdrop-blur-0'
      }`} />
      
      <div className="max-w-md w-full text-center">
        <h1 className="text-9xl font-bold gradient-text font-heading">404</h1>
        <h2 className="mt-4 text-3xl font-bold text-white font-heading">Page Not Found</h2>
        <p className="mt-4 text-lg text-text-secondary font-body">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-8 flex justify-center space-x-4">
          <Link 
            to="/" 
            className="btn btn-outline flex items-center font-heading"
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            Go Back
          </Link>
          <Link 
            to="/" 
            className="btn btn-primary flex items-center font-heading"
          >
            <Home className="w-5 h-5 mr-2" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;