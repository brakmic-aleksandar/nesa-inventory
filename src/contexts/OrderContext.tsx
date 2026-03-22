import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';

import { db } from '../database/DatabaseService';

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
  loadOrderId: number | null;
  loadFromSavedOrder: (
    orderId: number,
    customerName: string,
    itemsBySource: Record<string, OrderItem[]>
  ) => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [itemsBySource, setItemsBySource] = useState<Record<string, OrderItem[]>>({});
  const [customer, setCustomer] = useState('');
  const [loadOrderId, setLoadOrderId] = useState<number | null>(null);
  const itemsBySourceRef = useRef(itemsBySource);
  itemsBySourceRef.current = itemsBySource;

  const getItems = useCallback((source: string): OrderItem[] => {
    return itemsBySourceRef.current[source] || [];
  }, []);

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

    Object.entries(itemsBySourceRef.current).forEach(([source, items]: [string, OrderItem[]]) => {
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
  }, []);

  const loadFromSavedOrder = useCallback(
    (orderId: number, customerName: string, savedItemsBySource: Record<string, OrderItem[]>) => {
      skipAutoSaveRef.current = true;
      setLoadOrderId(orderId);
      setCustomer(customerName);
      setItemsBySource(savedItemsBySource);
    },
    []
  );

  // Auto-save order to DB whenever items change
  const loadOrderIdRef = useRef(loadOrderId);
  loadOrderIdRef.current = loadOrderId;
  const customerRef = useRef(customer);
  customerRef.current = customer;
  const skipAutoSaveRef = useRef(false);

  useEffect(() => {
    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false;
      return;
    }

    const currentCustomer = customerRef.current;
    if (!currentCustomer.trim()) return;

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

    if (allItems.length === 0) return;

    const currentOrderId = loadOrderIdRef.current;
    if (currentOrderId) {
      db.updateSavedOrder(currentOrderId, currentCustomer, allItems).catch((err) =>
        console.error('Auto-save update error:', err)
      );
    } else {
      db.saveOrder(currentCustomer, allItems)
        .then((newId) => {
          setLoadOrderId(newId);
        })
        .catch((err) => console.error('Auto-save create error:', err));
    }
  }, [itemsBySource, customer]);

  const clearAll = useCallback(() => {
    skipAutoSaveRef.current = true;
    setItemsBySource({});
    setLoadOrderId(null);
  }, []);

  const value = useMemo(
    () => ({
      getItems,
      setItems,
      customer,
      setCustomer,
      getAllItems,
      clearAll,
      loadOrderId,
      loadFromSavedOrder,
    }),
    [
      getItems,
      setItems,
      customer,
      setCustomer,
      getAllItems,
      clearAll,
      loadOrderId,
      loadFromSavedOrder,
    ]
  );

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
};
