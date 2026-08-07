/**
 * =================================================================
 * Salon Information System (SIS) - js/ui.js
 * [役割: DOM操作・UI制御・イベントハンドリング]
 * =================================================================
 */

// -----------------------------------------------------------------
// 1. DOM要素（画面のパーツ）の取得
// -----------------------------------------------------------------
const form = document.getElementById("reservation-form");
const nameInput = document.getElementById("name");
const nameKanaInput = document.getElementById("name_kana");
const telInput = document.getElementById("tel");
const emailInput = document.getElementById("email");
const memoInput = document.getElementById("memo");

const dateInput = document.getElementById("date");
const staffSelect = document.getElementById("staff");
const menuContainer = document.getElementById("menu-container");
const submitBtn = document.getElementById("submit-btn");

// ナビゲーションおよび機能ボタン
const toStep2Btn = document.getElementById("to-step-2-btn");
const toStep3Btn = document.getElementById("to-step-3-btn");
const backToStep1Btn = document.getElementById("back-to-step-1-btn");
const backToStep2Btn = document.getElementById("back-to-step-2-btn");
const goToCheckBtn = document.getElementById("go-to-check-btn");
const backFromCheckBtn = document.getElementById("back-from-check-btn");
const checkBtn = document.getElementById("check-btn");
const cancelChangeBtn = document.getElementById("cancel-change-btn");

// コンテナ（画面のブロック）および結果描画エリア
const step1Container = document.getElementById("step-1-container");
const step2Container = document.getElementById("step-2-container");
const step3Container = document.getElementById("step-3-container");
const checkTabContainer = document.getElementById("check-tab-container");
const resultsArea = document.getElementById("check-results-area");

// タイムテーブル表示パーツ
const timetableContainer = document.getElementById("timetable-container");
const timetableLoading = document.getElementById("timetable-loading");
const selectedDateInput = document.getElementById("selected-date");
const selectedTimeInput = document.getElementById("selected-time");

// -----------------------------------------------------------------
// 2. システム初期化 & UIセットアップ
// -----------------------------------------------------------------
async function ensureSystemSettingsLoaded() {
  if (AppState.systemSettings) {
    return AppState.systemSettings;
  }

  const settings = await fetchSystemSettingsApi();
  if (!settings || settings.success === false) {
    throw new Error(settings && settings.message ? settings.message : "システム設定の読み込みに失敗しました");
  }

  AppState.systemSettings = settings;
  applySystemSettings(settings);
  return settings;
}

function applySystemSettings(settings) {
  CONFIG.MAX_FUTURE_DAYS = settings.maxFutureDays;
  CONFIG.SHOW_STAFF_SELECTOR = settings.showStaffSelector;
  CONFIG.ALLOW_NO_ASSIGN = settings.allowNoAssign;
  CONFIG.NO_ASSIGN_LABEL = settings.noAssignLabel || "指名なし";
  CONFIG.STAFF_LIST = Array.isArray(settings.staffList) ? settings.staffList : [];
  CONFIG.MENU_SELECTOR_TYPE = settings.menuSelectorType || "TYPE_B";
  CONFIG.SHOW_MENU_MINUTES = settings.showMenuMinutes !== false;
  CONFIG.SHOW_MENU_PRICE = settings.showMenuPrice !== false;
  CONFIG.MENU_MASTER = settings.menuMaster || {};
}

function setupDateInputRange() {
  if (!dateInput) return;

  const today = new Date();
  dateInput.min = formatLocalDateInputValue(today);
  dateInput.max = getLocalDateAfterDays(CONFIG.MAX_FUTURE_DAYS);
}

function setupStaffSelector() {
  const staffGroup = document.getElementById("staff-group");
  if (!staffSelect) return;

  staffSelect.innerHTML = "";

  if (CONFIG.SHOW_STAFF_SELECTOR === false) {
    if (staffGroup) staffGroup.style.display = "none";

    if (CONFIG.ALLOW_NO_ASSIGN) {
      const defaultOpt = document.createElement("option");
      defaultOpt.value = CONFIG.NO_ASSIGN_LABEL;
      defaultOpt.textContent = `${CONFIG.NO_ASSIGN_LABEL} (店舗全体の空き状況)`;
      staffSelect.appendChild(defaultOpt);
      staffSelect.value = CONFIG.NO_ASSIGN_LABEL;
    } else if (CONFIG.STAFF_LIST.length > 0) {
      const firstStaff = CONFIG.STAFF_LIST[0];
      const opt = document.createElement("option");
      opt.value = firstStaff;
      opt.textContent = firstStaff;
      staffSelect.appendChild(opt);
      staffSelect.value = firstStaff;
    }

    return;
  }

  if (staffGroup) staffGroup.style.display = "block";

  if (CONFIG.ALLOW_NO_ASSIGN === true) {
    const defaultOpt = document.createElement("option");
    defaultOpt.value = CONFIG.NO_ASSIGN_LABEL;
    defaultOpt.textContent = `${CONFIG.NO_ASSIGN_LABEL} (店舗全体の空き状況)`;
    staffSelect.appendChild(defaultOpt);
  } else {
    const placeholderOpt = document.createElement("option");
    placeholderOpt.value = "";
    placeholderOpt.textContent = "担当スタッフを選択してください";
    placeholderOpt.disabled = true;
    placeholderOpt.selected = true;
    staffSelect.appendChild(placeholderOpt);
  }

  CONFIG.STAFF_LIST.forEach(staffName => {
    const opt = document.createElement("option");
    opt.value = staffName;
    opt.textContent = staffName;
    staffSelect.appendChild(opt);
  });
}

