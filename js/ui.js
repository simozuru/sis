/**
 * =================================================================
 * Salon Information System (SIS) - js/ui.js [Version 4.4.4]
 * [役割: DOM操作・UI制御・イベントハンドリング（予約検索・変更・キャンセルは booking.js へ分離）]
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
const menuMultiSelectNote = document.getElementById('menu-multi-select-note');
const submitBtn = document.getElementById('submit-btn');

// ナビゲーションおよび機能ボタン
const toStep2Btn = document.getElementById('to-step-2-btn');
const toStep3Btn = document.getElementById('to-step-3-btn');
const backToStep1Btn = document.getElementById('back-to-step-1-btn');
const backToStep2Btn = document.getElementById('back-to-step-2-btn');
const goToCheckBtn = document.getElementById('go-to-check-btn');
const goToCheckBtnStep2 = document.getElementById('go-to-check-btn-step2');
const homeBtn = document.getElementById('home-btn');
const shopLogo = document.getElementById('shop-logo');
const pageBody = document.getElementById('page-body');
const stepIndicator = document.getElementById('step-indicator');
const mainTitle = document.getElementById('main-title');
const mainSubtitle = document.getElementById('main-subtitle');
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
const prevTimetableBtn = document.getElementById('prev-timetable-btn');
const nextTimetableBtn = document.getElementById('next-timetable-btn');

// 予約確認タブの入力欄
const checkTelInput = document.getElementById('check-tel');
const checkEmailInput = document.getElementById('check-email');

// 変更前バナー（予約変更モード時に表示するパーツ）
const changeBannerEl = document.getElementById('change-banner');
const prevIdEl = document.getElementById('prev-id');
const prevDatetimeEl = document.getElementById('prev-datetime');
const prevMenuEl = document.getElementById('prev-menu');
const prevStaffEl = document.getElementById('prev-staff');

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
  CONFIG.DISPLAY_DAYS = settings.displayDays;
  CONFIG.CANCEL_BUFFER_HOURS = settings.cancelBufferHours;
  CONFIG.CHANGE_BUFFER_HOURS = settings.changeBufferHours;
  CONFIG.PROVISIONAL_RESERVATION_ENABLED = !!settings.provisionalReservationEnabled;
  CONFIG.PROVISIONAL_RESERVATION_TARGET = settings.provisionalReservationTarget || "ALL";
  CONFIG.HOME_PAGE_URL = settings.homePageUrl || null;
  if (homeBtn) {
    homeBtn.style.display = CONFIG.HOME_PAGE_URL ? 'inline' : 'none';
  }

  CONFIG.BACKGROUND_IMAGE_URL = settings.backgroundImageUrl || null;
  if (pageBody) {
    if (CONFIG.BACKGROUND_IMAGE_URL) {
      pageBody.style.backgroundImage = `url("${CONFIG.BACKGROUND_IMAGE_URL}")`;
      pageBody.classList.add('has-bg-image');
    } else {
      pageBody.style.backgroundImage = '';
      pageBody.classList.remove('has-bg-image');
    }
  }

  CONFIG.HEADER_BRANDING = settings.headerBranding || null;
  const branding = CONFIG.HEADER_BRANDING;
  if (branding && branding.logoUrl && shopLogo) {
    shopLogo.src = branding.logoUrl;
    shopLogo.style.display = 'block';
  }
  if (branding && branding.shopName && mainTitle) {
    mainTitle.textContent = branding.shopName;
    if (mainSubtitle) mainSubtitle.style.display = 'none';
    if (branding.titleFontSize) mainTitle.style.fontSize = branding.titleFontSize;
    if (branding.titleColor) mainTitle.style.color = branding.titleColor;
    if (branding.titleFontFamily) mainTitle.style.fontFamily = branding.titleFontFamily;
  }
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
    defaultOpt.textContent = CONFIG.NO_ASSIGN_LABEL;
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

  // プルダウン式（単一選択）の時は「複数選択可」の表記を隠す
  if (menuMultiSelectNote) {
    menuMultiSelectNote.style.display = isMenuPulldownType() ? 'none' : 'inline';
  }

  const menuMaster = CONFIG.MENU_MASTER || {};
  const menuNames = Object.keys(menuMaster);

  if (menuNames.length === 0) {
    menuContainer.innerHTML = '<div class="note">メニューを読み込んでいます...</div>';
    return;
  }

  let html = '';

  if (isMenuPulldownType()) {
    html += '<select id="menu-select" class="form-select menu-select-box">';
    html += '<option value="" disabled selected>メニューを選択してください</option>';

    menuNames.forEach(menuName => {
      const label = buildMenuLabel(menuName, menuMaster[menuName]);
      html += `<option value="${escapeHtml(menuName)}">${escapeHtml(label)}</option>`;
    });

    html += '</select>';
  } else {
    html += '<div class="menu-checkbox-list">';

    menuNames.forEach(menuName => {
      const label = buildMenuLabel(menuName, menuMaster[menuName]);
      html += `
        <label class="checkbox-label">
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
 * メニュー選択欄がプルダウン形式（TYPE_A）かどうかを判定する
 * @returns {boolean} プルダウン形式なら true
 */
