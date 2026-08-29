
/**
 * =================================================================
 * SIS 管理画面 - admin-settings.js
 * [役割: 「基本設定」〜「レイアウト関係」タブの読み込み・保存]
 * admin-core.js の後に読み込むこと
 * =================================================================
 */
async function loadSettings1() {
  if (settings1Loading) settings1Loading.style.display = 'block';
  if (settings1Error) settings1Error.style.display = 'none';
  if (settings1Form) settings1Form.style.display = 'none';

  try {
    const result = await callAdminApi('getSettingsPage1');
    if (!result.success) throw new Error(result.message || '設定の取得に失敗しました。');

    // 予約枠の刻み幅（内部はスロット数だが、画面上は分で表示する）
    baseSlotMinutesForConversion = result.baseSlotMinutes || 5;
    if (s1SlotStepMinutes) s1SlotStepMinutes.value = result.displaySlotStepMinutes || 30;

    // 仮予約制度
    const provisional = result.provisionalReservation || {};
    if (s1ProvisionalEnabled) s1ProvisionalEnabled.checked = !!provisional.enabled;
    setRadioValue('s1-provisional-target', provisional.target || 'ALL');
    if (s1ProvisionalTargetMenus) s1ProvisionalTargetMenus.value = (provisional.targetMenus || []).join(',');
    if (s1ProvisionalDeadline) s1ProvisionalDeadline.value = provisional.confirmDeadlineHours || 12;
    setRadioValue('s1-provisional-auto-action', provisional.autoAction || 'NONE');

    // キャンセル・変更の受付締切
    if (s1CancelBuffer) s1CancelBuffer.value = result.cancelBufferHours;
    if (s1ChangeBuffer) s1ChangeBuffer.value = result.changeBufferHours;

    // 予約可能な期間
    if (s1MaxFutureDays) s1MaxFutureDays.value = result.maxFutureDaysToReserve;
    if (s1DisplayDays) s1DisplayDays.value = String(result.displayDays);

    // 受付の基本設定
    if (s1MaxCapacity) s1MaxCapacity.value = result.maxCapacity;
    if (s1HistoryRetention) s1HistoryRetention.value = result.historyRetentionMonths;
    if (s1CancelHistoryRetention) s1CancelHistoryRetention.value = result.cancelHistoryRetentionMonths;
    if (s1CalendarHistoryRetention) s1CalendarHistoryRetention.value = result.calendarHistoryRetentionMonths;
    if (s1BufferMinutes) s1BufferMinutes.value = result.bufferMinutesBeforeReservation;

    settings1Loaded = true;
    if (settings1Form) settings1Form.style.display = 'block';
  } catch (error) {
    console.error('基本設定の取得エラー:', error);
    if (settings1Error) {
      settings1Error.textContent = error.message || '通信エラーが発生しました。時間をおいて再度お試しください。';
      settings1Error.style.display = 'block';
    }
  } finally {
    if (settings1Loading) settings1Loading.style.display = 'none';
  }
}

/**
 * 営業時間の入力行を、日〜土の7行分描画する
 * @param {Object} business - { 曜日番号: [開始時, 閉店時] }
 */
/**
 * 「時」「分」を別々のプルダウンで選ぶ入力欄一式を組み立てる（ブラウザ標準のtime入力は、スクロールで進みすぎて使いにくいため）
 * @param {string} className - この入力欄一式に共通で付けるクラス名（値の取得時に使う）
 * @param {string} timeStr - 初期値（"HH:mm"形式。空文字なら未選択状態）
 * @param {boolean} disabled - 無効状態で表示するか
 * @returns {string} HTML文字列
 */
function buildTimeSelectHtml(className, timeStr, disabled) {
  const [hourVal, minuteVal] = (timeStr || '').split(':');

  let hourOptions = '<option value="">--</option>';
  for (let h = 0; h < 24; h++) {
    const hh = String(h).padStart(2, '0');
    hourOptions += `<option value="${hh}" ${hourVal === hh ? 'selected' : ''}>${hh}</option>`;
  }

  let minuteOptions = '<option value="">--</option>';
  for (let m = 0; m < 60; m += 5) {
    const mm = String(m).padStart(2, '0');
    minuteOptions += `<option value="${mm}" ${minuteVal === mm ? 'selected' : ''}>${mm}</option>`;
  }

  const disabledAttr = disabled ? 'disabled' : '';
  return `<span class="time-select-pair ${className}"><select class="time-hour-select" ${disabledAttr}>${hourOptions}</select>:<select class="time-minute-select" ${disabledAttr}>${minuteOptions}</select></span>`;
}

/**
 * buildTimeSelectHtmlで作った時・分プルダウンから、"HH:mm"形式の値を読み取る（片方でも未選択なら空文字を返す）
 * @param {Element} container - プルダウンが含まれる親要素
 * @param {string} className - buildTimeSelectHtmlに渡したのと同じクラス名
 * @returns {string} "HH:mm" または 空文字
 */
