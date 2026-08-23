/**
 * =================================================================
 * Salon Information System (SIS) - js/admin.js [Version 1.0.0]
 * [役割: 管理画面のログイン・セッション維持・ログアウト]
 * =================================================================
 */

const SESSION_STORAGE_KEY = 'sis_admin_password';

const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const loginForm = document.getElementById('login-form');
const adminPasswordInput = document.getElementById('admin-password');
const loginError = document.getElementById('login-error');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');

const reportStartDateInput = document.getElementById('report-start-date');
const reportEndDateInput = document.getElementById('report-end-date');
const runReportBtn = document.getElementById('run-report-btn');
const reportError = document.getElementById('report-error');
const reportResults = document.getElementById('report-results');
const designationSummary = document.getElementById('designation-summary');
const designationByStaff = document.getElementById('designation-by-staff');
const menuPerformanceTbody = document.getElementById('menu-performance-tbody');
const menuRateTbody = document.getElementById('menu-rate-tbody');
const quickRangeButtons = document.querySelectorAll('.btn-quick-range');
const reportTypeSelect = document.getElementById('report-type-select');
const designationReportCard = document.getElementById('designation-report-card');
const menuCountReportCard = document.getElementById('menu-count-report-card');
const menuRateReportCard = document.getElementById('menu-rate-report-card');
const timeSlotReportCard = document.getElementById('time-slot-report-card');
const newRepeatReportCard = document.getElementById('new-repeat-report-card');
const frequencyReportCard = document.getElementById('frequency-report-card');
const dormantReportCard = document.getElementById('dormant-report-card');
const dateRangeControls = document.getElementById('date-range-controls');
const dormantControls = document.getElementById('dormant-controls');
const dormantMonthsInput = document.getElementById('dormant-months-input');
const timeSlotTableWrap = document.getElementById('time-slot-table-wrap');
const newRepeatSummary = document.getElementById('new-repeat-summary');
const frequencySummary = document.getElementById('frequency-summary');
const dormantCountLabel = document.getElementById('dormant-count-label');
const dormantTbody = document.getElementById('dormant-tbody');

const tabButtons = document.querySelectorAll('.tab-btn');
const tabPages = document.querySelectorAll('.tab-page');

const settings1Loading = document.getElementById('settings1-loading');
const settings1Error = document.getElementById('settings1-error');
const settings1SavedMsg = document.getElementById('settings1-saved-msg');
const settings1Form = document.getElementById('settings1-form');
const s1ShopName = document.getElementById('s1-shop-name');
const s1LogoUrl = document.getElementById('s1-logo-url');
const s1ContactPhone = document.getElementById('s1-contact-phone');
const s1ContactHours = document.getElementById('s1-contact-hours');
const s1ContactClosed = document.getElementById('s1-contact-closed');
const businessHoursRows = document.getElementById('business-hours-rows');
const menuMasterRows = document.getElementById('menu-master-rows');
const addMenuRowBtn = document.getElementById('add-menu-row-btn');
const staffNameRows = document.getElementById('staff-name-rows');
const s1MaxCapacity = document.getElementById('s1-max-capacity');
const s1ReminderDays = document.getElementById('s1-reminder-days');
const saveSettings1Btn = document.getElementById('save-settings1-btn');

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
let settings1Loaded = false; // タブを開くたびに再取得しないよう、読み込み済みかどうかを覚えておく

// レポートの種類ごとに、表示するカードの要素IDを対応させておく
const REPORT_CARD_MAP = {
  designation: designationReportCard,
  menuCount: menuCountReportCard,
  menuRate: menuRateReportCard,
  timeSlot: timeSlotReportCard,
  newRepeat: newRepeatReportCard,
  frequency: frequencyReportCard,
  dormant: dormantReportCard
};


/**
 * 管理画面のAPI（doPost）に、合言葉付きでリクエストを送る共通関数
 * 今後、管理画面の機能を追加する際は、この関数の形を参考にしてほしい
 * @param {string} action - サーバー側で処理する内容
 * @param {Object} [extraParams] - action以外に送りたい追加パラメータ
 * @returns {Promise<Object>}
 */
async function callAdminApi(action, extraParams = {}) {
  const password = sessionStorage.getItem(SESSION_STORAGE_KEY) || '';
  const body = Object.assign({ action: action, password: password }, extraParams);

  const response = await fetch(CONFIG.GAS_WEB_APP_URL, {
    method: 'POST',
    body: JSON.stringify(body)
  });
  return await response.json();
}

