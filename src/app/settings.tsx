import { useRouter } from 'expo-router';

import { SettingsDialog } from '../components/SettingsDialog';

export default function SettingsRoute() {
  const router = useRouter();
  const handleClose = async (hasImportedData: boolean) => {
    if (router.canGoBack()) {
      router.back();

      if (hasImportedData) {
        setTimeout(() => {
          router.setParams({ refreshKey: String(Date.now()) });
        }, 0);
      }

      return;
    }

    if (hasImportedData) {
      router.replace({
        pathname: '/',
        params: { refreshKey: String(Date.now()) },
      });
      return;
    }

    router.replace('/');
  };

  return <SettingsDialog onClose={handleClose} />;
}
