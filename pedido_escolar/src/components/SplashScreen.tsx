import React, { useState, useEffect } from 'react';

export const SplashScreen: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Start fading out after 4.3 seconds
    const fadeOutTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 4300);

    // Completely unmount after 6 seconds
    const unmountTimer = setTimeout(() => {
      setIsVisible(false);
    }, 6000);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#F8FAFC] transition-opacity ease-in-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ transitionDuration: '1700ms' }}
    >
      <div className="w-full h-[100dvh] flex items-center justify-center p-4">
        <img
          src="/splash-conceito.png"
          alt="Bem-vindo ao Colégio Conceito"
          className="w-full h-full object-contain max-w-[900px] animate-splash-cinematic motion-reduce:animate-none"
        />
      </div>
    </div>
  );
};
