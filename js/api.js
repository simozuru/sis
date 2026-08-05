/**
 * =================================================================
 * Salon Information System (SIS) - js/api.js [Version 4.3.1]
 * [役割: 外部API通信・fetch通信専門（メニュー金額・時間・表示フラグ完全同期版）]
 * =================================================================
 */

// システム設定の初期ロードとUI動的変更ロジック
async function initializeSystemSettings() {
  try {
    // 1. カレンダーの過去制限（当日は常に最低限セット）
    const nowJST = new Date(Date.now() + (9 * 60 * 60 * 1000)); 
    const todayStr = nowJST.toISOString().split('T')[0];
    dateInput.min = todayStr;

    // 2. Code.gsのgetSystemSettings窓口から最新の設定値を取得
    const response = await fetch(`${CONFIG.GAS_WEB_APP_URL}?method=getSystemSettings`);
    if (!response.ok) throw new Error('設定データの取得に失敗しました');
    const settings = await response.json();

    if (!settings.success) {
      console.error("サーバー側での設定取得エラー:", settings.message);
      return;
    }

    // 3. 未来予約制限日数を動的適用
    const maxFutureDays = settings.maxFutureDays || 30;
    const maxDateObj = new Date(nowJST.getTime() + (maxFutureDays * 24 * 60 * 60 * 1000));
    const maxDateStr = maxDateObj.toISOString().split('T')[0];
    dateInput.max = maxDateStr;

    // 4. スタッフプルダウンおよび表示グループの動的組み立て
    const staffGroup = document.getElementById('staff-group');
    staffSelect.innerHTML = ''; // 既存の選択肢をクリア

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

    // 5. 💡【ver.4.3.1 変更】GASから同期されたメニュー情報・各種表示設定フラグを格納し、UIを描画
    if (settings.menuSelectorType) {
      CONFIG.MENU_SELECTOR_TYPE = settings.menuSelectorType;
    }
    
    // 💡 時間・金額の表示制御フラグをCONFIGに反映
    if (settings.showMenuMinutes !== undefined) {
      CONFIG.SHOW_MENU_MINUTES = settings.showMenuMinutes;
    }
    if (settings.showMenuPrice !== undefined) {
      CONFIG.SHOW_MENU_PRICE = settings.showMenuPrice;
    }
    
    // 💡 オブジェクト構造のメニューマスター（時間・金額入り）が渡されている場合は丸ごと格納
    if (settings.menuMaster && Object.keys(settings.menuMaster).length > 0) {
      CONFIG.MENU_MASTER = settings.menuMaster;
    } 
    // 💡 互換性担保用：menuListが配列ではなくオブジェクト構造で送られてきた場合に対応
    else if (settings.menuList && typeof settings.menuList === 'object' && !Array.isArray(settings.menuList)) {
      CONFIG.MENU_MASTER = settings.menuList;
    } 
    // 💡 メニューの配列しか存在しない場合のセーフティフォールバック
    else if (settings.menuList && Array.isArray(settings.menuList)) {
      CONFIG.MENU_MASTER = settings.menuList;
    }

    // 💡【包括的関数へ変更】ui.js側の包括的なメニューUI描画関数を実行して画面を同期させる
    if (typeof renderMenuUI === 'function') {
      renderMenuUI();
    }

  } catch (error) {
    console.error("システム設定の初期化中にエラーが発生しました:", error);
  }
}