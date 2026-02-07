/**
 * WebSocket心跳检测Worker
 * 用于定期发送心跳包并监控WebSocket连接状态
 */

// 心跳定时器
let heartbeatTimer = null;

// WebSocket连接状态
let connectionStatus = null;

// 页面是否可见（聚焦/前台），仅可见时请求重连
let pageVisible = true;

// 上次心跳时间
let lastHeartbeatTime = new Date();

// 心跳间隔时间(毫秒)
const HEARTBEAT_INTERVAL = 20000;

/**
 * 发送日志消息到主线程
 * @param {string} message 日志消息
 */
function sendLog(message) {
  self.postMessage({ type: "log", data: message });
}

/**
 * 发送心跳消息到主线程
 * @param {number} elapsedTime 距离上次心跳的时间间隔(毫秒)
 */
function sendHeartbeat(elapsedTime) {
  self.postMessage({ type: "heart", data: `${elapsedTime}ms` });
}

/**
 * 请求主线程重新加载WebSocket连接
 */
function requestReload() {
  self.postMessage({ type: "reload" });
}

/**
 * 启动心跳检测
 */
function startHeartbeatMonitor() {
  // 清理可能存在的旧定时器
  clearInterval(heartbeatTimer);

  // 创建新的心跳定时器
  heartbeatTimer = setInterval(() => {
    const now = new Date();
    const elapsedTime = now.getTime() - lastHeartbeatTime.getTime();
    // 发送心跳消息
    sendHeartbeat(elapsedTime);
    // 更新上次心跳时间
    lastHeartbeatTime = now;
  }, HEARTBEAT_INTERVAL);
}

// 监听来自主线程的消息
self.onmessage = function (event) {
  const data = event.data;

  // 仅同步可见性（visibilitychange 时主线程下发）
  if (data.type === "visibility") {
    pageVisible = data.visible !== false;
    return;
  }

  const { status: newStatus, noticeType, visible } = data;

  // 更新连接状态与可见性
  connectionStatus = newStatus;
  if (visible !== undefined)
    pageVisible = visible !== false;

  sendLog(`Web Worker 初始化，ws状态：${connectionStatus} ${noticeType}，可见：${pageVisible}`);

  // 连接异常时仅在前台请求重连，后台由主线程在 visibilitychange 时重连
  if (connectionStatus !== 1) {
    if (pageVisible)
      requestReload();
    return;
  }

  startHeartbeatMonitor();
};
