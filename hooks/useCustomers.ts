import { useCallback, useEffect, useState } from 'react';

import { db } from '../database/DatabaseService';
import { CustomerGroupWithCustomers } from '../database/schema';
import { Settings } from '../models/Settings';
import { checkImportedFile, ImportFileStatus } from '../services/ExcelImportService';

export function useCustomers(refreshKey?: number) {
  const [customerGroups, setCustomerGroups] = useState<CustomerGroupWithCustomers[]>([]);
  const [importFileStatus, setImportFileStatus] = useState<ImportFileStatus>('unchanged');

  const loadCustomers = useCallback(async () => {
    const loadedCustomerGroups = await db.getCustomerGroupsWithCustomers();
    setCustomerGroups(loadedCustomerGroups);
    return loadedCustomerGroups;
  }, []);

  const checkForNewData = useCallback(async () => {
    const status = await checkImportedFile();
    await Settings.loadImportedFileBookmark();
    setImportFileStatus(status);
    return status;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const status = await checkImportedFile();
        await Settings.loadImportedFileBookmark();
        if (isMounted) {
          setImportFileStatus(status);
        }

        const loadedCustomers = await db.getCustomerGroupsWithCustomers();
        if (isMounted) {
          setCustomerGroups(loadedCustomers);
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
    customerGroups,
    importFileStatus,
    setImportFileStatus,
    loadCustomers,
    checkForNewData,
  };
}
