
/**
 * =================================================================
 * SIS 管理画面 - admin-accounts.js
 * [役割: 「アカウント管理」タブの読み込み・追加・削除]
 * admin-core.js の後に読み込むこと
 * =================================================================
 */
async function loadAccounts() {
  if (accountsLoading) accountsLoading.style.display = 'block';
  if (accountsError) accountsError.style.display = 'none';

  try {
    const result = await callAdminApi('getAdminAccounts');
    if (!result.success) throw new Error(result.message || 'アカウント一覧の取得に失敗しました。');

    renderAccounts(result.accounts || []);
    accountsLoaded = true;
  } catch (error) {
    console.error('アカウント一覧の取得エラー:', error);
    if (accountsError) {
      accountsError.textContent = error.message || '通信エラーが発生しました。時間をおいて再度お試しください。';
      accountsError.style.display = 'block';
    }
  } finally {
    if (accountsLoading) accountsLoading.style.display = 'none';
  }
}

/**
 * アカウント一覧を表として描画する（自分自身の行には削除ボタンを出さない）
 * @param {Array<Object>} accounts - { loginId, displayName } の配列
 */
function renderAccounts(accounts) {
  if (!accountsTbody) return;

  const myLoginId = sessionStorage.getItem(SESSION_DISPLAY_NAME_KEY); // 表示名しか保持していないため、削除可否はサーバー側の最終チェックに委ねる

  if (accounts.length === 0) {
    accountsTbody.innerHTML = '<tr><td colspan="3">登録されているアカウントはありません。</td></tr>';
    return;
  }

  accountsTbody.innerHTML = accounts.map(acc => `
    <tr>
      <td>${escapeHtmlAdmin(acc.loginId)}</td>
      <td>${escapeHtmlAdmin(acc.displayName)}</td>
      <td><button type="button" class="btn-remove-row delete-account-btn" data-login-id="${escapeHtmlAdmin(acc.loginId)}" title="このアカウントを削除">×</button></td>
    </tr>
  `).join('');

  accountsTbody.querySelectorAll('.delete-account-btn').forEach(btn => {
    btn.addEventListener('click', () => handleDeleteAccount(btn.getAttribute('data-login-id')));
  });
}

/**
 * アカウント削除ボタンが押された時の処理（確認ダイアログを挟んでから実行する）
 * @param {string} targetLoginId
 */
async function handleDeleteAccount(targetLoginId) {
  if (!confirm(`ログインID「${targetLoginId}」のアカウントを削除しますか？この操作は取り消せません。`)) return;

  if (accountsError) accountsError.style.display = 'none';

  try {
    const result = await callAdminApi('deleteAdminAccount', { targetLoginId: targetLoginId });
    if (!result.success) throw new Error(result.message || '削除に失敗しました。');

    await loadAccounts();
  } catch (error) {
    console.error('アカウント削除エラー:', error);
    if (accountsError) {
      accountsError.textContent = error.message || '通信エラーが発生しました。時間をおいて再度お試しください。';
      accountsError.style.display = 'block';
    }
  }
}

if (addAccountForm) {
  addAccountForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (addAccountError) addAccountError.style.display = 'none';
    if (addAccountSavedMsg) addAccountSavedMsg.style.display = 'none';
    if (addAccountBtn) {
      addAccountBtn.disabled = true;
      addAccountBtn.textContent = '追加中...';
    }

    try {
      const newLoginId = newLoginIdInput.value.trim();
      const newPassword = newPasswordInput.value;
      const newDisplayName = newDisplayNameInput.value.trim();

      const result = await callAdminApi('addAdminAccount', {
        newLoginId: newLoginId,
        newPassword: newPassword,
        newDisplayName: newDisplayName
      });

      if (!result.success) throw new Error(result.message || '追加に失敗しました。');

      if (addAccountSavedMsg) addAccountSavedMsg.style.display = 'block';
      addAccountForm.reset();
      await loadAccounts();
    } catch (error) {
      console.error('アカウント追加エラー:', error);
      if (addAccountError) {
        addAccountError.textContent = error.message || '通信エラーが発生しました。時間をおいて再度お試しください。';
        addAccountError.style.display = 'block';
      }
    } finally {
      if (addAccountBtn) {
        addAccountBtn.disabled = false;
        addAccountBtn.textContent = '追加する';
      }
    }
  });
}

/**
 * ページを開いた時、既にログイン済み（ブラウザのタブ内にセッショントークンが残っている）かどうか確認する
 */