function getTimeFromSelects(container, className) {
  const wrap = container.querySelector(`.${className}`);
  if (!wrap) return '';
  const hour = wrap.querySelector('.time-hour-select').value;
  const minute = wrap.querySelector('.time-minute-select').value;
  if (!hour || !minute) return '';
  return `${hour}:${minute}`;
}

function renderBusinessHoursRows(business, lastOrderOverride) {
  if (!businessHoursRows) return;

  lastOrderOverride = lastOrderOverride || {};

  businessHoursRows.innerHTML = DAY_LABELS.map((label, dayIndex) => {
    const hours = business[dayIndex] || business[String(dayIndex)] || null;
    const openHour = hours ? hours[0] : '';
    const closeHour = hours ? hours[1] : '';

    const override = lastOrderOverride[dayIndex] || lastOrderOverride[String(dayIndex)] || null;
    const hasOverride = !!override;
    const lastOrderTime = override ? override.lastOrderTime : '';
    const overrideCloseTime = override ? override.closeTime : '';

    return `
      <div class="business-hours-row" data-day="${dayIndex}">
        <span class="day-label">${label}曜日</span>
        <input type="number" class="business-open-input" min="0" max="23" value="${openHour}" placeholder="休">
        <span class="time-sep">時 〜</span>
        <input type="number" class="business-close-input" min="0" max="23" value="${closeHour}" placeholder="休">
        <span class="time-sep">時</span>
      </div>
      <div class="last-order-row" data-day="${dayIndex}">
        <label><input type="checkbox" class="last-order-check" ${hasOverride ? 'checked' : ''}> 最終受付制を設定する</label>
        <span class="last-order-time-pair"><span>最終受付</span>${buildTimeSelectHtml('last-order-time-select', lastOrderTime, !hasOverride)}</span>
        <span class="last-order-time-pair"><span>終了時刻</span>${buildTimeSelectHtml('last-order-close-select', overrideCloseTime, !hasOverride)}</span>
      </div>
    `;
  }).join('');

  // チェックのON/OFFで、時刻入力欄の有効・無効を切り替える
  businessHoursRows.querySelectorAll('.last-order-check').forEach(check => {
    check.addEventListener('change', () => {
      const row = check.closest('.last-order-row');
      row.querySelectorAll('select').forEach(select => {
        select.disabled = !check.checked;
      });
    });
  });
}

/**
 * 「指定時間、予約間隔の設定」の入力行を、日〜土の7行分描画する
 * @param {Object} overrideByDay - { 曜日番号: { startTime, endTime, stepMinutes } }
 */
function renderSlotStepOverrideRows(overrideByDay) {
  if (!slotStepOverrideRows) return;

  slotStepOverrideRows.innerHTML = DAY_LABELS.map((label, dayIndex) => {
    const override = overrideByDay[dayIndex] || overrideByDay[String(dayIndex)] || null;
    const hasOverride = !!override;
    const startTime = override ? override.startTime : '';
    const endTime = override ? override.endTime : '';
    const stepMinutes = override ? override.stepMinutes : '';

    return `
      <div class="slot-step-override-row" data-day="${dayIndex}">
        <span class="day-label">${label}曜日</span>
        <label><input type="checkbox" class="slot-override-check" ${hasOverride ? 'checked' : ''}> 使う</label>
        ${buildTimeSelectHtml('slot-override-start-select', startTime, !hasOverride)}
        <span>〜</span>
        ${buildTimeSelectHtml('slot-override-end-select', endTime, !hasOverride)}
        <input type="number" class="slot-override-minutes-input" min="5" step="5" value="${stepMinutes}" placeholder="分" ${hasOverride ? '' : 'disabled'}>
        <span>分間隔</span>
      </div>
    `;
  }).join('');

  slotStepOverrideRows.querySelectorAll('.slot-override-check').forEach(check => {
    check.addEventListener('change', () => {
      const row = check.closest('.slot-step-override-row');
      row.querySelectorAll('select, input:not(.slot-override-check)').forEach(input => {
        input.disabled = !check.checked;
      });
    });
  });
}


function renderMenuMasterRows(menuMaster) {
  if (!menuMasterRows) return;

  const entries = Object.keys(menuMaster).map(name => ({ name, ...menuMaster[name] }));
  menuMasterRows.innerHTML = '';
  entries.forEach(entry => addMenuRow(entry.name, entry.minutes, entry.price));

  if (entries.length === 0) addMenuRow('', '', '');
}

/**
 * メニュー行を1行追加する
 */
function addMenuRow(name = '', minutes = '', price = '') {
  if (!menuMasterRows) return;

  const row = document.createElement('div');
  row.className = 'menu-master-row';
  row.innerHTML = `
    <input type="text" class="menu-name-input" placeholder="メニュー名（例：カット）" value="${escapeHtmlAdmin(name)}">
    <input type="number" class="menu-minutes-input" placeholder="分" min="5" step="5" value="${minutes}">
    <input type="number" class="menu-price-input" placeholder="円" min="0" value="${price}">
    <button type="button" class="btn-remove-row" title="このメニューを削除">×</button>
  `;
  row.querySelector('.btn-remove-row').addEventListener('click', () => row.remove());
  menuMasterRows.appendChild(row);
}

