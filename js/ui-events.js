
/**
 * =================================================================
 * SIS 予約サイト - ui-events.js
 * [役割: 予約送信処理、全イベントリスナーの初期化（最後に読み込むこと）]
 * ui-core.js・ui-timetable.js の後に読み込むこと
 * =================================================================
 */
function getProvisionalWordingMode() {
  if (!CONFIG.PROVISIONAL_RESERVATION_ENABLED) return 'NORMAL';

  if (CONFIG.PROVISIONAL_RESERVATION_TARGET === 'MENU_ONLY') {
    // メニュー限定の場合、選択されたメニューで正確に判定できる
    const selectedMenuVal = getSelectedMenusValue();
    const selectedMenuList = String(selectedMenuVal || '').split(',').map(m => m.trim());
    const isMatch = selectedMenuList.some(m => (CONFIG.PROVISIONAL_RESERVATION_TARGET_MENUS || []).includes(m));
    return isMatch ? 'PROVISIONAL' : 'NORMAL';
  }

  if (CONFIG.PROVISIONAL_RESERVATION_TARGET === 'NEW_ONLY') {
    // 新規のお客様だけ仮予約になる設定の場合、この時点では仮予約かどうか確定できないため中立的な文言にする
    return 'NEUTRAL';
  }

  return 'PROVISIONAL'; // "ALL"
}

/**
 * ブラウザ標準のconfirm()の代わりに、装飾できる確認ポップアップを表示する
 * @param {string} htmlMessage - 表示するメッセージ（HTMLタグの装飾も使える）
 * @returns {Promise<boolean>} 「はい」が押されたら true、「キャンセル」なら false
 */
async function handleReservationSubmit(e) {
  e.preventDefault();

  const isChange = isChangeMode();

  const confirmMsg = isChange
    ? '選択した新しい日時で予約を変更してもよろしいですか？'
    : (() => {
        const mode = getProvisionalWordingMode();
        if (mode === 'PROVISIONAL') return 'この内容で<span class="custom-confirm-highlight">仮予約</span>を申請してもよろしいですか？';
        if (mode === 'NEUTRAL') return 'この内容で予約を送信してもよろしいですか？';
        return 'この内容で予約を確定してもよろしいですか？';
      })();

  const confirmed = await showCustomConfirm(confirmMsg);
  if (!confirmed) return;

  submitBtn.disabled = true;
  submitBtn.textContent = isChange ? '予約を変更中...' : '予約を登録中...';

  saveCurrentCustomerDataToCache();

  const action = isChange ? 'change' : 'create';
  const payload = {
    staff: staffSelect.value,
    menu: getSelectedMenusValue(),
    name: nameInput.value,
    name_kana: nameKanaInput.value,
    tel: telInput.value,
    email: emailInput.value,
    formData: memoInput.value
  };

  if (isChange) {
    payload.resId = AppState.changeModeData.resId;
    payload.newDate = selectedDateInput.value;
    payload.newTime = selectedTimeInput.value;
  } else {
    payload.date = selectedDateInput.value;
    payload.time = selectedTimeInput.value;
  }

  try {
    const data = await submitReservationApi(action, payload);

    if (!data.success) {
      alert('処理に失敗しました: ' + data.message);
      return;
    }

    if (isChange) {
      alert('ご予約の変更が正常に完了しました！');
      AppState.changeModeData = null;
      renderChangeBanner(null);
    } else {
      const isProvisional = !!data.isProvisional;
      const baseMsg = isProvisional ? 'ご予約を申請しました！' : 'ご予約が完了しました！';
      const msg = data.resId ? `${baseMsg}\n【ご予約ID: ${data.resId}】` : baseMsg;
      alert(msg);
    }

    // 確認タブの入力欄にも今回の連絡先を反映しておく
    if (checkTelInput) checkTelInput.value = telInput.value;
    if (checkEmailInput) checkEmailInput.value = emailInput.value;

    resetReservationSelection();
    applyCachedCustomerDataToForm();
    await initializeSystemUI();

    if (isChange) {
      showSection(checkTabContainer);
      await fetchReservations();
    } else {
      showSection(step1Container);
    }
  } catch (error) {
    console.error('送信エラー:', error);
    alert('通信エラーが発生しました。');
  } finally {
    submitBtn.disabled = false;
  }
}

