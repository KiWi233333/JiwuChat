export interface PageInfo { cursor?: string, isLast: boolean, size: number }

export interface RoomChacheData {
  pageInfo: PageInfo
  userList: ChatMemberVO[]
  isReload: boolean
  cacheTime: number
  isLoading: boolean
}

export interface MemberListManager<T> {
  list: Ref<T[]>
  pageInfo: Ref<PageInfo>
  isLoading: Ref<boolean>
  isReload: Ref<boolean>
  lastLoadTime: Ref<number | undefined>
  load: () => Promise<void>
  reload: () => Promise<void>
  ensureFresh: () => Promise<void>
}

export interface ChatContactExtra extends ChatContactDetailVO {
  msgMap: Record<number, ChatMessageVO>
  msgIds: number[]
  unreadMsgList?: ChatMessageVO[]
  pageInfo: Partial<PageInfo>
  isReload: boolean
  isLoading: boolean
  isSyncing?: boolean
  targetUid?: string
  saveTime?: number
  scrollTopSize?: number
  lastSortedIndex?: number
}