function isMenuPulldownType() {
  return CONFIG.MENU_SELECTOR_TYPE === 'TYPE_A';
}

/**
 * 現在選択されているメニューを取得する
 * @returns {string} メニュー名（複数選択時はカンマ区切り）
 */
function getSelectedMenusValue() {
  if (isMenuPulldownType()) {
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

  if (isMenuPulldownType()) {
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
  if (isMenuPulldownType()) {
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

// 現在タイムテーブルに表示中の開始日と、その表示日数（ページ送りボタンで使用）
let currentTimetableStartDate = '';
let currentTimetableDayCount = 0;

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

  updateStepIndicator(targetContainer);
}

/**
 * 表示中のステップに応じて、上部の進捗表示（①②③）を更新する
 * 予約確認・キャンセル画面（checkTabContainer）の時は、この進捗表示自体を非表示にする
 * @param {HTMLElement} targetContainer - 今から表示するセクション
 */
function updateStepIndicator(targetContainer) {
  if (!stepIndicator) return;

  let currentStep = 0;
  if (targetContainer === step1Container) currentStep = 1;
  else if (targetContainer === step2Container) currentStep = 2;
  else if (targetContainer === step3Container) currentStep = 3;

  if (currentStep === 0) {
    stepIndicator.style.display = 'none';
    return;
  }
  stepIndicator.style.display = 'flex';

  stepIndicator.querySelectorAll('.step-item').forEach(item => {
    const stepNum = parseInt(item.getAttribute('data-step'), 10);
    item.classList.remove('active', 'completed');
    if (stepNum === currentStep) {
      item.classList.add('active');
    } else if (stepNum < currentStep) {
      item.classList.add('completed');
    }
  });

  stepIndicator.querySelectorAll('.step-line').forEach((line, idx) => {
    const lineStepNum = idx + 1; // この線は data-step (idx+1) と (idx+2) の間にある
    line.classList.toggle('completed', lineStepNum < currentStep);
  });
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
    const dayIndex = getDayOfWeekIndex(dStr);
    const dayClass = dayIndex === 6 ? ' class="day-sat"' : (dayIndex === 0 ? ' class="day-sun"' : '');
    html += `<th${dayClass}>${escapeHtml(formatDateHeaderLabel(dStr))}</th>`;
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
        html += `<td class="slot-cell slot-available" data-date="${escapeHtml(dStr)}" data-time="${escapeHtml(timeStr)}">◎</td>`;
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
 * @param {string} [dateOverride] - 指定時はこの日付を起点に取得する（ページ送り用。省略時は画面の日付欄を使う）
 * @returns {Promise<boolean>} 取得と描画に成功したら true
 */
async function updateAvailableTimes(dateOverride) {
  const dateVal = dateOverride || (dateInput ? dateInput.value : '');
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

    // ページ送り（次/前の日程）で使うため、今回表示した開始日と日数を覚えておく
    currentTimetableStartDate = dateVal;
    currentTimetableDayCount = (multiDayStatuses && typeof multiDayStatuses === 'object')
      ? Object.keys(multiDayStatuses).length || CONFIG.DISPLAY_DAYS
      : CONFIG.DISPLAY_DAYS;

    renderTimetable(multiDayStatuses);
    updateTimetableNavButtons();

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

/**
 * 「前の日程を見る」ボタンを、今日より前に戻れないよう無効化する
 */
function updateTimetableNavButtons() {
  if (!prevTimetableBtn) return;
  const todayStr = formatLocalDateInputValue(new Date());
  prevTimetableBtn.disabled = currentTimetableStartDate <= todayStr;
}

/**
 * 次の日程（表示中の続き）へページ送りする
 */
async function goToNextTimetablePage() {
  const dayCount = currentTimetableDayCount || CONFIG.DISPLAY_DAYS;
  const nextDate = addDaysToDateString(currentTimetableStartDate, dayCount);
  await updateAvailableTimes(nextDate);
}

/**
 * 前の日程へページ送りする（今日より前には戻らない）
 */
async function goToPrevTimetablePage() {
  const dayCount = currentTimetableDayCount || CONFIG.DISPLAY_DAYS;
  const prevDate = addDaysToDateString(currentTimetableStartDate, -dayCount);
  const todayStr = formatLocalDateInputValue(new Date());
  await updateAvailableTimes(prevDate < todayStr ? todayStr : prevDate);
}

// -----------------------------------------------------------------
// 6. フォーム送信処理
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
    : (!CONFIG.PROVISIONAL_RESERVATION_ENABLED
        ? 'この内容で予約を確定してもよろしいですか？'
        : (CONFIG.PROVISIONAL_RESERVATION_TARGET === 'NEW_ONLY'
            // 新規のお客様だけ仮予約になる設定の場合、送信前は仮予約かどうか確定できないため中立的な文言にする
            ? 'この内容で予約を送信してもよろしいですか？'
            : 'この内容で仮予約を申請してもよろしいですか？'));

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
      renderChangeBanner(null);
    } else {
      const isProvisional = !!data.isProvisional;
      const baseMsg = isProvisional ? 'ご予約を申請しました！' : 'ご予約が完了しました！';
      const msg = data.resId ? `${baseMsg}\n【ご予約ID: ${data.resId}】` : baseMsg;
      alert(msg);
    }

    // 確認タブの入力欄にも今回の連絡先を反映しておく
    if (checkTelInput) checkTelInput.value = telInput.value;
    if (checkEmailInput) checkEmailInput.value = emailInput.value;

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
// 7. イベントリスナー設定
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

  const goToCheckHandler = () => {
    applyCachedCustomerDataToForm();
    showSection(checkTabContainer);
  };

  if (goToCheckBtn) {
    goToCheckBtn.addEventListener('click', goToCheckHandler);
  }

  if (goToCheckBtnStep2) {
    goToCheckBtnStep2.addEventListener('click', goToCheckHandler);
  }

  if (homeBtn) {
    homeBtn.addEventListener('click', () => {
      if (CONFIG.HOME_PAGE_URL) {
        window.location.href = CONFIG.HOME_PAGE_URL;
      }
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

  if (nextTimetableBtn) {
    nextTimetableBtn.addEventListener('click', async () => {
      nextTimetableBtn.disabled = true;
      await goToNextTimetablePage();
      nextTimetableBtn.disabled = false;
    });
  }

  if (prevTimetableBtn) {
    prevTimetableBtn.addEventListener('click', async () => {
      prevTimetableBtn.disabled = true;
      await goToPrevTimetablePage();
    });
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
// 8. ページ読み込み時の自動実行
// -----------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  initializeEvents();
  applyCachedCustomerDataToForm();
  showSection(step1Container);
  initializeSystemUI();
});
