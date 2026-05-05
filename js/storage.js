const STORAGE_KEY_PLANTS = 'plant-care-plants';

function loadPlants() {
  try {
    const json = localStorage.getItem(STORAGE_KEY_PLANTS);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    console.error('植物データの読み込みに失敗しました', e);
    return [];
  }
}

function savePlants(plants) {
  try {
    localStorage.setItem(STORAGE_KEY_PLANTS, JSON.stringify(plants));
  } catch (e) {
    console.error('植物データの保存に失敗しました', e);
    alert('データの保存に失敗しました。ストレージの空き容量を確認してください。');
  }
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
  const plants = loadPlants();
  plants.push(plant);
  savePlants(plants);
}

function recordWatering(plantId, date) {
  const plants = loadPlants();
  const plant = plants.find(function (p) { return p.id === plantId; });
  if (!plant) return;
  plant.lastWatered = date;
  plant.wateringHistory.push({ date: date, note: '' });
  savePlants(plants);
}

function addWateringRecord(plantId, date) {
  const plants = loadPlants();
  const plant = plants.find(function (p) { return p.id === plantId; });
  if (!plant) return;
  const alreadyExists = plant.wateringHistory.some(function (e) { return e.date === date; });
  if (alreadyExists) return;
  plant.wateringHistory.push({ date: date, note: '' });
  if (!plant.lastWatered || date > plant.lastWatered) {
    plant.lastWatered = date;
  }
  savePlants(plants);
}

function removeWateringRecord(plantId, date) {
  const plants = loadPlants();
  const plant = plants.find(function (p) { return p.id === plantId; });
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
  savePlants(plants);
}

function updatePlant(plantId, updates) {
  const plants = loadPlants();
  const plant = plants.find(function (p) { return p.id === plantId; });
  if (!plant) return;
  plant.nickname  = updates.nickname;
  plant.species   = updates.species;
  plant.placedAt  = updates.placedAt;
  plant.addedDate = updates.addedDate;
  savePlants(plants);
}

function deletePlant(plantId) {
  const plants = loadPlants();
  savePlants(plants.filter(function (p) { return p.id !== plantId; }));
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

function importData(jsonText) {
  try {
    const data = JSON.parse(jsonText);
    if (!Array.isArray(data.plants)) {
      alert('ファイルの形式が正しくありません。plant-care のバックアップファイルを選んでください。');
      return false;
    }
    savePlants(data.plants);
    return true;
  } catch (e) {
    console.error('インポートに失敗しました', e);
    alert('ファイルの読み込みに失敗しました。ファイルが壊れていないか確認してください。');
    return false;
  }
}
