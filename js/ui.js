/**
 * =================================================================
 * Salon Information System (SIS) - js/ui.js
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
// 2. システム初期化 & UIセットアップ
// -----------------------------------------------------------------
/**
 * api.js で取得した設定値をもとに画面を作る処理
 */
async function initializeSystemUI() {
  const settings = await fetchSystemSettingsApi();
  if (!settings || settings.success === false) {
    console.error("システム設定の読み込みに失敗しました");
    return;
  }

  // カレンダーの選択範囲制御（過去の日付を選べなくする）
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  if (dateInput) {
    dateInput.min = todayStr;
    const maxFutureDays = settings.maxFutureDays || 60;
    const maxDateObj = new Date(today.getTime() + (maxFutureDays * 24 * 60 * 60 * 1000));
    dateInput.max = maxDateObj.toISOString().split('T')[0];
  }

  // スタッフ選択プルダウンの構築
  const staffGroup = document.getElementById('staff-group');
  if (staffSelect) {
    staffSelect.innerHTML = '';
    if (settings.showStaffSelector === false) {
      if (staffGroup) staffGroup.style.display = 'none';
      if (settings.staffList && settings.staffList.length > 0) {
        staffSelect.innerHTML = `<option value="${settings.staffList[0]}">${settings.staffList[0]}</option>`;
        staffSelect.value = settings.staffList[0];
      }
    } else {
      if (staffGroup) staffGroup.style.display = 'block';

      if (settings.allowNoAssign === true) {
        const defaultOpt = document.createElement('option');
        defaultOpt.value = '指名なし';
        defaultOpt.textContent = '指名なし (店舗全体の空き状況)';
        staffSelect.appendChild(defaultOpt);
      } else {
        const placeholderOpt = document.createElement('option');
        placeholderOpt.value = '';
        placeholderOpt.textContent = '担当スタッフを選択してください';
        placeholderOpt.disabled = true;
        placeholderOpt.selected = true;
        staffSelect.appendChild(placeholderOpt);
      }

      if (settings.staffList && settings.staffList.length > 0) {
        settings.staffList.forEach(staffName => {
          const opt = document.createElement('option');
          opt.value = staffName;
          opt.textContent = staffName;
          staffSelect.appendChild(opt);
        });
      }
    }
  }

  // 設定値（CONFIG）へ反映
  if (settings.menuSelectorType) CONFIG.MENU_SELECTOR_TYPE = settings.menuSelectorType;
  if (settings.showMenuMinutes !== undefined) CONFIG.SHOW_MENU_MINUTES = settings.showMenuMinutes;
  if (settings.showMenuPrice !== undefined) CONFIG.SHOW_MENU_PRICE = settings.showMenuPrice;
  if (settings.menuMaster) CONFIG.MENU_MASTER = settings.menuMaster;

  // メニュー画面を表示
  renderMenuUI();
}

