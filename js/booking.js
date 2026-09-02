/**
 * =================================================================
 * Salon Information System (SIS) - js/booking.js [Version 4.4.4]
 * [役割: 予約の検索・変更・キャンセル処理]
 * =================================================================
 */

/**
 * 予約時間（"10:00"）を "10時00分" の表記に変換する
 * @param {string} timeStr - 時間文字列
 * @returns {string} 整形済み文字列
 */
function formatReservationTime(timeStr) {
  const parts = String(timeStr || '').split(':');
  if (parts.length < 2) return String(timeStr || '');
  return `${parts[0]}時${parts[1]}分`;
}

/**
 * 予約1件分のカードHTMLを作る
 * @param {Object} res - 予約データ
 * @returns {string} カードのHTML
 */
function buildReservationCardHtml(res) {
  const formattedDate = formatJapaneseDate(res.date);
  const formattedTime = formatReservationTime(res.time);

  const safeId = escapeHtml(res.id);
  const safeMenu = escapeHtml(res.menu);
  const safeStaff = escapeHtml(res.staff);
  const safeMemo = escapeHtml(res.memo);
  const safeDate = escapeHtml(res.date);
  const safeTime = escapeHtml(res.time);
  const safeCreatedAt = escapeHtml(res.createdAt);

  const memoRow = res.memo
    ? `<div class="res-row"><span class="res-label">備考・メモ</span> ${safeMemo}</div>`
    : '';

  // キャンセル・日時変更、それぞれの受付締切を過ぎているか判定する
  const isChangeExpired = isReservationDeadlinePassed(res.date, res.time, CONFIG.CHANGE_BUFFER_HOURS);
  const isCancelExpired = isReservationDeadlinePassed(res.date, res.time, CONFIG.CANCEL_BUFFER_HOURS);

  const changeButtonHtml = isChangeExpired
    ? `<button type="button" class="btn-change" disabled>日時変更期間を過ぎています</button>`
    : `<button type="button" class="btn-change" data-id="${safeId}" data-date="${safeDate}" data-time="${safeTime}" data-staff="${safeStaff}" data-menu="${safeMenu}" data-memo="${safeMemo}">日時を変更する</button>`;

  const cancelButtonHtml = isCancelExpired
    ? `<button type="button" class="btn-cancel" disabled>キャンセル期限を過ぎています</button>`
    : `<button type="button" class="btn-cancel" data-id="${safeId}">この予約をキャンセルする</button>`;

  return `
    <div class="reservation-card">
      <div class="res-row"><span class="res-label">予約日</span> ${escapeHtml(formattedDate)}</div>
      <div class="res-row"><span class="res-label">予約時間</span> ${escapeHtml(formattedTime)}</div>
      <div class="res-row"><span class="res-label">メニュー</span> ${safeMenu}</div>
      <div class="res-row"><span class="res-label">担当</span> ${safeStaff}</div>
      ${memoRow}
      <div class="res-card-divider"><span class="res-label">予約ID</span> <span class="res-id-badge">${safeId}</span></div>
      <div class="res-created-time">⏱ 受付時間：${safeCreatedAt}</div>
      <div class="btn-action-group">
        ${changeButtonHtml}
        ${cancelButtonHtml}
      </div>
    </div>
  `;
}

/**
 * 過去の来店履歴、1件分のカードHTMLを作る（閲覧専用。ボタンなし）
 * @param {Object} item - { date, time, menu, staff, status }
 * @returns {string} カードのHTML
 */
function buildHistoryCardHtml(item) {
  const formattedDate = formatJapaneseDate(item.date);
  const formattedTime = formatReservationTime(item.time);
  const isCancelled = item.status === 'キャンセル済み';
  const statusClass = isCancelled ? 'history-status-cancelled' : 'history-status-visited';

  return `
    <div class="reservation-card history-card">
      <div class="res-row"><span class="res-label">来店日</span> ${escapeHtml(formattedDate)}</div>
      <div class="res-row"><span class="res-label">時間</span> ${escapeHtml(formattedTime)}</div>
      <div class="res-row"><span class="res-label">メニュー</span> ${escapeHtml(item.menu)}</div>
      <div class="res-row"><span class="res-label">担当</span> ${escapeHtml(item.staff)}</div>
      <span class="history-status-badge ${statusClass}">${escapeHtml(item.status)}</span>
    </div>
  `;
}

