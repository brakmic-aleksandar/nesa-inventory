import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL, Stand, StandItem, ShelfItem, Customer } from './schema';

class DatabaseService {
  /**
   * Execute a raw SQL statement (e.g., for BEGIN/COMMIT/ROLLBACK TRANSACTION).
   * Use with caution! Only for transaction control or special cases.
   */
  public async execRawSQL(sql: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.execAsync(sql);
  }
  private db: SQLite.SQLiteDatabase | null = null;
  private readonly DB_VERSION = 5; // Increment this when schema changes

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

    console.log(`Database version: ${currentVersion}, Target version: ${this.DB_VERSION}`);

    // Run migrations if needed
    if (currentVersion < this.DB_VERSION) {
      await this.migrate(currentVersion);
    }
  }

  private async migrate(fromVersion: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    console.log(`Running migrations from version ${fromVersion} to ${this.DB_VERSION}`);

    // Migration from version 0 to 1: Add missing columns if they don't exist
    if (fromVersion < 1) {
      console.log('Running migration: Adding color_number, item_code, image_path to stand_items');

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
      console.log('Running migration: Ensuring customers table exists');
      // Table is created by CREATE_TABLES_SQL with IF NOT EXISTS, so this is safe
    }

    // Migration from version 2 to 3: Add color_order column
    if (fromVersion < 3) {
      console.log('Running migration: Adding color_order to stand_items');

      const tableInfo = await this.db.getAllAsync<any>('PRAGMA table_info(stand_items)');
      const columnNames = tableInfo.map((col: any) => col.name);

      if (!columnNames.includes('color_order')) {
        await this.db.execAsync('ALTER TABLE stand_items ADD COLUMN color_order INTEGER');
      }
    }

    // Migration from version 3 to 4: Ensure color_order exists (for databases that skipped migration)
    if (fromVersion < 4) {
      console.log('Running migration: Verifying color_order column exists');

      const tableInfo = await this.db.getAllAsync<any>('PRAGMA table_info(stand_items)');
      const columnNames = tableInfo.map((col: any) => col.name);

      if (!columnNames.includes('color_order')) {
        console.log('Adding missing color_order column');
        await this.db.execAsync('ALTER TABLE stand_items ADD COLUMN color_order INTEGER');
      }
    }

    // Migration from version 4 to 5: Add stand-level color header mode config
    if (fromVersion < 5) {
      console.log('Running migration: Adding color_headers_mode to stands');

      const tableInfo = await this.db.getAllAsync<any>('PRAGMA table_info(stands)');
      const columnNames = tableInfo.map((col: any) => col.name);

      if (!columnNames.includes('color_headers_mode')) {
        await this.db.execAsync(
          "ALTER TABLE stands ADD COLUMN color_headers_mode TEXT NOT NULL DEFAULT 'per_sheet'"
        );
      }
    }

    // Update version
    await this.db.execAsync('DELETE FROM db_version WHERE id = 1');
    await this.db.runAsync('INSERT INTO db_version (id, version) VALUES (?, ?)', [
      1,
      this.DB_VERSION,
    ]);

    console.log(`Migration complete. Database now at version ${this.DB_VERSION}`);
  }

  // Stand operations
  async getAllStands(): Promise<Stand[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAllAsync<Stand>('SELECT * FROM stands ORDER BY order_index');
  }

  async getStandById(id: number): Promise<Stand | null> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getFirstAsync<Stand>('SELECT * FROM stands WHERE id = ?', [id]);
  }

  async getStandByName(name: string): Promise<Stand | null> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getFirstAsync<Stand>('SELECT * FROM stands WHERE name = ?', [name]);
  }

  // Stand items operations
  async getStandItems(standId: number): Promise<StandItem[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAllAsync<StandItem>(
      'SELECT * FROM stand_items WHERE stand_id = ? ORDER BY row_index, col_index',
      [standId]
    );
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
  }

  // Shelf items operations
  async getAllShelfItems(): Promise<ShelfItem[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAllAsync<ShelfItem>('SELECT * FROM shelf_items ORDER BY order_index');
  }

  async updateShelfItem(id: number, name: string, imagePath: string | null): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('UPDATE shelf_items SET name = ?, image_path = ? WHERE id = ?', [
      name,
      imagePath,
      id,
    ]);
  }

  // Import operations
  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('DELETE FROM stand_items');
    await this.db.runAsync('DELETE FROM stands');
    await this.db.runAsync('DELETE FROM shelf_items');
    await this.db.runAsync('DELETE FROM customers');
  }

  // Customer operations
  async getAllCustomers(): Promise<Customer[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAllAsync<Customer>('SELECT * FROM customers ORDER BY order_index ASC');
  }

  async importCustomers(customers: Omit<Customer, 'id'>[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    for (const customer of customers) {
      // Use INSERT OR IGNORE to skip duplicates based on UNIQUE constraint
      await this.db.runAsync('INSERT OR IGNORE INTO customers (name, order_index) VALUES (?, ?)', [
        customer.name,
        customer.order_index,
      ]);
    }
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
  }

  async updateStandColorHeadersModeByName(name: string, mode: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync('UPDATE stands SET color_headers_mode = ? WHERE name = ?', [mode, name]);
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
  }
}

export const db = new DatabaseService();
