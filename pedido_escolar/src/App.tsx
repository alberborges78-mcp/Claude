import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

const CatalogView = lazy(() => import('./views/CatalogView').then((m) => ({ default: m.CatalogView })));
const CartView = lazy(() => import('./views/CartView').then((m) => ({ default: m.CartView })));
const OrderConfirmationView = lazy(() => import('./views/OrderConfirmationView').then((m) => ({ default: m.OrderConfirmationView })));
const OrderLookupView = lazy(() => import('./views/OrderLookupView').then((m) => ({ default: m.OrderLookupView })));
const PrivacyPolicyView = lazy(() => import('./views/PrivacyPolicyView').then((m) => ({ default: m.PrivacyPolicyView })));
const LoginView = lazy(() => import('./views/LoginView').then((m) => ({ default: m.LoginView })));
const AdminLayout = lazy(() => import('./views/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })));
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
        ? "bg-slate-50 dark:bg-slate-950 bg-[url('/background-conceito.png')] bg-cover bg-center bg-fixed bg-blend-soft-light" 
        : "bg-slate-50 dark:bg-slate-950"
    }`}>
      <Header currentView={currentView} onNavigate={handleNavigate} theme={theme} onToggleTheme={toggleTheme} />

      <main className="flex-1 relative z-10">
        <Suspense fallback={
          <div className="min-h-[45vh] flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          </div>
        }>
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
        </Suspense>
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
