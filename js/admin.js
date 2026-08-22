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
const quickRangeButtons = document.querySelectorAll('.btn-quick-range');

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
 * 指名率・メニュー実績、両方のレポートをまとめて取得して表示する
 */
async function runReport() {
  const startDate = reportStartDateInput ? reportStartDateInput.value : '';
  const endDate = reportEndDateInput ? reportEndDateInput.value : '';

  if (reportError) reportError.style.display = 'none';
  if (reportResults) reportResults.style.display = 'none';

  if (!startDate || !endDate) {
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
    const [designationResult, menuResult] = await Promise.all([
      callAdminApi('getDesignationRateReport', { startDate, endDate }),
      callAdminApi('getMenuPerformanceReport', { startDate, endDate })
    ]);

    if (!designationResult.success || !menuResult.success) {
      const message = (designationResult && designationResult.message) || (menuResult && menuResult.message) || '集計に失敗しました。';
      throw new Error(message);
    }

    renderDesignationReport(designationResult);
    renderMenuPerformanceReport(menuResult);

    if (reportResults) reportResults.style.display = 'block';
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
 * 簡易的なHTMLエスケープ（メニュー名・スタッフ名をそのまま画面に表示するため）
 * @param {string} str
 * @returns {string}
 */
function escapeHtmlAdmin(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
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
