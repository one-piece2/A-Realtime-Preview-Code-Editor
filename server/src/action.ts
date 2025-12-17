export const ACTIONS = {
  JOIN: 'join',
  JOINED: 'joined',
  DISCONNECTED: 'disconnected',
  CODE_CHANGE: 'code-change',
  SYNC_CODE: 'sync-code',
  LEAVE: 'leave',
  LEFT: 'left',                       // 离开房间成功确认
  //Yjs 同步消息
  Y_SYNC: 'y-sync',
  //Yjs 更新消息
  Y_UPDATE: 'y-update',
  //Yjs Awareness（光标、选区、用户状态）消息
  Y_AWARENESS: 'y-awareness',


  ERROR: 'error',                    // 错误消息
  ROLE_CHANGED: 'role-changed',      // 角色变更通知
  MEMBER_JOINED: 'member-joined',    // 新成员加入通知
  MEMBER_LEFT: 'member-left',        // 成员离开通知
  MEMBER_REMOVED: 'member-removed',  // 成员被移除通知
  ROOM_UPDATED: 'room-updated',      // 房间信息更新通知
};