// -----------------------------------------------------------------
// 3. メニューUI制御
// -----------------------------------------------------------------
function renderMenuUI() {
  if (!menuContainer) return;
  
  const menuMaster = (typeof CONFIG !== 'undefined' && CONFIG.MENU_MASTER) ? CONFIG.MENU_MASTER : {};
  let menuNames = Object.keys(menuMaster);
  
  if (menuNames.length > 0 && !isNaN(menuNames[0])) {
    if (Array.isArray(CONFIG.MENU_MASTER)) {
      menuNames = CONFIG.MENU_MASTER;
    }
  }
  
  const selectType = CONFIG.MENU_SELECTOR_TYPE || "TYPE_B";
  const showMinutes = CONFIG.SHOW_MENU_MINUTES !== false;
  const showPrice = CONFIG.SHOW_MENU_PRICE !== false;
  
  if (menuNames.length === 0) {
    menuContainer.innerHTML = '<div class="note">メニューを読み込んでいます...</div>';
    return;
  }
  
  if (selectType === "TYPE_A") {
    let html = '<select id="menu-select" class="form-select" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ccc;">';
    html += '<option value="" disabled selected>メニューを選択してください</option>';
    
    menuNames.forEach((menuName) => {
      if (typeof menuName === 'object' && menuName !== null) {
        menuName = menuName.name || Object.keys(menuName)[0];
      }
      const menuData = menuMaster[menuName] || {};
      let label = menuName;
      let meta = [];
      
      if (showMinutes && menuData.minutes) meta.push(`${menuData.minutes}分`);
      if (showPrice && menuData.price !== undefined && menuData.price !== null) meta.push(`￥${Number(menuData.price).toLocaleString()}`);
      if (meta.length > 0) label += ` (${meta.join(' / ')})`;
      
      html += `<option value="${menuName}">${label}</option>`;
    });
    html += '</select>';
    menuContainer.innerHTML = html;
  } else {
    let html = '<div class="menu-checkbox-list" style="display: flex; flex-direction: column; gap: 8px;">';
    menuNames.forEach((menuName) => {
      if (typeof menuName === 'object' && menuName !== null) {
        menuName = menuName.name || Object.keys(menuName)[0];
      }
      const menuData = menuMaster[menuName] || {};
      let label = menuName;
      let meta = [];
      
      if (showMinutes && menuData.minutes) meta.push(`${menuData.minutes}分`);
      if (showPrice && menuData.price !== undefined && menuData.price !== null) meta.push(`￥${Number(menuData.price).toLocaleString()}`);
      if (meta.length > 0) label += ` (${meta.join(' / ')})`;
      
      html += `
        <label class="checkbox-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="checkbox" name="selected_menus" value="${menuName}" class="menu-checkbox">
          <span>${label}</span>
        </label>
      `;
    });
    html += '</div>';
    menuContainer.innerHTML = html;
  }

  if (typeof changeModeData !== 'undefined' && changeModeData && changeModeData.oldMenu) {
    applySelectedMenuValue(changeModeData.oldMenu);
  }
}

function getSelectedMenusValue() {
  const selectType = CONFIG.MENU_SELECTOR_TYPE || "TYPE_B";
  if (selectType === "TYPE_A") {
    const menuSelect = document.getElementById('menu-select');
    return menuSelect ? menuSelect.value : '';
  } else {
    const checkboxes = document.querySelectorAll('.menu-checkbox:checked');
    return Array.from(checkboxes).map(cb => cb.value).join(',');
  }
}

function applySelectedMenuValue(menuValue) {
  if (!menuValue) return;
  const selectType = CONFIG.MENU_SELECTOR_TYPE || "TYPE_B";

  if (selectType === "TYPE_A") {
    const menuSelect = document.getElementById('menu-select');
    if (menuSelect) menuSelect.value = menuValue;
  } else {
    const oldMenus = menuValue.split(',');
    document.querySelectorAll('.menu-checkbox').forEach(cb => {
      cb.checked = oldMenus.includes(cb.value);
    });
  }
}

function clearSelectedMenuValue() {
  const selectType = CONFIG.MENU_SELECTOR_TYPE || "TYPE_B";
  if (selectType === "TYPE_A") {
    const menuSelect = document.getElementById('menu-select');
    if (menuSelect) menuSelect.selectedIndex = 0;
  } else {
    document.querySelectorAll('.menu-checkbox').forEach(cb => cb.checked = false);
  }
}

// -----------------------------------------------------------------
// 4. セクション切替・タイムテーブル（時間表）描画
// -----------------------------------------------------------------
function showSection(targetContainer) {
  const sections = [step1Container, step2Container, step3Container, checkTabContainer];
  sections.forEach(sec => { if (sec) sec.style.display = 'none'; });
  if (targetContainer) targetContainer.style.display = 'block';
}