// -----------------------------------------------------------------
// 7. イベントリスナー設定
// -----------------------------------------------------------------
/**
 * 画面上のすべてのイベントを登録する
 */
function initializeEvents() {
  if (form) {
    form.addEventListener('submit', handleReservationSubmit);
  }

  if (toStep2Btn) {
    toStep2Btn.addEventListener('click', () => {
      if (!nameInput.checkValidity() || !nameKanaInput.checkValidity() || !telInput.checkValidity() || !emailInput.checkValidity()) {
        alert('お客様情報を正しく入力してください。');
        return;
      }
      showSection(step2Container);
    });
  }

  if (toStep3Btn) {
    toStep3Btn.addEventListener('click', async () => {
      if (!dateInput.value || !staffSelect.value || !getSelectedMenusValue()) {
        alert('ご来店希望日、スタッフ、メニューを選択してください。');
        return;
      }

      const originalText = toStep3Btn.textContent;
      toStep3Btn.disabled = true;
      toStep3Btn.textContent = '空き状況を読み込み中...';

      const success = await updateAvailableTimes();

      toStep3Btn.disabled = false;
      toStep3Btn.textContent = originalText;

      if (success) {
        showSection(step3Container);
      }
    });
  }

  if (backToStep1Btn) {
    backToStep1Btn.addEventListener('click', () => showSection(step1Container));
  }

  if (backToStep2Btn) {
    backToStep2Btn.addEventListener('click', () => showSection(step2Container));
  }

  const goToCheckHandler = () => {
    applyCachedCustomerDataToForm();
    showSection(checkTabContainer);
  };

  if (goToCheckBtn) {
    goToCheckBtn.addEventListener('click', goToCheckHandler);
  }

  if (goToCheckBtnStep2) {
    goToCheckBtnStep2.addEventListener('click', goToCheckHandler);
  }

  if (homeBtn) {
    homeBtn.addEventListener('click', () => {
      if (CONFIG.HOME_PAGE_URL) {
        window.location.href = CONFIG.HOME_PAGE_URL;
      }
    });
  }

  if (backToReservationBtn) {
    backToReservationBtn.addEventListener('click', () => showSection(step1Container));
  }

  if (backFromCheckBtn) {
    backFromCheckBtn.addEventListener('click', () => showSection(step1Container));
  }

  if (checkBtn) {
    checkBtn.addEventListener('click', fetchReservations);
  }

  if (cancelChangeBtn) {
    cancelChangeBtn.addEventListener('click', abortChangeMode);
  }

  if (nextTimetableBtn) {
    nextTimetableBtn.addEventListener('click', async () => {
      nextTimetableBtn.disabled = true;
      await goToNextTimetablePage();
      nextTimetableBtn.disabled = false;
    });
  }

  if (prevTimetableBtn) {
    prevTimetableBtn.addEventListener('click', async () => {
      prevTimetableBtn.disabled = true;
      await goToPrevTimetablePage();
    });
  }

  if (resultsArea) {
    resultsArea.addEventListener('click', (e) => {
      const target = e.target;
      if (target.classList.contains('btn-change')) {
        startChangeMode(target);
      } else if (target.classList.contains('btn-cancel')) {
        requestCancel(target);
      }
    });
  }
}

// -----------------------------------------------------------------
// 8. ページ読み込み時の自動実行
// -----------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  initializeEvents();
  applyCachedCustomerDataToForm();
  showSection(step1Container);
  initializeSystemUI();

  // フッターのコピーライトリンク（config.jsの値をそのまま反映。GASの設定取得を待たない）
  const copyrightLink = document.getElementById('copyright-link');
  if (copyrightLink) {
    copyrightLink.textContent = CONFIG.COPYRIGHT_LINK_TEXT;
    copyrightLink.href = CONFIG.COPYRIGHT_LINK_URL;
  }
});
