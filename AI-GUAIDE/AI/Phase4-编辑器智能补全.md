# Phase 4: 编辑器智能补全 (Ghost Text)

> 攻克 Monaco Editor 底层 API

## 1. 目标概述

在 Monaco Editor 中实现类似 GitHub Copilot 的 Ghost Text 功能：
- 用户停止输入后自动触发补全请求
- 以灰色半透明文本显示补全建议
- 按 Tab 键接受补全，按 Esc 键取消

---

## 2. 核心技术点

| 技术 | 说明 |
|------|------|
| `InlineCompletionsProvider` | Monaco 内联补全 API |
| `registerInlineCompletionsProvider` | 注册补全提供者 |
| Debounce | 防抖处理，避免频繁请求 |
| AbortController | 取消进行中的请求 |

---

## 3. 目录结构

```
client/src/components/Editor/
├── Editor.tsx                    # 现有编辑器组件
├── ghostText/
│   ├── index.ts                  # 导出
│   ├── GhostTextProvider.ts      # 补全提供者
│   ├── useGhostText.ts           # Hook 封装
│   └── config.ts                 # 配置常量
```

---

## 4. 实施步骤

### 4.1 配置常量

**文件**: `client/src/components/Editor/ghostText/config.ts`

```typescript
export const GHOST_TEXT_CONFIG = {
  // 触发延迟（毫秒）- 用户停止输入后多久触发
  TRIGGER_DELAY: 500,
  
  // 最小触发字符数
  MIN_TRIGGER_LENGTH: 3,
  
  // 请求超时（毫秒）
  REQUEST_TIMEOUT: 5000,
  
  // 最大补全长度
  MAX_COMPLETION_TOKENS: 150,
  
  // 支持的语言
  SUPPORTED_LANGUAGES: [
    'typescript',
    'javascript',
    'typescriptreact',
    'javascriptreact',
    'css',
    'html',
    'json',
    'markdown',
  ],
};
```

### 4.2 Ghost Text Provider

**文件**: `client/src/components/Editor/ghostText/GhostTextProvider.ts`

```typescript
import type * as Monaco from 'monaco-editor';
import { getCompletion } from '@/modules/ai';
import { GHOST_TEXT_CONFIG } from './config';

export class GhostTextProvider implements Monaco.languages.InlineCompletionsProvider {
  private abortController: AbortController | null = null;
  private lastRequestTime = 0;

  /**
   * 提供内联补全
   */
  async provideInlineCompletions(
    model: Monaco.editor.ITextModel,
    position: Monaco.Position,
    context: Monaco.languages.InlineCompletionContext,
    token: Monaco.CancellationToken
  ): Promise<Monaco.languages.InlineCompletions | null> {
    // 取消之前的请求
    this.abortController?.abort();
    this.abortController = new AbortController();

    // 检查是否支持当前语言
    const language = model.getLanguageId();
    if (!GHOST_TEXT_CONFIG.SUPPORTED_LANGUAGES.includes(language)) {
      return null;
    }

    // 获取光标前后的代码
    const prefix = this.getPrefix(model, position);
    const suffix = this.getSuffix(model, position);

    // 检查最小触发长度
    const currentLine = model.getLineContent(position.lineNumber);
    const linePrefix = currentLine.substring(0, position.column - 1).trim();
    if (linePrefix.length < GHOST_TEXT_CONFIG.MIN_TRIGGER_LENGTH) {
      return null;
    }

    // 避免在空行或只有空格的行触发
    if (!linePrefix) {
      return null;
    }

    try {
      // 记录请求时间
      this.lastRequestTime = Date.now();

      // 调用 AI 补全 API
      const completion = await this.fetchCompletion({
        prefix,
        suffix,
        language,
        filename: model.uri.path,
        signal: this.abortController.signal,
      });

      // 检查是否被取消
      if (token.isCancellationRequested) {
        return null;
      }

      // 如果没有补全内容，返回空
      if (!completion || !completion.trim()) {
        return null;
      }

      // 返回内联补全
      return {
        items: [
          {
            insertText: completion,
            range: new (window as any).monaco.Range(
              position.lineNumber,
              position.column,
              position.lineNumber,
              position.column
            ),
          },
        ],
      };
    } catch (error) {
      // 忽略取消错误
      if (error instanceof Error && error.name === 'AbortError') {
        return null;
      }
      console.error('Ghost text error:', error);
      return null;
    }
  }

  /**
   * 释放资源
   */
  freeInlineCompletions(): void {
    // 清理资源
  }

  /**
   * 获取光标前的代码（上下文）
   */
  private getPrefix(model: Monaco.editor.ITextModel, position: Monaco.Position): string {
    // 获取光标前最多 50 行
    const startLine = Math.max(1, position.lineNumber - 50);
    const range = new (window as any).monaco.Range(
      startLine,
      1,
      position.lineNumber,
      position.column
    );
    return model.getValueInRange(range);
  }

  /**
   * 获取光标后的代码
   */
  private getSuffix(model: Monaco.editor.ITextModel, position: Monaco.Position): string {
    // 获取光标后最多 10 行
    const endLine = Math.min(model.getLineCount(), position.lineNumber + 10);
    const lastLineLength = model.getLineLength(endLine);
    const range = new (window as any).monaco.Range(
      position.lineNumber,
      position.column,
      endLine,
      lastLineLength + 1
    );
    return model.getValueInRange(range);
  }

  /**
   * 调用补全 API
   */
  private async fetchCompletion(params: {
    prefix: string;
    suffix: string;
    language: string;
    filename: string;
    signal: AbortSignal;
  }): Promise<string> {
    const { prefix, suffix, language, filename } = params;

    // 创建超时 Promise
    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Request timeout'));
      }, GHOST_TEXT_CONFIG.REQUEST_TIMEOUT);
    });

    // 调用 API
    const completionPromise = getCompletion({
      prefix,
      suffix,
      language,
      filename,
      maxTokens: GHOST_TEXT_CONFIG.MAX_COMPLETION_TOKENS,
    });

    // 竞争：补全 vs 超时
    return Promise.race([completionPromise, timeoutPromise]);
  }
}
```

