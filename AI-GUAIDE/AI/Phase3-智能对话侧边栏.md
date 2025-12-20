# Phase 3: 智能对话侧边栏 (Chat UI)

> 实现多模态交互界面

## 1. 目标概述

构建一个功能完整的 AI 聊天侧边栏，支持：
- 多轮对话与历史记录
- 流式消息渲染（打字机效果）
- 代码高亮显示
- 文件/代码片段上传
- 会话管理

---

## 2. 目录结构

```
client/src/components/AIChat/
├── index.tsx              # 主组件导出
├── ChatSidebar.tsx        # 侧边栏容器
├── ChatHeader.tsx         # 头部（标题、操作按钮）
├── ChatMessages.tsx       # 消息列表
├── ChatMessage.tsx        # 单条消息
├── ChatInput.tsx          # 输入框组件
├── ConversationList.tsx   # 会话列表
├── CodeBlock.tsx          # 代码块渲染
├── FileUpload.tsx         # 文件上传组件
└── styles.css             # 样式文件（可选）
```

---

## 3. 实施步骤

### 3.1 主侧边栏容器

**文件**: `client/src/components/AIChat/ChatSidebar.tsx`

```tsx
import { useState } from 'react';
import { useTheme } from '@/core/config';
import { MessageSquare, PanelLeftClose, PanelLeft } from 'lucide-react';
import { ChatHeader } from './ChatHeader';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { ConversationList } from './ConversationList';
import { useAIChat } from '@/modules/ai';

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  editorContext?: string; // 当前编辑器代码上下文
}

export function ChatSidebar({ isOpen, onToggle, editorContext }: ChatSidebarProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showHistory, setShowHistory] = useState(false);
  
  const { sendMessage, isStreaming, stopGeneration, conversation } = useAIChat();

  const handleSend = (content: string) => {
    sendMessage(content, editorContext);
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className={`fixed right-4 bottom-4 p-3 rounded-full shadow-lg z-50 transition-all
          ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-white hover:bg-slate-50 text-slate-800'}
        `}
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div
      className={`h-full w-[380px] flex flex-col border-l transition-all duration-300
        ${isDark 
          ? 'bg-slate-900 border-slate-700 text-slate-100' 
          : 'bg-white border-slate-200 text-slate-800'}
      `}
    >
      <ChatHeader
        title={conversation?.title || 'AI 助手'}
        onClose={onToggle}
        onToggleHistory={() => setShowHistory(!showHistory)}
        showHistory={showHistory}
      />

      {showHistory ? (
        <ConversationList onSelect={() => setShowHistory(false)} />
      ) : (
        <>
          <ChatMessages />
          <ChatInput
            onSend={handleSend}
            isStreaming={isStreaming}
            onStop={stopGeneration}
          />
        </>
      )}
    </div>
  );
}
```

### 3.2 头部组件

**文件**: `client/src/components/AIChat/ChatHeader.tsx`

