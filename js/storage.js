/**
 * =================================================================
 * Salon Information System (SIS) - js/storage.js
 * [役割: ローカルストレージ・キャッシュ操作専門]
 * =================================================================
 */

/**
 * 1. 【キャッシュ復元】保存されたお客様情報を画面の入力欄へ自動セットする
 */
function restoreCachedCustomerData() {
  try {
    if (typeof CONFIG === 'undefined' || !CONFIG.STORAGE_FIELDS) return;

    CONFIG.STORAGE_FIELDS.forEach(field => {
      const saved = localStorage.getItem(`sis_${field}`);
      if (saved) {
        const el = document.getElementById(field);
        if (el) el.value = saved;
        
        // 確認・キャンセル用タブ側の入力欄にも自動セット
        if (field === 'tel') {
          const checkTel = document.getElementById('check-tel');
          if (checkTel) checkTel.value = saved;
        }
        if (field === 'email') {
          const checkEmail = document.getElementById('check-email');
          if (checkEmail) checkEmail.value = saved;
        }
      }
    });
  } catch (e) {
    console.warn("ローカルストレージからのデータ復元に失敗しました:", e);
  }
}

/**
 * 2. 【キャッシュ保存】入力されたお客様情報をローカルストレージに保存する
 */
function saveCustomerDataToCache() {
  try {
    if (typeof CONFIG === 'undefined' || !CONFIG.STORAGE_FIELDS) return;

    CONFIG.STORAGE_FIELDS.forEach(field => {
      const el = document.getElementById(field);
      if (el && el.value) {
        localStorage.setItem(`sis_${field}`, el.value.trim());
      }
    });
  } catch (e) {
    console.warn("ローカルストレージへのデータ保存に失敗しました:", e);
  }
}

// ページ読み込み時に自動で復元処理を実行
restoreCachedCustomerData();