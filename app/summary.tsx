import { useRouter } from 'expo-router';

import { useOrder } from '../contexts/OrderContext';
import OrderSummaryScreen from '../screens/OrderSummaryScreen';

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