/**
 * ログイン画面・管理画面本体の表示を切り替える
 * @param {boolean} isLoggedIn
 */
function showDashboard(isLoggedIn) {
  if (loginContainer) loginContainer.style.display = isLoggedIn ? 'none' : 'flex';
  if (dashboardContainer) dashboardContainer.style.display = isLoggedIn ? 'block' : 'none';

  if (isLoggedIn) {
    setupReportTypeOptions();
  }
}

/**
 * スタッフ人数を確認し、2人未満の場合は「指名率」の選択肢自体を消す
 * （お客様向けの getSystemSettings は認証不要の公開APIなので、そのまま利用する）
 */
async function setupReportTypeOptions() {
  if (!reportTypeSelect) return;

  try {
    const response = await fetch(`${CONFIG.GAS_WEB_APP_URL}?method=getSystemSettings`);
    const settings = await response.json();
    const staffCount = (settings && Array.isArray(settings.staffList)) ? settings.staffList.length : 0;

    const designationOption = reportTypeSelect.querySelector('option[value="designation"]');
    if (designationOption) {
      designationOption.style.display = staffCount >= 2 ? '' : 'none';
      // 指名率が選べない場合、プルダウンの選択が「指名率」のままにならないようにする
      if (staffCount < 2 && reportTypeSelect.value === 'designation') {
        reportTypeSelect.value = 'menuCount';
      }
    }
  } catch (error) {
    console.error('スタッフ人数の取得に失敗しました（指名率の表示判定をスキップします）:', error);
  }

  updateVisibleReportCard();
}

/**
 * プルダウンで選ばれている種類のカードだけを表示し、操作欄（期間指定 or 月数指定）も切り替える
 */
function updateVisibleReportCard() {
  if (!reportTypeSelect) return;
  const selected = reportTypeSelect.value;

  Object.keys(REPORT_CARD_MAP).forEach(key => {
    const card = REPORT_CARD_MAP[key];
    if (card) card.style.display = (key === selected) ? 'block' : 'none';
  });

  const isDormant = (selected === 'dormant');
  if (dateRangeControls) dateRangeControls.style.display = isDormant ? 'none' : 'flex';
  if (dormantControls) dormantControls.style.display = isDormant ? 'flex' : 'none';
}

if (reportTypeSelect) {
  reportTypeSelect.addEventListener('change', updateVisibleReportCard);
}

/**
 * タブの切り替え。「基本設定」タブは、初めて開いた時だけサーバーから読み込む
 */
if (tabButtons) {
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      tabButtons.forEach(b => b.classList.toggle('active', b === btn));
      tabPages.forEach(page => {
        page.style.display = (page.id === `tab-${targetTab}`) ? 'block' : 'none';
      });

      if (targetTab === 'settings1' && !settings1Loaded) {
        loadSettings1();
      }
    });
  });
}

/**
 * Dateオブジェクトを "yyyy-MM-dd" 形式の文字列に変換する
 * @param {Date} d
 * @returns {string}
 */
function formatDateForInput(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * クイックボタン（今週・今月・先月）に応じた開始日・終了日を計算する
 * @param {string} rangeKey
 * @returns {{start: Date, end: Date}}
 */
function calcQuickRange(rangeKey) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (rangeKey === 'thisWeek') {
    const dayOfWeek = today.getDay(); // 0:日曜
    const start = new Date(today);
    start.setDate(today.getDate() - dayOfWeek);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  }

  if (rangeKey === 'thisMonth') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start, end };
  }

  if (rangeKey === 'lastMonth') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { start, end };
  }

  return { start: today, end: today };
}

if (quickRangeButtons) {
  quickRangeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const { start, end } = calcQuickRange(btn.getAttribute('data-range'));
      if (reportStartDateInput) reportStartDateInput.value = formatDateForInput(start);
      if (reportEndDateInput) reportEndDateInput.value = formatDateForInput(end);
    });
  });
}

/**
 * プルダウンで選ばれているレポートだけを取得・表示する
 * （メニュー実績とメニュー率は、同じデータから両方描画できるので、片方選んだ時点でもう片方も一緒に計算しておく）
 */
