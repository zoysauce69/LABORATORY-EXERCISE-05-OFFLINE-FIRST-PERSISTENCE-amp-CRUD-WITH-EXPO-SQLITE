import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  addProduct,
  deleteProduct,
  initDatabase,
  Product,
  searchProducts,
} from '@/services/db';

export default function SQLitePOSScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('General');

  const loadData = (query = '') => {
    const rows = searchProducts(query);
    setProducts(rows);
  };

  useEffect(() => {
    initDatabase();
    // Hydration from AsyncStorage-backed SQLite: the one place a setState in an
    // effect body is correct.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  const handleAddProduct = () => {
    if (!name || !price || !stock) {
      Alert.alert('Validation Error', 'Please fill in all product fields.');
      return;
    }
    const parsedPrice = Number.parseFloat(price);
    const parsedStock = Number.parseInt(stock, 10);
    if (Number.isNaN(parsedPrice) || Number.isNaN(parsedStock)) {
      Alert.alert('Validation Error', 'Price and stock must be valid numbers.');
      return;
    }
    addProduct(name.trim(), category.trim() || 'General', parsedPrice, parsedStock);
    setName('');
    setPrice('');
    setStock('');
    setCategory('General');
    setModalVisible(false);
    loadData(search);
  };

  const handleDelete = (id: number, prodName: string) => {
    Alert.alert('Delete Confirmation', `Remove ${prodName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteProduct(id);
          loadData(search);
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Product }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemMeta}>
          Cat: {item.category} — Stock: {item.stock} units
        </Text>
      </View>
      <Text style={styles.itemPrice}>₱{item.price.toFixed(2)}</Text>
      <TouchableOpacity
        onPress={() => handleDelete(item.id, item.name)}
        style={styles.delBtn}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${item.name}`}
      >
        <Text style={styles.delBtnText}>🗑</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Inventory Database (SQLite)</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Add Item"
        >
          <Text style={styles.addBtnText}>+ Add Item</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchBar}
        placeholder="Search items by name (SQL LIKE)..."
        value={search}
        onChangeText={(text) => {
          setSearch(text);
          loadData(text);
        }}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {Platform.OS === 'web' ? (
        <View style={styles.webNotice}>
          <Text style={styles.webNoticeText}>
            The web preview has no SQLite database. Open the app in Expo Go on a phone to add,
            search and delete stored products.
          </Text>
        </View>
      ) : null}

      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.empty}>No products found in SQLite database.</Text>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Product Entry</Text>
            <TextInput
              style={styles.input}
              placeholder="Product Name"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Category (e.g. Produce)"
              value={category}
              onChangeText={setCategory}
            />
            <TextInput
              style={styles.input}
              placeholder="Price (PHP)"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />
            <TextInput
              style={styles.input}
              placeholder="Initial Stock"
              keyboardType="numeric"
              value={stock}
              onChangeText={setStock}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleAddProduct}
                accessibilityRole="button"
                accessibilityLabel="Save to SQLite"
              >
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#0E2A35' },
  addBtn: {
    backgroundColor: '#00758F',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  addBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  searchBar: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E6EDF2',
  },
  listContent: { paddingBottom: 20 },
  card: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#F0F4F8',
  },
  cardInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#0E2A35' },
  itemMeta: { fontSize: 11, color: '#475569', marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: 'bold', color: '#0F7B67', marginHorizontal: 10 },
  delBtn: { padding: 6 },
  delBtnText: { fontSize: 18 },
  empty: { textAlign: 'center', color: '#64748B', marginTop: 40 },
  webNotice: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  webNoticeText: { color: '#92400E', fontSize: 12, lineHeight: 17 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    gap: 10,
  },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0E2A35' },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E6EDF2',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalBtns: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 8 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1' },
  saveBtn: { backgroundColor: '#00758F', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  btnText: { fontWeight: '600' },
});
