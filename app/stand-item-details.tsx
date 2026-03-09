import { useLocalSearchParams, useRouter } from 'expo-router';

import { useLanguage } from '../contexts/LanguageContext';
import { ItemDetailsDialog } from '../components/ItemDetailsDialog';

export default function StandItemDetailsRoute() {
  const router = useRouter();
  const { t } = useLanguage();
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

  const details = [];
  if (colorNumber) {
    details.push({ label: t.itemModal.color, value: colorNumber });
  }
  if (itemCode) {
    details.push({ label: t.itemModal.itemCode, value: itemCode });
  }
  if (Number.isFinite(quantity as number) && quantity !== undefined) {
    details.push({ label: t.itemModal.currentQuantity, value: quantity });
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
