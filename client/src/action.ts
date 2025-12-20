export const ACTIONS = {
    JOIN: 'join',
    JOINED: 'joined',
    DISCONNECTED: 'disconnected',
    CODE_CHANGE: 'code-change',
    SYNC_CODE: 'sync-code',
    LEAVE: 'leave',
    //处理yjs文档同步
    Y_SYNC: 'y-sync',
    //处理yjs文档更新
    Y_UPDATE: 'y-update',
    // Yjs Awareness（光标、选区、用户状态）消息
    Y_AWARENESS: 'y-awareness',

    ERROR: 'error',                    // 错误消息
    ROLE_CHANGED: 'role-changed',      // 角色变更通知
    MEMBER_JOINED: 'member-joined',    // 新成员加入通知
    MEMBER_LEFT: 'member-left',        // 成员离开通知
    MEMBER_REMOVED: 'member-removed',  // 成员被移除通知
    ROOM_UPDATED: 'room-updated',      // 房间信息更新通知
};