if (addMenuRowBtn) {
  addMenuRowBtn.addEventListener('click', () => addMenuRow());
}

/**
 * スタッフ名の入力行を描画する（カレンダーIDは隠しdata属性として各行に保持する）
 * @param {Object} staffMaster - { スタッフ名: カレンダーID }
 */
/**
 * スタッフ名・カレンダーIDの入力行を描画する
 * @param {Object} staffMaster - { スタッフ名: カレンダーID }
 */
function renderStaffNameRows(staffMaster) {
  if (!staffNameRows) return;

  const names = Object.keys(staffMaster);
  staffNameRows.innerHTML = '';
  names.forEach(name => addStaffRow(name, staffMaster[name]));

  if (names.length === 0) addStaffRow('', '');
}

/**
 * スタッフ行を1行追加する（名前・カレンダーID・削除ボタン）
 */
function addStaffRow(name = '', calendarId = '') {
  if (!staffNameRows) return;

  const row = document.createElement('div');
  row.className = 'staff-name-row';
  row.innerHTML = `
    <input type="text" class="staff-name-input" placeholder="スタッフ名（例：下鶴）" value="${escapeHtmlAdmin(name)}">
    <input type="text" class="staff-calendar-id-input" placeholder="カレンダーID（xxxx@group.calendar.google.com）" value="${escapeHtmlAdmin(calendarId)}">
    <button type="button" class="btn-remove-row" title="このスタッフを削除">×</button>
  `;
  row.querySelector('.btn-remove-row').addEventListener('click', () => row.remove());
  staffNameRows.appendChild(row);
}

if (addStaffRowBtn) {
  addStaffRowBtn.addEventListener('click', () => addStaffRow());
}

/**
 * フォームの入力内容を集めて、Config.gsのキー名に合わせた形に組み立てる
 * @returns {Object} saveSettings に渡す { 設定キー: 値 } のマップ
 */
function collectSettings1FormData() {
  const settings = {};

  // 予約枠の刻み幅（画面上の「分」を、内部のスロット数に変換して保存する）
  const stepMinutes = s1SlotStepMinutes ? parseInt(s1SlotStepMinutes.value, 10) : 30;
  if (!isNaN(stepMinutes) && stepMinutes > 0) {
    settings.DISPLAY_SLOT_STEP = Math.round(stepMinutes / baseSlotMinutesForConversion);
  }

  // 仮予約制度
  const targetMenus = s1ProvisionalTargetMenus.value.split(',').map(m => m.trim()).filter(m => m.length > 0);
  settings.PROVISIONAL_RESERVATION = {
    enabled: !!s1ProvisionalEnabled.checked,
    target: getRadioValue('s1-provisional-target') || 'ALL',
    targetMenus: targetMenus,
    confirmDeadlineHours: parseInt(s1ProvisionalDeadline.value, 10) || 12,
    autoAction: getRadioValue('s1-provisional-auto-action') || 'NONE'
  };

  // キャンセル・変更の受付締切
  settings.CANCEL_BUFFER_HOURS_BEFORE_RESERVATION = parseInt(s1CancelBuffer.value, 10);
  settings.CHANGE_BUFFER_HOURS_BEFORE_RESERVATION = parseInt(s1ChangeBuffer.value, 10);

  // 予約可能な期間
  settings.MAX_FUTURE_DAYS_TO_RESERVE = parseInt(s1MaxFutureDays.value, 10);
  settings.DISPLAY_DAYS = parseInt(s1DisplayDays.value, 10);

  // 受付の基本設定
  settings.MAX_CAPACITY = parseInt(s1MaxCapacity.value, 10);
  settings.HISTORY_RETENTION_MONTHS = parseInt(s1HistoryRetention.value, 10);
  settings.CANCEL_HISTORY_RETENTION_MONTHS = parseInt(s1CancelHistoryRetention.value, 10);
  settings.CALENDAR_HISTORY_RETENTION_MONTHS = parseInt(s1CalendarHistoryRetention.value, 10);
  settings.BUFFER_MINUTES_BEFORE_RESERVATION = parseInt(s1BufferMinutes.value, 10);

  return settings;
}

