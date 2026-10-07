DAVAO ORIENTAL STATE UNIVERSITY
Faculty of Computing, Engineering, and Technology | Department of Information Technology
ITMSD 1 — FUNDAMENTALS OF MOBILE DESIGN AND TOOLS (AY 2026-2027 | 1ST SEMESTER)
LABORATORY EXERCISE 05: OFFLINE-FIRST PERSISTENCE & CRUD WITH EXPO SQLITE
(Transforming Figma MCP Prototypes into Relational Embedded Mobile Databases)

ENGINEERING CONTEXT: In Laboratory Exercise 04 (Figma MCP + OpenCode), you built a high-fidelity visual layout for a Mobile POS / Inventory app with static dummy arrays. In a real-world commercial mobile application (such as retail checkouts, warehouses, or field sales), relying on static memory arrays causes all edits to vanish on reload, while relying exclusively on the cloud fails when network connectivity is lost. In this exercise, you will equip your Figma mobile application with an embedded relational database engine using modern Expo SQLite (expo-sqlite). You will implement full offline-first CRUD (Create, Read, Update, Delete) operations, SQL indexing, and database durability that persists permanently across device reboots and Airplane Mode.
1. Learning Objectives
After completing this laboratory exercise, students will be able to:
•  CLO 2.1: Configure and initialize an embedded SQLite relational database in React Native using modern expo-sqlite.
•  CLO 2.2: Execute DDL statements (CREATE TABLE, PRAGMA) to enforce relational schemas, autoincrement primary keys, and data integrity.
•  CLO 2.3: Implement database auto-seeding on initial application launch to populate mock inventory records seamlessly.
•  CLO 2.4: Execute parameterized SQL CRUD operations (INSERT, SELECT, UPDATE, DELETE) avoiding SQL injection vulnerabilities.
•  CLO 2.5: Integrate SQL-level filtering (WHERE title LIKE ?) into a virtualized <FlatList> search interface with instant sub-millisecond query performance.
•  CLO 2.6: Validate offline data durability by verifying data persistence across application restarts and Airplane Mode.
2. Step-by-Step Implementation Guide
Step 1: Install expo-sqlite in Your Lab 04 Expo Project
Open your existing Expo terminal inside your Lab 04 project folder (e.g., `suppliers-app` or POS project) and install the official SQLite module:
  npx expo install expo-sqlite
Verify that `expo-sqlite` is added to your `package.json` dependencies.
Step 2: Create the Database Service Module (src/services/db.js)
Create a modular database service file. Use modern synchronous/asynchronous methods:
• Initialize database: `const db = SQLite.openDatabaseSync('pos_inventory.db');`
• Enable WAL mode (Write-Ahead Logging) for speed: `db.execSync('PRAGMA journal_mode = WAL;');`
• Create table: `CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT NOT NULL, price REAL NOT NULL, stock INTEGER NOT NULL);`
• Implement auto-seeding: If `SELECT COUNT(*) FROM products` is 0, insert 4–6 initial items so the screen is never blank on fresh installs.
Step 3: Connect Screen State to SQLite Queries
In your inventory/POS screen (e.g. `HomeScreen.js` or `InventoryScreen.js`):
• Replace static dummy arrays with dynamic state: `const [products, setProducts] = useState([]);`
• Write a reusable `loadProducts()` function that runs `db.getAllSync('SELECT * FROM products ORDER BY id DESC')` and updates state.
• Call `loadProducts()` inside `useEffect` on initial mount.
Step 4: Implement SQL Search Filtering
Connect the search bar generated from your Figma layout. When the user types:
• Execute parameterized query: `db.getAllSync('SELECT * FROM products WHERE name LIKE ? ORDER BY name ASC', ['%' + search + '%'])`
• Update `products` state dynamically to trigger a snappy virtualized `<FlatList>` re-render.
Step 5: Implement Create & Delete (CRUD Actions)
• Add Product: Create an 'Add Item' button opening a simple Modal or input form. On submit, execute `db.runSync('INSERT INTO products (name, category, price, stock) VALUES (?, ?, ?, ?)', [name, category, price, stock]);` and reload the list.
• Delete Product: Add a trash/delete icon on each list card. On press, prompt confirmation and execute `db.runSync('DELETE FROM products WHERE id = ?', [id]);`.
• Update Stock (Optional/Bonus): Add a '+ / -' button to increment or decrement stock: `db.runSync('UPDATE products SET stock = stock - 1 WHERE id = ?', [id]);`.
Step 6: Test Offline Durability & Airplane Mode
Add 2 new products and delete 1 existing product. Enable Airplane mode on your physical phone, fully swipe away/kill the Expo Go application, and relaunch Expo Go. Confirm that all records remain completely preserved.
3. Reference Code Blueprint (src/services/db.js & SQLitePOSScreen.js)
// --- File 1: src/services/db.js ---
import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('pos_inventory.db');

