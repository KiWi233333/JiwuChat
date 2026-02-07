import type { Message as BackMessage } from "@tauri-apps/plugin-websocket";
import type { IWebSocketAdapter, WSAdapterErrorHandler, WSAdapterMessageHandler, WSAdapterStatusHandler } from "./types";
import type { WsSendMsgDTO } from "~/types/chat/WsType";
import BackWebSocket from "@tauri-apps/plugin-websocket";
import { WsStatusEnum } from "~/types/chat/WsType";

export class TauriWSAdapter implements IWebSocketAdapter {
  private ws: BackWebSocket | null = null;
  private status: WsStatusEnum = WsStatusEnum.CLOSE;
  private messageHandler: WSAdapterMessageHandler | null = null;
  private statusHandler: WSAdapterStatusHandler | null = null;
  private errorHandler: WSAdapterErrorHandler | null = null;

  async connect(url: string): Promise<void> {
    this.updateStatus(WsStatusEnum.CONNECTION);

    try {
      this.ws = await BackWebSocket.connect(url);

      if (!this.ws?.id) {
        this.updateStatus(WsStatusEnum.CLOSE);
        throw new Error("Failed to connect Tauri WebSocket");
      }

      this.updateStatus(WsStatusEnum.OPEN);
      this.setupListeners();
    }
    catch (err) {
      this.updateStatus(WsStatusEnum.CLOSE);
      this.errorHandler?.(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      await this.ws.disconnect();
      this.ws = null;
    }
    this.updateStatus(WsStatusEnum.SAFE_CLOSE);
  }

  send(data: WsSendMsgDTO): void {
    if (this.status === WsStatusEnum.OPEN && this.ws) {
      this.ws.send(JSON.stringify(data));
    }
  }

  onMessage(handler: WSAdapterMessageHandler): void {
    this.messageHandler = handler;
  }

  onStatusChange(handler: WSAdapterStatusHandler): void {
    this.statusHandler = handler;
  }

  onError(handler: WSAdapterErrorHandler): void {
    this.errorHandler = handler;
  }

  getStatus(): WsStatusEnum {
    return this.status;
  }

  dispose(): void {
    this.ws?.disconnect();
    this.ws = null;
    this.messageHandler = null;
    this.statusHandler = null;
    this.errorHandler = null;
    this.status = WsStatusEnum.CLOSE;
  }

  private setupListeners(): void {
    if (!this.ws)
      return;

    this.ws.addListener((msg: BackMessage) => {
      if (this.handleError(msg))
        return;

      if (msg.type === "Close") {
        this.updateStatus(WsStatusEnum.SAFE_CLOSE);
        this.ws = null;
        return;
      }

      if (msg.type === "Text" && msg.data) {
        this.messageHandler?.(String(msg.data));
        return;
      }

      if (!["Binary", "Ping", "Pong"].includes(msg.type)) {
        this.updateStatus(WsStatusEnum.SAFE_CLOSE);
        this.ws = null;
      }
    });
  }

  private handleError(msg: BackMessage): boolean {
    const data = msg?.data?.toString() || "";

    if (data.includes("WebSocket protocol error: Connection reset without closing handshake")) {
      this.updateStatus(WsStatusEnum.SAFE_CLOSE);
      this.ws = null;
      return true;
    }

    if (data.includes("WebSocket protocol error")) {
      this.updateStatus(WsStatusEnum.CLOSE);
      this.errorHandler?.(new Error(data));
      this.ws = null;
      return true;
    }

    return false;
  }

  private updateStatus(status: WsStatusEnum): void {
    this.status = status;
    this.statusHandler?.(status);
  }
}
