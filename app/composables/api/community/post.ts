/**
 * 获取帖子列表
 * @param page 页
 * @param size 个数
 * @param dto 查询参数
 * @returns Result<IPage<PostInfoVO>
 */
export function getPostPageLazy(page: number, size: number, dto: SelectCommPostDTO) {
  return useFetch<Result<IPage<PostInfoVO>>>(`${BaseUrl}/community/post/list/${page}/${size}`, {
    method: "POST",
    body: { ...dto },
  });
}
export function getPostPage(page: number, size: number, dto: SelectCommPostDTO) {
  return useHttp.post<Result<IPage<PostInfoVO>>>(`/community/post/list/${page}/${size}`, { ...dto }, {
  });
}
export function getPostPageSelf(page: number, size: number, dto: SelectCommPostDTO, token: string) {
  return useHttp.post<Result<IPage<PostInfoVO>>>(`/community/post/self/list/${page}/${size}`, { ...dto }, {
    headers: {
      Authorization: token,
    },
  });
}

/**
 * 社区圈子表
 *
 * PostInfoVO
 */
export interface PostInfoVO {
  id: string
  userId: string
  categoryId: string
  title: string
  /**
   * 封面
   */
  cover: string
  images?: string
  tags?: string
  isEssence?: boolean
  commentTopId?: any
  comments: number
  likes: number
  /**
   * 0-草稿，1-已发布，2-已删除
   */
  status: PostStatus
  views: number
  createTime: string
  updateTime: string
  /**
   * 用户部分信息
   */
  user: PostUserSeVO
}
export interface PostUserSeVO {
  username: string
  nickname?: string
  gender: string
  avatar?: string
  slogan?: string
  birthday?: string
}
/**
 * 分页查询社区帖子
 * SelectCommPostDTO
 */
export interface SelectCommPostDTO {
  /**
   * userId
   */
  userId?: string
  /**
   * 帖子关键字
   */
  name?: string
  /**
   * 帖子分类id
   */
  cid?: string
  status?: number
  /**
   * 评论数排序
   * 0 asc, 1 desc
   */
  commentSort?: isTrue
  /**
   * 是否精华
   */
  isEssence?: isTrue
  /**
   * 是否最新
   */
  isNew?: isTrue
  /**
   * 浏览量排序
   * 0 asc, 1 desc
   */
  viewsSort?: isTrue
}

/**
 * 帖子状态
 */
export enum PostStatus {
  /** 未审核 */
  UNDOING = 0,
  /** 已发布，通过 */
  PUBLISHED = 1,
  /** 已删除 */
  DELETED = 2, // 用户删除状态
  REJECT = 3, // 已驳回
  ADMIN_DELETED = 4,
  DRAFT = 5,
}


/**
 * 获取帖子详情
 * @returns Result<PostDetailInfoVO>
 */
export function getCommPostDetail(id: string, token: string) {
  return useFetch<Result<PostDetailInfoVO>>(`${BaseUrl}/community/post/${id}`, {
    method: "GET",
    headers: {
      Authorization: token,
    },
  });
}

/**
 * 获取帖子详情(个人管理)
 * @returns Result<PostDetailInfoVO>
 */
export function getCommPostDetailBySelf(id: string, token: string) {
  return useHttp.get<Result<PostDetailInfoVO>>(`/community/post/self/${id}`, {}, {
    headers: {
      Authorization: token,
    },
  });
}


/**
 * 获取帖子详情
 * @returns Result<PostDetailInfoVO>
 */
export function getCommPostDetailHttp(id: string, token: string) {
  return useHttp.get<Result<PostDetailInfoVO>>(`/community/post/${id}`, {}, {
    headers: {
      Authorization: token,
    },
  });
}

export interface PostDetailInfoVO extends PostInfoVO {
  /**
   * 帖子内容
   */
  content: string
}
/**
 * 添加帖子
 * @param dto 参数
 * @param token token
 * @returns 影响行
 */
export function addCommPost(dto: InsertPostDTO, token: string) {
  return useHttp.post<Result<string>>("/community/post", {
    ...dto,
  }, {
    headers: {
      Authorization: token,
    },
  });
}
/**
 * InsertPostDTO
 */
export interface InsertPostDTO {
  /**
   * 分类id
   */
  categoryId: string
  /**
   * 内容
   */
  content: string
  /**
   * 封面
   */
  cover: string
  /**
   * 图片集合
   */
  images?: string[]
  /**
   * 标签集合
   */
  tags?: string[]
  /**
   * 标题
   */
  title: string
  [property: string]: any
}

/**
 * 修改帖子
 * @param id 帖子id
 * @param dto 参数
 * @param token token
 * @returns 影响行
 */
export function updateCommPost(id: string, dto: UpdatePostDTO, token: string) {
  return useHttp.put<Result<number>>(`/community/post/${id}`, {
    ...dto,
  }, {
    headers: {
      Authorization: token,
    },
  });
}
/**
 * UpdatePostDTO
 */
