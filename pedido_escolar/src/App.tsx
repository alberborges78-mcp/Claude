import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CatalogView } from './views/CatalogView';
import { CartView } from './views/CartView';
import { OrderConfirmationView } from './views/OrderConfirmationView';
import { OrderLookupView } from './views/OrderLookupView';
import { PrivacyPolicyView } from './views/PrivacyPolicyView';
import { LoginView } from './views/LoginView';
import { AdminLayout } from './views/admin/AdminLayout';
import { CartProvider } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
function MainApp() {
  const { isAuthenticated, authLoading } = useAuth();
  const [currentView, setCurrentView] = useState<string>('catalog');
  const [activeOrderToken, setActiveOrderToken] = useState<string>('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('seven-theme');
    if (savedTheme === 'dark') {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('seven-theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Handle URL path on initial load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const hash = window.location.hash;

      if (pathname.startsWith('/pedido/')) {
        const token = pathname.replace('/pedido/', '').trim();
        if (token) {
          setActiveOrderToken(token);
          setCurrentView('confirmation');
          return;
        }
      }

      if (hash === '#consultar' || pathname === '/consultar' || pathname === '/consulta') {
        setCurrentView('lookup');
        // OrderLookupView reads ?pedido= directly from URL on mount — no event needed
        return;
      }

      if (pathname === '/privacidade') {
        setCurrentView('privacy');
        return;
      }

      if (hash === '#admin') {
        setCurrentView(isAuthenticated ? 'admin' : 'login');
      }
    }
  }, [isAuthenticated]);

  const handleNavigate = (view: string, token?: string) => {
    if (token) {
      setActiveOrderToken(token);
      if (typeof window !== 'undefined' && window.history) {
        window.history.pushState({}, '', `/pedido/${token}`);
      }
    } else if (view === 'catalog') {
      if (typeof window !== 'undefined' && window.history) {
        window.history.pushState({}, '', '/');
      }
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isPublicView = currentView !== 'admin';

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 relative z-0 text-[var(--seven-text-primary)] ${
      isPublicView 
        ? "bg-[var(--seven-surface-page)] bg-[url('/background-conceito.png')] bg-cover bg-center bg-fixed" 
        : "bg-slate-50 dark:bg-slate-900"
    }`}>
      <Header currentView={currentView} onNavigate={handleNavigate} theme={theme} onToggleTheme={toggleTheme} />

      <main className="flex-1 relative z-10">
        {currentView === 'catalog' && <CatalogView onNavigate={handleNavigate} />}
        {currentView === 'cart' && <CartView onNavigate={handleNavigate} />}
        {currentView === 'lookup' && <OrderLookupView onNavigate={handleNavigate} />}
        {currentView === 'privacy' && <PrivacyPolicyView onNavigate={handleNavigate} />}
        {currentView === 'confirmation' && (
          <OrderConfirmationView qrToken={activeOrderToken} onNavigate={handleNavigate} />
        )}
        {currentView === 'login' && (
          <LoginView
            onLoginSuccess={() => handleNavigate('admin')}
            onBack={() => handleNavigate('catalog')}
          />
        )}
        {currentView === 'admin' && (
          authLoading ? (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold">Restaurando sessão...</span>
            </div>
          ) : isAuthenticated ? (
            <AdminLayout onNavigatePublic={() => handleNavigate('catalog')} />
          ) : (
            <LoginView
              onLoginSuccess={() => handleNavigate('admin')}
              onBack={() => handleNavigate('catalog')}
            />
          )
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <MainApp />
      </CartProvider>
    </AuthProvider>
  );
}