```tsx
import { X, History, Plus, Trash2 } from 'lucide-react';
import { useTheme } from '@/core/config';
import { useConversationList } from '@/modules/ai';

interface ChatHeaderProps {
  title: string;
  onClose: () => void;
  onToggleHistory: () => void;
  showHistory: boolean;
}

export function ChatHeader({ title, onClose, onToggleHistory, showHistory }: ChatHeaderProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { createConversation, currentId, deleteConversation } = useConversationList();

  const handleNewChat = () => {
    createConversation();
  };

  const handleDelete = () => {
    if (currentId && confirm('确定删除当前对话？')) {
      deleteConversation(currentId);
    }
  };

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 border-b
        ${isDark ? 'border-slate-700' : 'border-slate-200'}
      `}
    >
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-sm truncate max-w-[180px]">{title}</h3>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={handleNewChat}
          className={`p-2 rounded-lg transition-colors
            ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}
          `}
          title="新对话"
        >
          <Plus className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleHistory}
          className={`p-2 rounded-lg transition-colors
            ${showHistory ? (isDark ? 'bg-slate-800' : 'bg-slate-100') : ''}
            ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}
          `}
          title="历史记录"
        >
          <History className="w-4 h-4" />
        </button>

        {currentId && (
          <button
            onClick={handleDelete}
            className={`p-2 rounded-lg transition-colors text-red-500
              ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}
            `}
            title="删除对话"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={onClose}
          className={`p-2 rounded-lg transition-colors
            ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}
          `}
          title="关闭"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
```

### 3.3 消息列表组件

**文件**: `client/src/components/AIChat/ChatMessages.tsx`

```tsx
import { useEffect, useRef } from 'react';
import { useTheme } from '@/core/config';
import { useCurrentMessages, useAIStore } from '@/modules/ai';
import { ChatMessage } from './ChatMessage';
import { Bot, Loader2 } from 'lucide-react';

export function ChatMessages() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const messages = useCurrentMessages();
  const isStreaming = useAIStore((state) => state.isStreaming);
  const error = useAIStore((state) => state.error);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div
          className={`p-4 rounded-full mb-4
            ${isDark ? 'bg-slate-800' : 'bg-slate-100'}
          `}
        >
          <Bot className="w-8 h-8 text-emerald-500" />
        </div>
        <h4 className="font-semibold mb-2">AI 编程助手</h4>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          我可以帮你解答编程问题、审查代码、生成代码片段
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}

      {isStreaming && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>AI 正在思考...</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">
          错误: {error}
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
```

### 3.4 单条消息组件

**文件**: `client/src/components/AIChat/ChatMessage.tsx`

```tsx
import { useMemo } from 'react';
import { useTheme } from '@/core/config';
import { User, Bot, Copy, Check } from 'lucide-react';
import { CodeBlock } from './CodeBlock';
import type { Message } from '@/modules/ai';
import { useState } from 'react';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  // 解析消息内容，提取代码块
  const parsedContent = useMemo(() => {
    return parseMessageContent(message.content);
  }, [message.content]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* 头像 */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
          ${isUser
            ? 'bg-emerald-500 text-white'
            : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'
          }
        `}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* 消息内容 */}
      <div
        className={`group relative max-w-[85%] rounded-2xl px-4 py-3
          ${isUser
            ? 'bg-emerald-500 text-white rounded-br-md'
            : isDark
              ? 'bg-slate-800 text-slate-100 rounded-bl-md'
              : 'bg-slate-100 text-slate-800 rounded-bl-md'
          }
        `}
      >
        {/* 复制按钮 */}
        {!isUser && (
          <button
            onClick={handleCopy}
            className={`absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity
              ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}
            `}
          >
            {copied ? (
              <Check className="w-3 h-3 text-emerald-500" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        )}

        {/* 渲染内容 */}
        <div className="text-sm leading-relaxed">
          {parsedContent.map((block, index) => {
            if (block.type === 'code') {
              return (
                <CodeBlock
                  key={index}
                  code={block.content}
                  language={block.language}
                />
              );
            }
            return (
              <p key={index} className="whitespace-pre-wrap">
                {block.content}
              </p>
            );
          })}
        </div>

        {/* 时间戳 */}
        <div
          className={`text-xs mt-2 opacity-60
            ${isUser ? 'text-right' : ''}
          `}
        >
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

// 解析消息内容，分离代码块和普通文本
interface ContentBlock {
  type: 'text' | 'code';
  content: string;
  language?: string;
}

function parseMessageContent(content: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // 添加代码块之前的文本
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim();
      if (text) {
        blocks.push({ type: 'text', content: text });
      }
    }

    // 添加代码块
    blocks.push({
      type: 'code',
      language: match[1] || 'plaintext',
      content: match[2].trim(),
    });

    lastIndex = match.index + match[0].length;
  }

  // 添加剩余文本
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim();
    if (text) {
      blocks.push({ type: 'text', content: text });
    }
  }

  // 如果没有任何块，返回原始内容
  if (blocks.length === 0) {
    blocks.push({ type: 'text', content });
  }

  return blocks;
}
```

### 3.5 代码块组件

**文件**: `client/src/components/AIChat/CodeBlock.tsx`

```tsx
import { useState } from 'react';
import { useTheme } from '@/core/config';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language = 'plaintext' }: CodeBlockProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`my-3 rounded-lg overflow-hidden border
      ${isDark ? 'border-slate-600 bg-slate-950' : 'border-slate-300 bg-slate-900'}
    `}>
      {/* 头部 */}
      <div className={`flex items-center justify-between px-3 py-2 border-b
        ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-600 bg-slate-800'}
      `}>
        <span className="text-xs text-slate-400 font-mono">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              <span>已复制</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>复制</span>
            </>
          )}
        </button>
      </div>

      {/* 代码内容 */}
      <pre className="p-3 overflow-x-auto">
        <code className="text-sm font-mono text-slate-100 leading-relaxed">
          {code}
        </code>
      </pre>
    </div>
  );
}
```

### 3.6 输入框组件

**文件**: `client/src/components/AIChat/ChatInput.tsx`

```tsx
import { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/core/config';
import { Send, Square, Paperclip, Code } from 'lucide-react';

interface ChatInputProps {
  onSend: (content: string) => void;
  isStreaming: boolean;
  onStop: () => void;
}

export function ChatInput({ onSend, isStreaming, onStop }: ChatInputProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动调整高度
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (input.trim() && !isStreaming) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`p-4 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
      <div
        className={`flex items-end gap-2 rounded-xl border p-2
          ${isDark 
            ? 'bg-slate-800 border-slate-700' 
            : 'bg-slate-50 border-slate-200'}
        `}
      >
        {/* 附件按钮 */}
        <button
          className={`p-2 rounded-lg transition-colors
            ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}
          `}
          title="上传文件"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* 代码上下文按钮 */}
        <button
          className={`p-2 rounded-lg transition-colors
            ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}
          `}
          title="添加代码上下文"
        >
          <Code className="w-5 h-5" />
        </button>

        {/* 输入框 */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息... (Shift+Enter 换行)"
          rows={1}
          className={`flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed
            ${isDark ? 'text-slate-100 placeholder:text-slate-500' : 'text-slate-800 placeholder:text-slate-400'}
          `}
          disabled={isStreaming}
        />

        {/* 发送/停止按钮 */}
        {isStreaming ? (
          <button
            onClick={onStop}
            className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
            title="停止生成"
          >
            <Square className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className={`p-2 rounded-lg transition-colors
              ${input.trim()
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : isDark
                  ? 'bg-slate-700 text-slate-500'
                  : 'bg-slate-200 text-slate-400'
              }
            `}
            title="发送"
          >
            <Send className="w-5 h-5" />
          </button>
        )}
      </div>

      <p className={`text-xs mt-2 text-center
        ${isDark ? 'text-slate-500' : 'text-slate-400'}
      `}>
        AI 可能会犯错，请核实重要信息
      </p>
    </div>
  );
}
```

### 3.7 会话列表组件

**文件**: `client/src/components/AIChat/ConversationList.tsx`

```tsx
import { useTheme } from '@/core/config';
import { useConversationList } from '@/modules/ai';
import { MessageSquare, Trash2 } from 'lucide-react';

