import { useCallback, useEffect, useRef, useState } from 'react';

import { db } from '../database/DatabaseService';
import { SavedOrder } from '../database/schema';

export function useSavedOrders() {
  const [orders, setOrders] = useState<SavedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      await db.deleteExpiredOrders();
      const result = await db.getSavedOrders();
      if (mountedRef.current) {
        setOrders(result);
      }
    } catch (error) {
      console.error('Error loading saved orders:', error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const deleteOrder = useCallback(
    async (orderId: number) => {
      await db.deleteSavedOrder(orderId);
      await refresh();
    },
    [refresh]
  );

  return { orders, loading, refresh, deleteOrder };
}
