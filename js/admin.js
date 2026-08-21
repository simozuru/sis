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
