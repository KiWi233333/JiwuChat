import type { WebSocketManager } from "~/composables/hooks/ws/WebSocketManager";
import type { WsSendMsgDTO } from "~/types/chat/WsType";
import { acceptHMRUpdate, defineStore } from "pinia";
import { useWsMessage } from "~/composables/hooks/ws/useWsCore";
import { getWebSocketManager } from "~/composables/hooks/ws/WebSocketManager";
import { WsStatusEnum } from "~/types/chat/WsType";

export const useWsStore = defineStore(
  WS_STORE_KEY,
  () => {
    const isWindBlur = ref<boolean>(false);
    const setting = useSettingStore();

    const manager = shallowRef<WebSocketManager | null>(null);

    const {
      wsMsgList,
      isNewMsg,
      processWsMessage,
      resetMsgList,
    } = useWsMessage();

    const status = computed(() => manager.value?.status.value ?? WsStatusEnum.CLOSE);

    const reload = () => mitter.emit(MittEventType.CHAT_WS_RELOAD);

    async function initDefault(call: () => any) {
      const user = useUserStore();
      if (!user.getToken) {
        await close(false);
        return false;
      }

      if (manager.value && (status.value === WsStatusEnum.OPEN || status.value === WsStatusEnum.CONNECTION)) {
        return true;
      }

      const useTauri = !setting.isUseWebsocket;
      manager.value = getWebSocketManager(useTauri);

      const fullWsUrl = `${BaseWSUrlRef.value}?Authorization=${user.getToken}`;
      const success = await manager.value.connect(fullWsUrl);

      if (success) {
        call();
      }

      return success;
    }

    function onMessage() {
      if (!manager.value)
        return;

      manager.value.onMessage((data: string) => {
        try {
          const msgData = JSON.parse(data) as Result<WsMsgBodyVO>;
          checkResponse(msgData);
          if (msgData) {
            processWsMessage(msgData);
          }
        }
        catch (err) {
          // ignore
        }
      });
    }

    function send(data: WsSendMsgDTO) {
      manager.value?.send(data);
    }

    function sendHeart() {
      manager.value?.sendHeart();
    }

    async function close(isConfirm = true) {
      if (!isConfirm) {
        try {
          await manager.value?.disconnect();
        }
        finally {
          // ignore
        }
        return;
      }

      ElMessageBox.confirm("是否断开会话？", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        confirmButtonClass: "el-button--danger shadow border-default ",
        lockScroll: false,
        center: true,
        callback: async (res: string) => {
          if (res === "confirm") {
            await manager.value?.disconnect();
            ElNotification.success("断开成功！");
          }
        },
      });
    }

    function resetStore() {
      try {
        close(false);
        manager.value?.dispose();
      }
      catch (err) {
        // ignore
      }
      finally {
        resetMsgList();
        manager.value = null;
        isWindBlur.value = false;
      }
    }

    return {
      isNewMsg,
      manager,
      status,
      isWindBlur,
      wsMsgList,
      resetStore,
      reload,
      initDefault,
      send,
      close,
      sendHeart,
      onMessage,
    };
  },
  {
  },
);

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useWsStore, import.meta.hot));
