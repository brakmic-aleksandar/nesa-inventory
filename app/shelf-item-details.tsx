import { useLocalSearchParams, useRouter } from 'expo-router';

import { ShelfItemDetailsDialog } from '../components/ShelfItemDetailsDialog';

export default function ShelfItemDetailsRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    image?: string;
    quantity?: string;
  }>();

  const id = params.id !== undefined ? Number(params.id) : undefined;
  const name = params.name || '';
  const image = params.image || 'placeholder';
  const quantity = params.quantity !== undefined ? Number(params.quantity) : undefined;

  return (
    <ShelfItemDetailsDialog
      id={Number.isFinite(id as number) ? id : undefined}
      name={name}
      image={image}
      quantity={Number.isFinite(quantity as number) ? quantity : undefined}
      onClose={() => router.back()}
    />
  );
}
