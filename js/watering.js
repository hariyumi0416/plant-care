function getSeason(month) {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

function judgeWatering(plant, species, today) {
  if (!plant.lastWatered) {
    return { status: 'unknown', message: '水やり記録がありません' };
  }

  const todayDate = new Date(today);
  const lastWateredDate = new Date(plant.lastWatered);
  const daysElapsed = Math.floor((todayDate - lastWateredDate) / (1000 * 60 * 60 * 24));

  const season = getSeason(todayDate.getMonth() + 1);
  const interval = species.wateringInterval[season];

  if (daysElapsed < interval - 2) {
    const remaining = interval - daysElapsed;
    return { status: 'early', message: 'まだ早い — あと' + remaining + '日待ちましょう' };
  }

  if (daysElapsed <= interval + 2) {
    return { status: 'ok', message: 'そろそろOK（' + daysElapsed + '日経過・推奨' + interval + '日）' };
  }

  return { status: 'late', message: '少し遅れ気味（' + daysElapsed + '日経過・推奨' + interval + '日）' };
}
