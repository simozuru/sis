/**
 * =================================================================
 * Salon Information System (SIS) - js/api.js
 * [役割: 外部API通信・fetch通信専門]
 * =================================================================
 */

/**
 * 1. システム初期設定の取得 API
 * @returns {Promise<Object>} GASから返された設定オブジェクト
 */
async function fetchSystemSettingsApi() {
  try {
    const response = await fetch(`${CONFIG.GAS_WEB_APP_URL}?method=getSystemSettings`);
    if (!response.ok) throw new Error("システム設定の取得に失敗しました");
    return await response.json();
  } catch (error) {
    console.error("fetchSystemSettingsApi エラー:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * 2. 空き時間・タイムテーブルデータの取得 API
 * @param {string} date - 日付 (yyyy-MM-dd)
 * @param {string} staff - スタッフ名
 * @param {string} menu - メニュー名
 * @param {string} [resId] - 変更時の除外予約ID
 * @param {string} [tel] - 電話番号（お客様専用の施術時間を反映するため）
 * @returns {Promise<Object>} 空き状況データ
 */
async function fetchTimetableDataApi(date, staff, menu, resId = "", tel = "") {
  try {
    const url = `${CONFIG.GAS_WEB_APP_URL}?method=getSlotStatuses&date=${encodeURIComponent(date)}&staff=${encodeURIComponent(staff)}&menu=${encodeURIComponent(menu)}&resId=${encodeURIComponent(resId)}&tel=${encodeURIComponent(tel)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("タイムテーブルの取得に失敗しました");
    return await response.json();
  } catch (error) {
    console.error("fetchTimetableDataApi エラー:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * 3. 予約確定・変更・キャンセルの送信 API
 * @param {string} action - 'create' | 'change' | 'cancel'
 * @param {Object} payload - 送信するパラメータデータ
 * @returns {Promise<Object>} 処理結果
 */
async function submitReservationApi(action, payload) {
  try {
    const postData = {
      action: action,
      ...payload
    };

    const response = await fetch(CONFIG.GAS_WEB_APP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(postData)
    });

    if (!response.ok) throw new Error("予約処理のリクエストに失敗しました");
    return await response.json();
  } catch (error) {
    console.error("submitReservationApi エラー:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * 4. 既存予約の確認検索 API
 * @param {string} tel - 電話番号
 * @param {string} email - メールアドレス
 * @returns {Promise<Object>} 該当する予約リスト
 */
async function fetchCustomerReservationsApi(tel, email) {
  try {
    const url = `${CONFIG.GAS_WEB_APP_URL}?method=getCustomerReservations&tel=${encodeURIComponent(tel)}&email=${encodeURIComponent(email)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("ご予約状況の取得に失敗しました");
    return await response.json();
  } catch (error) {
    console.error("fetchCustomerReservationsApi エラー:", error);
    return { success: false, message: error.toString() };
  }
}
