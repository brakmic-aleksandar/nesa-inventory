import { useRouter } from 'expo-router';

import OrderSummaryScreen from '../screens/OrderSummaryScreen';
import { useOrder } from '../contexts/OrderContext';

export default function SummaryRoute() {
  const router = useRouter();
  const { customer } = useOrder();

  return (
    <OrderSummaryScreen
      inputText={customer}
      onBackPress={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }
        router.replace('/selection');
      }}
      onOrderSent={() => {
        router.dismissAll();
        router.replace('/');
      }}
    />
  );
}
