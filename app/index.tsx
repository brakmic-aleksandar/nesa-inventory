import { useRouter, useLocalSearchParams } from 'expo-router';

import { useOrder } from '../contexts/OrderContext';
import StartScreen from '../screens/StartScreen';

export default function StartRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ refreshKey?: string }>();
  const { setCustomer } = useOrder();

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

  return (
    <StartScreen
      key={dataRefreshKey}
      onStartPress={handleStartPress}
      onSettingsPress={() => router.push('/settings')}
      refreshKey={dataRefreshKey}
    />
  );
}
