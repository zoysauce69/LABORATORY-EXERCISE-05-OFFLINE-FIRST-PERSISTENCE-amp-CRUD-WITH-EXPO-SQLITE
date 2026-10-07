import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('roomlink_inventory.db');

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
}

export function initDatabase(): void {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL
    );
  `);

  const countRow = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM products;',
  );
  if (!countRow || countRow.count === 0) {
    db.runSync(
      'INSERT INTO products (name, category, price, stock) VALUES (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?);',
      [
        'Fresh Davao Bananas',
        'Produce',
        65.0,
        48,
        'Mati Brown Rice (5kg)',
        'Grains',
        280.0,
        25,
        'Coconut Virgin Oil',
        'Beverages',
        150.0,
        14,
        'Canned Tuna (180g)',
        'Canned Goods',
        45.0,
        62,
        'Roasted Coffee Beans (500g)',
        'Beverages',
        225.0,
        30,
      ],
    );
  }
}

export function getAllProducts(): Product[] {
  return db.getAllSync<Product>('SELECT * FROM products ORDER BY id DESC;');
}

export function searchProducts(query: string): Product[] {
  if (!query.trim()) {
    return getAllProducts();
  }
  const term = `%${query.trim()}%`;
  return db.getAllSync<Product>(
    'SELECT * FROM products WHERE name LIKE ? ORDER BY name ASC;',
    [term],
  );
}

export function addProduct(
  name: string,
  category: string,
  price: number,
  stock: number,
): void {
  db.runSync(
    'INSERT INTO products (name, category, price, stock) VALUES (?, ?, ?, ?);',
    [name, category, price, stock],
  );
}

export function deleteProduct(id: number): void {
  db.runSync('DELETE FROM products WHERE id = ?;', [id]);
}

export function decrementStock(id: number): void {
  db.runSync('UPDATE products SET stock = stock - 1 WHERE id = ?;', [id]);
}