async function initializeSystemUI() {
  await ensureSystemSettingsLoaded();
  setupDateInputRange();
  setupStaffSelector();
  renderMenuUI();
}

// -----------------------------------------------------------------
// 3. メニューUI制御
// -----------------------------------------------------------------
function renderMenuUI() {
  if (!menuContainer) return;

  const menuMaster = CONFIG.MENU_MASTER || {};
  const menuNames = Object.keys(menuMaster);
  const selectType = CONFIG.MENU_SELECTOR_TYPE || "TYPE_B";

  if (menuNames.length === 0) {
    menuContainer.innerHTML = '<div class="note">メニューを読み込んでいます...</div>';
    return;
  }

  if (selectType === "TYPE_A") {
    let html = '<select id="menu-select" class="form-select" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ccc;">';
    html += '<option value="" disabled selected>メニューを選択してください</option>';

    menuNames.forEach(menuName => {
      const label = buildMenuLabel(menuName, menuMaster[menuName]);
      html += `<option value="${escapeHtml(menuName)}">${escapeHtml(label)}</option>`;
    });

    html += "</select>";
    menuContainer.innerHTML = html;
  } else {
    let html = '<div class="menu-checkbox-list" style="display: flex; flex-direction: column; gap: 8px;">';

    menuNames.forEach(menuName => {
      const label = buildMenuLabel(menuName, menuMaster[menuName]);
      html += `
        <label class="checkbox-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="checkbox" name="selected_menus" value="${escapeHtml(menuName)}" class="menu-checkbox">
          <span>${escapeHtml(label)}</span>
        </label>
      `;
    });

    html += "</div>";
    menuContainer.innerHTML = html;
  }

  if (isChangeMode() && AppState.changeModeData.oldMenu) {
    applySelectedMenuValue(AppState.changeModeData.oldMenu);
  }
}

function getSelectedMenusValue() {
  const selectType = CONFIG.MENU_SELECTOR_TYPE || "TYPE_B";

  if (selectType === "TYPE_A") {
    const menuSelect = document.getElementById("menu-select");
    return menuSelect ? menuSelect.value : "";
  }

  const checkboxes = document.querySelectorAll(".menu-checkbox:checked");
  return Array.from(checkboxes).map(cb => cb.value).join(",");
}

function applySelectedMenuValue(menuValue) {
  if (!menuValue) return;

  const selectType = CONFIG.MENU_SELECTOR_TYPE || "TYPE_B";

  if (selectType === "TYPE_A") {
    const menuSelect = document.getElementById("menu-select");
    if (menuSelect) {
      menuSelect.value = menuValue;
    }
    return;
  }

  const oldMenus = menuValue.split(",");
  document.querySelectorAll(".menu-checkbox").forEach(cb => {
    cb.checked = oldMenus.includes(cb.value);
  });
}

function clearSelectedMenuValue() {
  const selectType = CONFIG.MENU_SELECTOR_TYPE || "TYPE_B";

  if (selectType === "TYPE_A") {
    const menuSelect = document.getElementById("menu-select");
    if (menuSelect) {
      menuSelect.selectedIndex = 0;
    }
    return;
  }

  document.querySelectorAll(".menu-checkbox").forEach(cb => {
    cb.checked = false;
  });
}

// -----------------------------------------------------------------
// 4. セクション切替・タイムテーブル描画
// -----------------------------------------------------------------
function showSection(targetContainer) {
  const sections = [step1Container, step2Container, step3Container, checkTabContainer];
  sections.forEach(sec => {
    if (sec) sec.style.display = "none";
  });

  if (targetContainer) targetContainer.style.display = "block";
}

function renderEmptyTimetable(message) {
  timetableContainer.innerHTML = `<div class="no-data text-danger">${escapeHtml(message)}</div>`;
}

function renderTimetable(multiDayStatuses) {
  if (multiDayStatuses && multiDayStatuses.success === false) {
    renderEmptyTimetable(multiDayStatuses.message || "空き状況の取得に失敗しました。");
    return;
  }

  if (!multiDayStatuses || Object.keys(multiDayStatuses).length === 0) {
    renderEmptyTimetable("空き枠がありません。");
    return;
  }

  const dateKeys = Object.keys(multiDayStatuses).sort();
