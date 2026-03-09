export interface Stand {
  id: number;
  name: string;
  subtitle: string;
  icon: string;
  color: string;
  order_index: number;
  color_headers_mode?: string | null;
}

export interface StandItem {
  id: number;
  stand_id: number;
  name: string;
  color_number: string | null;
  row_index: number;
  col_index: number;
  item_code: string | null;
  image_path: string | null;
  color_order: number | null;
}

export interface ShelfItem {
  id: number;
  name: string;
  image_path: string | null;
  order_index: number;
}

export interface Customer {
  id: number;
  name: string;
  order_index: number;
}

export const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS stands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    color_headers_mode TEXT NOT NULL DEFAULT 'per_sheet'
  );

  CREATE TABLE IF NOT EXISTS stand_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stand_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    color_number TEXT,
    row_index INTEGER NOT NULL,
    col_index INTEGER NOT NULL,
    item_code TEXT,
    image_path TEXT,
    color_order INTEGER,
    FOREIGN KEY (stand_id) REFERENCES stands(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS shelf_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    image_path TEXT,
    order_index INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    order_index INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_stand_items_stand_id ON stand_items(stand_id);
  CREATE INDEX IF NOT EXISTS idx_stand_items_position ON stand_items(row_index, col_index);
  CREATE INDEX IF NOT EXISTS idx_shelf_items_order ON shelf_items(order_index);
  CREATE INDEX IF NOT EXISTS idx_customers_order ON customers(order_index);
`;
