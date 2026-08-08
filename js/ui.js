/**
 * =================================================================
 * Salon Information System (SIS) - js/ui.js [Version 4.4.3]
 * [役割: DOM操作・UI制御・イベントハンドリング]
 * =================================================================
 */

// -----------------------------------------------------------------
// 1. DOM要素（画面のパーツ）の取得
// -----------------------------------------------------------------
const form = document.getElementById('reservation-form');
const nameInput = document.getElementById('name');
const nameKanaInput = document.getElementById('name_kana');
const telInput = document.getElementById('tel');
const emailInput = document.getElementById('email');
const memoInput = document.getElementById('memo');

const dateInput = document.getElementById('date');
const staffSelect = document.getElementById('staff');
const menuContainer = document.getElementById('menu-container');
const submitBtn = document.getElementById('submit-btn');

// ナビゲーションおよび機能ボタン
const toStep2Btn = document.getElementById('to-step-2-btn');
const toStep3Btn = document.getElementById('to-step-3-btn');
const backToStep1Btn = document.getElementById('back-to-step-1-btn');
const backToStep2Btn = document.getElementById('back-to-step-2-btn');
const goToCheckBtn = document.getElementById('go-to-check-btn');
const backFromCheckBtn = document.getElementById('back-from-check-btn');
const checkBtn = document.getElementById('check-btn');
const cancelChangeBtn = document.getElementById('cancel-change-btn');

// コンテナ（画面のブロック）および結果描画エリア
const step1Container = document.getElementById('step-1-container');
const step2Container = document.getElementById('step-2-container');
const step3Container = document.getElementById('step-3-container');
const checkTabContainer = document.getElementById('check-tab-container');
const resultsArea = document.getElementById('check-results-area');

// タイムテーブル（時間表）表示パーツ
const timetableContainer = document.getElementById('timetable-container');
const timetableLoading = document.getElementById('timetable-loading');
const selectedDateInput = document.getElementById('selected-date');
const selectedTimeInput = document.getElementById('selected-time');

// -----------------------------------------------------------------
// 2. システム設定の取得（初回のみ通信）
// -----------------------------------------------------------------
/**
 * システム設定を取得する。2回目以降は保持済みの値を返して通信しない。
 * @returns {Promise<Object>} システム設定オブジェクト
 */
async function ensureSystemSettingsLoaded() {
  if (AppState.systemSettings) {
    return AppState.systemSettings;
  }

  const settings = await fetchSystemSettingsApi();

  if (!settings || settings.success === false) {
    const message = (settings && settings.message) ? settings.message : 'システム設定の読み込みに失敗しました';
    throw new Error(message);
  }

  AppState.systemSettings = settings;
  applySystemSettings(settings);
  return settings;
}

/**
 * GASから受け取った設定値をCONFIGへ反映する
 * @param {Object} settings - GASの getSystemSettings() 返却値
 */
function applySystemSettings(settings) {
  CONFIG.MAX_FUTURE_DAYS = settings.maxFutureDays;
  CONFIG.SHOW_STAFF_SELECTOR = settings.showStaffSelector;
  CONFIG.ALLOW_NO_ASSIGN = settings.allowNoAssign;
  CONFIG.NO_ASSIGN_LABEL = settings.noAssignLabel;
  CONFIG.STAFF_LIST = Array.isArray(settings.staffList) ? settings.staffList : [];
  CONFIG.MENU_SELECTOR_TYPE = settings.menuSelectorType;
  CONFIG.SHOW_MENU_MINUTES = settings.showMenuMinutes;
  CONFIG.SHOW_MENU_PRICE = settings.showMenuPrice;
  CONFIG.MENU_MASTER = settings.menuMaster || {};
}

// -----------------------------------------------------------------
// 3. 画面初期セットアップ
// -----------------------------------------------------------------
/**
 * カレンダーの選択可能範囲を設定する（日本時間基準）
 */
function setupDateInputRange() {
  if (!dateInput) return;

  dateInput.min = formatLocalDateInputValue(new Date());
  dateInput.max = getLocalDateAfterDays(CONFIG.MAX_FUTURE_DAYS);
}

/**
 * スタッフ選択プルダウンを構築する
 */