/**
 * 電話番号とメールアドレスから、過去の来店履歴を検索して一覧表示する
 * （現在の予約検索(fetchReservations)と同じ入力欄を使い、同時に呼ばれる）
 */
async function fetchHistory() {
  if (!historyResultsArea) return;

  const telVal = checkTelInput ? checkTelInput.value.trim() : '';
  const emailVal = checkEmailInput ? checkEmailInput.value.trim() : '';
  if (!telVal || !emailVal) return;

  historyResultsArea.innerHTML = '<div class="no-data">来店履歴を検索しています...</div>';

  try {
    const result = await fetchCustomerHistoryApi(telVal, emailVal);

    if (!result.success) {
      historyResultsArea.innerHTML = `<div class="no-data text-danger">${escapeHtml(result.message)}</div>`;
      return;
    }

    if (!result.history || result.history.length === 0) {
      historyResultsArea.innerHTML = '<h3 class="results-title">過去のご来店履歴</h3><div class="no-data">過去のご来店履歴はありません。</div>';
      return;
    }

    let htmlContent = '<h3 class="results-title">過去のご来店履歴</h3>';
    result.history.forEach(item => {
      htmlContent += buildHistoryCardHtml(item);
    });

    historyResultsArea.innerHTML = htmlContent;
  } catch (error) {
    console.error('来店履歴検索エラー:', error);
    historyResultsArea.innerHTML = '<div class="no-data text-danger">エラーが発生しました。時間を置いて再度お試しください。</div>';
  }
}

/**
 * 電話番号とメールアドレスから予約を検索して一覧表示する
 */
async function fetchReservations() {
  const telVal = checkTelInput ? checkTelInput.value.trim() : '';
  const emailVal = checkEmailInput ? checkEmailInput.value.trim() : '';

  if (!telVal || !emailVal) {
    alert('電話番号とメールアドレスの両方を入力してください。');
    return;
  }

  if (checkBtn) {
    checkBtn.disabled = true;
    checkBtn.textContent = '検索中...';
  }
  if (resultsArea) {
    resultsArea.innerHTML = '<div class="no-data">予約データを検索しています...</div>';
  }

  saveCurrentCustomerDataToCache();

  // 過去の来店履歴は、現在の予約検索と同時に（並行して）取得する
  fetchHistory();

  try {
    const result = await fetchCustomerReservationsApi(telVal, emailVal);

    if (!result.success) {
      resultsArea.innerHTML = `<div class="no-data text-danger">${escapeHtml(result.message)}</div>`;
      return;
    }

    if (!result.reservations || result.reservations.length === 0) {
      resultsArea.innerHTML = '<div class="no-data">現在、条件に一致する今日以降のご予約はありません。</div>';
      return;
    }

    let htmlContent = '<h3 class="results-title">お客様のご予約状況</h3>';
    result.reservations.forEach(res => {
      htmlContent += buildReservationCardHtml(res);
    });

    resultsArea.innerHTML = htmlContent;
  } catch (error) {
    console.error('予約検索エラー:', error);
    resultsArea.innerHTML = '<div class="no-data text-danger">エラーが発生しました。時間を置いて再度お試しください。</div>';
  } finally {
    if (checkBtn) {
      checkBtn.disabled = false;
      checkBtn.textContent = 'ご予約状況を確認する';
    }
  }
}

/**
 * 変更前バナーの表示・非表示を切り替える
 * @param {Object|null} data - 変更前の予約内容。null なら非表示にして内容を空にする
 */