export interface UpdatePostDTO {
  /**
   * 分类id
   */
  categoryId?: string
  /**
   * 内容
   */
  content?: string
  /**
   * 封面
   */
  cover?: string
  /**
   * 图片集合
   */
  images?: string[] | null
  /**
   * 标签集合
   */
  tags?: string[] | null
  /**
   * 标题
   */
  title?: string
  [property: string]: any
}

/**
 * 软删除帖子（10天自动删除）（回收站）
 * @param id 帖子id
 * @param token token
 * @returns 影响行
 */
export function delCommPost(id: string, token: string) {
  return useHttp.deleted<Result<number>>(`/community/post/${id}`, {
  }, {
    headers: {
      Authorization: token,
    },
  });
}

/**
 * 删除帖子（立即删除）
 * @param id 帖子id
 * @param token token
 * @returns 影响行
 */
export function hardDelCommPost(id: string, token: string) {
  return useHttp.deleted<Result<number>>(`/community/post/hard/${id}`, {
  }, {
    headers: {
      Authorization: token,
    },
  });
}

// ------------------------帖子行为-------------------
/**
 *
 * @param page 页码
 * @param size 每页数量
 * @param dto 参数
 * @param token 用户token
 * @returns Result<IPage<CommPostActionVO>>
 */
export function getCommPostActionPage(page: number, size: number, dto: SelectCommPostActionPageDTO, token: string) {
  return useHttp.post<Result<IPage<CommPostActionVO>>>(`/community/post/action/list/${page}/${size}`, {
    ...dto,
  }, {
    headers: {
      Authorization: token,
    },
  });
}
/**
 * SelectCommPostActionPageDTO
 */
export interface SelectCommPostActionPageDTO {
  /**
   * 是否展示帖子部分信息
   */
  isPostInfo?: number | null
  /**
   * 帖子id
   */
  postId?: string
  /**
   * 行为类型，0 表示点赞，1 表示收藏
   */
  type?: PostActionType
}
export interface CommPostActionVO {
  id: string
  userId: string
  postId: string
  type: number
  createTime: string
  postInfo?: PostInfoVO
}
/**
 * 获取帖子行为列表
 * @param pid 帖子id
 * @param dto 参数
 * @param token 用户token
 * @returns Result<CommPostActionVO[]>
 */
export function getPostActionById(pid: string, dto: SelectThePostActionDTO, token: string) {
  return useHttp.post<Result<CommPostActionVO[]>>(`/community/post/action/${pid}`, {
    ...dto,
  }, {
    headers: {
      Authorization: token,
    },
  });
}
/**
 * SelectThePostActionDTO
 */
export interface SelectThePostActionDTO {
  /**
   * 是否展示帖子部分信息
   */
  isPostInfo?: number | null
  /**
   * 行为类型，0 表示点赞，1 表示收藏
   */
  type?: number | null
  [property: string]: any
}


/**
 * 切换帖子行为（确认、取消）
 * @param pid 帖子id
 * @param dto 参数
 * @param token token
 * @returns 最终值
 */
export function togglePostAction(pid: string, dto: TogglePostActionDTO, token: string) {
  return useHttp.put<Result<number>>(`/community/post/action/${pid}`, {
    ...dto,
  }, {
    headers: {
      Authorization: token,
    },
  });
}

/**
 * TogglePostActionDTO
 */
export interface TogglePostActionDTO {
  /**
   * 帖子id
   */
  postId: string
  /**
   * 行为类型，0 表示点赞，1 表示收藏
   */
  type: PostActionType
}

export enum PostActionType {
  /**
   * 点赞
   */
  LIKE = 0,
  /**
   * 收藏
   */
  COLLECT = 1,
}


export const getPostStatusList: {
  title: string
  class?: string
  iconClass: "" | "warning" | "danger" | "success" | "info"
  value: number
}[] = [
  { title: "待审核", iconClass: "warning", value: 0 },
  { title: "已审核", iconClass: "", value: 1 },
  { title: "回收站", iconClass: "danger", value: 2 },
  { title: "已驳回", iconClass: "danger", value: 3 },
  { title: "管理员删除", iconClass: "", value: 4 },
  { title: "存草稿", iconClass: "success", value: 5 },
];

Object.freeze(getPostStatusList);
/************************************/

/**
 * 获取用户帖子统计
 * @returns Result<PostDetailInfoVO>
 */
export function getPostTotal(dto: PostTotalDTO, token: string) {
  return useHttp.post<Result<PostTotalVO>>("/community/post/total", {
    ...dto,
  }, {
    headers: {
      Authorization: token,
    },
  });
}


/**
 * PostTotalDTO
 */
export interface PostTotalDTO {
  /**
   * 用户id
   */
  userId: null | string
  /**
   * 结束时间
   */
  endTime?: null | string
  /**
   * 开始时间
   */
  startTime?: null | string
  [property: string]: any
}

export interface PostTotalVO {
  /**
   * 帖子总数
   */
  postCount: number
  /**
   * 帖子评论总数
   */
  postCommentCount: number
  /**
   * 帖子点赞总数
   */
  postLikeCount: number
  /**
   * 帖子收藏总数
   */
  postCollectCount: number
}
