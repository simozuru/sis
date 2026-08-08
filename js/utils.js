/**
 * =================================================================
 * Salon Information System (SIS) - js/utils.js
 * [役割: 共通関数（日付・文字列・表示整形など）]
 * =================================================================
 */

/**
 * 1. HTMLエスケープ
 * @param {string} value - 変換対象文字列
 * @returns {string} エスケープ後文字列
 */
function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * 2. yyyy-MM-dd を yyyy年M月d日 に変換
 * @param {string} dateStr - 日付文字列
 * @returns {string} 整形済み日付文字列
 */
function formatJapaneseDate(dateStr) {
  const parts = String(dateStr || "").split("-");
  if (parts.length !== 3) return String(dateStr || "");
  return `${parts[0]}年${Number(parts[1])}月${Number(parts[2])}日`;
}

/**
 * 3. yyyy-MM-dd を M/d(曜) に変換
 * @param {string} dateStr - 日付文字列
 * @returns {string} 整形済み日付文字列
 */
function formatDateHeaderLabel(dateStr) {
  const cleanStr = String(dateStr || "").replace(/-/g, "/");
  const d = new Date(cleanStr);

  if (isNaN(d.getTime())) return String(dateStr || "");

  const dayLabels = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getMonth() + 1}/${d.getDate()}(${dayLabels[d.getDay()]})`;
}

/**
 * 4. ローカル日付で yyyy-MM-dd を作成
 * @param {Date} dateObj - Dateオブジェクト
 * @returns {string} yyyy-MM-dd 形式
 */
function formatLocalDateInputValue(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 5. 今日から指定日数後の日付を yyyy-MM-dd で返す
 * @param {number} days - 加算日数
 * @returns {string} yyyy-MM-dd 形式
 */
function getLocalDateAfterDays(days) {
  const today = new Date();
  const target = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
  return formatLocalDateInputValue(target);
}

/**
 * 6. メニュー表示ラベルを作る
 * @param {string} menuName - メニュー名
 * @param {Object} menuData - メニューデータ
 * @returns {string} 表示ラベル
 */
function buildMenuLabel(menuName, menuData) {
  const safeName = String(menuName || "");
  const data = menuData || {};
  const meta = [];

  if (CONFIG.SHOW_MENU_MINUTES && data.minutes) {
    meta.push(`${data.minutes}分`);
  }

  if (CONFIG.SHOW_MENU_PRICE && data.price !== undefined && data.price !== null) {
    meta.push(`￥${Number(data.price).toLocaleString()}`);
  }

  if (meta.length === 0) return safeName;
  return `${safeName} (${meta.join(" / ")})`;
}

/**
 * 7. 予約変更モードかどうかを返す
 * @returns {boolean} 変更モードなら true
 */
function isChangeMode() {
  return Boolean(AppState.changeModeData);
}

/**
 * 8. お客様入力データを集める
 * @returns {Object} 入力値オブジェクト
 */
function collectCustomerInputValues() {
  return {
    name: document.getElementById("name") ? document.getElementById("name").value.trim() : "",
    name_kana: document.getElementById("name_kana") ? document.getElementById("name_kana").value.trim() : "",
    tel: document.getElementById("tel") ? document.getElementById("tel").value.trim() : "",
    email: document.getElementById("email") ? document.getElementById("email").value.trim() : ""
  };
}

/**
 * 9. キャッシュ済みお客様情報を画面に反映する
 */
function applyCachedCustomerDataToForm() {
  const cached = getCachedCustomerData();

  Object.keys(cached).forEach(field => {
    const el = document.getElementById(field);
    if (el) el.value = cached[field];
  });

  if (cached.tel) {
    const checkTel = document.getElementById("check-tel");
    if (checkTel) checkTel.value = cached.tel;
  }

  if (cached.email) {
    const checkEmail = document.getElementById("check-email");
    if (checkEmail) checkEmail.value = cached.email;
  }
}

/**
 * 10. フォーム入力内容をキャッシュ保存する
 */
function saveCurrentCustomerDataToCache() {
  saveCustomerDataToCache(collectCustomerInputValues());
}

/**
 * 11. 予約一覧カード内のメニュー表示用HTMLを作る
 * @param {string} menuValue - メニュー文字列
 * @returns {string} エスケープ済み文字列
 */
function buildReservationMenuHtml(menuValue) {
  return escapeHtml(menuValue || "");
}