async function runReport() {
  const selected = reportTypeSelect ? reportTypeSelect.value : 'designation';
  const isDormant = (selected === 'dormant');

  const startDate = reportStartDateInput ? reportStartDateInput.value : '';
  const endDate = reportEndDateInput ? reportEndDateInput.value : '';
  const monthsThreshold = dormantMonthsInput ? dormantMonthsInput.value : '3';

  if (reportError) reportError.style.display = 'none';
  if (reportResults) reportResults.style.display = 'none';

  if (!isDormant && (!startDate || !endDate)) {
    if (reportError) {
      reportError.textContent = '開始日・終了日を入力してください。';
      reportError.style.display = 'block';
    }
    return;
  }

  if (runReportBtn) {
    runReportBtn.disabled = true;
    runReportBtn.textContent = '集計中...';
  }

  try {
    let result;

    if (selected === 'designation') {
      result = await callAdminApi('getDesignationRateReport', { startDate, endDate });
      if (!result.success) throw new Error(result.message || '集計に失敗しました。');
      renderDesignationReport(result);

    } else if (selected === 'menuCount' || selected === 'menuRate') {
      result = await callAdminApi('getMenuPerformanceReport', { startDate, endDate });
      if (!result.success) throw new Error(result.message || '集計に失敗しました。');
      renderMenuPerformanceReport(result);
      renderMenuRateReport(result);

    } else if (selected === 'timeSlot') {
      result = await callAdminApi('getTimeSlotPatternReport', { startDate, endDate });
      if (!result.success) throw new Error(result.message || '集計に失敗しました。');
      renderTimeSlotReport(result);

    } else if (selected === 'newRepeat') {
      result = await callAdminApi('getNewRepeatRatioReport', { startDate, endDate });
      if (!result.success) throw new Error(result.message || '集計に失敗しました。');
      renderNewRepeatReport(result);

    } else if (selected === 'frequency') {
      result = await callAdminApi('getVisitFrequencyDistributionReport', { startDate, endDate });
      if (!result.success) throw new Error(result.message || '集計に失敗しました。');
      renderFrequencyReport(result);

    } else if (selected === 'dormant') {
      result = await callAdminApi('getDormantCustomersReport', { monthsThreshold });
      if (!result.success) throw new Error(result.message || '集計に失敗しました。');
      renderDormantReport(result);
    }

    if (reportResults) reportResults.style.display = 'block';
    updateVisibleReportCard();
  } catch (error) {
    console.error('レポート取得エラー:', error);
    if (reportError) {
      reportError.textContent = error.message || '通信エラーが発生しました。時間をおいて再度お試しください。';
      reportError.style.display = 'block';
    }
  } finally {
    if (runReportBtn) {
      runReportBtn.disabled = false;
      runReportBtn.textContent = '集計する';
    }
  }
}

/**
 * 指名率レポートの結果を画面に描画する
 * @param {Object} data - getDesignationRateReport の戻り値
 */
function renderDesignationReport(data) {
  if (designationSummary) {
    designationSummary.innerHTML = `
      <div class="designation-summary-item">
        <div class="designation-summary-value">${data.designatedRate}%</div>
        <div class="designation-summary-label">指名（${data.designatedCount}件）</div>
      </div>
      <div class="designation-summary-item">
        <div class="designation-summary-value">${data.noAssignRate}%</div>
        <div class="designation-summary-label">指名なし（${data.noAssignCount}件）</div>
      </div>
      <div class="designation-summary-item">
        <div class="designation-summary-value">${data.totalCount}</div>
        <div class="designation-summary-label">合計件数</div>
      </div>
    `;
  }

  if (designationByStaff) {
    const staffNames = Object.keys(data.byStaff || {}).sort((a, b) => data.byStaff[b] - data.byStaff[a]);
    if (staffNames.length === 0) {
      designationByStaff.innerHTML = '<p>この期間の指名データはありません。</p>';
    } else {
      designationByStaff.innerHTML = staffNames.map(name =>
        `<div class="designation-by-staff-row"><span>${escapeHtmlAdmin(name)}</span><span>${data.byStaff[name]}件</span></div>`
      ).join('');
    }
  }
}

/**
 * メニュー実績レポートの結果を画面に描画する
 * @param {Object} data - getMenuPerformanceReport の戻り値
 */
