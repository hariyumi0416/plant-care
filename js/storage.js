const GROUP_ID_KEY = 'plant-care-group-id';

// 紛らわしい文字(i, l, o, 0, 1)を除いた小文字英数字
function generateGroupId() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let raw = '';
  for (let i = 0; i < 12; i++) {
    raw += chars[bytes[i] % chars.length];
  }
  return raw.slice(0, 4) + '-' + raw.slice(4, 8) + '-' + raw.slice(8, 12);
}

function getCurrentGroupId() {
  let id = localStorage.getItem(GROUP_ID_KEY);
  if (!id) {
    id = generateGroupId();
    localStorage.setItem(GROUP_ID_KEY, id);
  }
  return id;
}

async function joinGroup(inputId) {
  const cleaned = inputId.trim().toLowerCase();
  if (!cleaned) return false;
  localStorage.setItem(GROUP_ID_KEY, cleaned);
  await initStorage();
  return true;
}

// インメモリキャッシュ
let _plants = [];

function _plantsRef() {
  return db.collection('groups').doc(getCurrentGroupId()).collection('plants');
}

// Firestore から植物データを初回ロードしてキャッシュに格納する
async function initStorage() {
  try {
    _plants = [];
    const snapshot = await _plantsRef().get();
    _plants = snapshot.docs.map(function (doc) {
      return Object.assign({ id: doc.id }, doc.data());
    });
  } catch (e) {
    console.error('Firestore からの初回ロードに失敗しました', e);
    alert('データの読み込みに失敗しました。ネットワーク接続を確認してください。');
  }
}

// キャッシュをそのまま返す（同期）
function loadPlants() {
  return _plants.slice();
}

async function loadPlantData() {
  try {
    const response = await fetch('data/plants.json');
    if (!response.ok) throw new Error('plants.json の読み込み失敗');
    return await response.json();
  } catch (e) {
    console.error('plants.json の読み込みに失敗しました', e);
    return [];
  }
}

async function loadTroubleData() {
  try {
    const response = await fetch('data/troubles.json');
    if (!response.ok) throw new Error('troubles.json の読み込み失敗');
    return await response.json();
  } catch (e) {
    console.error('troubles.json の読み込みに失敗しました', e);
    return [];
  }
}

function addPlant(plant) {
  _plants.push(plant);
  _plantsRef().doc(plant.id).set(plant)
    .catch(function (e) { console.error('addPlant の Firestore 書き込みに失敗しました', e); });
}

function recordWatering(plantId, date) {
  const plant = _plants.find(function (p) { return p.id === plantId; });
  if (!plant) return;
  plant.lastWatered = date;
  plant.wateringHistory.push({ date: date, note: '' });
  _plantsRef().doc(plantId).set(plant)
    .catch(function (e) { console.error('recordWatering の Firestore 書き込みに失敗しました', e); });
}

function addWateringRecord(plantId, date) {
  const plant = _plants.find(function (p) { return p.id === plantId; });
  if (!plant) return;
  const alreadyExists = plant.wateringHistory.some(function (e) { return e.date === date; });
  if (alreadyExists) return;
  plant.wateringHistory.push({ date: date, note: '' });
  if (!plant.lastWatered || date > plant.lastWatered) {
    plant.lastWatered = date;
  }
  _plantsRef().doc(plantId).set(plant)
    .catch(function (e) { console.error('addWateringRecord の Firestore 書き込みに失敗しました', e); });
}

function removeWateringRecord(plantId, date) {
  const plant = _plants.find(function (p) { return p.id === plantId; });
  if (!plant) return;
  plant.wateringHistory = plant.wateringHistory.filter(function (e) { return e.date !== date; });
  if (plant.lastWatered === date) {
    if (plant.wateringHistory.length === 0) {
      plant.lastWatered = null;
    } else {
      plant.lastWatered = plant.wateringHistory.reduce(function (max, e) {
        return e.date > max ? e.date : max;
      }, '');
    }
  }
  _plantsRef().doc(plantId).set(plant)
    .catch(function (e) { console.error('removeWateringRecord の Firestore 書き込みに失敗しました', e); });
}

function updatePlant(plantId, updates) {
  const plant = _plants.find(function (p) { return p.id === plantId; });
  if (!plant) return;
  plant.nickname  = updates.nickname;
  plant.species   = updates.species;
  plant.placedAt  = updates.placedAt;
  plant.addedDate = updates.addedDate;
  _plantsRef().doc(plantId).set(plant)
    .catch(function (e) { console.error('updatePlant の Firestore 書き込みに失敗しました', e); });
}

function deletePlant(plantId) {
  _plants = _plants.filter(function (p) { return p.id !== plantId; });
  _plantsRef().doc(plantId).delete()
    .catch(function (e) { console.error('deletePlant の Firestore 書き込みに失敗しました', e); });
}

function exportData() {
  const plants = loadPlants();
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString().split('T')[0],
    plants: plants
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plant-care-backup-' + payload.exportedAt + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

async function importData(jsonText) {
  try {
    const data = JSON.parse(jsonText);
    if (!Array.isArray(data.plants)) {
      alert('ファイルの形式が正しくありません。plant-care のバックアップファイルを選んでください。');
      return false;
    }

    // 既存のドキュメントをすべて削除
    const existing = await _plantsRef().get();
    const deletePromises = existing.docs.map(function (doc) { return doc.ref.delete(); });
    await Promise.all(deletePromises);

    // 新しいデータを書き込み
    const setPromises = data.plants.map(function (plant) {
      return _plantsRef().doc(plant.id).set(plant);
    });
    await Promise.all(setPromises);

    // キャッシュを更新
    _plants = data.plants.slice();
    return true;
  } catch (e) {
    console.error('インポートに失敗しました', e);
    alert('ファイルの読み込みに失敗しました。ファイルが壊れていないか確認してください。');
    return false;
  }
}
