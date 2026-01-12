import { RECALL_TIME_OUT } from "../constants";

/**
 * 检查是否可以撤回消息
 * @param isSelf 是否是自己发送的消息
 * @param sendTime 消息发送时间
 * @returns 是否可以撤回
 */
export function canRecall(isSelf: boolean, sendTime: number): boolean {
  return isSelf && sendTime >= Date.now() - RECALL_TIME_OUT;
}

/**
 * 检查是否可以删除消息
 * @param hasGroupPermission 是否有群组权限
 * @returns 是否可以删除
 */
export function canDelete(hasGroupPermission: boolean): boolean {
  return hasGroupPermission;
}

/**
 * 检查是否是消息所有者
 * @param currentUserId 当前用户ID
 * @param messageUserId 消息发送者ID
 * @returns 是否是所有者
 */
export function isMessageOwner(currentUserId: number, messageUserId: number): boolean {
  return currentUserId === messageUserId;
}

/**
 * 检查是否有群组管理权限
 * @param role 用户在群组中的角色
 * @returns 是否有权限
 */
export function hasGroupPermission(role?: ChatRoomRoleEnum): boolean {
  return role === ChatRoomRoleEnum.OWNER || role === ChatRoomRoleEnum.ADMIN;
}