function renderMenuPerformanceReport(data) {
  if (!menuPerformanceTbody) return;

  const ranking = data.ranking || [];
  if (ranking.length === 0) {
    menuPerformanceTbody.innerHTML = '<tr><td colspan="2">この期間のメニューデータはありません。</td></tr>';
    return;
  }

  menuPerformanceTbody.innerHTML = ranking.map(item =>
    `<tr><td>${escapeHtmlAdmin(item.menuName)}</td><td>${item.count}件</td></tr>`
  ).join('');
}

/**
 * メニュー率レポート（メニュー実績と同じデータから、割合を計算して表示する）
 * @param {Object} data - getMenuPerformanceReport の戻り値
 */
function renderMenuRateReport(data) {
  if (!menuRateTbody) return;

  const ranking = data.ranking || [];
  if (ranking.length === 0) {
    menuRateTbody.innerHTML = '<tr><td colspan="2">この期間のメニューデータはありません。</td></tr>';
    return;
  }

  const total = ranking.reduce((sum, item) => sum + item.count, 0);

  menuRateTbody.innerHTML = ranking.map(item => {
    const rate = total > 0 ? Math.round((item.count / total) * 1000) / 10 : 0;
    return `<tr><td>${escapeHtmlAdmin(item.menuName)}</td><td>${rate}%</td></tr>`;
  }).join('');
}

/**
 * 曜日・時間帯の傾向レポートを表として描画する
 * @param {Object} data - getTimeSlotPatternReport の戻り値
 */
function renderTimeSlotReport(data) {
  if (!timeSlotTableWrap) return;

  const grid = data.grid || {};
  const dayLabels = data.dayLabels || ["日", "月", "火", "水", "木", "金", "土"];

  // 実際にデータがある時間帯だけを列に出す（0〜23時全部は出さない）
  const hoursSet = new Set();
  Object.keys(grid).forEach(day => {
    Object.keys(grid[day]).forEach(hour => hoursSet.add(parseInt(hour, 10)));
  });
  const hours = Array.from(hoursSet).sort((a, b) => a - b);

  if (hours.length === 0) {
    timeSlotTableWrap.innerHTML = '<p>この期間の予約データはありません。</p>';
    return;
  }

  let html = '<table class="time-slot-table"><thead><tr><th>曜日＼時</th>';
  hours.forEach(h => { html += `<th>${h}時</th>`; });
  html += '</tr></thead><tbody>';

  for (let d = 0; d < 7; d++) {
    html += `<tr><th>${dayLabels[d]}</th>`;
    hours.forEach(h => {
      const count = (grid[d] && grid[d][h]) || 0;
      html += count > 0 ? `<td class="has-count">${count}</td>` : `<td>-</td>`;
    });
    html += '</tr>';
  }
  html += '</tbody></table>';

  timeSlotTableWrap.innerHTML = html;
}

/**
 * 新規・リピート比率レポートを描画する
 * @param {Object} data - getNewRepeatRatioReport の戻り値
 */
function renderNewRepeatReport(data) {
  if (!newRepeatSummary) return;

  newRepeatSummary.innerHTML = `
    <div class="designation-summary-item">
      <div class="designation-summary-value">${data.newRate}%</div>
      <div class="designation-summary-label">新規（${data.newCount}人）</div>
    </div>
    <div class="designation-summary-item">
      <div class="designation-summary-value">${data.repeatRate}%</div>
      <div class="designation-summary-label">リピート（${data.repeatCount}人）</div>
    </div>
    <div class="designation-summary-item">
      <div class="designation-summary-value">${data.totalCount}</div>
      <div class="designation-summary-label">合計人数</div>
    </div>
  `;
}

/**
 * 来店頻度の分布レポートを描画する
 * @param {Object} data - getVisitFrequencyDistributionReport の戻り値
 */
function renderFrequencyReport(data) {
  if (!frequencySummary) return;

  frequencySummary.innerHTML = `
    <div class="designation-summary-item">
      <div class="designation-summary-value">${data.once}</div>
      <div class="designation-summary-label">1回</div>
    </div>
    <div class="designation-summary-item">
      <div class="designation-summary-value">${data.fewTimes}</div>
      <div class="designation-summary-label">2〜3回</div>
    </div>
    <div class="designation-summary-item">
      <div class="designation-summary-value">${data.loyal}</div>
      <div class="designation-summary-label">4回以上</div>
    </div>
  `;
}