if (settings1Form) {
  settings1Form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (settings1Error) settings1Error.style.display = 'none';
    if (settings1SavedMsg) settings1SavedMsg.style.display = 'none';
    if (saveSettings1Btn) {
      saveSettings1Btn.disabled = true;
      saveSettings1Btn.textContent = '保存中...';
    }

    try {
      const settings = collectSettings1FormData();
      const token = sessionStorage.getItem(SESSION_TOKEN_KEY) || '';

      const response = await fetch(CONFIG.GAS_WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'saveSettings', settings: JSON.stringify(settings), token: token })
      });
      const result = await response.json();

      if (!result.success) throw new Error(result.message || '保存に失敗しました。');

      if (settings1SavedMsg) settings1SavedMsg.style.display = 'block';
    } catch (error) {
      console.error('基本設定の保存エラー:', error);
      if (settings1Error) {
        settings1Error.textContent = error.message || '通信エラーが発生しました。時間をおいて再度お試しください。';
        settings1Error.style.display = 'block';
      }
    } finally {
      if (saveSettings1Btn) {
        saveSettings1Btn.disabled = false;
        saveSettings1Btn.textContent = '保存する';
      }
    }
  });
}

/**
 * 「メニュー関係」タブの現在値を取得し、フォームに反映する
 */
async function loadSettings5() {
  if (settings5Loading) settings5Loading.style.display = 'block';
  if (settings5Error) settings5Error.style.display = 'none';
  if (settings5Form) settings5Form.style.display = 'none';

  try {
    const result = await callAdminApi('getSettingsPage5');
    if (!result.success) throw new Error(result.message || '設定の取得に失敗しました。');

    renderMenuMasterRows(result.menuMaster || {});

    setRadioValue('s5-menu-selector-type', result.menuSelectorType || 'TYPE_B');
    if (s5ShowMenuMinutes) s5ShowMenuMinutes.checked = !!result.showMenuMinutes;
    if (s5ShowMenuPrice) s5ShowMenuPrice.checked = !!result.showMenuPrice;

    settings5Loaded = true;
    if (settings5Form) settings5Form.style.display = 'block';
  } catch (error) {
    console.error('メニュー関係の取得エラー:', error);
    if (settings5Error) {
      settings5Error.textContent = error.message || '通信エラーが発生しました。時間をおいて再度お試しください。';
      settings5Error.style.display = 'block';
    }
  } finally {
    if (settings5Loading) settings5Loading.style.display = 'none';
  }
}

if (settings5Form) {
  settings5Form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (settings5Error) settings5Error.style.display = 'none';
    if (settings5SavedMsg) settings5SavedMsg.style.display = 'none';
    if (saveSettings5Btn) {
      saveSettings5Btn.disabled = true;
      saveSettings5Btn.textContent = '保存中...';
    }

    try {
      const menuMaster = {};
      document.querySelectorAll('.menu-master-row').forEach(row => {
        const name = row.querySelector('.menu-name-input').value.trim();
        const minutes = parseInt(row.querySelector('.menu-minutes-input').value, 10);
        const price = parseInt(row.querySelector('.menu-price-input').value, 10);
        if (name && !isNaN(minutes) && minutes > 0) {
          menuMaster[name] = { minutes: minutes, slots: Math.ceil(minutes / 5), price: isNaN(price) ? 0 : price };
        }
      });

      const settings = {
        MENU_MASTER: menuMaster,
        MENU_SELECTOR_TYPE: getRadioValue('s5-menu-selector-type') || 'TYPE_B',
        SHOW_MENU_MINUTES: !!s5ShowMenuMinutes.checked,
        SHOW_MENU_PRICE: !!s5ShowMenuPrice.checked
      };

      const token = sessionStorage.getItem(SESSION_TOKEN_KEY) || '';
      const response = await fetch(CONFIG.GAS_WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'saveSettings', settings: JSON.stringify(settings), token: token })
      });
      const result = await response.json();

      if (!result.success) throw new Error(result.message || '保存に失敗しました。');

      if (settings5SavedMsg) settings5SavedMsg.style.display = 'block';
    } catch (error) {
      console.error('メニュー関係の保存エラー:', error);
      if (settings5Error) {
        settings5Error.textContent = error.message || '通信エラーが発生しました。時間をおいて再度お試しください。';
        settings5Error.style.display = 'block';
      }
    } finally {
      if (saveSettings5Btn) {
        saveSettings5Btn.disabled = false;
        saveSettings5Btn.textContent = '保存する';
      }
    }
  });
}

/**
 * 「営業時間」タブの現在値を取得し、フォームに反映する
 */
async function loadSettings6() {
  if (settings6Loading) settings6Loading.style.display = 'block';
  if (settings6Error) settings6Error.style.display = 'none';
  if (settings6Form) settings6Form.style.display = 'none';

  try {
    const result = await callAdminApi('getSettingsPage6');
    if (!result.success) throw new Error(result.message || '設定の取得に失敗しました。');

    renderBusinessHoursRows(result.business || {}, result.lastOrderOverride || {});
    renderSlotStepOverrideRows(result.displaySlotStepOverride || {});

    settings6Loaded = true;
    if (settings6Form) settings6Form.style.display = 'block';
  } catch (error) {
    console.error('営業時間の取得エラー:', error);
    if (settings6Error) {
      settings6Error.textContent = error.message || '通信エラーが発生しました。時間をおいて再度お試しください。';
      settings6Error.style.display = 'block';
    }
  } finally {
    if (settings6Loading) settings6Loading.style.display = 'none';
  }
}

