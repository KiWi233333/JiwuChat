import type { IWebSocketAdapter } from "./adapters/types";
import type { WsSendMsgDTO } from "~/types/chat/WsType";
import { mitter, MittEventType } from "~/composables/utils/useMitt";
import { WsMsgType, WsStatusEnum } from "~/types/chat/WsType";
import { createWebSocketAdapter } from "./adapters/types";

const WS_SYNC_DELAY = 200;

export class WebSocketManager {
  private adapter: IWebSocketAdapter | null = null;
  private _status = ref<WsStatusEnum>(WsStatusEnum.CLOSE);
  private _lastDisconnectTime = ref<number>(0);
  private _connectTime = ref<number>(0);
  private useTauri: boolean;

  constructor(useTauri: boolean = false) {
    this.useTauri = useTauri;
  }

  get status() {
    return this._status;
  }

  get lastDisconnectTime() {
    return this._lastDisconnectTime;
  }

  get connectTime() {
    return this._connectTime;
  }

  async connect(url: string): Promise<boolean> {
    if (this.adapter && this._status.value === WsStatusEnum.OPEN) {
      return true;
    }

    if (this.adapter && this._status.value === WsStatusEnum.CONNECTION) {
      return true;
    }

    try {
      await this.dispose();
      this.adapter = await createWebSocketAdapter(this.useTauri);

      this.adapter.onStatusChange((status) => {
        this._status.value = status;
        if (status === WsStatusEnum.CLOSE || status === WsStatusEnum.SAFE_CLOSE) {
          this._lastDisconnectTime.value = Date.now();
        }
      });

      this.adapter.onError((err) => {
        console.error("WebSocket error:", err);
        this._lastDisconnectTime.value = Date.now();
      });

      await this.adapter.connect(url);
      this._connectTime.value = Date.now();
      this.checkSyncEvent();
      return true;
    }
    catch (err) {
      console.error("WebSocket connect failed:", err);
      this._status.value = WsStatusEnum.CLOSE;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.adapter) {
      await this.adapter.disconnect();
      this._lastDisconnectTime.value = Date.now();
    }
    this._status.value = WsStatusEnum.SAFE_CLOSE;
  }

  async dispose(): Promise<void> {
    if (this.adapter) {
      this.adapter.dispose();
      this.adapter = null;
    }
  }

  send(data: WsSendMsgDTO): void {
    if (this._status.value === WsStatusEnum.OPEN && this.adapter) {
      this.adapter.send(data);
    }
  }

  sendHeart(): void {
    this.send({
      type: WsMsgType.HEARTBEAT,
      data: null,
    });
  }

  onMessage(handler: (data: string) => void): void {
    if (this.adapter) {
      this.adapter.onMessage(handler);
    }
  }

  setUseTauri(useTauri: boolean): void {
    this.useTauri = useTauri;
  }

  private checkSyncEvent(): void {
    const lastDisconnect = this._lastDisconnectTime.value;
    const connectTime = this._connectTime.value;

    if (lastDisconnect > 0 && (connectTime - lastDisconnect) >= WS_SYNC_DELAY) {
      mitter.emit(MittEventType.WS_SYNC, {
        lastDisconnectTime: lastDisconnect,
        reconnectTime: connectTime,
      });
    }
  }

  reset(): void {
    this._status.value = WsStatusEnum.CLOSE;
    this._lastDisconnectTime.value = Date.now();
    this._connectTime.value = 0;
    this.dispose();
    mitter.emit(MittEventType.CHAT_WS_RELOAD);
  }
}

let wsManager: WebSocketManager | null = null;

export function getWebSocketManager(useTauri?: boolean): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager(useTauri);
  }
  else if (useTauri !== undefined) {
    wsManager.setUseTauri(useTauri);
  }
  return wsManager;
}
