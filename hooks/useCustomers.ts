import { useCallback, useEffect, useState } from 'react';
import { Customer } from '../database/schema';
import { db } from '../database/DatabaseService';
import { checkImportedFile } from '../services/ExcelImportService';
import { Settings } from '../models/Settings';

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
    const bookmarkMeta = await Settings.loadImportedFileBookmark();
    console.log('[CustomersStatus]', {
      hasChanged,
      hasBookmark: Boolean(bookmarkMeta.bookmark),
      modDate: bookmarkMeta.modDate,
      fileSize: bookmarkMeta.fileSize,
    });
    setHasNewDataAvailable(hasChanged);
    await loadCustomers();
    return hasChanged;
  }, [loadCustomers]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const hasChanged = await checkImportedFile();
        const bookmarkMeta = await Settings.loadImportedFileBookmark();
        console.log('[CustomersLoad]', {
          hasChanged,
          hasBookmark: Boolean(bookmarkMeta.bookmark),
          modDate: bookmarkMeta.modDate,
          fileSize: bookmarkMeta.fileSize,
        });
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