function renderChangeBanner(data) {
  if (prevIdEl) prevIdEl.textContent = data ? (data.resId || '') : '';
  if (prevDatetimeEl) prevDatetimeEl.textContent = data ? `${formatJapaneseDate(data.oldDate)}  ${data.oldTime || ''}` : '';
  if (prevMenuEl) prevMenuEl.textContent = data ? (data.oldMenu || '') : '';
  if (prevStaffEl) prevStaffEl.textContent = data ? (data.oldStaff || '') : '';

  if (changeBannerEl) changeBannerEl.style.display = data ? 'block' : 'none';
}

/**
 * 予約条件の選択状態（日付・スタッフ・メニュー・時間表）を初期状態に戻す
 */
function resetReservationSelection() {
  if (dateInput) dateInput.value = '';
  if (staffSelect && staffSelect.options.length > 0) staffSelect.selectedIndex = 0;
  clearSelectedMenuValue();

  if (selectedDateInput) selectedDateInput.value = '';
  if (selectedTimeInput) selectedTimeInput.value = '';
  if (memoInput) memoInput.value = '';

  if (timetableContainer) {
    timetableContainer.innerHTML = '<div class="no-data">条件に沿った空き枠を表示しています。</div>';
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = '日時を選択してください';
  }
}

/**
 * 予約変更モードを開始する
 * @param {HTMLElement} buttonEl - 押された「日時を変更する」ボタン
 */
async function startChangeMode(buttonEl) {
  const rawStaff = buttonEl.getAttribute('data-staff');
  const staffVal = (rawStaff && rawStaff !== 'null' && rawStaff !== 'undefined') ? rawStaff : CONFIG.NO_ASSIGN_LABEL;

  AppState.changeModeData = {
    resId: buttonEl.getAttribute('data-id') || '',
    oldDate: buttonEl.getAttribute('data-date') || '',
    oldTime: buttonEl.getAttribute('data-time') || '',
    oldStaff: staffVal,
    oldMenu: buttonEl.getAttribute('data-menu') || ''
  };

  // 設定は保持済みのため通信は発生しない
  await initializeSystemUI();

  // 元の担当スタッフを選択状態にする
  if (staffSelect) {
    const exists = Array.from(staffSelect.options).some(opt => opt && opt.value === staffVal);
    if (exists) {
      staffSelect.value = staffVal;
    } else if (staffSelect.options.length > 0) {
      staffSelect.selectedIndex = 0;
    }
  }

  if (memoInput) memoInput.value = buttonEl.getAttribute('data-memo') || '';
  if (dateInput) dateInput.value = AppState.changeModeData.oldDate;

  renderChangeBanner(AppState.changeModeData);

  if (submitBtn) submitBtn.textContent = '日時を選択してください';

  showSection(step2Container);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * 予約変更モードを終了して通常の予約画面に戻す
 */
function abortChangeMode() {
  AppState.changeModeData = null;

  renderChangeBanner(null);
  resetReservationSelection();

  applyCachedCustomerDataToForm();
  initializeSystemUI();
  showSection(step1Container);
}

/**
 * 予約のキャンセルを実行する
 * @param {HTMLElement} buttonEl - 押された「キャンセルする」ボタン
 */
async function requestCancel(buttonEl) {
  const resId = buttonEl.getAttribute('data-id');
  if (!resId) return;

  if (!confirm(`ご予約（ID: ${resId}）をキャンセルしてもよろしいですか？\n\n※この操作は取り消せません。`)) return;

  if (resultsArea) {
    resultsArea.innerHTML = '<div class="no-data">予約のキャンセル処理を行っています...</div>';
  }

  try {
    const data = await submitReservationApi('cancel', { resId: resId });

    if (data.success) {
      alert('ご予約のキャンセルが正常に完了しました。');
    } else {
      alert('キャンセルに失敗しました: ' + data.message);
    }
  } catch (error) {
    console.error('キャンセル通信エラー:', error);
    alert('通信エラーが発生しました。時間を置いて再度お試しください。');
  } finally {
    fetchReservations();
  }
}