if (settings6Form) {
  settings6Form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (settings6Error) settings6Error.style.display = 'none';
    if (settings6SavedMsg) settings6SavedMsg.style.display = 'none';
    if (saveSettings6Btn) {
      saveSettings6Btn.disabled = true;
      saveSettings6Btn.textContent = '保存中...';
    }

    try {
      const business = {};
      document.querySelectorAll('.business-hours-row').forEach(row => {
        const day = row.getAttribute('data-day');
        const openVal = row.querySelector('.business-open-input').value;
        const closeVal = row.querySelector('.business-close-input').value;
        if (openVal !== '' && closeVal !== '') {
          business[day] = [parseInt(openVal, 10), parseInt(closeVal, 10)];
        }
      });

      const lastOrderOverride = {};
      document.querySelectorAll('.last-order-row').forEach(row => {
        const day = row.getAttribute('data-day');
        const check = row.querySelector('.last-order-check');
        if (!check.checked) return;

        const lastOrderTime = getTimeFromSelects(row, 'last-order-time-select');
        const closeTime = getTimeFromSelects(row, 'last-order-close-select');
        if (lastOrderTime && closeTime) {
          lastOrderOverride[day] = { lastOrderTime: lastOrderTime, closeTime: closeTime };
        }
      });

      const displaySlotStepOverride = {};
      document.querySelectorAll('.slot-step-override-row').forEach(row => {
        const day = row.getAttribute('data-day');
        const check = row.querySelector('.slot-override-check');
        if (!check.checked) return;

        const startTime = getTimeFromSelects(row, 'slot-override-start-select');
        const endTime = getTimeFromSelects(row, 'slot-override-end-select');
        const stepMinutes = parseInt(row.querySelector('.slot-override-minutes-input').value, 10);
        if (startTime && endTime && !isNaN(stepMinutes) && stepMinutes > 0) {
          displaySlotStepOverride[day] = { startTime: startTime, endTime: endTime, stepMinutes: stepMinutes };
        }
      });

      const settings = {
        BUSINESS: business,
        LAST_ORDER_OVERRIDE: lastOrderOverride,
        DISPLAY_SLOT_STEP_OVERRIDE: displaySlotStepOverride
      };

      const token = sessionStorage.getItem(SESSION_TOKEN_KEY) || '';
      const response = await fetch(CONFIG.GAS_WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'saveSettings', settings: JSON.stringify(settings), token: token })
      });
      const result = await response.json();

      if (!result.success) throw new Error(result.message || '保存に失敗しました。');

      if (settings6SavedMsg) settings6SavedMsg.style.display = 'block';
    } catch (error) {
      console.error('営業時間の保存エラー:', error);
      if (settings6Error) {
        settings6Error.textContent = error.message || '通信エラーが発生しました。時間をおいて再度お試しください。';
        settings6Error.style.display = 'block';
      }
    } finally {
      if (saveSettings6Btn) {
        saveSettings6Btn.disabled = false;
        saveSettings6Btn.textContent = '保存する';
      }
    }
  });
}

/**
 * 「設定1」タブ（スタッフ・カレンダーID・担当スタッフの選択）の現在値を取得し、フォームに反映する
 */
async function loadSettings4() {
  if (settings4Loading) settings4Loading.style.display = 'block';
  if (settings4Error) settings4Error.style.display = 'none';
  if (settings4Form) settings4Form.style.display = 'none';

  try {
    const result = await callAdminApi('getSettingsPage4');
    if (!result.success) throw new Error(result.message || '設定の取得に失敗しました。');

    renderStaffNameRows(result.staffMaster || {});

    if (s4AllowNoAssign) s4AllowNoAssign.checked = !!result.allowNoAssign;
    if (s4NoAssignLabel) s4NoAssignLabel.value = result.noAssignLabel || '';
    if (s4NoAssignCalendarId) s4NoAssignCalendarId.value = result.noAssignCalendarId || '';
    setRadioValue('s4-no-assign-mode', String(result.noAssignMode));
    setRadioValue('s4-no-assign-type', result.noAssignType);

    settings4Loaded = true;
    if (settings4Form) settings4Form.style.display = 'block';
  } catch (error) {
    console.error('設定1の取得エラー:', error);
    if (settings4Error) {
      settings4Error.textContent = error.message || '通信エラーが発生しました。時間をおいて再度お試しください。';
      settings4Error.style.display = 'block';
    }
  } finally {
    if (settings4Loading) settings4Loading.style.display = 'none';
  }
}