/**
 * 休眠顧客リストを描画する
 * @param {Object} data - getDormantCustomersReport の戻り値
 */
function renderDormantReport(data) {
  if (dormantCountLabel) {
    dormantCountLabel.textContent = `最終来店から${data.monthsThreshold}ヶ月以上：${data.count}名`;
  }

  if (!dormantTbody) return;

  const list = data.list || [];
  if (list.length === 0) {
    dormantTbody.innerHTML = '<tr><td colspan="4">該当するお客様はいません。</td></tr>';
    return;
  }

  dormantTbody.innerHTML = list.map(c =>
    `<tr><td>${escapeHtmlAdmin(c.name)}</td><td>${escapeHtmlAdmin(c.tel)}</td><td>${c.lastVisitDate}</td><td>${c.visitCount}回</td></tr>`
  ).join('');
}

/**
 * 簡易的なHTMLエスケープ（メニュー名・スタッフ名をそのまま画面に表示するため）
 * @param {string} str
 * @returns {string}
 */
function escapeHtmlAdmin(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * 「基本設定」タブの現在値を取得し、フォームに反映する
 */
async function loadSettings1() {
  if (settings1Loading) settings1Loading.style.display = 'block';
  if (settings1Error) settings1Error.style.display = 'none';
  if (settings1Form) settings1Form.style.display = 'none';

  try {
    const result = await callAdminApi('getSettingsPage1');
    if (!result.success) throw new Error(result.message || '設定の取得に失敗しました。');

    // 店名・ロゴ
    const branding = result.headerBranding || {};
    if (s1ShopName) s1ShopName.value = branding.shopName || '';
    if (s1LogoUrl) s1LogoUrl.value = branding.logoUrl || '';

    // 連絡先情報
    const contact = result.headerContactInfo || {};
    if (s1ContactPhone) s1ContactPhone.value = contact.phone || '';
    if (s1ContactHours) s1ContactHours.value = contact.hours || '';
    if (s1ContactClosed) s1ContactClosed.value = contact.closedDay || '';

    // 営業時間
    renderBusinessHoursRows(result.business || {});

    // メニュー・料金
    renderMenuMasterRows(result.menuMaster || {});

    // スタッフ名（カレンダーIDは隠しdata属性として保持しておく）
    renderStaffNameRows(result.staffMaster || {});

    // その他
    if (s1MaxCapacity) s1MaxCapacity.value = result.maxCapacity;
    if (s1ReminderDays) s1ReminderDays.value = result.reminderMailDaysBefore;

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
function renderBusinessHoursRows(business) {
  if (!businessHoursRows) return;

  businessHoursRows.innerHTML = DAY_LABELS.map((label, dayIndex) => {
    const hours = business[dayIndex] || business[String(dayIndex)] || null;
    const openHour = hours ? hours[0] : '';
    const closeHour = hours ? hours[1] : '';
    return `
      <div class="business-hours-row" data-day="${dayIndex}">
        <span class="day-label">${label}曜日</span>
        <input type="number" class="business-open-input" min="0" max="23" value="${openHour}" placeholder="休">
        <span class="time-sep">時 〜</span>
        <input type="number" class="business-close-input" min="0" max="23" value="${closeHour}" placeholder="休">
        <span class="time-sep">時</span>
      </div>
    `;
  }).join('');
}

/**
 * メニュー・料金の入力行を描画する
 * @param {Object} menuMaster - { メニュー名: { minutes, price } }
 */
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
function renderStaffNameRows(staffMaster) {
  if (!staffNameRows) return;

  const names = Object.keys(staffMaster);
  staffNameRows.innerHTML = names.map((name, i) => `
    <div class="staff-name-row" data-calendar-id="${escapeHtmlAdmin(staffMaster[name])}">
      <span class="staff-label">担当${i + 1}</span>
      <input type="text" class="staff-name-input" value="${escapeHtmlAdmin(name)}">
    </div>
  `).join('');
}

/**
 * フォームの入力内容を集めて、Config.gsのキー名に合わせた形に組み立てる
 * @returns {Object} saveSettings に渡す { 設定キー: 値 } のマップ
 */
function collectSettings1FormData() {
  const settings = {};

  // 店名・ロゴ（両方空なら null にして「未設定」に戻す）
  const shopName = s1ShopName ? s1ShopName.value.trim() : '';
  const logoUrl = s1LogoUrl ? s1LogoUrl.value.trim() : '';
  settings.HEADER_BRANDING = (shopName || logoUrl) ? { shopName: shopName || null, logoUrl: logoUrl || null } : null;

  // 連絡先情報
  const phone = s1ContactPhone ? s1ContactPhone.value.trim() : '';
  const hours = s1ContactHours ? s1ContactHours.value.trim() : '';
  const closedDay = s1ContactClosed ? s1ContactClosed.value.trim() : '';
  settings.HEADER_CONTACT_INFO = (phone || hours || closedDay) ? { phone: phone || null, hours: hours || null, closedDay: closedDay || null } : null;

  // 営業時間
  const business = {};
  document.querySelectorAll('.business-hours-row').forEach(row => {
    const day = row.getAttribute('data-day');
    const openVal = row.querySelector('.business-open-input').value;
    const closeVal = row.querySelector('.business-close-input').value;
    if (openVal !== '' && closeVal !== '') {
      business[day] = [parseInt(openVal, 10), parseInt(closeVal, 10)];
    }
  });
  settings.BUSINESS = business;

  // メニュー・料金
  const menuMaster = {};
  document.querySelectorAll('.menu-master-row').forEach(row => {
    const name = row.querySelector('.menu-name-input').value.trim();
    const minutes = parseInt(row.querySelector('.menu-minutes-input').value, 10);
    const price = parseInt(row.querySelector('.menu-price-input').value, 10);
    if (name && !isNaN(minutes) && minutes > 0) {
      menuMaster[name] = { minutes: minutes, slots: Math.ceil(minutes / 5), price: isNaN(price) ? 0 : price };
    }
  });
  settings.MENU_MASTER = menuMaster;

  // スタッフ名（カレンダーIDは、読み込み時に保持しておいたものをそのまま使う）
  const staffMaster = {};
  document.querySelectorAll('.staff-name-row').forEach(row => {
    const calendarId = row.getAttribute('data-calendar-id');
    const name = row.querySelector('.staff-name-input').value.trim();
    if (name && calendarId) {
      staffMaster[name] = calendarId;
    }
  });
  settings.STAFF_MASTER = staffMaster;

  // その他
  if (s1MaxCapacity && s1MaxCapacity.value !== '') settings.MAX_CAPACITY = parseInt(s1MaxCapacity.value, 10);
  if (s1ReminderDays && s1ReminderDays.value !== '') settings.REMINDER_MAIL_DAYS_BEFORE = parseInt(s1ReminderDays.value, 10);

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
      const password = sessionStorage.getItem(SESSION_STORAGE_KEY) || '';

      const response = await fetch(CONFIG.GAS_WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'saveSettings', settings: JSON.stringify(settings), password: password })
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

if (runReportBtn) {
  runReportBtn.addEventListener('click', runReport);
}

/**
 * ページを開いた時、既にログイン済み（ブラウザのタブ内に合言葉が残っている）かどうか確認する
 */
async function checkExistingSession() {
  const savedPassword = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!savedPassword) {
    showDashboard(false);
    return;
  }

  const result = await callAdminApi('adminLogin', { password: savedPassword });
  if (result && result.success) {
    showDashboard(true);
  } else {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    showDashboard(false);
  }
}

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (loginError) loginError.style.display = 'none';
    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.textContent = '確認中...';
    }

    try {
      const password = adminPasswordInput ? adminPasswordInput.value : '';
      const result = await callAdminApi('adminLogin', { password: password });

      if (result && result.success) {
        sessionStorage.setItem(SESSION_STORAGE_KEY, password);
        showDashboard(true);
      } else {
        if (loginError) {
          loginError.textContent = (result && result.message) || '合言葉が正しくありません。';
          loginError.style.display = 'block';
        }
      }
    } catch (error) {
      console.error('ログイン処理エラー:', error);
      if (loginError) {
        loginError.textContent = '通信エラーが発生しました。時間をおいて再度お試しください。';
        loginError.style.display = 'block';
      }
    } finally {
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = 'ログイン';
      }
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    showDashboard(false);
    if (adminPasswordInput) adminPasswordInput.value = '';
  });
}

window.addEventListener('DOMContentLoaded', () => {
  checkExistingSession();
});
