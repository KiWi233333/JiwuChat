import type { ErrorHandler, IWebSocketAdapter, MessageHandler, StatusHandler } from "./types";
import type { WsSendMsgDTO } from "~/types/chat/WsType";
import { WsStatusEnum } from "~/types/chat/WsType";

export class BrowserWSAdapter implements IWebSocketAdapter {
  private ws: WebSocket | null = null;
  private status: WsStatusEnum = WsStatusEnum.CLOSE;
  private messageHandler: MessageHandler | null = null;
  private statusHandler: StatusHandler | null = null;
  private errorHandler: ErrorHandler | null = null;

  async connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.updateStatus(WsStatusEnum.CONNECTION);

      try {
        this.ws = new WebSocket(url);
      }
      catch (err) {
        this.updateStatus(WsStatusEnum.CLOSE);
        reject(err);
        return;
      }

      this.ws.onopen = () => {
        this.updateStatus(WsStatusEnum.OPEN);
        resolve();
      };

      this.ws.onerror = (event) => {
        this.updateStatus(WsStatusEnum.CLOSE);
        this.errorHandler?.(new Error("WebSocket error"));
        reject(event);
      };

      this.ws.onclose = () => {
        this.updateStatus(WsStatusEnum.SAFE_CLOSE);
      };

      this.ws.onmessage = (event: MessageEvent) => {
        if (event.data) {
          this.messageHandler?.(event.data);
        }
      };
    });
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.updateStatus(WsStatusEnum.SAFE_CLOSE);
  }

  send(data: WsSendMsgDTO): void {
    if (this.status === WsStatusEnum.OPEN && this.ws) {
      this.ws.send(JSON.stringify(data));
    }
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  onStatusChange(handler: StatusHandler): void {
    this.statusHandler = handler;
  }

  onError(handler: ErrorHandler): void {
    this.errorHandler = handler;
  }

  getStatus(): WsStatusEnum {
    return this.status;
  }

  dispose(): void {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }
    this.messageHandler = null;
    this.statusHandler = null;
    this.errorHandler = null;
    this.status = WsStatusEnum.CLOSE;
  }

  private updateStatus(status: WsStatusEnum): void {
    this.status = status;
    this.statusHandler?.(status);
  }
}