if (settings4Form) {
  settings4Form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (settings4Error) settings4Error.style.display = 'none';
    if (settings4SavedMsg) settings4SavedMsg.style.display = 'none';
    if (saveSettings4Btn) {
      saveSettings4Btn.disabled = true;
      saveSettings4Btn.textContent = '保存中...';
    }

    try {
      // スタッフ名・カレンダーID（両方入力されている行だけを対象にする）
      const staffMaster = {};
      document.querySelectorAll('.staff-name-row').forEach(row => {
        const name = row.querySelector('.staff-name-input').value.trim();
        const calendarId = row.querySelector('.staff-calendar-id-input').value.trim();
        if (name && calendarId) {
          staffMaster[name] = calendarId;
        }
      });

      const settings = {
        STAFF_MASTER: staffMaster,
        ALLOW_NO_ASSIGN: !!s4AllowNoAssign.checked,
        NO_ASSIGN_LABEL: s4NoAssignLabel.value.trim() || '指名なし',
        NO_ASSIGN_CALENDAR_ID: s4NoAssignCalendarId.value.trim(),
        NO_ASSIGN_MODE: parseInt(getRadioValue('s4-no-assign-mode'), 10) || 2,
        NO_ASSIGN_TYPE: getRadioValue('s4-no-assign-type') || 'TYPE_B'
      };

      const token = sessionStorage.getItem(SESSION_TOKEN_KEY) || '';
      const response = await fetch(CONFIG.GAS_WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'saveSettings', settings: JSON.stringify(settings), token: token })
      });
      const result = await response.json();

      if (!result.success) throw new Error(result.message || '保存に失敗しました。');

      if (settings4SavedMsg) settings4SavedMsg.style.display = 'block';
    } catch (error) {
      console.error('設定1の保存エラー:', error);
      if (settings4Error) {
        settings4Error.textContent = error.message || '通信エラーが発生しました。時間をおいて再度お試しください。';
        settings4Error.style.display = 'block';
      }
    } finally {
      if (saveSettings4Btn) {
        saveSettings4Btn.disabled = false;
        saveSettings4Btn.textContent = '保存する';
      }
    }
  });
}

/**
 * 「設定2」タブの現在値を取得し、フォームに反映する
 */
async function loadSettings2() {
  if (settings2Loading) settings2Loading.style.display = 'block';
  if (settings2Error) settings2Error.style.display = 'none';
  if (settings2Form) settings2Form.style.display = 'none';

  try {
    const result = await callAdminApi('getSettingsPage2');
    if (!result.success) throw new Error(result.message || '設定の取得に失敗しました。');

    if (s2ReminderDays) s2ReminderDays.value = result.reminderMailDaysBefore;
    if (s2AdminEmail) s2AdminEmail.value = result.adminEmail || '';

    if (s2MailHeader) s2MailHeader.value = result.customerMailHeader || '';
    if (s2MailFooter) s2MailFooter.value = result.customerMailFooter || '';

    settings2Loaded = true;
    if (settings2Form) settings2Form.style.display = 'block';
  } catch (error) {
    console.error('設定2の取得エラー:', error);
    if (settings2Error) {
      settings2Error.textContent = error.message || '通信エラーが発生しました。時間をおいて再度お試しください。';
      settings2Error.style.display = 'block';
    }
  } finally {
    if (settings2Loading) settings2Loading.style.display = 'none';
  }
}

/**
 * name属性を指定して、ラジオボタンのうち該当する値のものだけをチェックする
 * @param {string} name - ラジオボタンのname属性
 * @param {string} value - チェックしたい値
 */
if (settings2Form) {
  settings2Form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (settings2Error) settings2Error.style.display = 'none';
    if (settings2SavedMsg) settings2SavedMsg.style.display = 'none';
    if (saveSettings2Btn) {
      saveSettings2Btn.disabled = true;
      saveSettings2Btn.textContent = '保存中...';
    }

    try {
      const settings = {
        REMINDER_MAIL_DAYS_BEFORE: parseInt(s2ReminderDays.value, 10),
        ADMIN_EMAIL: s2AdminEmail.value.trim(),
        CUSTOMER_MAIL_HEADER: s2MailHeader.value,
        CUSTOMER_MAIL_FOOTER: s2MailFooter.value
      };

      const token = sessionStorage.getItem(SESSION_TOKEN_KEY) || '';
      const response = await fetch(CONFIG.GAS_WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'saveSettings', settings: JSON.stringify(settings), token: token })
      });
      const result = await response.json();

      if (!result.success) throw new Error(result.message || '保存に失敗しました。');

      if (settings2SavedMsg) settings2SavedMsg.style.display = 'block';
    } catch (error) {
      console.error('設定2の保存エラー:', error);
      if (settings2Error) {
        settings2Error.textContent = error.message || '通信エラーが発生しました。時間をおいて再度お試しください。';
        settings2Error.style.display = 'block';
      }
    } finally {
      if (saveSettings2Btn) {
        saveSettings2Btn.disabled = false;
        saveSettings2Btn.textContent = '保存する';
      }
    }
  });
}

/**
 * 「設定3」タブの現在値を取得し、フォームに反映する
 */