function setupStaffSelector() {
  if (!staffSelect) return;

  const staffGroup = document.getElementById('staff-group');
  staffSelect.innerHTML = '';

  // スタッフ選択欄を表示しない設定の場合
  if (CONFIG.SHOW_STAFF_SELECTOR === false) {
    if (staffGroup) staffGroup.style.display = 'none';

    if (CONFIG.ALLOW_NO_ASSIGN === true) {
      const noAssignOpt = document.createElement('option');
      noAssignOpt.value = CONFIG.NO_ASSIGN_LABEL;
      noAssignOpt.textContent = CONFIG.NO_ASSIGN_LABEL;
      staffSelect.appendChild(noAssignOpt);
      staffSelect.value = CONFIG.NO_ASSIGN_LABEL;
    } else if (CONFIG.STAFF_LIST.length > 0) {
      const firstStaff = CONFIG.STAFF_LIST[0];
      const opt = document.createElement('option');
      opt.value = firstStaff;
      opt.textContent = firstStaff;
      staffSelect.appendChild(opt);
      staffSelect.value = firstStaff;
    }
    return;
  }

  // スタッフ選択欄を表示する設定の場合
  if (staffGroup) staffGroup.style.display = 'block';

  if (CONFIG.ALLOW_NO_ASSIGN === true) {
    const defaultOpt = document.createElement('option');
    defaultOpt.value = CONFIG.NO_ASSIGN_LABEL;
    defaultOpt.textContent = `${CONFIG.NO_ASSIGN_LABEL} (店舗全体の空き状況)`;
    staffSelect.appendChild(defaultOpt);
  } else {
    const placeholderOpt = document.createElement('option');
    placeholderOpt.value = '';
    placeholderOpt.textContent = '担当スタッフを選択してください';
    placeholderOpt.disabled = true;
    placeholderOpt.selected = true;
    staffSelect.appendChild(placeholderOpt);
  }

  CONFIG.STAFF_LIST.forEach(staffName => {
    const opt = document.createElement('option');
    opt.value = staffName;
    opt.textContent = staffName;
    staffSelect.appendChild(opt);
  });
}

/**
 * システム設定をもとに画面全体を組み立てる
 */
async function initializeSystemUI() {
  try {
    await ensureSystemSettingsLoaded();
  } catch (error) {
    console.error('システム設定の読み込みに失敗しました:', error);
    if (menuContainer) {
      menuContainer.innerHTML = '<div class="note text-danger">設定の読み込みに失敗しました。時間をおいて再度お試しください。</div>';
    }
    return;
  }

  setupDateInputRange();
  setupStaffSelector();
  renderMenuUI();
}

// -----------------------------------------------------------------
// 4. メニューUI制御
// -----------------------------------------------------------------
/**
 * メニュー選択UI（プルダウン / チェックボックス）を描画する
 */
function renderMenuUI() {
  if (!menuContainer) return;

  const menuMaster = CONFIG.MENU_MASTER || {};
  const menuNames = Object.keys(menuMaster);

  if (menuNames.length === 0) {
    menuContainer.innerHTML = '<div class="note">メニューを読み込んでいます...</div>';
    return;
  }

  const isPulldown = (CONFIG.MENU_SELECTOR_TYPE === 'TYPE_A');
  let html = '';

  if (isPulldown) {
    html += '<select id="menu-select" class="form-select" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ccc;">';
    html += '<option value="" disabled selected>メニューを選択してください</option>';

    menuNames.forEach(menuName => {
      const label = buildMenuLabel(menuName, menuMaster[menuName]);
      html += `<option value="${escapeHtml(menuName)}">${escapeHtml(label)}</option>`;
    });

    html += '</select>';
  } else {
    html += '<div class="menu-checkbox-list" style="display: flex; flex-direction: column; gap: 8px;">';

    menuNames.forEach(menuName => {
      const label = buildMenuLabel(menuName, menuMaster[menuName]);
      html += `
        <label class="checkbox-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="checkbox" name="selected_menus" value="${escapeHtml(menuName)}" class="menu-checkbox">
          <span>${escapeHtml(label)}</span>
        </label>
      `;
    });

    html += '</div>';
  }

  menuContainer.innerHTML = html;

  // 予約変更モードの場合は、元のメニューを選択済みにする
  if (isChangeMode() && AppState.changeModeData.oldMenu) {
    applySelectedMenuValue(AppState.changeModeData.oldMenu);
  }
}

/**
 * 現在選択されているメニューを取得する
 * @returns {string} メニュー名（複数選択時はカンマ区切り）
 */
