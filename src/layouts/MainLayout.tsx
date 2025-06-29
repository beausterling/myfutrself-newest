import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface MainLayoutProps {
  theme: string;
  toggleTheme: () => void;
}

const MainLayout = ({ theme, toggleTheme }: MainLayoutProps) => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header theme={theme} toggleTheme={toggleTheme} />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;