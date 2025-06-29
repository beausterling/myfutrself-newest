import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-black/20 backdrop-blur-lg border-t border-white/10">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Link to="/" className="inline-block">
              <span className="text-2xl font-bold gradient-text font-heading">MyFutrSelf</span>
            </Link>
            <p className="mt-4 text-white/60 font-body">
              Transform your life by connecting with your future self and achieving your biggest goals.
            </p>
            <div className="mt-6 flex space-x-4">
              <a 
                href="https://www.facebook.com/beau.sterling.2025" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/40 hover:text-primary-aqua transition-colors"
              >
                <Facebook size={20} />
              </a>
              <a 
                href="https://x.com/beausterling_" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/40 hover:text-primary-aqua transition-colors"
              >
                <Twitter size={20} />
              </a>
              <a 
                href="https://www.instagram.com/beausterling" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/40 hover:text-primary-aqua transition-colors"
              >
                <Instagram size={20} />
              </a>
              <a 
                href="https://www.youtube.com/@beau_sterling" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/40 hover:text-primary-aqua transition-colors"
              >
                <Youtube size={20} />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white font-heading">Company</h3>
            <ul className="space-y-3">
              <li><Link to="/waitlist" className="text-white/60 hover:text-white transition-colors font-body">About</Link></li>
              <li><Link to="/waitlist" className="text-white/60 hover:text-white transition-colors font-body">Careers</Link></li>
              <li><Link to="/waitlist" className="text-white/60 hover:text-white transition-colors font-body">Blog</Link></li>
              <li><Link to="/waitlist" className="text-white/60 hover:text-white transition-colors font-body">Press</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white font-heading">Resources</h3>
            <ul className="space-y-3">
              <li><Link to="/waitlist" className="text-white/60 hover:text-white transition-colors font-body">Support</Link></li>
              <li><Link to="/waitlist" className="text-white/60 hover:text-white transition-colors font-body">Contact</Link></li>
              <li><Link to="/waitlist" className="text-white/60 hover:text-white transition-colors font-body">FAQ</Link></li>
              <li><Link to="/waitlist" className="text-white/60 hover:text-white transition-colors font-body">Tutorials</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white font-heading">Legal</h3>
            <ul className="space-y-3">
              <li><Link to="/waitlist" className="text-white/60 hover:text-white transition-colors font-body">Terms of Service</Link></li>
              <li><Link to="/waitlist" className="text-white/60 hover:text-white transition-colors font-body">Privacy Policy</Link></li>
              <li><Link to="/waitlist" className="text-white/60 hover:text-white transition-colors font-body">Cookie Policy</Link></li>
              <li><Link to="/waitlist" className="text-white/60 hover:text-white transition-colors font-body">Licenses</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-white/10 text-center text-white/50">
          <p className="font-body">&copy; {currentYear} MyFutrSelf. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;