function getSelectedMenusValue() {
  if (CONFIG.MENU_SELECTOR_TYPE === 'TYPE_A') {
    const menuSelect = document.getElementById('menu-select');
    return menuSelect ? menuSelect.value : '';
  }

  const checkboxes = document.querySelectorAll('.menu-checkbox:checked');
  return Array.from(checkboxes).map(cb => cb.value).join(',');
}

/**
 * 指定されたメニューを選択済み状態にする
 * @param {string} menuValue - メニュー名（カンマ区切り可）
 */
function applySelectedMenuValue(menuValue) {
  if (!menuValue) return;

  if (CONFIG.MENU_SELECTOR_TYPE === 'TYPE_A') {
    const menuSelect = document.getElementById('menu-select');
    if (menuSelect) menuSelect.value = menuValue;
    return;
  }

  const oldMenus = String(menuValue).split(',');
  document.querySelectorAll('.menu-checkbox').forEach(cb => {
    cb.checked = oldMenus.includes(cb.value);
  });
}

/**
 * メニューの選択状態をすべて解除する
 */
function clearSelectedMenuValue() {
  if (CONFIG.MENU_SELECTOR_TYPE === 'TYPE_A') {
    const menuSelect = document.getElementById('menu-select');
    if (menuSelect) menuSelect.selectedIndex = 0;
    return;
  }

  document.querySelectorAll('.menu-checkbox').forEach(cb => {
    cb.checked = false;
  });
}

// -----------------------------------------------------------------
// 5. セクション切替・タイムテーブル（時間表）描画
// -----------------------------------------------------------------
/**
 * 指定したセクションだけを表示する
 * @param {HTMLElement} targetContainer - 表示したいセクション
 */
function showSection(targetContainer) {
  const sections = [step1Container, step2Container, step3Container, checkTabContainer];
  sections.forEach(sec => {
    if (sec) sec.style.display = 'none';
  });

  if (targetContainer) targetContainer.style.display = 'block';
}

/**
 * タイムテーブル領域にメッセージだけを表示する
 * @param {string} message - 表示する文言
 * @param {boolean} [isError] - エラー表示にするか
 */
function renderTimetableMessage(message, isError = false) {
  if (!timetableContainer) return;
  const cls = isError ? 'no-data text-danger' : 'no-data';
  timetableContainer.innerHTML = `<div class="${cls}">${escapeHtml(message)}</div>`;
}

/**
 * 複数日分の空き状況からタイムテーブルを描画する
 * @param {Object} multiDayStatuses - GASから取得した空き状況データ
 */
function renderTimetable(multiDayStatuses) {
  if (!timetableContainer) return;

  if (multiDayStatuses && multiDayStatuses.success === false) {
    renderTimetableMessage(`【エラー検知】${multiDayStatuses.message || ''}`, true);
    return;
  }

  if (!multiDayStatuses || Object.keys(multiDayStatuses).length === 0) {
    renderTimetableMessage('空き枠がありません。', true);
    return;
  }

  const dateKeys = Object.keys(multiDayStatuses).sort();
  let timeSlots = [];

  // 営業日のデータから、表示する時間の並びを取り出す
  for (const dKey of dateKeys) {
    const dayData = multiDayStatuses[dKey];
    if (dayData && !dayData.SHOP_HOLIDAY) {
      const slots = Object.keys(dayData).filter(key => /^\d{1,2}:\d{2}$/.test(key));
      if (slots.length > 0) {
        timeSlots = slots.sort((a, b) => {
          const [aHour, aMin] = a.split(':').map(Number);
          const [bHour, bMin] = b.split(':').map(Number);
          return aHour !== bHour ? aHour - bHour : aMin - bMin;
        });
        break;
      }
    }
  }

  // 表示できる時間が1つも無い場合は、表を作らずに知らせる
  if (timeSlots.length === 0) {
    renderTimetableMessage('この期間に空き枠がありません。日付を変えてお試しください。');
    return;
  }

  let html = '<table class="timetable-table"><thead><tr><th>時間</th>';

  dateKeys.forEach(dStr => {
    html += `<th>${escapeHtml(formatDateHeaderLabel(dStr))}</th>`;
  });

  html += '</tr></thead><tbody>';

  timeSlots.forEach((timeStr, rowIndex) => {
    html += `<tr><td class="time-col">${escapeHtml(timeStr)}</td>`;

    dateKeys.forEach(dStr => {
      const dayData = multiDayStatuses[dStr];

      // 店舗休業日は、1列まるごと1つのセルにまとめて表示する
      if (dayData && dayData.SHOP_HOLIDAY) {
        if (rowIndex === 0) {
          const holidayText = dayData.HOLIDAY_TEXT || '休業日';
          html += `<td rowspan="${timeSlots.length}" class="shop-holiday-cell"><strong>${escapeHtml(holidayText)}</strong></td>`;
        }
        return;
      }

      const status = dayData ? dayData[timeStr] : '×';

      if (status === '○') {
        html += `<td class="slot-cell slot-available" data-date="${escapeHtml(dStr)}" data-time="${escapeHtml(timeStr)}">○</td>`;
      } else {
        html += '<td class="slot-cell slot-unavailable">×</td>';
      }
    });

    html += '</tr>';
  });

  html += '</tbody></table>';
  timetableContainer.innerHTML = html;

  bindTimetableCellEvents();
}

