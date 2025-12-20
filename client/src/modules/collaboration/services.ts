
  //Collaboration 模块服务层 封装 Yjs 相关的底层操作
  
 

import type { editor } from 'monaco-editor';
import type { Awareness } from 'y-protocols/awareness';
import type { RemoteCursor, SelectionRange } from './types';
import { getToken } from '@/utils/mannegerToken'
// 生成基于 clientID 的稳定颜色
export function generateUserColor(clientId: number): string {
  const hue = (clientId * 137.508) % 360; // 使用黄金角度确保颜色分布均匀
  return `hsl(${hue}, 70%, 50%)`;
}

// 初始化本地用户 awareness 状态
export function initLocalUserState(
  awareness: Awareness,
  username: string,
  avatarUrl: string
): void {
  const userColor = generateUserColor(awareness.clientID);
  awareness.setLocalStateField('user', {
    name: username,
    avatarUrl: avatarUrl??'/image.png',
    color: userColor,
    awarenessId: awareness.clientID,
  });
}

// 更新本地光标位置
export function updateLocalCursorPosition(
  awareness: Awareness,
  editorInstance: editor.IStandaloneCodeEditor
): void {
  const model = editorInstance.getModel();
  if (!model) return;

  try {
      // 获取当前光标和选择范围
    const selection = editorInstance.getSelection();
    if (!selection) {
         // 如果没有选择，清除光标状态
      awareness.setLocalStateField('cursor', null);
      return;
    }

    const startPos = selection.getStartPosition();
    const endPos = selection.getEndPosition();
  // 计算偏移量
    const anchor = model.getOffsetAt(startPos);
    const head = model.getOffsetAt(endPos);
    const position = model.getOffsetAt(endPos);
// 更新 awareness 状态
    awareness.setLocalStateField('cursor', {
      position,
      anchor,
      head,
      startLine: startPos.lineNumber,
      startColumn: startPos.column,
      endLine: endPos.lineNumber,
      endColumn: endPos.column,
    });
  } catch (error) {
    console.warn('更新光标位置失败:', error);
  }
}


 //计算远端光标渲染数据
export function calculateRemoteCursors(
  awareness: Awareness,
  editorInstance: editor.IStandaloneCodeEditor,
  editorOption: typeof editor.EditorOption
): Record<string, RemoteCursor> {
  const model = editorInstance.getModel();
  if (!model) return {};
      //获取所有客户端的状态
  const states = awareness.getStates();
  const newCursors: Record<string, RemoteCursor> = {};

  states.forEach((state, clientId) => {
    // 跳过本地用户
    if (clientId === awareness.clientID) return;

    // 检查是否有用户信息和光标信息
    if (!state.user || !state.cursor) return;

    let offset: number | null = null;

    // 优先使用 position，然后是 head，最后是 anchor
    if (typeof state.cursor.position === 'number') {

      offset = state.cursor.position;
    } else if (typeof state.cursor.head === 'number') {
      offset = state.cursor.head;
    } else if (typeof state.cursor.anchor === 'number') {
      offset = state.cursor.anchor;
    } else {
      return;
    }

    if (offset === null || offset === undefined) {
      return;
    }
//获取模型的长度
    const maxLen = model.getValueLength();
//获取安全的偏移量
    const safeOffset = Math.max(0, Math.min(maxLen, offset));

    let pos;
    try {
      pos = model.getPositionAt(safeOffset);
    } catch (error) {
      return;
    }

    const layout = editorInstance.getScrolledVisiblePosition(pos);
    if (!layout) return;

    const lineHeight =
      layout.height && layout.height > 0
        ? layout.height
        : (editorInstance.getOption(editorOption.lineHeight) as number);

    const left = layout.left ?? 0;
    const top = layout.top ?? 0;

    // 检查光标是否在可见区域内
    const editorLayout = editorInstance.getLayoutInfo();
    if (
      left < -50 ||
      left > editorLayout.width + 50 ||
      top < -50 ||
      top > editorLayout.height + 50
    ) {
      return;
    }

    // 计算选区范围
    let selection: SelectionRange[] | null = null;
    if (
      state.cursor.anchor !== undefined &&
      state.cursor.head !== undefined &&
      state.cursor.anchor !== state.cursor.head
    ) {
      selection = calculateSelectionRanges(
        state.cursor.anchor,
        state.cursor.head,
        model,
        editorInstance,
        editorLayout,
        lineHeight
      );
    }

    newCursors[String(clientId)] = {
      name: state.user.name || 'Anonymous',
      avatarUrl: state.user.avatarUrl || '/image.png',
      color: state.user.color || '#3b82f6',
      top,
      left,
      lineHeight,
      clientId: String(clientId),
      selection,
    };
  });

  return newCursors;
}


 //计算选区范围
