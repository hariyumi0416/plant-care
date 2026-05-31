let plantData = [];
let userPlants = [];
let troubleData = [];
let currentTroubledPlant = null;
let editingPlantId = null;
const calendarDisplayMonths = new Map(); // plant.id → { year, month }（month は 0-indexed）

document.addEventListener('DOMContentLoaded', async function () {
  console.log('plant-care 起動');

  const today = new Date().toISOString().split('T')[0];

  // ===== イベントリスナーをすべて先に登録（await より前）=====

  // 設定ボタン
  document.getElementById('btn-settings').addEventListener('click', function () {
    showSettingsScreen(function () {
      userPlants = loadPlants();
      renderPlantList(userPlants, plantData, today, calendarDisplayMonths);
    });
  });

  // 植物追加ボタン
  document.getElementById('btn-add-plant').addEventListener('click', function () {
    document.getElementById('input-added-date').value = today;
    showScreen('screen-add');
  });

  document.getElementById('btn-back-from-add').addEventListener('click', function () {
    editingPlantId = null;
    document.getElementById('screen-add-title').textContent = '植物を追加';
    document.getElementById('btn-submit-plant').textContent = '登録する';
    showScreen('screen-list');
  });

  document.getElementById('form-add-plant').addEventListener('submit', function (event) {
    event.preventDefault();

    if (editingPlantId) {
      updatePlant(editingPlantId, {
        nickname:  document.getElementById('input-nickname').value.trim(),
        species:   document.getElementById('input-species').value,
        placedAt:  document.getElementById('input-placed-at').value.trim(),
        addedDate: document.getElementById('input-added-date').value,
      });
      editingPlantId = null;
      document.getElementById('screen-add-title').textContent = '植物を追加';
      document.getElementById('btn-submit-plant').textContent = '登録する';
    } else {
      const plant = {
        id: 'plant-' + Date.now(),
        nickname: document.getElementById('input-nickname').value.trim(),
        species: document.getElementById('input-species').value,
        placedAt: document.getElementById('input-placed-at').value.trim(),
        addedDate: document.getElementById('input-added-date').value,
        lastWatered: null,
        wateringHistory: [],
        photos: [],
        memo: ''
      };
      addPlant(plant);
    }

    userPlants = loadPlants();
    renderPlantList(userPlants, plantData, today, calendarDisplayMonths);

    document.getElementById('form-add-plant').reset();
    showScreen('screen-list');
  });

  // 植物カードのボタン（イベント委譲）
  document.getElementById('plant-list').addEventListener('click', function (event) {
    if (event.target.classList.contains('btn-edit')) {
      const plantId = event.target.dataset.plantId;
      const plant = userPlants.find(function (p) { return p.id === plantId; });
      editingPlantId = plantId;

      document.getElementById('input-species').value    = plant.species;
      document.getElementById('input-nickname').value   = plant.nickname;
      document.getElementById('input-placed-at').value  = plant.placedAt;
      document.getElementById('input-added-date').value = plant.addedDate;

      document.getElementById('screen-add-title').textContent = '植物を編集';
      document.getElementById('btn-submit-plant').textContent = '更新する';
      showScreen('screen-add');
      return;
    }

    if (event.target.classList.contains('btn-watering')) {
      const plantId = event.target.dataset.plantId;
      recordWatering(plantId, today);
      userPlants = loadPlants();
      renderPlantList(userPlants, plantData, today, calendarDisplayMonths);
      return;
    }

    if (event.target.classList.contains('btn-delete')) {
      const plantId = event.target.dataset.plantId;
      const nickname = event.target.dataset.nickname;
      const confirmed = confirm('「' + nickname + '」を削除しますか？\nこの操作は元に戻せません。');
      if (!confirmed) return;
      deletePlant(plantId);
      calendarDisplayMonths.delete(plantId);
      userPlants = loadPlants();
      renderPlantList(userPlants, plantData, today, calendarDisplayMonths);
      return;
    }

    if (event.target.classList.contains('btn-calendar-prev') ||
        event.target.classList.contains('btn-calendar-next')) {
      const plantId = event.target.dataset.plantId;
      const todayParts = today.split('-');
      const current = calendarDisplayMonths.get(plantId) || {
        year: parseInt(todayParts[0]),
        month: parseInt(todayParts[1]) - 1
      };
      let { year, month } = current;
      if (event.target.classList.contains('btn-calendar-prev')) {
        month--;
        if (month < 0) { month = 11; year--; }
      } else {
        month++;
        if (month > 11) { month = 0; year++; }
      }
      calendarDisplayMonths.set(plantId, { year, month });
      renderPlantList(userPlants, plantData, today, calendarDisplayMonths);
      return;
    }

    const calendarCell = event.target.closest('.calendar-cell');
    if (calendarCell && !calendarCell.classList.contains('calendar-cell--empty') && !calendarCell.classList.contains('calendar-cell--future')) {
      const plantId = calendarCell.dataset.plantId;
      const date = calendarCell.dataset.date;
      const isWatered = calendarCell.dataset.watered === 'true';
      const parts = date.split('-');
      const month = parseInt(parts[1]);
      const day = parseInt(parts[2]);
      if (isWatered) {
        if (!confirm(month + '月' + day + '日の水やり記録を削除しますか？')) return;
        removeWateringRecord(plantId, date);
      } else {
        if (!confirm(month + '月' + day + '日に水やり記録を追加しますか？')) return;
        addWateringRecord(plantId, date);
      }
      userPlants = loadPlants();
      renderPlantList(userPlants, plantData, today, calendarDisplayMonths);
      return;
    }

    if (event.target.classList.contains('btn-trouble')) {
      const plantId = event.target.dataset.plantId;
      currentTroubledPlant = userPlants.find(function (p) { return p.id === plantId; });
      const species = plantData.find(function (p) { return p.id === currentTroubledPlant.species; });

      document.getElementById('trouble-plant-name').textContent = currentTroubledPlant.nickname;
      document.getElementById('trouble-symptom-list').classList.remove('hidden');
      document.getElementById('trouble-detail').classList.add('hidden');
      renderTroubleSymptomList(species, troubleData);
      showScreen('screen-trouble');
    }
  });

  // トラブル相談画面
  document.getElementById('btn-back-from-trouble').addEventListener('click', function () {
    showScreen('screen-list');
  });

  document.getElementById('trouble-symptom-list').addEventListener('click', function (event) {
    if (!event.target.classList.contains('btn-symptom')) return;
    const troubleId = event.target.dataset.troubleId;
    const trouble = troubleData.find(function (t) { return t.id === troubleId; });
    if (trouble) renderTroubleDetail(trouble, event.target);
  });

  // エクスポート
  document.getElementById('btn-export').addEventListener('click', function () {
    exportData();
  });

  // インポート
  document.getElementById('input-import').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const confirmed = confirm('現在のデータを上書きします。よろしいですか？');
    if (!confirmed) {
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async function (e) {
      const success = await importData(e.target.result);
      if (success) {
        userPlants = loadPlants();
        calendarDisplayMonths.clear();
        renderPlantList(userPlants, plantData, today, calendarDisplayMonths);
        alert('復元が完了しました。');
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  });

  // ===== 非同期初期化（イベントリスナー登録後に実行）=====
  plantData = await loadPlantData();
  troubleData = await loadTroubleData();
  await initStorage();
  userPlants = loadPlants();

  renderSpeciesSelect(plantData);
  renderPlantList(userPlants, plantData, today, calendarDisplayMonths);
  showScreen('screen-list');
});
