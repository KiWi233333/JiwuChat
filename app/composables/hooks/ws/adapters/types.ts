import type { WsSendMsgDTO, WsStatusEnum } from "~/types/chat/WsType";

export type WSAdapterMessageHandler = (data: string) => void;
export type WSAdapterStatusHandler = (status: WsStatusEnum) => void;
export type WSAdapterErrorHandler = (error: Error) => void;

export interface IWebSocketAdapter {
  connect: (url: string) => Promise<void>
  disconnect: () => Promise<void>
  send: (data: WsSendMsgDTO) => void
  onMessage: (handler: WSAdapterMessageHandler) => void
  onStatusChange: (handler: WSAdapterStatusHandler) => void
  onError: (handler: WSAdapterErrorHandler) => void
  getStatus: () => WsStatusEnum
  dispose: () => void
}

export interface WebSocketAdapterOptions {
  onMessage?: WSAdapterMessageHandler
  onStatusChange?: WSAdapterStatusHandler
  onError?: WSAdapterErrorHandler
}

export async function createWebSocketAdapter(useTauri: boolean): Promise<IWebSocketAdapter> {
  if (useTauri) {
    const { TauriWSAdapter } = await import("./tauri");
    return new TauriWSAdapter();
  }
  const { BrowserWSAdapter } = await import("./browser");
  return new BrowserWSAdapter();
}