/**
 * 空き枠セルのクリック処理を登録する
 */
function bindTimetableCellEvents() {
  document.querySelectorAll('.slot-available').forEach(cell => {
    cell.addEventListener('click', (e) => {
      document.querySelectorAll('.slot-available').forEach(c => c.classList.remove('selected'));

      const target = e.currentTarget;
      target.classList.add('selected');

      if (selectedDateInput) selectedDateInput.value = target.getAttribute('data-date');
      if (selectedTimeInput) selectedTimeInput.value = target.getAttribute('data-time');

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = isChangeMode() ? '上記の内容で変更を確定する' : '上記の内容で予約を確定する';
      }
    });
  });
}

/**
 * 選択条件をもとに空き状況を取得して描画する
 * @returns {Promise<boolean>} 取得と描画に成功したら true
 */
async function updateAvailableTimes() {
  const dateVal = dateInput ? dateInput.value : '';
  const staffVal = staffSelect ? staffSelect.value : '';
  const menuVal = getSelectedMenusValue();

  if (!dateVal || !staffVal || !menuVal) {
    alert('日付、スタッフ、メニューをすべて選択してください。');
    return false;
  }

  if (timetableContainer) timetableContainer.innerHTML = '';
  if (timetableLoading) timetableLoading.style.display = 'block';

  try {
    const resId = isChangeMode() ? (AppState.changeModeData.resId || '') : '';
    const multiDayStatuses = await fetchTimetableDataApi(dateVal, staffVal, menuVal, resId);

    if (multiDayStatuses && multiDayStatuses.success === false) {
      console.error('タイムテーブル取得失敗:', multiDayStatuses.message);
      renderTimetableMessage(`データの取得に失敗しました: ${multiDayStatuses.message || ''}`, true);
      return false;
    }

    renderTimetable(multiDayStatuses);

    if (selectedDateInput) selectedDateInput.value = '';
    if (selectedTimeInput) selectedTimeInput.value = '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '日時を選択してください';
    }
    return true;
  } catch (error) {
    console.error('空き状況更新エラー:', error);
    renderTimetableMessage(`通信エラーが発生しました: ${error.message || error}`, true);
    return false;
  } finally {
    if (timetableLoading) timetableLoading.style.display = 'none';
  }
}

// -----------------------------------------------------------------
// 6. 予約検索 & 変更 / キャンセル処理
// -----------------------------------------------------------------
/**
 * 予約時間（"10:00"）を "10時00分" の表記に変換する
 * @param {string} timeStr - 時間文字列
 * @returns {string} 整形済み文字列
 */
function formatReservationTime(timeStr) {
  const parts = String(timeStr || '').split(':');
  if (parts.length < 2) return String(timeStr || '');
  return `${parts[0]}時${parts[1]}分`;
}

/**
 * 予約1件分のカードHTMLを作る
 * @param {Object} res - 予約データ
 * @returns {string} カードのHTML
 */
