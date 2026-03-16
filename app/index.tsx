import { useRouter, useLocalSearchParams } from 'expo-router';

import { useOrder } from '../contexts/OrderContext';
import { db } from '../database/DatabaseService';
import { SavedOrderItem } from '../database/schema';
import StartScreen from '../screens/StartScreen';

function groupItemsBySource(items: SavedOrderItem[]): Record<string, Array<{
  id: number;
  name: string;
  quantity: number;
  image: string;
  colorNumber?: string | null;
  itemCode?: string | null;
  colorOrder?: number | null;
}>> {
  const result: Record<string, Array<{
    id: number;
    name: string;
    quantity: number;
    image: string;
    colorNumber?: string | null;
    itemCode?: string | null;
    colorOrder?: number | null;
  }>> = {};

  items.forEach((item) => {
    if (!result[item.source]) {
      result[item.source] = [];
    }
    result[item.source].push({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      image: item.image ?? '',
      colorNumber: item.color_number,
      itemCode: item.item_code,
      colorOrder: item.color_order,
    });
  });

  return result;
}

export default function StartRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ refreshKey?: string }>();
  const { setCustomer, loadFromSavedOrder } = useOrder();

  const dataRefreshKey = params.refreshKey ? Number(params.refreshKey) || 0 : 0;

  const handleStartPress = (text: string) => {
    setCustomer(text);
    router.push({
      pathname: '/selection',
      params: {
        refreshKey: String(dataRefreshKey),
      },
    });
  };

  const handleEditExistingOrder = async (orderId: number) => {
    try {
      const data = await db.getSavedOrderWithItems(orderId);
      if (!data) return;

      const itemsBySource = groupItemsBySource(data.items);
      loadFromSavedOrder(orderId, data.order.customer_name, itemsBySource);

      router.push({
        pathname: '/selection',
        params: {
          refreshKey: String(dataRefreshKey),
        },
      });
    } catch (error) {
      console.error('Error loading saved order for edit:', error);
    }
  };

  return (
    <StartScreen
      key={dataRefreshKey}
      onStartPress={handleStartPress}
      onEditExistingOrder={handleEditExistingOrder}
      onSettingsPress={() => router.push('/settings')}
      onSavedOrdersPress={() => router.push('/saved-orders')}
      refreshKey={dataRefreshKey}
    />
  );
}