interface ConversationListProps {
  onSelect: () => void;
}

export function ConversationList({ onSelect }: ConversationListProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { conversations, currentId, selectConversation, deleteConversation } = useConversationList();

  const handleSelect = (id: string) => {
    selectConversation(id);
    onSelect();
  };

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          暂无历史对话
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-2">
      {conversations.map((conv) => (
        <div
          key={conv.id}
          className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer mb-1 transition-colors
            ${conv.id === currentId
              ? isDark ? 'bg-slate-800' : 'bg-slate-100'
              : isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
            }
          `}
          onClick={() => handleSelect(conv.id)}
        >
          <MessageSquare className="w-4 h-4 flex-shrink-0 text-slate-400" />
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{conv.title}</p>
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {conv.messages.length} 条消息 · {formatDate(conv.updatedAt)}
            </p>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteConversation(conv.id);
            }}
            className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-red-500
              ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}
            `}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
  
  return date.toLocaleDateString();
}
```

### 3.8 模块导出

**文件**: `client/src/components/AIChat/index.tsx`

```tsx
export { ChatSidebar } from './ChatSidebar';
export { ChatHeader } from './ChatHeader';
export { ChatMessages } from './ChatMessages';
export { ChatMessage } from './ChatMessage';
export { ChatInput } from './ChatInput';
export { ConversationList } from './ConversationList';
export { CodeBlock } from './CodeBlock';
```

---

## 4. 集成到主布局

在主页面中集成侧边栏：

```tsx
import { useState } from 'react';
import { ChatSidebar } from '@/components/AIChat';

function EditorPage() {
  const [chatOpen, setChatOpen] = useState(false);
  const [editorCode, setEditorCode] = useState('');

  return (
    <div className="flex h-screen">
      {/* 编辑器区域 */}
      <div className="flex-1">
        <Editor onChange={setEditorCode} />
      </div>

      {/* AI 聊天侧边栏 */}
      <ChatSidebar
        isOpen={chatOpen}
        onToggle={() => setChatOpen(!chatOpen)}
        editorContext={editorCode}
      />
    </div>
  );
}
```

---

## 5. 下一步

完成 Phase 3 后，进入 **Phase 4: 编辑器智能补全 (Ghost Text)**。