async function loadSettings3() {
  if (settings3Loading) settings3Loading.style.display = 'block';
  if (settings3Error) settings3Error.style.display = 'none';
  if (settings3Form) settings3Form.style.display = 'none';

  try {
    const result = await callAdminApi('getSettingsPage3');
    if (!result.success) throw new Error(result.message || '設定の取得に失敗しました。');

    // 店名・ロゴ
    const branding = result.headerBranding || {};
    if (s3ShopName) s3ShopName.value = branding.shopName || '';
    if (s3LogoUrl) s3LogoUrl.value = branding.logoUrl || '';

    // 連絡先情報
    const contact = result.headerContactInfo || {};
    if (s3ContactPhone) s3ContactPhone.value = contact.phone || '';
    if (s3ContactHours) s3ContactHours.value = contact.hours || '';
    if (s3ContactClosed) s3ContactClosed.value = contact.closedDay || '';

    // トップページに戻るボタン
    if (s3HomeUrl) s3HomeUrl.value = result.homePageUrl || '';
    if (s3HomeLabel) s3HomeLabel.value = result.homePageLabel || '';

    // 情報セクション
    const info = result.infoSection || {};
    if (s3InfoEnabled) s3InfoEnabled.checked = !!info.enabled;
    if (s3InfoHeading) s3InfoHeading.value = (info.heading && info.heading.text) || '';
    renderInfoItemRows(info.items || []);

    settings3Loaded = true;
    if (settings3Form) settings3Form.style.display = 'block';
  } catch (error) {
    console.error('設定3の取得エラー:', error);
    if (settings3Error) {
      settings3Error.textContent = error.message || '通信エラーが発生しました。時間をおいて再度お試しください。';
      settings3Error.style.display = 'block';
    }
  } finally {
    if (settings3Loading) settings3Loading.style.display = 'none';
  }
}

/**
 * 情報セクションのカード入力欄（固定4枠）を描画する
 * @param {Array} items - 既存のカード設定（0〜4件）
 */
function renderInfoItemRows(items) {
  if (!infoItemRows) return;

  const iconOptionsHtml = INFO_ICON_OPTIONS.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('');

  let html = '';
  for (let i = 0; i < 4; i++) {
    const item = items[i] || {};
    const isUrlType = !!item.url && !item.page;
    const showIcon = item.showIcon !== false; // 未指定の場合は「使う」扱い
    const iconValue = item.icon || '';
    const isIconUrlType = /^https?:\/\//i.test(iconValue);

    html += `
      <div class="info-item-block" data-slot="${i}">
        <div class="info-item-block-title">カード${i + 1}（空欄のままなら、このカードは表示されません）</div>

        <div class="form-group checkbox-group">
          <label><input type="checkbox" class="info-show-icon-check" ${showIcon ? 'checked' : ''}> アイコンを使う</label>
        </div>
        <div class="info-icon-settings" style="${showIcon ? '' : 'display: none;'}">
          <div class="info-item-link-type">
            <label><input type="radio" name="info-icon-type-${i}" value="preset" ${!isIconUrlType ? 'checked' : ''}> 用意されたアイコンから選ぶ</label>
            <label><input type="radio" name="info-icon-type-${i}" value="image" ${isIconUrlType ? 'checked' : ''}> 画像URLを指定する</label>
          </div>
          <div class="form-group info-icon-preset-group" style="${isIconUrlType ? 'display: none;' : ''}">
            <label>アイコンの種類</label>
            <select class="info-icon-select">${iconOptionsHtml}</select>
          </div>
          <div class="form-group info-icon-image-group" style="${isIconUrlType ? '' : 'display: none;'}">
            <label>アイコン画像のURL</label>
            <input type="text" class="info-icon-image-input" value="${escapeHtmlAdmin(isIconUrlType ? iconValue : '')}" placeholder="https://example.com/icon.png">
          </div>
        </div>

        <div class="form-group">
          <label>タイトル</label>
          <input type="text" class="info-title-input" value="${escapeHtmlAdmin(item.title || '')}" placeholder="例：お店情報">
        </div>
        <div class="form-group">
          <label>説明文</label>
          <input type="text" class="info-desc-input" value="${escapeHtmlAdmin(item.description || '')}" placeholder="例：サロンの詳しい情報はこちら">
        </div>
        <div class="info-item-link-type">
          <label><input type="radio" name="info-link-type-${i}" value="page" ${!isUrlType ? 'checked' : ''}> サイト内のページ（1〜4）</label>
          <label><input type="radio" name="info-link-type-${i}" value="url" ${isUrlType ? 'checked' : ''}> 外部URL</label>
        </div>
        <div class="form-group">
          <label>ページ番号 または URL</label>
          <input type="text" class="info-link-value-input" value="${escapeHtmlAdmin(isUrlType ? item.url : (item.page || ''))}" placeholder="例：1 または https://example.com">
        </div>
      </div>
    `;
  }
  infoItemRows.innerHTML = html;

  // 読み込んだアイコンの選択状態を反映する（HTML文字列にselectedを埋め込むより、後からJSで設定する方が安全）
  items.forEach((item, i) => {
    const select = infoItemRows.querySelector(`.info-item-block[data-slot="${i}"] .info-icon-select`);
    if (select && item.icon && !/^https?:\/\//i.test(item.icon)) select.value = item.icon;
  });

  // 「アイコンを使う」チェックの切り替えで、アイコン設定エリア自体を表示・非表示にする
  infoItemRows.querySelectorAll('.info-show-icon-check').forEach(check => {
    check.addEventListener('change', () => {
      const settingsArea = check.closest('.info-item-block').querySelector('.info-icon-settings');
      if (settingsArea) settingsArea.style.display = check.checked ? 'block' : 'none';
    });
  });

  // 「プリセット / 画像URL」の切り替えで、該当する入力欄だけを表示する
  infoItemRows.querySelectorAll('.info-item-block').forEach(block => {
    const presetGroup = block.querySelector('.info-icon-preset-group');
    const imageGroup = block.querySelector('.info-icon-image-group');
    block.querySelectorAll('input[type="radio"][name^="info-icon-type-"]').forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.checked && radio.value === 'preset') {
          if (presetGroup) presetGroup.style.display = 'block';
          if (imageGroup) imageGroup.style.display = 'none';
        } else if (radio.checked && radio.value === 'image') {
          if (presetGroup) presetGroup.style.display = 'none';
          if (imageGroup) imageGroup.style.display = 'block';
        }
      });
    });
  });
}

