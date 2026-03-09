import { useLocalSearchParams, useRouter } from 'expo-router';

import { StandItemDetailsDialog } from '../components/StandItemDetailsDialog';

export default function StandItemDetailsRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    name?: string;
    image?: string;
    quantity?: string;
    colorNumber?: string;
    itemCode?: string;
  }>();

  const name = params.name || '';
  const image = params.image || 'placeholder';
  const quantity = params.quantity !== undefined ? Number(params.quantity) : undefined;
  const colorNumber = params.colorNumber || undefined;
  const itemCode = params.itemCode || undefined;

  return (
    <StandItemDetailsDialog
      name={name}
      image={image}
      quantity={Number.isFinite(quantity as number) ? quantity : undefined}
      colorNumber={colorNumber}
      itemCode={itemCode}
      onClose={() => router.back()}
    />
  );
}