function buildReservationCardHtml(res) {
  const formattedDate = formatJapaneseDate(res.date);
  const formattedTime = formatReservationTime(res.time);

  const safeId = escapeHtml(res.id);
  const safeMenu = escapeHtml(res.menu);
  const safeStaff = escapeHtml(res.staff);
  const safeMemo = escapeHtml(res.memo);
  const safeDate = escapeHtml(res.date);
  const safeTime = escapeHtml(res.time);
  const safeCreatedAt = escapeHtml(res.createdAt);

  const memoRow = res.memo
    ? `<div class="res-row"><span class="res-label">備考・メモ</span> ${safeMemo}</div>`
    : '';

  return `
    <div class="reservation-card">
      <div class="res-row"><span class="res-label">予約日</span> ${escapeHtml(formattedDate)}</div>
      <div class="res-row"><span class="res-label">予約時間</span> ${escapeHtml(formattedTime)}</div>
      <div class="res-row"><span class="res-label">メニュー</span> ${safeMenu}</div>
      <div class="res-row"><span class="res-label">担当</span> ${safeStaff}</div>
      ${memoRow}
      <div class="res-card-divider"><span class="res-label">予約ID</span> <span class="res-id-badge">${safeId}</span></div>
      <div class="res-created-time">⏱ 受付時間：${safeCreatedAt}</div>
      <div class="btn-action-group">
        <button type="button" class="btn-change" data-id="${safeId}" data-date="${safeDate}" data-time="${safeTime}" data-staff="${safeStaff}" data-menu="${safeMenu}" data-memo="${safeMemo}">日時を変更する</button>
        <button type="button" class="btn-cancel" data-id="${safeId}">この予約をキャンセルする</button>
      </div>
    </div>
  `;
}

/**
 * 電話番号とメールアドレスから予約を検索して一覧表示する
 */
async function fetchReservations() {
  const checkTelEl = document.getElementById('check-tel');
  const checkEmailEl = document.getElementById('check-email');

  const telVal = checkTelEl ? checkTelEl.value.trim() : '';
  const emailVal = checkEmailEl ? checkEmailEl.value.trim() : '';

  if (!telVal || !emailVal) {
    alert('電話番号とメールアドレスの両方を入力してください。');
    return;
  }

  if (checkBtn) {
    checkBtn.disabled = true;
    checkBtn.textContent = '検索中...';
  }
  if (resultsArea) {
    resultsArea.innerHTML = '<div class="no-data">予約データを検索しています...</div>';
  }

  saveCurrentCustomerDataToCache();

  try {
    const result = await fetchCustomerReservationsApi(telVal, emailVal);

    if (!result.success) {
      resultsArea.innerHTML = `<div class="no-data text-danger">${escapeHtml(result.message)}</div>`;
      return;
    }

    if (!result.reservations || result.reservations.length === 0) {
      resultsArea.innerHTML = '<div class="no-data">現在、条件に一致する今日以降のご予約はありません。</div>';
      return;
    }

    let htmlContent = '<h3 class="results-title">お客様のご予約状況</h3>';
    result.reservations.forEach(res => {
      htmlContent += buildReservationCardHtml(res);
    });

    resultsArea.innerHTML = htmlContent;
  } catch (error) {
    console.error('予約検索エラー:', error);
    resultsArea.innerHTML = '<div class="no-data text-danger">エラーが発生しました。時間を置いて再度お試しください。</div>';
  } finally {
    if (checkBtn) {
      checkBtn.disabled = false;
      checkBtn.textContent = 'ご予約状況を確認する';
    }
  }
}

/**
 * 変更前の予約内容を画面上部のバナーに表示する
 */
function renderChangeBanner() {
  const data = AppState.changeModeData;
  if (!data) return;

  const prevIdEl = document.getElementById('prev-id');
  const prevDatetimeEl = document.getElementById('prev-datetime');
  const prevMenuEl = document.getElementById('prev-menu');
  const prevStaffEl = document.getElementById('prev-staff');
  const changeBannerEl = document.getElementById('change-banner');

  if (prevIdEl) prevIdEl.textContent = data.resId || '';
  if (prevDatetimeEl) prevDatetimeEl.textContent = `${formatJapaneseDate(data.oldDate)}  ${data.oldTime || ''}`;
  if (prevMenuEl) prevMenuEl.textContent = data.oldMenu || '';
  if (prevStaffEl) prevStaffEl.textContent = data.oldStaff || '';

  if (changeBannerEl) changeBannerEl.style.display = 'block';
}

/**
 * 変更前バナーの内容を消して非表示にする
 */
