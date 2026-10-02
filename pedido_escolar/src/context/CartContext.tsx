import React, { createContext, useContext, useEffect, useState } from 'react';
import { CartItem } from '../types';

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id' | 'subtotal_cents'>) => void;
  removeItem: (id: string) => void;
  updateItemQuantity: (id: string, newQuantity: number) => void;
  clearCart: () => void;
  totalPieces: number;
  totalAmountCents: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'seven_cart_items_v1';

function generateCartItemId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(CART_STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse cart cache', e);
      }
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save cart to storage', e);
    }
  }, [items]);

  const addItem = (itemInput: Omit<CartItem, 'id' | 'subtotal_cents'>) => {
    const subtotal_cents = itemInput.unit_price_cents * itemInput.quantity;
    const newItem: CartItem = {
      ...itemInput,
      id: generateCartItemId(),
      subtotal_cents,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItemQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          // Adjust personalizations array length if quantity changes
          const updatedPersonalizations = [];
          for (let i = 1; i <= newQuantity; i++) {
            const existing = item.personalizations.find((p) => p.piece_index === i);
            updatedPersonalizations.push(
              existing || {
                piece_index: i,
                student_name: item.student_name,
                custom_name: '',
                custom_number: '',
              }
            );
          }
          return {
            ...item,
            quantity: newQuantity,
            subtotal_cents: item.unit_price_cents * newQuantity,
            personalizations: updatedPersonalizations,
          };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalPieces = items.reduce((acc, item) => acc + item.quantity, 0);
  const totalAmountCents = items.reduce((acc, item) => acc + item.subtotal_cents, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateItemQuantity,
        clearCart,
        totalPieces,
        totalAmountCents,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
