import { useLocalStorage } from "@vueuse/core";

export interface HistoryAccount {
  type: LoginType;
  account: string;
  password?: string; // 加密存储
  timestamp: number;
  userInfo?: {
    id: string;
    avatar?: string | null;
    nickname?: string | null;
  }; // 登录成功后返回的用户信息
}


export function useHistoryAccount(key: string = "history-accounts") {
  const historyAccounts = useLocalStorage<HistoryAccount[]>(key, [], {
    shallow: false,
  });

  /**
   * 添加登录记录
   * @param account 登录账号
   */
  const addHistoryAccount = async (account: Omit<HistoryAccount, "timestamp">) => {
    const existingIndex = historyAccounts.value.findIndex(a => a.type === account.type && a.account === account.account);

    const encryptedPassword = account.password ? await encrypt(account.password, account.account) : undefined;
    const newAccount = {
      ...account,
      password: encryptedPassword ? JSON.stringify(encryptedPassword) : undefined,
      timestamp: Date.now(),
    };

    if (existingIndex !== -1) {
      historyAccounts.value[existingIndex] = newAccount;
    }
    else {
      historyAccounts.value.unshift(newAccount);
    }

    // 保留最近10条记录
    historyAccounts.value = historyAccounts.value.slice(0, 10);
  };

  /**
   * 获取解密后的历史账号
   */
  const getDecryptedAccounts = async () => {
    return Promise.all(
      historyAccounts.value.map(async (account) => {
        if (account.password) {
          try {
            const decryptedPassword = await decrypt(JSON.parse(account.password), account.account);
            return { ...account, password: decryptedPassword };
          }
          catch (error) {
            console.error("解密失败", error);
          }
        }
        return account;
      }),
    );
  };

  const removeHistoryAccount = (account: string, log: boolean = true, confirmCheck: boolean = false) => {
    if (confirmCheck) {
      ElMessageBox.confirm(
        "确定要删除这个历史账号吗？",
        "删除确认",
        {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          type: "warning",
        },
      ).then(() => {
        const existingIndex = historyAccounts.value.findIndex(a => a.account === account);
        if (existingIndex !== -1) {
          historyAccounts.value.splice(existingIndex, 1);
          if (log) {
            ElMessage.success(`删除成功！`);
          }
        }
      }).catch(() => {
        // 用户取消删除
      });
    }
    else {
      const existingIndex = historyAccounts.value.findIndex(a => a.account === account);
      if (existingIndex !== -1) {
        historyAccounts.value.splice(existingIndex, 1);
        if (log) {
          ElMessage.success(`删除成功！`);
        }
      }
    }
  };

  const decryptHistoryAccounts = async (item: HistoryAccount | Record<string, any>) => {
    if (item.password) {
      try {
        const decryptedPassword = await decrypt(JSON.parse(item.password), item.account);
        return { ...item, password: decryptedPassword };
      }
      catch (error) {
        console.error("解密失败", error);
      }
    }
    return item;
  };

  return {
    historyAccounts,
    addHistoryAccount,
    removeHistoryAccount,
    getDecryptedAccounts,
    decryptHistoryAccounts,
  };
}