function renderTimetable(multiDayStatuses) {
  if (multiDayStatuses && multiDayStatuses.success === false) {
    timetableContainer.innerHTML = `<div class="no-data text-danger" style="word-break: break-all;">【エラー検知】<br>${multiDayStatuses.message}</div>`;
    return;
  }

  if (!multiDayStatuses || Object.keys(multiDayStatuses).length === 0) {
    timetableContainer.innerHTML = '<div class="no-data text-danger">空き状況の取得に失敗しました。</div>';
    return;
  }

  const dateKeys = Object.keys(multiDayStatuses).sort();
  let timeSlots = [];
  
  for (const dKey of dateKeys) {
    if (multiDayStatuses[dKey] && !multiDayStatuses[dKey].SHOP_HOLIDAY) {
      const slots = Object.keys(multiDayStatuses[dKey]).filter(key => /^\d{1,2}:\d{2}$/.test(key));
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
  
  if (timeSlots.length === 0) {
    timeSlots = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
  }

  let html = '<table class="timetable-table"><thead><tr><th>時間</th>';
  
  dateKeys.forEach(dStr => {
    const cleanStr = dStr.replace(/-/g, '/');
    const d = new Date(cleanStr);
    let label = dStr;
    if (!isNaN(d.getTime())) {
      const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];
      label = `${d.getMonth() + 1}/${d.getDate()}(${dayLabels[d.getDay()]})`;
    }
    html += `<th>${label}</th>`;
  });
  html += '</tr></thead><tbody>';

  timeSlots.forEach(timeStr => {
    html += `<tr><td class="time-col">${timeStr}</td>`;
    
    dateKeys.forEach(dStr => {
      const dayData = multiDayStatuses[dStr];
      if (dayData && dayData.SHOP_HOLIDAY) {
        if (timeSlots.indexOf(timeStr) === 0) {
          html += `<td rowspan="${timeSlots.length}" class="shop-holiday-cell"><strong>${dayData.HOLIDAY_TEXT || '休業日'}</strong></td>`;
        }
        return;
      }
      
      const status = dayData ? dayData[timeStr] : '×';
      if (status === '○') {
        html += `<td class="slot-cell slot-available" data-date="${dStr}" data-time="${timeStr}">○</td>`;
      } else {
        html += `<td class="slot-cell slot-unavailable">×</td>`;
      }
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  timetableContainer.innerHTML = html;

  document.querySelectorAll('.slot-available').forEach(cell => {
    cell.addEventListener('click', (e) => {
      document.querySelectorAll('.slot-available').forEach(c => c.classList.remove('selected'));
      const target = e.currentTarget;
      target.classList.add('selected');
      
      selectedDateInput.value = target.getAttribute('data-date');
      selectedTimeInput.value = target.getAttribute('data-time');
      
      submitBtn.disabled = false;
      const isChange = typeof changeModeData !== 'undefined' && changeModeData;
      submitBtn.textContent = isChange ? '上記の内容で変更を確定する' : '上記の内容で予約を確定する';
    });
  });
}

async function updateAvailableTimes() {
  const dateVal = dateInput.value;
  const staffVal = staffSelect.value;
  const menuVal = getSelectedMenusValue(); 

  if (!dateVal || !staffVal || !menuVal) {
    alert('日付、スタッフ、メニューをすべて選択してください。');
    return false;
  }

  timetableContainer.innerHTML = '';
  if (timetableLoading) timetableLoading.style.display = 'block';
  
  try {
    const resId = (typeof changeModeData !== 'undefined' && changeModeData && changeModeData.resId) ? changeModeData.resId : "";
    const multiDayStatuses = await fetchTimetableDataApi(dateVal, staffVal, menuVal, resId);
    
    // APIから通信エラーや処理失敗が返ってきた場合
    if (multiDayStatuses && multiDayStatuses.success === false) {
      console.error('タイムテーブル取得失敗:', multiDayStatuses.message);
      timetableContainer.innerHTML = `<div class="no-data text-danger">データの取得に失敗しました:<br>${multiDayStatuses.message}</div>`;
      return false;
    }

    renderTimetable(multiDayStatuses);
    
    selectedDateInput.value = '';
    selectedTimeInput.value = '';
    submitBtn.disabled = true;
    submitBtn.textContent = '日時を選択してください';
    return true;
  } catch (error) {
    console.error('空き状況更新エラー:', error);
    timetableContainer.innerHTML = `<div class="no-data text-danger">通信エラーが発生しました:<br>${error.message || error}</div>`;
    return false;
  } finally {
    if (timetableLoading) timetableLoading.style.display = 'none';
  }
}

// -----------------------------------------------------------------
// 5. 予約検索 & 変更 / キャンセル処理
// -----------------------------------------------------------------
async function fetchReservations() {
  const telVal = document.getElementById('check-tel').value.trim();
  const emailVal = document.getElementById('check-email').value.trim();

  if (!telVal || !emailVal) {
    alert('電話番号とメールアドレスの両方を入力してください。');
    return;
  }

  checkBtn.disabled = true;
  checkBtn.textContent = '検索中...';
  resultsArea.innerHTML = '<div class="no-data">予約データを検索しています...</div>';

  saveCustomerDataToCache();

  try {
    const result = await fetchCustomerReservationsApi(telVal, emailVal);

    if (!result.success) {
      resultsArea.innerHTML = `<div class="no-data text-danger">${result.message}</div>`;
      return;
    }

    if (!result.reservations || result.reservations.length === 0) {
      resultsArea.innerHTML = '<div class="no-data">現在、条件に一致する今日以降のご予約はありません。</div>';
      return;
    }

    let htmlContent = '<h3 class="results-title">お客様のご予約状況</h3>';
    
    result.reservations.forEach((res) => {
      const dateParts = res.date.split('-');
      const formattedDate = dateParts.length === 3 ? `${dateParts[0]}年${dateParts[1]}月${dateParts[2]}日` : res.date;
      const timeParts = res.time.split(':');
      const formattedTime = timeParts.length >= 2 ? `${timeParts[0]}時${timeParts[1]}分` : res.time;

      const safeMenu = (res.menu || '').replace(/"/g, '&quot;');
      const safeStaff = (res.staff || '').replace(/"/g, '&quot;');
      const safeMemo = (res.memo || '').replace(/"/g, '&quot;');
      const safeId = (res.id || '').replace(/"/g, '&quot;');

      htmlContent += `
        <div class="reservation-card">
          <div class="res-row"><span class="res-label">予約日</span> ${formattedDate}</div>
          <div class="res-row"><span class="res-label">予約時間</span> ${formattedTime}</div>
          <div class="res-row"><span class="res-label">メニュー</span> ${res.menu}</div>
          <div class="res-row"><span class="res-label">担当</span> ${res.staff}</div>
          ${res.memo ? `<div class="res-row"><span class="res-label">備考・メモ</span> ${res.memo}</div>` : ''}
          <div class="res-card-divider"><span class="res-label">予約ID</span> <span class="res-id-badge">${safeId}</span></div>
          <div class="res-created-time">⏱ 受付時間：${res.createdAt}</div>
          <div class="btn-action-group">
            <button type="button" class="btn-change" data-id="${safeId}" data-date="${res.date}" data-time="${res.time}" data-staff="${safeStaff}" data-menu="${safeMenu}" data-memo="${safeMemo}">日時を変更する</button>
            <button type="button" class="btn-cancel" data-id="${safeId}">この予約をキャンセルする</button>
          </div>
        </div>
      `;
    });

    resultsArea.innerHTML = htmlContent;
  } catch (error) {
    console.error('予約検索エラー:', error);
    resultsArea.innerHTML = '<div class="no-data text-danger">エラーが発生しました。時間を置いて再度お試しください。</div>';
  } finally {
    checkBtn.disabled = false;
    checkBtn.textContent = 'ご予約状況を確認する';
  }
}

async function startChangeMode(buttonEl) {
  // 安全にデータ属性を取得（nullやundefinedの場合はデフォルト値を設定）
  const rawStaff = buttonEl.getAttribute('data-staff');
  const staffVal = (rawStaff && rawStaff !== 'null' && rawStaff !== 'undefined') ? rawStaff : '指名なし';

  window.changeModeData = {
    resId: buttonEl.getAttribute('data-id') || '',
    oldDate: buttonEl.getAttribute('data-date') || '',
    oldTime: buttonEl.getAttribute('data-time') || '',
    oldStaff: staffVal,
    oldMenu: buttonEl.getAttribute('data-menu') || ''
  };

  await initializeSystemUI();

  // ドロップダウン内に同じ値が存在する場合のみセットする安全処理
  if (staffSelect) {
    let exists = Array.from(staffSelect.options).some(opt => opt.value === changeModeData.oldStaff);
    if (exists) {
      staffSelect.value = changeModeData.oldStaff;
    } else if (staffSelect.options.length > 0) {
      staffSelect.selectedIndex = 0;
    }
  }

  applySelectedMenuValue(changeModeData.oldMenu);
  if (memoInput) memoInput.value = buttonEl.getAttribute('data-memo') || '';
  if (dateInput) dateInput.value = changeModeData.oldDate;

  const prevDateParts = changeModeData.oldDate.split('-');
  const formattedOldDate = prevDateParts.length === 3 ? `${prevDateParts[0]}年${prevDateParts[1]}月${prevDateParts[2]}日` : changeModeData.oldDate;
  
  const prevIdEl = document.getElementById('prev-id');
  const prevDatetimeEl = document.getElementById('prev-datetime');
  const prevMenuEl = document.getElementById('prev-menu');
  const prevStaffEl = document.getElementById('prev-staff');
  const changeBannerEl = document.getElementById('change-banner');

  if (prevIdEl) prevIdEl.textContent = changeModeData.resId;
  if (prevDatetimeEl) prevDatetimeEl.textContent = `${formattedOldDate}  ${changeModeData.oldTime}`;
  if (prevMenuEl) prevMenuEl.textContent = changeModeData.oldMenu;
  if (prevStaffEl) prevStaffEl.textContent = changeModeData.oldStaff;

  if (changeBannerEl) changeBannerEl.style.display = 'block';
  if (submitBtn) submitBtn.textContent = '日時を選択してください';

  showSection(step2Container);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function abortChangeMode() {
  window.changeModeData = null;
  const changeBannerEl = document.getElementById('change-banner');
  if (changeBannerEl) changeBannerEl.style.display = 'none';
  
  const prevIdEl = document.getElementById('prev-id');
  const prevDatetimeEl = document.getElementById('prev-datetime');
  const prevMenuEl = document.getElementById('prev-menu');
  const prevStaffEl = document.getElementById('prev-staff');

  if (prevIdEl) prevIdEl.textContent = '';
  if (prevDatetimeEl) prevDatetimeEl.textContent = '';
  if (prevMenuEl) prevMenuEl.textContent = '';
  if (prevStaffEl) prevStaffEl.textContent = '';

  if (submitBtn) submitBtn.textContent = '日時を選択してください';
  
  if (dateInput) dateInput.value = '';
  if (staffSelect && staffSelect.options.length > 0) staffSelect.selectedIndex = 0;
  clearSelectedMenuValue();
  
  if (selectedDateInput) selectedDateInput.value = '';
  if (selectedTimeInput) selectedTimeInput.value = '';
  if (timetableContainer) timetableContainer.innerHTML = '<div class="no-data">条件に沿った空き枠を表示しています。</div>';
  if (submitBtn) submitBtn.disabled = true;
  if (memoInput) memoInput.value = '';
  
  restoreCachedCustomerData();
  initializeSystemUI();
  showSection(step1Container);
}

async function requestCancel(buttonEl) {
  const resId = buttonEl.getAttribute('data-id');
  if (!resId) return;

  if (!confirm(`ご予約（ID: ${resId}）をキャンセルしてもよろしいですか？\n\n※この操作は取り消せません。`)) return;

  resultsArea.innerHTML = '<div class="no-data">予約のキャンセル処理を行っています...</div>';

  try {
    const data = await submitReservationApi('cancel', { resId: resId });

    if (data.success) {
      alert('ご予約のキャンセルが正常に完了しました。');
    } else {
      alert('キャンセルに失敗しました: ' + data.message);
    }
    fetchReservations();
  } catch (error) {
    console.error('キャンセル通信エラー:', error);
    alert('通信エラーが発生しました。時間を置いて再度お試しください。');
    fetchReservations();
  }
}

// -----------------------------------------------------------------
// 6. フォーム送信処理 & イベントリスナー設定
// -----------------------------------------------------------------
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const isChange = typeof changeModeData !== 'undefined' && changeModeData;
  const confirmMsg = isChange 
    ? '選択した新しい日時で予約を変更してもよろしいですか？' 
    : 'この内容で予約を確定してもよろしいですか？';
    
  if (!confirm(confirmMsg)) return;

  submitBtn.disabled = true;
  submitBtn.textContent = isChange ? '予約を変更中...' : '予約を登録中...';

  saveCustomerDataToCache();

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
    payload.resId = changeModeData.resId;
    payload.newDate = selectedDateInput.value;
    payload.newTime = selectedTimeInput.value;
  } else {
    payload.date = selectedDateInput.value;
    payload.time = selectedTimeInput.value;
  }

  try {
    const data = await submitReservationApi(action, payload);
    
    if (data.success) {
      if (isChange) {
        alert('ご予約の変更が正常に完了しました！');
        abortChangeMode();
      } else {
        const msg = data.resId ? `ご予約が完了しました！\n【ご予約ID: ${data.resId}】` : 'ご予約が完了しました！';
        alert(msg);
      }
      
      document.getElementById('check-tel').value = telInput.value;
      document.getElementById('check-email').value = emailInput.value;

      dateInput.value = '';
      if (staffSelect.options.length > 0) staffSelect.selectedIndex = 0; 
      clearSelectedMenuValue();
      
      selectedDateInput.value = '';
      selectedTimeInput.value = '';
      timetableContainer.innerHTML = '<div class="no-data">条件に沿った空き枠を表示しています。</div>';
      submitBtn.disabled = true;
      memoInput.value = '';

      restoreCachedCustomerData();
      await initializeSystemUI();

      if (isChange) {
        showSection(checkTabContainer);
        await fetchReservations();
      } else {
        showSection(step1Container);
      }
    } else {
      alert('処理に失敗しました: ' + data.message);
    }
  } catch (error) {
    console.error('送信エラー:', error);
    alert('通信エラーが発生しました。');
  } finally {
    submitBtn.disabled = false;
  }
});

function initializeEvents() {
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
      
      toStep3Btn.disabled = true;
      const originalText = toStep3Btn.textContent;
      toStep3Btn.textContent = '空き状況を読み込み中...';
      
      const success = await updateAvailableTimes();
      
      toStep3Btn.disabled = false;
      toStep3Btn.textContent = originalText;
      
      if (success) {
        showSection(step3Container);
      }
    });
  }

  if (backToStep1Btn) backToStep1Btn.addEventListener('click', () => showSection(step1Container));
  if (backToStep2Btn) backToStep2Btn.addEventListener('click', () => showSection(step2Container));

  if (goToCheckBtn) {
    goToCheckBtn.addEventListener('click', () => {
      restoreCachedCustomerData();
      showSection(checkTabContainer);
    });
  }
  if (backFromCheckBtn) backFromCheckBtn.addEventListener('click', () => showSection(step1Container));
  if (checkBtn) checkBtn.addEventListener('click', fetchReservations);
  if (cancelChangeBtn) cancelChangeBtn.addEventListener('click', abortChangeMode);

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
// 7. ページ読み込み時の自動実行
// -----------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  initializeSystemUI();
  initializeEvents();
  showSection(step1Container);
});