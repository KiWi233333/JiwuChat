import type { WsSendMsgDTO, WsStatusEnum } from "~/types/chat/WsType";

export type MessageHandler = (data: string) => void;
export type StatusHandler = (status: WsStatusEnum) => void;
export type ErrorHandler = (error: Error) => void;

export interface IWebSocketAdapter {
  connect: (url: string) => Promise<void>
  disconnect: () => Promise<void>
  send: (data: WsSendMsgDTO) => void
  onMessage: (handler: MessageHandler) => void
  onStatusChange: (handler: StatusHandler) => void
  onError: (handler: ErrorHandler) => void
  getStatus: () => WsStatusEnum
  dispose: () => void
}

export interface WebSocketAdapterOptions {
  onMessage?: MessageHandler
  onStatusChange?: StatusHandler
  onError?: ErrorHandler
}

export async function createWebSocketAdapter(useTauri: boolean): Promise<IWebSocketAdapter> {
  if (useTauri) {
    const { TauriWSAdapter } = await import("./tauri");
    return new TauriWSAdapter();
  }
  const { BrowserWSAdapter } = await import("./browser");
  return new BrowserWSAdapter();
}
