import type { UserInfoVO, UserWallet } from "../api/user/info";
import { acceptHMRUpdate, defineStore } from "pinia";
import { toLogout } from "../api/user";
import { getUserInfo } from "../api/user/info";

// @unocss-include
// https://pinia.web3doc.top/ssr/nuxt.html#%E5%AE%89%E8%A3%85
export const useUserStore = defineStore(
  USER_STORE_KEY,
  () => {
    // token
    const token = ref<string>("");
    // 是否登录
    const isLogin = ref<boolean>(false);
    // 是否打开登录
    const showLoginPageType = ref<"login" | "register" | "env-config" | "">("");
    const showUpdatePwd = ref<boolean>(false);
    // 钱包信息 TODO: 暂不使用
    const userWallet = ref<UserWallet>({
      userId: "",
      balance: 0,
      recharge: 0,
      spend: 0,
      points: 0,
      updateTime: "",
      createTime: "",
    });
    // 用户个人信息
    const userInfo = ref<UserInfoVO>({
      id: "",
      username: "",
      email: "",
      phone: "",
      nickname: "",
      gender: Gender.BOY,
      avatar: "",
      birthday: "",
      createTime: "",
      slogan: "",
      updateTime: "",
      lastLoginTime: "",
      status: UserStatus.FALSE,
      isEmailVerified: 0,
      isPhoneVerified: 0,
    });
    const isOnLogining = ref<boolean>(false);
    const userId = computed(() => userInfo.value.id);
    const markPhone = computed(() => userInfo.value?.phone?.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2") || "");


    const getToken = computed({
      get() {
        if (!isLogin.value || !token.value) {
          showLoginPageType.value = "login";
          return "";
        }
        else {
          return token.value;
        }
      },
      set(value) {
        token.value = value;
      },
    });

    function getTokenFn() {
      return token.value?.trim();
    }

    /**
     * 用户登录
     * @param t t
     */
    const onUserLogin = async (t: string, saveLocal?: boolean, callback?: (data: UserInfoVO) => void) => {
      const res = await getUserInfo(t);
      if (res.code && res.code === StatusCode.SUCCESS) {
        userInfo.value = res.data as UserInfoVO;
        isLogin.value = true;
        token.value = t;
        callback && callback(res.data);
        return true;
      }
      else {
        callbackUserExit(t);
        return false;
      }
    };

    // 退出登录
    function exitLogin() {
      ElMessageBox.confirm("是否确认退出登录？", "退出登录", {
        confirmButtonText: "确认退出",
        confirmButtonClass: "el-button--danger",
        lockScroll: false,
        center: true,
        cancelButtonText: "取消",
        type: "warning",
      })
        .then(() => {
          callbackUserExit(token.value);
          // if (document)
          //   ElMessage.success("退出成功！");
        })
        .catch(() => { });
    }

    /**
     * 加载用户信息
     * @param token 用户token
     */
    const loadUserInfo = async (token: string): Promise<boolean> => {
      const user = await getUserInfo(token);
      if (user.code === StatusCode.SUCCESS) {
        userInfo.value = user.data;
        return true;
      }
      else {
        return false;
      }
    };

    /**
     * 退出登录
     * @param t token
     */
    async function callbackUserExit(t?: string) {
      try {
        if (t)
          await toLogout(t);
      }
      catch (error) {
        console.log(error);
      }
      finally {
        // 退出登录
        clearUserStore();
        useChatStore().resetStore();
        useWsStore().resetStore();
        await nextTick();
        await navigateTo("/login");
      }
    }
    /**
     * 清空store缓存
     */
    function clearUserStore() {
      token.value = "";
      isOnLogining.value = false;
      isLogin.value = false;
      userWallet.value = {
        userId: "",
        balance: 0,
        recharge: 0,
        spend: 0,
        points: 0,
        updateTime: "",
        createTime: "",
      };
      userInfo.value = {
        id: "",
        username: "",
        email: "",
        phone: "",
        nickname: "",
        gender: Gender.BOY,
        avatar: "",
        birthday: "",
        createTime: "",
        updateTime: "",
        slogan: "",
        lastLoginTime: "",
        status: UserStatus.FALSE,
        isEmailVerified: 0,
        isPhoneVerified: 0,
      };
    }
    return {
      // state
      token,
      isLogin,
      showUpdatePwd,
      showLoginPageType,
      userInfo,
      userId,
      markPhone,
      userWallet,
      isOnLogining,
      // actions
      onUserLogin,
      callbackUserExit,
      exitLogin,
      clearUserStore,
      loadUserInfo,
      // getter
      getToken,
      getTokenFn,
    };
  },
  {
    // https://prazdevs.github.io/pinia-plugin-persistedstate/frameworks/nuxt-3.html
    persist: {
      storage: piniaPluginPersistedstate.localStorage(),
    },
  },
);
if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useUserStore, import.meta.hot));
