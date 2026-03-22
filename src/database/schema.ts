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

export interface CustomerGroup {
  id: number;
  name: string;
  order_index: number;
}

export interface CustomerGroupMember {
  group_id: number;
  customer_id: number;
  order_index: number;
}

export interface SavedOrder {
  id: number;
  customer_name: string;
  created_at: string;
  expires_at: string;
  sent_at: string | null;
}

export interface SavedOrderItem {
  id: number;
  order_id: number;
  name: string;
  quantity: number;
  source: string;
  color_number: string | null;
  item_code: string | null;
  color_order: number | null;
  image: string | null;
}

export interface CustomerGroupWithCustomers {
  id: number;
  name: string;
  order_index: number;
  customers: Customer[];
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

  CREATE TABLE IF NOT EXISTS customer_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    order_index INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    order_index INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS customer_group_customers (
    group_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    order_index INTEGER NOT NULL,
    PRIMARY KEY (group_id, customer_id),
    FOREIGN KEY (group_id) REFERENCES customer_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_stand_items_stand_id ON stand_items(stand_id);
  CREATE INDEX IF NOT EXISTS idx_stand_items_position ON stand_items(row_index, col_index);
  CREATE INDEX IF NOT EXISTS idx_shelf_items_order ON shelf_items(order_index);
  CREATE INDEX IF NOT EXISTS idx_customer_groups_order ON customer_groups(order_index);
  CREATE INDEX IF NOT EXISTS idx_customers_order ON customers(order_index);
  CREATE INDEX IF NOT EXISTS idx_customer_group_customers_group ON customer_group_customers(group_id);
  CREATE INDEX IF NOT EXISTS idx_customer_group_customers_customer ON customer_group_customers(customer_id);

  CREATE TABLE IF NOT EXISTS saved_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  );

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

  CREATE INDEX IF NOT EXISTS idx_saved_order_items_order ON saved_order_items(order_id);
  CREATE INDEX IF NOT EXISTS idx_saved_orders_expires ON saved_orders(expires_at);
  CREATE INDEX IF NOT EXISTS idx_saved_orders_created ON saved_orders(created_at);
`;
