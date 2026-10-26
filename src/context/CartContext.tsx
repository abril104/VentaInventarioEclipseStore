'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  variantId: string;
  sku: string;
  productName: string;
  size: string;
  color: string;
  price: number;
  quantity: number;
  maxStock: number;
  image?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, delta: number) => void;
  clearCart: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Cargar de sessionStorage al iniciar
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('eclipse_cart');
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Guardar en sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('eclipse_cart', JSON.stringify(items));
    } catch (e) {
      // ignore
    }
  }, [items]);

  const addItem = (item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === item.variantId);
      if (existing) {
        const newQty = Math.min(existing.quantity + item.quantity, existing.maxStock);
        return prev.map((i) => (i.variantId === item.variantId ? { ...i, quantity: newQty } : i));
      }
      return [...prev, item];
    });
    setIsOpen(true);
  };

  const removeItem = (variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  };

  const updateQuantity = (variantId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.variantId === variantId) {
            const targetQty = item.quantity + delta;
            if (targetQty <= 0) return null;
            const finalQty = Math.min(targetQty, item.maxStock);
            return { ...item, quantity: finalQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        isOpen,
        setIsOpen,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart debe ser usado dentro de CartProvider');
  }
  return ctx;
}
