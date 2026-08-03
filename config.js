/**
 * =================================================================
 * Salon Information System (SIS) - js/config.js [Version 4.3.1]
 * [役割: システム共通設定・グローバルステート管理（メニュー金額＆表示選択機能拡張版）]
 * =================================================================
 */

// システム設定
const CONFIG = {
  GAS_WEB_APP_URL: "https://script.google.com/macros/s/AKfycbwjCmWjdkKTTnvHVsZrPPCq7uyOdiQ8DFH41t6qbJ08zebrbwjrdX57yRANvrSMsQzm/exec",
  STORAGE_FIELDS: ['name', 'name_kana', 'tel', 'email'],
  
  // GASから同期されるメニュー表示タイプの受け皿（デフォルトはTYPE_B:チェックボックス）
  MENU_SELECTOR_TYPE: "TYPE_B",
  
  // GASから同期される表示フラグの受け皿（表示任意コントロール用）
  SHOW_MENU_MINUTES: true, // 時間（分）を表示するかどうかのステート保持
  SHOW_MENU_PRICE: true,   // 金額を表示するかどうかのステート保持
  
  // GAS（Config.gs）から取得したメニューオブジェクトを格納する受け皿
  // 配列（[]）から、金額・時間を内包するオブジェクト（{}）の構造に変更して受け止めます
  MENU_MASTER: {}
};

// 予約変更モード用のグローバル状態
let changeModeData = null;