function clearChangeBanner() {
  const prevIdEl = document.getElementById('prev-id');
  const prevDatetimeEl = document.getElementById('prev-datetime');
  const prevMenuEl = document.getElementById('prev-menu');
  const prevStaffEl = document.getElementById('prev-staff');
  const changeBannerEl = document.getElementById('change-banner');

  if (prevIdEl) prevIdEl.textContent = '';
  if (prevDatetimeEl) prevDatetimeEl.textContent = '';
  if (prevMenuEl) prevMenuEl.textContent = '';
  if (prevStaffEl) prevStaffEl.textContent = '';

  if (changeBannerEl) changeBannerEl.style.display = 'none';
}

/**
 * 予約条件の選択状態（日付・スタッフ・メニュー・時間表）を初期状態に戻す
 */
function resetReservationSelection() {
  if (dateInput) dateInput.value = '';
  if (staffSelect && staffSelect.options.length > 0) staffSelect.selectedIndex = 0;
  clearSelectedMenuValue();

  if (selectedDateInput) selectedDateInput.value = '';
  if (selectedTimeInput) selectedTimeInput.value = '';
  if (memoInput) memoInput.value = '';

  if (timetableContainer) {
    timetableContainer.innerHTML = '<div class="no-data">条件に沿った空き枠を表示しています。</div>';
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = '日時を選択してください';
  }
}

/**
 * 予約変更モードを開始する
 * @param {HTMLElement} buttonEl - 押された「日時を変更する」ボタン
 */
