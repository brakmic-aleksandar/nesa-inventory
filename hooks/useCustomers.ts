import { useCallback, useEffect, useState } from 'react';

import { db } from '../database/DatabaseService';
import { Customer } from '../database/schema';
import { Settings } from '../models/Settings';
import { checkImportedFile } from '../services/ExcelImportService';

export function useCustomers(refreshKey?: number) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [hasNewDataAvailable, setHasNewDataAvailable] = useState(false);

  const loadCustomers = useCallback(async () => {
    const loadedCustomers = await db.getAllCustomers();
    setCustomers(loadedCustomers);
    return loadedCustomers;
  }, []);

  const refreshStatusAndCustomers = useCallback(async () => {
    const hasChanged = await checkImportedFile();
    await Settings.loadImportedFileBookmark();
    setHasNewDataAvailable(hasChanged);
    await loadCustomers();
    return hasChanged;
  }, [loadCustomers]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const hasChanged = await checkImportedFile();
        await Settings.loadImportedFileBookmark();
        if (isMounted) {
          setHasNewDataAvailable(hasChanged);
        }

        const loadedCustomers = await db.getAllCustomers();
        if (isMounted) {
          setCustomers(loadedCustomers);
        }
      } catch (error) {
        console.error('Error loading customers and status:', error);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  return {
    customers,
    hasNewDataAvailable,
    setHasNewDataAvailable,
    loadCustomers,
    refreshStatusAndCustomers,
  };
}
