import React, { createContext, useContext, useState } from 'react';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());

  const addToCart = (dish, quantity = 1, override = {}) => {
    setItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === dish.id && (!override.special_requests || item.special_requests === override.special_requests));
      if (existingItem) {
        return prevItems.map(item =>
          (item.id === dish.id && (!override.special_requests || item.special_requests === override.special_requests))
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      const price = override.price != null ? override.price : dish.price;
      const special_requests = override.special_requests || undefined;
      return [...prevItems, { ...dish, quantity, price, special_requests }];
    });
    
    // Tự động chọn món mới thêm vào
    setSelectedItems(prev => new Set([...prev, dish.id]));
  };

  const removeFromCart = (dishId) => {
    setItems(prevItems => prevItems.filter(item => item.id !== dishId));
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(dishId);
      return newSet;
    });
  };

  const updateQuantity = (dishId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(dishId);
      return;
    }
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === dishId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    setSelectedItems(new Set());
  };

  // Add combo as a single cart item with subItems
  // combo = { id, name, price, originalTotal, type: 'combo', images: string[], subItems: [{id, name, price, original_price, image}], quantity }
  const addComboToCart = (combo) => {
    setItems(prev => {
      const existing = prev.find(it => it.id === combo.id);
      if (existing) {
        return prev.map(it => it.id === combo.id ? { ...it, quantity: it.quantity + (combo.quantity || 1) } : it);
      }
      return [...prev, { ...combo, quantity: combo.quantity || 1 }];
    });
    setSelectedItems(prev => new Set([...prev, combo.id]));
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + (Number(item.price) * Number(item.quantity)), 0);
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getSelectedItems = () => {
    return items.filter(item => selectedItems.has(item.id));
  };

  const getSelectedTotalPrice = () => {
    return items
      .filter(item => selectedItems.has(item.id))
      .reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getSelectedTotalItems = () => {
    return items
      .filter(item => selectedItems.has(item.id))
      .reduce((total, item) => total + item.quantity, 0);
  };

  const toggleItemSelection = (dishId) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dishId)) {
        newSet.delete(dishId);
      } else {
        newSet.add(dishId);
      }
      return newSet;
    });
  };

  const selectAllItems = () => {
    setSelectedItems(new Set(items.map(item => item.id)));
  };

  const deselectAllItems = () => {
    setSelectedItems(new Set());
  };

  const value = {
    items,
    selectedItems,
    addToCart,
    addComboToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalPrice,
    getTotalItems,
    getSelectedItems,
    getSelectedTotalPrice,
    getSelectedTotalItems,
    toggleItemSelection,
    selectAllItems,
    deselectAllItems
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