async function startChangeMode(buttonEl) {
  const rawStaff = buttonEl.getAttribute('data-staff');
  const staffVal = (rawStaff && rawStaff !== 'null' && rawStaff !== 'undefined') ? rawStaff : CONFIG.NO_ASSIGN_LABEL;

  AppState.changeModeData = {
    resId: buttonEl.getAttribute('data-id') || '',
    oldDate: buttonEl.getAttribute('data-date') || '',
    oldTime: buttonEl.getAttribute('data-time') || '',
    oldStaff: staffVal,
    oldMenu: buttonEl.getAttribute('data-menu') || ''
  };

  // 設定は保持済みのため通信は発生しない
  await initializeSystemUI();

  // 元の担当スタッフを選択状態にする
  if (staffSelect) {
    const exists = Array.from(staffSelect.options).some(opt => opt && opt.value === staffVal);
    if (exists) {
      staffSelect.value = staffVal;
    } else if (staffSelect.options.length > 0) {
      staffSelect.selectedIndex = 0;
    }
  }

  if (memoInput) memoInput.value = buttonEl.getAttribute('data-memo') || '';
  if (dateInput) dateInput.value = AppState.changeModeData.oldDate;

  renderChangeBanner();

  if (submitBtn) submitBtn.textContent = '日時を選択してください';

  showSection(step2Container);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * 予約変更モードを終了して通常の予約画面に戻す
 */
function abortChangeMode() {
  AppState.changeModeData = null;

  clearChangeBanner();
  resetReservationSelection();

  applyCachedCustomerDataToForm();
  initializeSystemUI();
  showSection(step1Container);
}

/**
 * 予約のキャンセルを実行する
 * @param {HTMLElement} buttonEl - 押された「キャンセルする」ボタン
 */
async function requestCancel(buttonEl) {
  const resId = buttonEl.getAttribute('data-id');
  if (!resId) return;

  if (!confirm(`ご予約（ID: ${resId}）をキャンセルしてもよろしいですか？\n\n※この操作は取り消せません。`)) return;

  if (resultsArea) {
    resultsArea.innerHTML = '<div class="no-data">予約のキャンセル処理を行っています...</div>';
  }

  try {
    const data = await submitReservationApi('cancel', { resId: resId });

    if (data.success) {
      alert('ご予約のキャンセルが正常に完了しました。');
    } else {
      alert('キャンセルに失敗しました: ' + data.message);
    }
  } catch (error) {
    console.error('キャンセル通信エラー:', error);
    alert('通信エラーが発生しました。時間を置いて再度お試しください。');
  } finally {
    fetchReservations();
  }
}

// -----------------------------------------------------------------
// 7. フォーム送信処理
// -----------------------------------------------------------------
/**
 * 予約の新規登録・変更を送信する
 * @param {Event} e - submitイベント
 */
async function handleReservationSubmit(e) {
  e.preventDefault();

  const isChange = isChangeMode();
  const confirmMsg = isChange
    ? '選択した新しい日時で予約を変更してもよろしいですか？'
    : 'この内容で予約を確定してもよろしいですか？';

  if (!confirm(confirmMsg)) return;

  submitBtn.disabled = true;
  submitBtn.textContent = isChange ? '予約を変更中...' : '予約を登録中...';

  saveCurrentCustomerDataToCache();

  const action = isChange ? 'change' : 'create';
  const payload = {
    staff: staffSelect.value,
    menu: getSelectedMenusValue(),
    name: nameInput.value,
    name_kana: nameKanaInput.value,
    tel: telInput.value,
    email: emailInput.value,
    formData: memoInput.value
  };

  if (isChange) {
    payload.resId = AppState.changeModeData.resId;
    payload.newDate = selectedDateInput.value;
    payload.newTime = selectedTimeInput.value;
  } else {
    payload.date = selectedDateInput.value;
    payload.time = selectedTimeInput.value;
  }

  try {
    const data = await submitReservationApi(action, payload);

    if (!data.success) {
      alert('処理に失敗しました: ' + data.message);
      return;
    }

    if (isChange) {
      alert('ご予約の変更が正常に完了しました！');
      AppState.changeModeData = null;
      clearChangeBanner();
    } else {
      const msg = data.resId ? `ご予約が完了しました！\n【ご予約ID: ${data.resId}】` : 'ご予約が完了しました！';
      alert(msg);
    }

    // 確認タブの入力欄にも今回の連絡先を反映しておく
    const checkTelEl = document.getElementById('check-tel');
    const checkEmailEl = document.getElementById('check-email');
    if (checkTelEl) checkTelEl.value = telInput.value;
    if (checkEmailEl) checkEmailEl.value = emailInput.value;

    resetReservationSelection();
    applyCachedCustomerDataToForm();
    await initializeSystemUI();

    if (isChange) {
      showSection(checkTabContainer);
      await fetchReservations();
    } else {
      showSection(step1Container);
    }
  } catch (error) {
    console.error('送信エラー:', error);
    alert('通信エラーが発生しました。');
  } finally {
    submitBtn.disabled = false;
  }
}

// -----------------------------------------------------------------
// 8. イベントリスナー設定
// -----------------------------------------------------------------
/**
 * 画面上のすべてのイベントを登録する
 */
function initializeEvents() {
  if (form) {
    form.addEventListener('submit', handleReservationSubmit);
  }

  if (toStep2Btn) {
    toStep2Btn.addEventListener('click', () => {
      if (!nameInput.checkValidity() || !nameKanaInput.checkValidity() || !telInput.checkValidity() || !emailInput.checkValidity()) {
        alert('お客様情報を正しく入力してください。');
        return;
      }
      showSection(step2Container);
    });
  }

  if (toStep3Btn) {
    toStep3Btn.addEventListener('click', async () => {
      if (!dateInput.value || !staffSelect.value || !getSelectedMenusValue()) {
        alert('ご来店希望日、スタッフ、メニューを選択してください。');
        return;
      }

      const originalText = toStep3Btn.textContent;
      toStep3Btn.disabled = true;
      toStep3Btn.textContent = '空き状況を読み込み中...';

      const success = await updateAvailableTimes();

      toStep3Btn.disabled = false;
      toStep3Btn.textContent = originalText;

      if (success) {
        showSection(step3Container);
      }
    });
  }

  if (backToStep1Btn) {
    backToStep1Btn.addEventListener('click', () => showSection(step1Container));
  }

  if (backToStep2Btn) {
    backToStep2Btn.addEventListener('click', () => showSection(step2Container));
  }

  if (goToCheckBtn) {
    goToCheckBtn.addEventListener('click', () => {
      applyCachedCustomerDataToForm();
      showSection(checkTabContainer);
    });
  }

  if (backFromCheckBtn) {
    backFromCheckBtn.addEventListener('click', () => showSection(step1Container));
  }

  if (checkBtn) {
    checkBtn.addEventListener('click', fetchReservations);
  }

  if (cancelChangeBtn) {
    cancelChangeBtn.addEventListener('click', abortChangeMode);
  }

  if (resultsArea) {
    resultsArea.addEventListener('click', (e) => {
      const target = e.target;
      if (target.classList.contains('btn-change')) {
        startChangeMode(target);
      } else if (target.classList.contains('btn-cancel')) {
        requestCancel(target);
      }
    });
  }
}

// -----------------------------------------------------------------
// 9. ページ読み込み時の自動実行
// -----------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  initializeEvents();
  applyCachedCustomerDataToForm();
  showSection(step1Container);
  initializeSystemUI();
});
