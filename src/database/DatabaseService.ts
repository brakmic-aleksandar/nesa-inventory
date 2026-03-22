import * as SQLite from 'expo-sqlite';

import {
  CREATE_TABLES_SQL,
  Stand,
  StandItem,
  ShelfItem,
  Customer,
  CustomerGroupWithCustomers,
  CustomerGroup,
  SavedOrder,
  SavedOrderItem,
} from './schema';

const DEFAULT_CUSTOMER_GROUP_NAME = 'Ungrouped';

interface CustomerImportInput {
  name: string;
  order_index: number;
  group_name?: string | null;
}

class QueryCache {
  private cache = new Map<string, { data: unknown; timestamp: number }>();

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    return entry.data as T;
  }

  set(key: string, data: unknown): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  invalidate(): void {
    this.cache.clear();
  }
}

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private cache = new QueryCache();

  private async execRawSQL(sql: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.execAsync(sql);
  }

  async beginTransaction(): Promise<void> {
    await this.execRawSQL('BEGIN TRANSACTION');
  }

  async commitTransaction(): Promise<void> {
    await this.execRawSQL('COMMIT');
  }

  async rollbackTransaction(): Promise<void> {
    await this.execRawSQL('ROLLBACK');
  }
  private readonly DB_VERSION = 9; // Increment this when schema changes

  async init(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync('inventory.db');
      await this.createTables();
      await this.runMigrations();
      // await this.seedInitialData();
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  invalidateCache(): void {
    this.cache.invalidate();
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const statements = CREATE_TABLES_SQL.split(';').filter((s) => s.trim());
    for (const statement of statements) {
      await this.db.execAsync(statement);
    }
  }

  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Create version table if it doesn't exist
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS db_version (
        id INTEGER PRIMARY KEY,
        version INTEGER NOT NULL
      );
    `);

    // Get current version
    const versionResult = await this.db.getAllAsync<{ version: number }>(
      'SELECT version FROM db_version WHERE id = 1'
    );
    const currentVersion = versionResult.length > 0 ? versionResult[0].version : 0;

    // Run migrations if needed
    if (currentVersion < this.DB_VERSION) {
      await this.migrate(currentVersion);
    }
  }

  private async migrate(fromVersion: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Migration from version 0 to 1: Add missing columns if they don't exist
    if (fromVersion < 1) {
      // Check if columns exist
      const tableInfo = await this.db.getAllAsync<any>('PRAGMA table_info(stand_items)');
      const columnNames = tableInfo.map((col: any) => col.name);

      if (!columnNames.includes('color_number')) {
        await this.db.execAsync('ALTER TABLE stand_items ADD COLUMN color_number TEXT');
      }
      if (!columnNames.includes('item_code')) {
        await this.db.execAsync('ALTER TABLE stand_items ADD COLUMN item_code TEXT');
      }
      if (!columnNames.includes('image_path')) {
        await this.db.execAsync('ALTER TABLE stand_items ADD COLUMN image_path TEXT');
      }
    }

    // Migration from version 1 to 2: Ensure customers table exists
    if (fromVersion < 2) {
      // Table is created by CREATE_TABLES_SQL with IF NOT EXISTS, so this is safe
    }

    // Migration from version 2 to 3: Add color_order column
    if (fromVersion < 3) {
      const tableInfo = await this.db.getAllAsync<any>('PRAGMA table_info(stand_items)');
      const columnNames = tableInfo.map((col: any) => col.name);

      if (!columnNames.includes('color_order')) {
        await this.db.execAsync('ALTER TABLE stand_items ADD COLUMN color_order INTEGER');
      }
    }

    // Migration from version 3 to 4: Ensure color_order exists (for databases that skipped migration)
    if (fromVersion < 4) {
      const tableInfo = await this.db.getAllAsync<any>('PRAGMA table_info(stand_items)');
      const columnNames = tableInfo.map((col: any) => col.name);

      if (!columnNames.includes('color_order')) {
        await this.db.execAsync('ALTER TABLE stand_items ADD COLUMN color_order INTEGER');
      }
    }

    // Migration from version 4 to 5: Add stand-level color header mode config
    if (fromVersion < 5) {
      const tableInfo = await this.db.getAllAsync<any>('PRAGMA table_info(stands)');
      const columnNames = tableInfo.map((col: any) => col.name);

      if (!columnNames.includes('color_headers_mode')) {
        await this.db.execAsync(
          "ALTER TABLE stands ADD COLUMN color_headers_mode TEXT NOT NULL DEFAULT 'per_sheet'"
        );
      }
    }

    // Migration from version 5 to 6: Introduce customer groups (legacy-safe)
    if (fromVersion < 6) {
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS customer_groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          order_index INTEGER NOT NULL
        );
      `);

      await this.db.runAsync(
        'INSERT OR IGNORE INTO customer_groups (name, order_index) VALUES (?, ?)',
        [DEFAULT_CUSTOMER_GROUP_NAME, 0]
      );

      const defaultGroup = await this.db.getFirstAsync<{ id: number }>(
        'SELECT id FROM customer_groups WHERE name = ?',
        [DEFAULT_CUSTOMER_GROUP_NAME]
      );

      if (!defaultGroup) {
        throw new Error('Failed to resolve default customer group during migration');
      }

      const customerColumns = await this.db.getAllAsync<{ name: string }>(
        'PRAGMA table_info(customers)'
      );
      const hasGroupId = customerColumns.some((column) => column.name === 'group_id');

      // Keep legacy databases with group_id consistent; newer schemas skip this path.
      if (hasGroupId) {
        await this.db.runAsync('UPDATE customers SET group_id = ? WHERE group_id IS NULL', [
          defaultGroup.id,
        ]);
        await this.db.execAsync(
          'CREATE INDEX IF NOT EXISTS idx_customers_group_id ON customers(group_id)'
        );
      }

      await this.db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_customer_groups_order ON customer_groups(order_index)'
      );
      await this.db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_customers_order ON customers(order_index)'
      );
    }

    // Migration from version 6 to 7: Move customer-group relation into mapping table
    if (fromVersion < 7) {
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS customer_group_customers (
          group_id INTEGER NOT NULL,
          customer_id INTEGER NOT NULL,
          order_index INTEGER NOT NULL,
          PRIMARY KEY (group_id, customer_id),
          FOREIGN KEY (group_id) REFERENCES customer_groups(id) ON DELETE CASCADE,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
        );
      `);

      const customerColumns = await this.db.getAllAsync<{ name: string }>(
        'PRAGMA table_info(customers)'
      );
      const hasGroupId = customerColumns.some((column) => column.name === 'group_id');
      const defaultGroup = await this.db.getFirstAsync<{ id: number }>(
        'SELECT id FROM customer_groups WHERE name = ?',
        [DEFAULT_CUSTOMER_GROUP_NAME]
      );

      if (!defaultGroup) {
        throw new Error('Failed to resolve default customer group during v7 migration');
      }

      if (hasGroupId) {
        await this.db.execAsync(`
          INSERT OR IGNORE INTO customer_group_customers (group_id, customer_id, order_index)
          SELECT group_id, id, order_index FROM customers
        `);

        await this.db.execAsync(`
          CREATE TABLE IF NOT EXISTS customers_v7 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            order_index INTEGER NOT NULL
          );
        `);

        await this.db.execAsync(`
          INSERT OR IGNORE INTO customers_v7 (id, name, order_index)
          SELECT id, name, order_index FROM customers
        `);

        await this.db.execAsync('DROP TABLE customers');
        await this.db.execAsync('ALTER TABLE customers_v7 RENAME TO customers');
      } else {
        await this.db.runAsync(
          `
            INSERT OR IGNORE INTO customer_group_customers (group_id, customer_id, order_index)
            SELECT ?, id, order_index FROM customers
          `,
          [defaultGroup.id]
        );
      }

      await this.db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_customers_order ON customers(order_index)'
      );
      await this.db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_customer_group_customers_group ON customer_group_customers(group_id)'
      );
      await this.db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_customer_group_customers_customer ON customer_group_customers(customer_id)'
      );
    }

    // Migration from version 7 to 8: Add saved orders tables
    if (fromVersion < 8) {
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS saved_orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_name TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          expires_at TEXT NOT NULL
        );
      `);

      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS saved_order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          source TEXT NOT NULL,
          color_number TEXT,
          item_code TEXT,
          color_order INTEGER,
          image TEXT,
          FOREIGN KEY (order_id) REFERENCES saved_orders(id) ON DELETE CASCADE
        );
      `);

      await this.db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_saved_order_items_order ON saved_order_items(order_id)'
      );
      await this.db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_saved_orders_expires ON saved_orders(expires_at)'
      );
      await this.db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_saved_orders_created ON saved_orders(created_at)'
      );

      // Clean up any expired orders
      await this.db.runAsync(
        "DELETE FROM saved_orders WHERE datetime(expires_at) < datetime('now')"
      );
    }

    // Migration from version 8 to 9: Add sent_at column to saved_orders
    if (fromVersion < 9) {
      const tableInfo = await this.db.getAllAsync<any>('PRAGMA table_info(saved_orders)');
      const columnNames = tableInfo.map((col: any) => col.name);

      if (!columnNames.includes('sent_at')) {
        await this.db.execAsync('ALTER TABLE saved_orders ADD COLUMN sent_at TEXT');
      }
    }

    // Update version
    await this.db.execAsync('DELETE FROM db_version WHERE id = 1');
    await this.db.runAsync('INSERT INTO db_version (id, version) VALUES (?, ?)', [
      1,
      this.DB_VERSION,
    ]);
  }

  // Stand operations
  async getAllStands(): Promise<Stand[]> {
    if (!this.db) throw new Error('Database not initialized');

    const cached = this.cache.get<Stand[]>('allStands');
    if (cached) return cached;

    const result = await this.db.getAllAsync<Stand>('SELECT * FROM stands ORDER BY order_index');
    this.cache.set('allStands', result);
    return result;
  }

  async getStandById(id: number): Promise<Stand | null> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getFirstAsync<Stand>('SELECT * FROM stands WHERE id = ?', [id]);
  }

  async getStandByName(name: string): Promise<Stand | null> {
    if (!this.db) throw new Error('Database not initialized');

    const cacheKey = `stand:${name}`;
    const cached = this.cache.get<Stand | null>(cacheKey);
    if (cached !== undefined) return cached;

    const result = await this.db.getFirstAsync<Stand>('SELECT * FROM stands WHERE name = ?', [
      name,
    ]);
    this.cache.set(cacheKey, result);
    return result;
  }

  // Stand items operations
  async getStandItems(standId: number): Promise<StandItem[]> {
    if (!this.db) throw new Error('Database not initialized');

    const cacheKey = `standItems:${standId}`;
    const cached = this.cache.get<StandItem[]>(cacheKey);
    if (cached) return cached;

    const result = await this.db.getAllAsync<StandItem>(
      'SELECT * FROM stand_items WHERE stand_id = ? ORDER BY row_index, col_index',
      [standId]
    );
    this.cache.set(cacheKey, result);
    return result;
  }

  async updateStandItem(
    id: number,
    name: string,
    colorNumber: string | null,
    itemCode: string | null,
    imagePath: string | null
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(
      'UPDATE stand_items SET name = ?, color_number = ?, item_code = ?, image_path = ? WHERE id = ?',
      [name, colorNumber, itemCode, imagePath, id]
    );
    this.cache.invalidate();
  }

  // Shelf items operations
  async getAllShelfItems(): Promise<ShelfItem[]> {
    if (!this.db) throw new Error('Database not initialized');

    const cached = this.cache.get<ShelfItem[]>('allShelfItems');
    if (cached) return cached;

    const result = await this.db.getAllAsync<ShelfItem>(
      'SELECT * FROM shelf_items ORDER BY order_index'
    );
    this.cache.set('allShelfItems', result);
    return result;
  }

  async updateShelfItem(id: number, name: string, imagePath: string | null): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('UPDATE shelf_items SET name = ?, image_path = ? WHERE id = ?', [
      name,
      imagePath,
      id,
    ]);
    this.cache.invalidate();
  }

  // Import operations
  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.execAsync('SAVEPOINT clear_all');
    try {
      await this.db.runAsync('DELETE FROM stand_items');
      await this.db.runAsync('DELETE FROM stands');
      await this.db.runAsync('DELETE FROM shelf_items');
      await this.db.runAsync('DELETE FROM customer_group_customers');
      await this.db.runAsync('DELETE FROM customers');
      await this.db.runAsync('DELETE FROM customer_groups');
      await this.db.execAsync('RELEASE SAVEPOINT clear_all');
    } catch (error) {
      await this.db.execAsync('ROLLBACK TO SAVEPOINT clear_all');
      throw error;
    }
    this.cache.invalidate();
  }

  // Customer operations
  async getAllCustomers(): Promise<Customer[]> {
    if (!this.db) throw new Error('Database not initialized');

    const cached = this.cache.get<Customer[]>('allCustomers');
    if (cached) return cached;

    const result = await this.db.getAllAsync<Customer>(
      'SELECT * FROM customers ORDER BY order_index ASC'
    );
    this.cache.set('allCustomers', result);
    return result;
  }

  async getCustomerGroupsWithCustomers(): Promise<CustomerGroupWithCustomers[]> {
    if (!this.db) throw new Error('Database not initialized');

    const cached = this.cache.get<CustomerGroupWithCustomers[]>('customerGroupsWithCustomers');
    if (cached) return cached;

    const groups = await this.db.getAllAsync<CustomerGroup>(
      'SELECT id, name, order_index FROM customer_groups ORDER BY order_index ASC'
    );
    const members = await this.db.getAllAsync<{
      group_id: number;
      customer_id: number;
      group_customer_order: number;
      id: number;
      name: string;
      order_index: number;
    }>(
      `
        SELECT
          cgc.group_id,
          cgc.customer_id,
          cgc.order_index AS group_customer_order,
          c.id,
          c.name,
          c.order_index
        FROM customer_group_customers cgc
        INNER JOIN customers c ON c.id = cgc.customer_id
        ORDER BY cgc.group_id ASC, cgc.order_index ASC, c.order_index ASC
      `
    );

    const customersByGroupId = new Map<number, Customer[]>();
    members.forEach((member) => {
      const customerList = customersByGroupId.get(member.group_id) || [];
      const customer: Customer = {
        id: member.id,
        name: member.name,
        order_index: member.group_customer_order,
      };
      customerList.push(customer);
      customersByGroupId.set(member.group_id, customerList);
    });

    const result: CustomerGroupWithCustomers[] = groups.map((group) => ({
      ...group,
      customers: customersByGroupId.get(group.id) || [],
    }));

    this.cache.set('customerGroupsWithCustomers', result);
    return result;
  }

  async importCustomers(customers: CustomerImportInput[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const groups = await this.db.getAllAsync<CustomerGroup>(
      'SELECT id, name, order_index FROM customer_groups ORDER BY order_index ASC'
    );
    const groupByName = new Map<string, CustomerGroup>();
    groups.forEach((group) => {
      groupByName.set(group.name.toLowerCase(), group);
    });

    let nextGroupOrderIndex = groups.length;

    const ensureGroupId = async (groupNameRaw?: string | null): Promise<number> => {
      const normalizedName = (groupNameRaw || '').trim() || DEFAULT_CUSTOMER_GROUP_NAME;
      const lookupKey = normalizedName.toLowerCase();
      const existing = groupByName.get(lookupKey);
      if (existing) {
        return existing.id;
      }

      await this.db!.runAsync(
        'INSERT OR IGNORE INTO customer_groups (name, order_index) VALUES (?, ?)',
        [normalizedName, nextGroupOrderIndex]
      );

      const resolved = await this.db!.getFirstAsync<CustomerGroup>(
        'SELECT id, name, order_index FROM customer_groups WHERE name = ?',
        [normalizedName]
      );

      if (!resolved) {
        throw new Error(`Failed to create or resolve customer group: ${normalizedName}`);
      }

      groupByName.set(lookupKey, resolved);
      nextGroupOrderIndex += 1;
      return resolved.id;
    };

    for (const customer of customers) {
      const groupId = await ensureGroupId(customer.group_name);
      const existingCustomer = await this.db.getFirstAsync<{ id: number }>(
        `
          SELECT c.id
          FROM customers c
          INNER JOIN customer_group_customers cgc ON cgc.customer_id = c.id
          WHERE cgc.group_id = ? AND LOWER(c.name) = LOWER(?)
          LIMIT 1
        `,
        [groupId, customer.name]
      );

      let customerId = existingCustomer?.id;
      if (!customerId) {
        const insertResult = await this.db.runAsync(
          'INSERT INTO customers (name, order_index) VALUES (?, ?)',
          [customer.name, customer.order_index]
        );
        customerId = insertResult.lastInsertRowId;
      }

      await this.db.runAsync(
        'INSERT OR IGNORE INTO customer_group_customers (group_id, customer_id, order_index) VALUES (?, ?, ?)',
        [groupId, customerId, customer.order_index]
      );
    }
    this.cache.invalidate();
  }

  async importStands(stands: Omit<Stand, 'id'>[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      for (const stand of stands) {
        await this.db.runAsync(
          'INSERT INTO stands (name, subtitle, icon, color, order_index, color_headers_mode) VALUES (?, ?, ?, ?, ?, ?)',
          [
            stand.name,
            stand.subtitle,
            stand.icon,
            stand.color,
            stand.order_index,
            stand.color_headers_mode || 'per_sheet',
          ]
        );
      }
    } catch (error) {
      console.error('Error importing stands:', error);
      throw error;
    }
    this.cache.invalidate();
  }

  async updateStandColorHeadersModeByName(name: string, mode: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('UPDATE stands SET color_headers_mode = ? WHERE name = ?', [mode, name]);
    this.cache.invalidate();
  }

  async importStandItems(items: Omit<StandItem, 'id'>[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      for (const item of items) {
        await this.db.runAsync(
          'INSERT INTO stand_items (stand_id, name, color_number, row_index, col_index, item_code, image_path, color_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            item.stand_id,
            item.name,
            item.color_number,
            item.row_index,
            item.col_index,
            item.item_code,
            item.image_path,
            item.color_order,
          ]
        );
      }
    } catch (error) {
      console.error('Error importing stand items:', error);
      throw error;
    }
    this.cache.invalidate();
  }

  async importShelfItems(items: Omit<ShelfItem, 'id'>[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      for (const item of items) {
        await this.db.runAsync(
          'INSERT INTO shelf_items (name, image_path, order_index) VALUES (?, ?, ?)',
          [item.name, item.image_path, item.order_index]
        );
      }
    } catch (error) {
      console.error('Error importing shelf items:', error);
      throw error;
    }
    this.cache.invalidate();
  }

  // Saved order operations
  async saveOrder(
    customerName: string,
    items: {
      name: string;
      quantity: number;
      source: string;
      colorNumber?: string | null;
      itemCode?: string | null;
      colorOrder?: number | null;
      image?: string;
    }[]
  ): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const createdAt = new Date().toISOString();

    const result = await this.db.runAsync(
      'INSERT INTO saved_orders (customer_name, created_at, expires_at) VALUES (?, ?, ?)',
      [customerName, createdAt, expiresAt]
    );
    const orderId = result.lastInsertRowId;

    for (const item of items) {
      await this.db.runAsync(
        'INSERT INTO saved_order_items (order_id, name, quantity, source, color_number, item_code, color_order, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          orderId,
          item.name,
          item.quantity,
          item.source,
          item.colorNumber ?? null,
          item.itemCode ?? null,
          item.colorOrder ?? null,
          item.image ?? null,
        ]
      );
    }

    return orderId;
  }

  async getSavedOrders(): Promise<SavedOrder[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAllAsync<SavedOrder>(
      "SELECT * FROM saved_orders WHERE datetime(expires_at) >= datetime('now') ORDER BY created_at DESC"
    );
  }

  async getSavedOrderItems(orderId: number): Promise<SavedOrderItem[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAllAsync<SavedOrderItem>(
      'SELECT * FROM saved_order_items WHERE order_id = ?',
      [orderId]
    );
  }

  async getSavedOrderWithItems(
    orderId: number
  ): Promise<{ order: SavedOrder; items: SavedOrderItem[] } | null> {
    if (!this.db) throw new Error('Database not initialized');
    const order = await this.db.getFirstAsync<SavedOrder>(
      'SELECT * FROM saved_orders WHERE id = ?',
      [orderId]
    );
    if (!order) return null;
    const items = await this.getSavedOrderItems(orderId);
    return { order, items };
  }

  async deleteSavedOrder(orderId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('DELETE FROM saved_orders WHERE id = ?', [orderId]);
  }

  async deleteExpiredOrders(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(
      "DELETE FROM saved_orders WHERE datetime(expires_at) < datetime('now', 'localtime')"
    );
  }

  async updateSavedOrder(
    orderId: number,
    customerName: string,
    items: {
      name: string;
      quantity: number;
      source: string;
      colorNumber?: string | null;
      itemCode?: string | null;
      colorOrder?: number | null;
      image?: string;
    }[]
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('UPDATE saved_orders SET customer_name = ? WHERE id = ?', [
      customerName,
      orderId,
    ]);
    await this.db.runAsync('DELETE FROM saved_order_items WHERE order_id = ?', [orderId]);

    for (const item of items) {
      await this.db.runAsync(
        'INSERT INTO saved_order_items (order_id, name, quantity, source, color_number, item_code, color_order, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          orderId,
          item.name,
          item.quantity,
          item.source,
          item.colorNumber ?? null,
          item.itemCode ?? null,
          item.colorOrder ?? null,
          item.image ?? null,
        ]
      );
    }
  }

  async getTodayCustomerNames(): Promise<Set<string>> {
    if (!this.db) throw new Error('Database not initialized');
    const rows = await this.db.getAllAsync<{ customer_name: string }>(
      "SELECT DISTINCT customer_name FROM saved_orders WHERE date(created_at) = date('now', 'localtime')"
    );
    return new Set(rows.map((r) => r.customer_name));
  }

  async markOrderAsSent(orderId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync("UPDATE saved_orders SET sent_at = datetime('now') WHERE id = ?", [
      orderId,
    ]);
  }

  async getTodaySentCustomerNames(): Promise<Set<string>> {
    if (!this.db) throw new Error('Database not initialized');
    const rows = await this.db.getAllAsync<{ customer_name: string }>(
      "SELECT DISTINCT customer_name FROM saved_orders WHERE date(created_at) = date('now', 'localtime') AND sent_at IS NOT NULL"
    );
    return new Set(rows.map((r) => r.customer_name));
  }

  async getTodayOrderForCustomer(customerName: string): Promise<SavedOrder | null> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getFirstAsync<SavedOrder>(
      "SELECT * FROM saved_orders WHERE customer_name = ? AND date(created_at) = date('now', 'localtime') ORDER BY created_at DESC LIMIT 1",
      [customerName]
    );
  }

  async getSavedOrdersCount(): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    const result = await this.db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM saved_orders WHERE date(created_at) = date('now', 'localtime')"
    );
    return result?.count ?? 0;
  }
}

export const db = new DatabaseService();
