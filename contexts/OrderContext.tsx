import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  image: string;
  colorNumber?: string | null;
  itemCode?: string | null;
  colorOrder?: number | null;
}

interface OrderContextType {
  getItems: (source: string) => OrderItem[];
  setItems: (source: string, items: OrderItem[]) => void;
  customer: string;
  setCustomer: (customer: string) => void;
  getAllItems: () => {
    name: string;
    quantity: number;
    source: string;
    colorNumber?: string | null;
    itemCode?: string | null;
    colorOrder?: number | null;
  }[];
  clearAll: () => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [itemsBySource, setItemsBySource] = useState<Record<string, OrderItem[]>>({});
  const [customer, setCustomer] = useState('');

  const getItems = useCallback(
    (source: string): OrderItem[] => {
      return itemsBySource[source] || [];
    },
    [itemsBySource]
  );

  const setItems = useCallback((source: string, items: OrderItem[]) => {
    setItemsBySource((prev) => ({
      ...prev,
      [source]: items,
    }));
  }, []);

  const getAllItems = useCallback(() => {
    const allItems: {
      name: string;
      quantity: number;
      source: string;
      colorNumber?: string | null;
      itemCode?: string | null;
      colorOrder?: number | null;
    }[] = [];

    Object.entries(itemsBySource).forEach(([source, items]) => {
      items.forEach((item) => {
        if (item.quantity > 0) {
          allItems.push({
            name: item.name,
            quantity: item.quantity,
            source,
            colorNumber: item.colorNumber,
            itemCode: item.itemCode,
            colorOrder: item.colorOrder ?? null,
          });
        }
      });
    });

    return allItems;
  }, [itemsBySource]);

  const clearAll = useCallback(() => {
    setItemsBySource({});
  }, []);

  return (
    <OrderContext.Provider
      value={{ getItems, setItems, customer, setCustomer, getAllItems, clearAll }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
};
