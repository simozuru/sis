/**
 * =================================================================
 * Salon Information System (SIS) - js/config.js
 * [役割: システム共通設定・グローバルステート管理]
 * =================================================================
 */

// システム設定
const CONFIG = {
  GAS_WEB_APP_URL: "https://script.google.com/macros/s/AKfycbwjCmWjdkKTTnvHVsZrPPCq7uyOdiQ8DFH41t6qbJ08zebrbwjrdX57yRANvrSMsQzm/exec",
  STORAGE_FIELDS: ["name", "name_kana", "tel", "email"],
  STORAGE_PREFIX: "sis_",

  // GASから同期される設定値の受け皿
  MENU_SELECTOR_TYPE: "TYPE_B",
  SHOW_MENU_MINUTES: true,
  SHOW_MENU_PRICE: true,
  SHOW_STAFF_SELECTOR: true,
  ALLOW_NO_ASSIGN: true,
  NO_ASSIGN_LABEL: "指名なし",
  MAX_FUTURE_DAYS: 60,
  DISPLAY_DAYS: 7,
  CANCEL_BUFFER_HOURS: 24,
  CHANGE_BUFFER_HOURS: 24,
  PROVISIONAL_RESERVATION_ENABLED: false,
  PROVISIONAL_RESERVATION_TARGET: "ALL",
  MENU_MASTER: {},
  STAFF_LIST: []
};

// 画面全体で共有する状態
const AppState = {
  systemSettings: null,
  changeModeData: null
};