export function initDatabase() {
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

  // Auto-seed initial data from Figma mockup if database is empty
  const countRow = db.getFirstSync('SELECT COUNT(*) as count FROM products;');
  if (countRow.count === 0) {
    db.runSync(
      'INSERT INTO products (name, category, price, stock) VALUES (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?);',
      [
        'Fresh Davao Bananas', 'Produce', 65.00, 48,
        'Mati Brown Rice (5kg)', 'Grains', 280.00, 25,
        'Coconut Virgin Oil', 'Beverages', 150.00, 14
      ]
    );
  }
}

// --- File 2: src/screens/SQLitePOSScreen.js ---
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView, View, Text, FlatList, TextInput,
  TouchableOpacity, Modal, StyleSheet, Alert
} from 'react-native';
import { db, initDatabase } from '../services/db';

export default function SQLitePOSScreen() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');

  const loadData = (query = '') => {
    if (query.trim() === '') {
      const allRows = db.getAllSync('SELECT * FROM products ORDER BY id DESC;');
      setProducts(allRows);
    } else {
      const filtered = db.getAllSync(
        'SELECT * FROM products WHERE name LIKE ? ORDER BY name ASC;',
        [`%${query}%`]
      );
      setProducts(filtered);
    }
  };

  useEffect(() => {
    initDatabase();
    loadData();
  }, []);

  const handleAddProduct = () => {
    if (!name || !price || !stock) {
      Alert.alert('Validation Error', 'Please fill in all product fields.');
      return;
    }
    db.runSync(
      'INSERT INTO products (name, category, price, stock) VALUES (?, ?, ?, ?);',
      [name, 'General', parseFloat(price), parseInt(stock, 10)]
    );
    setName(''); setPrice(''); setStock('');
    setModalVisible(false);
    loadData(search);
  };

  const handleDelete = (id, prodName) => {
    Alert.alert('Delete Confirmation', `Remove ${prodName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          db.runSync('DELETE FROM products WHERE id = ?;', [id]);
          loadData(search);
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Inventory Database (SQLite)</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>+ Add Item</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchBar}
        placeholder="🔍 Search items by name (SQL LIKE)..."
        value={search}
        onChangeText={(text) => { setSearch(text); loadData(text); }}
      />

      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>Cat: {item.category} • Stock: {item.stock} units</Text>
            </View>
            <Text style={styles.itemPrice}>₱{item.price.toFixed(2)}</Text>
            <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={styles.delBtn}>
              <Text style={styles.delBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No products found in SQLite database.</Text>
        }
      />

      {/* Modal for adding product */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Product Entry</Text>
            <TextInput style={styles.input} placeholder="Product Name" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Price (PHP)" keyboardType="numeric" value={price} onChangeText={setPrice} />
            <TextInput style={styles.input} placeholder="Initial Stock" keyboardType="numeric" value={stock} onChangeText={setStock} />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddProduct}>
                <Text style={[styles.btnText, { color: '#FFF' }]}>Save to SQLite</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#0E2A35' },
  addBtn: { backgroundColor: '#00758F', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 6 },
  addBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  searchBar: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, marginBottom: 12 },
  card: { flexDirection: 'row', backgroundColor: '#FFF', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  itemName: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  itemMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  itemPrice: { fontSize: 15, fontWeight: 'bold', color: '#00758F', marginRight: 12 },
  delBtn: { backgroundColor: '#FEE2E2', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 4 },
  delBtnText: { color: '#DC2626', fontWeight: 'bold', fontSize: 13 },
  empty: { textAlign: 'center', color: '#64748B', marginTop: 30 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0E2A35', marginBottom: 14 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 6, padding: 10, marginBottom: 10 },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  cancelBtn: { padding: 10 },
  saveBtn: { backgroundColor: '#00758F', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6 },
  btnText: { fontWeight: 'bold', color: '#64748B' }
});

4. What to Submit (2 Public Links via Google Classroom)
#
Deliverable
Requirement / Verification
1
Public GitHub Repository Link
Public repository showing clean git commits; contains the refactored code connecting the Figma app to the local SQLite database module.
2
Demo Video Link (2–4 minutes)
YouTube (Unlisted) or Google Drive (Anyone with link); must show app running on physical phone via Expo Go, adding a product to SQLite, searching by keyword, deleting a product, killing the app in Airplane mode and reopening with data 100% preserved, with voiceover stating student name and section.

Submission Form:
1. GITHUB REPOSITORY LINK:
https://github.com/your-username/your-sqlite-pos-app
2. DEMO VIDEO LINK (Unlisted):
https://youtu.be/... OR https://drive.google.com/...

5. Grading Rubric (50 Points Total)
Evaluation Criteria
Full Points
Zero / Deficient
Pts
SQLite Database Setup & Seeding
Successfully initializes SQLite with openDatabaseSync / execSync; creates structured table; auto-seeds initial inventory on first launch.
Fails to initialize database; syntax error in SQL schema; no seeding mechanism.
15
Dynamic Read & SQL-Level Search
Reads records via SQL into <FlatList>; search bar queries SQLite with parameterized 'LIKE ?' clauses in real-time.
Static array still used; search bar is non-functional or causes unhandled SQL exceptions.
15
Create & Delete Operations (CRUD)
User can add new items to SQLite via input modal; user can delete existing rows with confirmation; UI immediately updates.
Add or delete operation missing; changes not persisted in SQLite; crashes on insert.
10
Offline Durability & Persistence
Data survives full application termination and device restarts; tested and proven fully operational in Airplane Mode.
Data resets to empty or initial state upon app restart; requires continuous internet.
5
Demo Video & Git Repository Hygiene
2–4 min clear video showing live Expo Go demo; stated student name and section; public working GitHub repository link.
Private links; broken links; video exceeds 5 min or missing voiceover/name.
5

Submission Policy: Late submissions: -5 points/day up to 3 days maximum. Broken or private links at checking time = 0 for that criterion. Plagiarized or duplicate repositories = 0 automatically.
6. Google Classroom Announcement Text (Ready to Copy & Paste)
📢 ITMSD 1 — LABORATORY EXERCISE 05: OFFLINE-FIRST PERSISTENCE & CRUD WITH EXPO SQLITE

Transform your Figma POS / Suppliers mobile prototype into a fully functional, offline-first application with an embedded relational database engine!

Requirements:
1. Install expo-sqlite and initialize a local relational SQLite database (`pos_inventory.db`).
2. Create table schema (products / items) with autoincrement ID, and auto-seed sample records on initial launch.
3. Render the records dynamically into <FlatList> using SQLite SELECT queries.
4. Implement real-time search filtering using parameterized SQL 'LIKE ?' clauses.
5. Implement Create (Add Item Modal) and Delete (Remove item) operations that immediately mutate SQLite.
6. Verify offline durability: Data must persist after completely killing Expo Go in Airplane Mode!

Deliverables to Submit (2 Links):
🔗 1. PUBLIC GITHUB REPO LINK: Containing the refactored code and database services.
🎥 2. DEMO VIDEO LINK (2–4 min, YouTube Unlisted or Google Drive Anyone-with-link): Showing live Expo Go demonstration on a physical phone, adding a product, searching, deleting, and showing persistence after app relaunch in Airplane Mode.

Total: 50 Points. Always test both links in an Incognito window before turning in!

Checklist Before Turn In:
[ ] GitHub repo is set to Public and contains recent commits
[ ] Video opens without login in an Incognito window
[ ] Auto-seeding, Add Item, SQL search, and Delete are clearly demonstrated
[ ] Durability across full app relaunch in Airplane mode is proven on video
[ ] Student Name and Section stated in the video voiceover
[ ] Both links pasted in the Google Classroom submission field
