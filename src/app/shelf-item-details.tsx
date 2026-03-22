import { useLocalSearchParams, useRouter } from 'expo-router';

import { ItemDetailsDialog } from '../components/ItemDetailsDialog';
import { useLanguage } from '../contexts/LanguageContext';

export default function ShelfItemDetailsRoute() {
  const router = useRouter();
  const { t } = useLanguage();
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

  const details = [];
  if (Number.isFinite(quantity as number) && quantity !== undefined) {
    details.push({ label: t.itemModal.currentQuantity, value: quantity });
  }
  if (Number.isFinite(id as number) && id !== undefined) {
    details.push({ label: t.itemModal.itemId, value: id });
  }

  return (
    <ItemDetailsDialog
      name={name}
      image={image}
      details={details}
      onClose={() => router.back()}
    />
  );
}