if (settings3Form) {
  settings3Form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (settings3Error) settings3Error.style.display = 'none';
    if (settings3SavedMsg) settings3SavedMsg.style.display = 'none';
    if (saveSettings3Btn) {
      saveSettings3Btn.disabled = true;
      saveSettings3Btn.textContent = '保存中...';
    }

    try {
      // 店名・ロゴ（両方空なら null にして「未設定」に戻す）
      const shopName = s3ShopName.value.trim();
      const logoUrl = s3LogoUrl.value.trim();
      const headerBranding = (shopName || logoUrl) ? { shopName: shopName || null, logoUrl: logoUrl || null } : null;

      // 連絡先情報
      const phone = s3ContactPhone.value.trim();
      const hours = s3ContactHours.value.trim();
      const closedDay = s3ContactClosed.value.trim();
      const headerContactInfo = (phone || hours || closedDay) ? { phone: phone || null, hours: hours || null, closedDay: closedDay || null } : null;

      const settings = {
        HEADER_BRANDING: headerBranding,
        HEADER_CONTACT_INFO: headerContactInfo,
        HOME_PAGE_URL: s3HomeUrl.value.trim() || null,
        HOME_PAGE_LABEL: s3HomeLabel.value.trim() || null,
        INFO_SECTION: {
          enabled: !!s3InfoEnabled.checked,
          heading: { text: s3InfoHeading.value.trim() || null, fontSize: null, color: null, fontFamily: null },
          items: collectInfoItems()
        }
      };

      const token = sessionStorage.getItem(SESSION_TOKEN_KEY) || '';
      const response = await fetch(CONFIG.GAS_WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'saveSettings', settings: JSON.stringify(settings), token: token })
      });
      const result = await response.json();

      if (!result.success) throw new Error(result.message || '保存に失敗しました。');

      if (settings3SavedMsg) settings3SavedMsg.style.display = 'block';
    } catch (error) {
      console.error('設定3の保存エラー:', error);
      if (settings3Error) {
        settings3Error.textContent = error.message || '通信エラーが発生しました。時間をおいて再度お試しください。';
        settings3Error.style.display = 'block';
      }
    } finally {
      if (saveSettings3Btn) {
        saveSettings3Btn.disabled = false;
        saveSettings3Btn.textContent = '保存する';
      }
    }
  });
}

/**
 * 情報セクションの4枠から、タイトルが入力されているものだけを取り出して配列にする
 * @returns {Array} INFO_SECTION.items に渡す配列
 */
function collectInfoItems() {
  const items = [];
  document.querySelectorAll('.info-item-block').forEach(block => {
    const title = block.querySelector('.info-title-input').value.trim();
    if (!title) return; // タイトル未入力の枠は、カードとして保存しない

    const description = block.querySelector('.info-desc-input').value.trim();
    const slot = block.getAttribute('data-slot');
    const linkType = getRadioValue(`info-link-type-${slot}`);
    const linkValue = block.querySelector('.info-link-value-input').value.trim();

    const showIcon = block.querySelector('.info-show-icon-check').checked;
    const iconType = getRadioValue(`info-icon-type-${slot}`);
    const icon = (showIcon && iconType === 'image')
      ? block.querySelector('.info-icon-image-input').value.trim()
      : block.querySelector('.info-icon-select').value;

    const item = { icon: icon, showIcon: showIcon, title: title, description: description };
    if (linkType === 'url') {
      item.url = linkValue;
    } else {
      const pageNum = parseInt(linkValue, 10);
      if (!isNaN(pageNum)) item.page = pageNum;
    }
    items.push(item);
  });
  return items;
}
