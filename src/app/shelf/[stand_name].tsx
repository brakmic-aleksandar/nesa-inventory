import { useLocalSearchParams, useRouter } from 'expo-router';

import StandScreen from '../../screens/StandScreen';
import ShelfScreen from '../../screens/ShelfScreen';
import { SHELF_SOURCE_ID } from '../../constants';

export default function StandNameRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ stand_name?: string }>();
  const standName = typeof params.stand_name === 'string' ? params.stand_name : SHELF_SOURCE_ID;

  if (standName === SHELF_SOURCE_ID) {
    return <ShelfScreen />;
  }

  return <StandScreen cardTitle={standName} />;
}
