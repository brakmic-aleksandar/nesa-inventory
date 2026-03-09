import { useLocalSearchParams, useRouter } from 'expo-router';

import SelectionScreen from '../screens/SelectionScreen';
import { SHELF_SOURCE_ID } from '../constants';
import { useOrder } from '../contexts/OrderContext';

export default function SelectionRoute() {
  const router = useRouter();
  const { customer } = useOrder();
  const params = useLocalSearchParams<{ refreshKey?: string }>();

  const inputText = customer;
  const refreshKey =
    typeof params.refreshKey === 'string' && !Number.isNaN(Number(params.refreshKey))
      ? Number(params.refreshKey)
      : undefined;

  const handleCardPress = (cardTitle: string) => {
    router.push({
      pathname: '/shelf/[stand_name]',
      params: {
        stand_name: cardTitle === SHELF_SOURCE_ID ? SHELF_SOURCE_ID : cardTitle,
      },
    });
  };

  return (
    <SelectionScreen
      inputText={inputText}
      onBackPress={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }
        router.replace('/');
      }}
      onCardPress={(cardTitle) => handleCardPress(cardTitle)}
      onShowSummary={() => router.push('/summary')}
      refreshKey={refreshKey}
    />
  );
}
