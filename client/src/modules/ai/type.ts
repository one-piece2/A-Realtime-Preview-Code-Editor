export type MessageRole = 'user' | 'assistant' | 'system';
/** 
 每条消息一个ID
 每个会话一个ID
 一个会话有多个消息
*/




// 单条消息
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  // 附件信息
  attachments?: Attachment[];
}

// 附件类型
export interface Attachment {
  id: string;
  name: string;
  type: 'file' | 'code' | 'image';
  content: string; // 文件内容
  size?: number;
}

// 会话
export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

// Store 状态
export interface AIState {
  // 当前会话
  currentConversationId: string | null;
  conversations: Record<string, Conversation>;
  
  // 流式状态
  isStreaming: boolean;
  streamingContent: string;
  
  // 错误状态
  error: string | null;
}


// Store Actions
export interface AIActions {
  // 会话管理
  createConversation: () => string;
  deleteConversation: (id: string) => void;
  setCurrentConversation: (id: string | null) => void;
  
  // 消息管理
  addMessage: (conversationId: string, message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessage: (conversationId: string, messageId: string, content: string) => void;
  clearMessages: (conversationId: string) => void;
  
  // 流式状态
  setStreaming: (isStreaming: boolean) => void;
  appendStreamingContent: (content: string) => void;
  resetStreamingContent: () => void;
  
  // 错误处理
  setError: (error: string | null) => void;
  
  // 重置
  reset: () => void;
}

export type AIStore = AIState & AIActions;