function calculateSelectionRanges(
  anchor: number,
  head: number,
  model: editor.ITextModel,
  editorInstance: editor.IStandaloneCodeEditor,
  editorLayout: editor.EditorLayoutInfo,
  lineHeight: number
): SelectionRange[] | null {
  const maxLen = model.getValueLength();
  const anchorOffset = Math.max(0, Math.min(maxLen, anchor));
  const headOffset = Math.max(0, Math.min(maxLen, head));
  const startOffset = Math.min(anchorOffset, headOffset);
  const endOffset = Math.max(anchorOffset, headOffset);

  try {
    const startPos = model.getPositionAt(startOffset);
    const endPos = model.getPositionAt(endOffset);

    const selectionRanges: SelectionRange[] = [];

    for (let lineNum = startPos.lineNumber; lineNum <= endPos.lineNumber; lineNum++) {
      const lineStartCol = lineNum === startPos.lineNumber ? startPos.column : 1;
      const lineEndCol =
        lineNum === endPos.lineNumber ? endPos.column : model.getLineMaxColumn(lineNum);

      const lineStartPos = { lineNumber: lineNum, column: lineStartCol };
      const lineEndPos = { lineNumber: lineNum, column: lineEndCol };

      const startLayout = editorInstance.getScrolledVisiblePosition(lineStartPos);
      const endLayout = editorInstance.getScrolledVisiblePosition(lineEndPos);

      if (startLayout && endLayout) {
        const rangeTop = startLayout.top;
        const rangeLeft = startLayout.left;
        const rangeWidth = Math.max(endLayout.left - startLayout.left, 4);
        const rangeHeight = startLayout.height || lineHeight;

        if (rangeTop >= -50 && rangeTop <= editorLayout.height + 50) {
          selectionRanges.push({
            top: rangeTop,
            left: rangeLeft,
            width: rangeWidth,
            height: rangeHeight,
          });
        }
      }
    }

    return selectionRanges.length > 0 ? selectionRanges : null;
  } catch (error) {
    return null;
  }
}

// 从 awareness 状态中提取协作者信息
export function extractCollaborators(
  awareness: Awareness
): Map<number, { name: string; avatarUrl: string; color: string }> {
  const states = awareness.getStates();
  const usersMap = new Map<number, { name: string; avatarUrl: string; color: string }>();

  states.forEach((state, clientId) => {
    if (state.user) {
      usersMap.set(clientId, {
        name: state.user.name || 'Anonymous',
        avatarUrl: state.user.avatarUrl || '/image.png',
        color: state.user.color || '#3b82f6',
      });
    }
  });

  return usersMap;
}

// 创建防抖函数
export function createDebounce(delay: number = 50) {
  let timer: NodeJS.Timeout | null = null;

  return (fn: () => void) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(fn, delay);
  };
}

// 清理防抖定时器
export function clearDebounce(timer: NodeJS.Timeout | null) {
  if (timer) {
    clearTimeout(timer);
  }
}

export function getAccessToken(){
    return getToken()
}