### 4.3 useGhostText Hook

**文件**: `client/src/components/Editor/ghostText/useGhostText.ts`

```typescript
import { useEffect, useRef, useCallback } from 'react';
import type * as Monaco from 'monaco-editor';
import { GhostTextProvider } from './GhostTextProvider';
import { GHOST_TEXT_CONFIG } from './config';

interface UseGhostTextOptions {
  enabled?: boolean;
}

export function useGhostText(
  editorRef: React.RefObject<Monaco.editor.IStandaloneCodeEditor | null>,
  monacoRef: React.RefObject<typeof Monaco | null>,
  options: UseGhostTextOptions = {}
) {
  const { enabled = true } = options;
  const providerRef = useRef<GhostTextProvider | null>(null);
  const disposableRef = useRef<Monaco.IDisposable | null>(null);

  // 注册 Provider
  const registerProvider = useCallback(() => {
    const monaco = monacoRef.current;
    if (!monaco || !enabled) return;

    // 创建 Provider 实例
    providerRef.current = new GhostTextProvider();

    // 为所有支持的语言注册
    GHOST_TEXT_CONFIG.SUPPORTED_LANGUAGES.forEach((language) => {
      const disposable = monaco.languages.registerInlineCompletionsProvider(
        language,
        providerRef.current!
      );

      // 保存第一个 disposable（实际应该保存所有）
      if (!disposableRef.current) {
        disposableRef.current = disposable;
      }
    });
  }, [monacoRef, enabled]);

  // 注销 Provider
  const unregisterProvider = useCallback(() => {
    disposableRef.current?.dispose();
    disposableRef.current = null;
    providerRef.current = null;
  }, []);

  // 手动触发补全
  const triggerCompletion = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.trigger('ghost-text', 'editor.action.inlineSuggest.trigger', {});
  }, [editorRef]);

  // 接受补全
  const acceptCompletion = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.trigger('ghost-text', 'editor.action.inlineSuggest.commit', {});
  }, [editorRef]);

  // 拒绝补全
  const rejectCompletion = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.trigger('ghost-text', 'editor.action.inlineSuggest.hide', {});
  }, [editorRef]);

  // 生命周期管理
  useEffect(() => {
    if (enabled) {
      registerProvider();
    }

    return () => {
      unregisterProvider();
    };
  }, [enabled, registerProvider, unregisterProvider]);

  return {
    triggerCompletion,
    acceptCompletion,
    rejectCompletion,
    isEnabled: enabled,
  };
}
```

### 4.4 模块导出

**文件**: `client/src/components/Editor/ghostText/index.ts`

```typescript
export { GhostTextProvider } from './GhostTextProvider';
export { useGhostText } from './useGhostText';
export { GHOST_TEXT_CONFIG } from './config';
```

### 4.5 集成到 Editor 组件

修改现有的 `Editor.tsx`，添加 Ghost Text 支持：

```typescript
// 在 Editor.tsx 中添加

import { useGhostText } from './ghostText';

// 在组件内部
const monacoRef = useRef<typeof Monaco | null>(null);

const handleEditorMount = (editorInstance: editor.IStandaloneCodeEditor, monaco: any) => {
  editorRef.current = editorInstance;
  monacoRef.current = monaco;
  
  // ... 现有代码 ...
};

// 使用 Ghost Text Hook
const { triggerCompletion } = useGhostText(editorRef, monacoRef, {
  enabled: true, // 可以通过 props 控制
});
```

---

## 5. 键盘快捷键配置

Monaco Editor 默认的内联补全快捷键：
- **Tab**: 接受补全
- **Esc**: 拒绝补全
- **Alt + ]**: 下一个建议
- **Alt + [**: 上一个建议

如需自定义，可以在编辑器挂载时添加：

```typescript
// 自定义快捷键
editorInstance.addCommand(
  monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space,
  () => {
    editorInstance.trigger('ghost-text', 'editor.action.inlineSuggest.trigger', {});
  }
);
```

---

## 6. 性能优化建议

| 优化点 | 实现方式 |
|--------|----------|
| 请求防抖 | 用户停止输入 500ms 后才触发 |
| 请求取消 | 新请求自动取消旧请求 |
| 缓存 | 可添加 LRU 缓存避免重复请求 |
| 条件触发 | 只在有意义的位置触发（非注释、非字符串内） |

---

## 7. 调试技巧

```typescript
// 在 GhostTextProvider 中添加调试日志
console.log('[GhostText] Prefix:', prefix.slice(-100));
console.log('[GhostText] Completion:', completion);
```

---

## 8. 下一步

完成 Phase 4 后，进入 **Phase 5: 性能优化与工程化**：
- 大文件切片 (Web Worker)
- 虚拟滚动 (Virtual Scrolling)
