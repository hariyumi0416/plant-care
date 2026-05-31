function formatDateJa(dateStr) {
  if (!dateStr) return 'まだありません';
  const parts = dateStr.split('-');
  return parts[0] + '年' + parseInt(parts[1]) + '月' + parseInt(parts[2]) + '日';
}

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(function (screen) {
    screen.classList.add('hidden');
  });
  document.getElementById(screenId).classList.remove('hidden');
}

function renderPlantList(userPlants, plantData, today, calendarDisplayMonths) {
  const listEl = document.getElementById('plant-list');
  const emptyEl = document.getElementById('plant-list-empty');

  listEl.innerHTML = '';

  if (userPlants.length === 0) {
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');

  userPlants.forEach(function (plant) {
    const species = plantData.find(function (p) { return p.id === plant.species; });
    const speciesName = species ? species.displayName : plant.species;

    const card = document.createElement('div');
    card.className = 'plant-card';

    const nameRow = document.createElement('div');
    nameRow.className = 'plant-card-name-row';

    const nameEl = document.createElement('div');
    nameEl.className = 'plant-card-name';
    nameEl.textContent = plant.nickname;

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-edit';
    editBtn.textContent = '✏️ 編集';
    editBtn.dataset.plantId = plant.id;

    nameRow.appendChild(nameEl);
    nameRow.appendChild(editBtn);

    const speciesEl = document.createElement('div');
    speciesEl.className = 'plant-card-detail';
    speciesEl.textContent = '種類: ' + speciesName;

    const placeEl = document.createElement('div');
    placeEl.className = 'plant-card-detail';
    placeEl.textContent = '置き場所: ' + plant.placedAt;

    const dateEl = document.createElement('div');
    dateEl.className = 'plant-card-detail';
    dateEl.textContent = '迎えた日: ' + formatDateJa(plant.addedDate);

    card.appendChild(nameRow);
    card.appendChild(speciesEl);
    card.appendChild(placeEl);
    card.appendChild(dateEl);

    if (species) {
      const result = judgeWatering(plant, species, today);

      const divider = document.createElement('hr');
      divider.className = 'plant-card-divider';

      const statusEl = document.createElement('div');
      statusEl.className = 'watering-status watering-status--' + result.status;
      statusEl.textContent = '💧 ' + result.message;

      const waterBtn = document.createElement('button');
      waterBtn.className = 'btn-watering';
      waterBtn.textContent = '水やりした';
      waterBtn.dataset.plantId = plant.id;

      const noteEl = document.createElement('p');
      noteEl.className = 'watering-note';
      noteEl.textContent = '※ 最終判断は土の乾き具合を確認してください';

      const troubleBtn = document.createElement('button');
      troubleBtn.className = 'btn-trouble';
      troubleBtn.textContent = '困ったときは';
      troubleBtn.dataset.plantId = plant.id;

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-delete';
      deleteBtn.textContent = 'この植物を削除';
      deleteBtn.dataset.plantId = plant.id;
      deleteBtn.dataset.nickname = plant.nickname;

      const displayState = (calendarDisplayMonths || new Map()).get(plant.id);
      const todayParts = today.split('-');
      const displayYear  = displayState ? displayState.year  : parseInt(todayParts[0]);
      const displayMonth = displayState ? displayState.month : parseInt(todayParts[1]) - 1;

      const lastWateredEl = document.createElement('div');
      lastWateredEl.className = 'plant-card-detail';
      lastWateredEl.textContent = '最後の水やり: ' + formatDateJa(plant.lastWatered);

      card.appendChild(divider);
      card.appendChild(lastWateredEl);
      card.appendChild(statusEl);
      card.appendChild(waterBtn);
      card.appendChild(noteEl);
      card.appendChild(renderWateringCalendar(plant, today, displayYear, displayMonth));
      card.appendChild(troubleBtn);
      card.appendChild(deleteBtn);
    }

    listEl.appendChild(card);
  });
}

function renderWateringCalendar(plant, today, displayYear, displayMonth) {
  const todayParts = today.split('-');
  const todayY = parseInt(todayParts[0]);
  const todayM = parseInt(todayParts[1]) - 1; // 0-indexed
  const todayD = parseInt(todayParts[2]);

  // 表示月の水やり日を Set に変換
  const wateredDays = new Set();
  (plant.wateringHistory || []).forEach(function (entry) {
    const parts = entry.date.split('-');
    if (parseInt(parts[0]) === displayYear && parseInt(parts[1]) - 1 === displayMonth) {
      wateredDays.add(parseInt(parts[2]));
    }
  });

  // 月の情報
  const firstWeekday = new Date(displayYear, displayMonth, 1).getDay(); // 0=日曜
  const lastDay = new Date(displayYear, displayMonth + 1, 0).getDate();

  const container = document.createElement('div');
  container.className = 'plant-calendar';

  // タイトル行（前月ボタン・タイトル・翌月ボタン）
  const titleRow = document.createElement('div');
  titleRow.className = 'calendar-nav';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'btn-calendar-nav btn-calendar-prev';
  prevBtn.textContent = '‹';
  prevBtn.dataset.plantId = plant.id;

  const titleEl = document.createElement('div');
  titleEl.className = 'calendar-title';
  titleEl.textContent = displayYear + '年' + (displayMonth + 1) + '月';

  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn-calendar-nav btn-calendar-next';
  nextBtn.textContent = '›';
  nextBtn.dataset.plantId = plant.id;

  titleRow.appendChild(prevBtn);
  titleRow.appendChild(titleEl);
  titleRow.appendChild(nextBtn);
  container.appendChild(titleRow);

  const grid = document.createElement('div');
  grid.className = 'calendar-grid';

  // 曜日ラベル
  ['日', '月', '火', '水', '木', '金', '土'].forEach(function (label) {
    const el = document.createElement('div');
    el.className = 'calendar-day-label';
    el.textContent = label;
    grid.appendChild(el);
  });

  // 先頭の空セル
  for (let i = 0; i < firstWeekday; i++) {
    const el = document.createElement('div');
    el.className = 'calendar-cell calendar-cell--empty';
    grid.appendChild(el);
  }

  // 日付セル
  const monthStr = String(displayMonth + 1).padStart(2, '0');
  for (let day = 1; day <= lastDay; day++) {
    const dayStr = String(day).padStart(2, '0');
    const dateStr = displayYear + '-' + monthStr + '-' + dayStr;
    const isWatered = wateredDays.has(day);
    const isFuture = (displayYear > todayY) ||
                     (displayYear === todayY && displayMonth > todayM) ||
                     (displayYear === todayY && displayMonth === todayM && day > todayD);
    const isToday = (displayYear === todayY && displayMonth === todayM && day === todayD);

    const cell = document.createElement('div');
    cell.className = 'calendar-cell';
    if (isToday) cell.classList.add('calendar-cell--today');
    if (isFuture) cell.classList.add('calendar-cell--future');
    cell.dataset.plantId = plant.id;
    cell.dataset.date = dateStr;
    cell.dataset.watered = isWatered ? 'true' : 'false';

    const num = document.createElement('span');
    num.className = 'calendar-day-num';
    num.textContent = day;
    cell.appendChild(num);

    if (isWatered) {
      const drop = document.createElement('span');
      drop.className = 'calendar-drop';
      drop.textContent = '💧';
      cell.appendChild(drop);
    }

    grid.appendChild(cell);
  }

  // 末尾の空セル（最終行を埋める）
  const remainder = (firstWeekday + lastDay) % 7;
  if (remainder !== 0) {
    for (let i = remainder; i < 7; i++) {
      const el = document.createElement('div');
      el.className = 'calendar-cell calendar-cell--empty';
      grid.appendChild(el);
    }
  }

  container.appendChild(grid);
  return container;
}

function showSettingsScreen(onJoined) {
  document.getElementById('display-group-id').textContent = getCurrentGroupId();
  document.getElementById('input-join-group-id').value = '';
  document.getElementById('copy-feedback').classList.add('hidden');

  document.getElementById('btn-back-from-settings').onclick = function () {
    showScreen('screen-list');
  };

  document.getElementById('btn-copy-group-id').onclick = function () {
    const groupId = getCurrentGroupId();
    navigator.clipboard.writeText(groupId).then(function () {
      const feedback = document.getElementById('copy-feedback');
      feedback.classList.remove('hidden');
      setTimeout(function () { feedback.classList.add('hidden'); }, 2000);
    }).catch(function (e) {
      console.error('クリップボードへのコピーに失敗しました', e);
    });
  };

  document.getElementById('btn-join-group').onclick = async function () {
    const inputVal = document.getElementById('input-join-group-id').value.trim();
    if (!inputVal) return;

    const currentId = getCurrentGroupId();
    const confirmed = confirm(
      'グループ「' + inputVal + '」に切り替えます。\n' +
      '今表示している植物は見えなくなります。\n' +
      '（現在のグループID: ' + currentId + ' ／ 戻れるよう控えておいてください）\n' +
      'よろしいですか？'
    );
    if (!confirmed) return;

    const ok = await joinGroup(inputVal);
    if (ok) {
      onJoined();
      showScreen('screen-list');
    }
  };

  showScreen('screen-settings');
}

function renderSpeciesSelect(plantData) {
  const select = document.getElementById('input-species');
  plantData.forEach(function (plant) {
    const option = document.createElement('option');
    option.value = plant.id;
    option.textContent = plant.displayName;
    select.appendChild(option);
  });
}

function renderTroubleSymptomList(species, troubleData) {
  const listEl = document.getElementById('trouble-symptom-list');
  listEl.innerHTML = '';

  // commonTroubles の順番で先に並べ、残りを後に続ける
  const priorityIds = species.commonTroubles || [];
  const prioritized = priorityIds
    .map(function (id) { return troubleData.find(function (t) { return t.id === id; }); })
    .filter(Boolean);
  const rest = troubleData.filter(function (t) { return !priorityIds.includes(t.id); });
  const sorted = prioritized.concat(rest);

  sorted.forEach(function (trouble) {
    const btn = document.createElement('button');
    btn.className = 'btn-symptom';
    btn.textContent = trouble.symptom;
    btn.dataset.troubleId = trouble.id;
    listEl.appendChild(btn);
  });
}

function renderTroubleDetail(trouble, selectedBtn) {
  document.getElementById('trouble-detail-symptom').textContent = trouble.symptom;

  const causesEl = document.getElementById('trouble-detail-causes');
  causesEl.innerHTML = '';
  trouble.possibleCauses.forEach(function (cause) {
    const li = document.createElement('li');
    li.textContent = cause;
    causesEl.appendChild(li);
  });

  const actionsEl = document.getElementById('trouble-detail-actions');
  actionsEl.innerHTML = '';
  trouble.actions.forEach(function (action) {
    const li = document.createElement('li');
    li.textContent = action;
    actionsEl.appendChild(li);
  });

  document.querySelectorAll('.btn-symptom').forEach(function (btn) {
    btn.classList.remove('btn-symptom--selected');
  });
  selectedBtn.classList.add('btn-symptom--selected');

  document.getElementById('trouble-detail').classList.remove('hidden');
}
