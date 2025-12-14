
import * as monaco from 'monaco-editor';
import { getCompletion } from '@/modules/ai/services';
export type LoadingCallback = (isLoading: boolean) => void;
const DEBOUNCE_DELAY = 500;
const MAX_PREFIX_LENGTH = 2000;
const MAX_SUFFIX_LENGTH = 500;
// 触发补全的字符列表 
const TRIGGER_CHARS = [' ', '.', '(', '{', '[', ',', ':', '\n', '=', '>'];
//返回 InlineCompletionsProvider 实例
export function createInlineCompletionProvider(onLoadingChange?: LoadingCallback) {
    let abortController: AbortController | null = null;
    // 防抖定时器 每次用户输入都会重置
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    return {
        provideInlineCompletions: async (
            //当前编辑器文本模型
            model: monaco.editor.ITextModel,
            //光标位置(行/列)
            position: monaco.Position,
            //补全上下文 （自动触发/用户触发）
            context: monaco.languages.InlineCompletionContext,
            //取消令牌
            token: monaco.CancellationToken
        ): Promise<monaco.languages.InlineCompletions> => {
            //取消请求和定时器
            abortController?.abort();
            if (debounceTimer) clearTimeout(debounceTimer);

            //获取当前行内容和光标前的字符
            const lineContent = model.getLineContent(position.lineNumber);
            const charBeforeCursor = lineContent[position.column - 2] || '';

            // 判断是否在行尾
            const isLineEnd = position.column > lineContent.length;

            // 只在特定字符后触发，或者在行尾
            const shouldTrigger = TRIGGER_CHARS.includes(charBeforeCursor) || isLineEnd;

            // 如果是自动触发且不满足触发条件，直接返回空
            // Explicit (显式触发，如快捷键) 可以绕过 TRIGGER_CHARS 检查
            const isExplicit = context.triggerKind === monaco.languages.InlineCompletionTriggerKind.Explicit;
            if (!shouldTrigger && !isExplicit) {
                return { items: [] };
            }

            //防抖等待
            await new Promise<void>((resolve) => {
                debounceTimer = setTimeout(resolve, DEBOUNCE_DELAY);
            });

            // 检查在等待期间用户是否取消了请求（比如继续输入）
            if (token.isCancellationRequested) {
                return { items: [] };
            }

            // 获取光标前的所有代码
            const fullPrefix = model.getValueInRange({
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
            });

            // 获取光标后的所有代码
            const fullSuffix = model.getValueInRange({
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: model.getLineCount(),
                endColumn: model.getLineMaxColumn(model.getLineCount()),
            });

            // 限制上下文长度
            const prefix = fullPrefix.slice(-MAX_PREFIX_LENGTH);
            const suffix = fullSuffix.slice(0, MAX_SUFFIX_LENGTH);



            // 创建新的 AbortController
            abortController = new AbortController();
            
            // 通知 Loading 状态开始
            onLoadingChange?.(true);
            
            try {
                const completion = await getCompletion({
                    prefix,
                    suffix,
                    language: model.getLanguageId(),
                    filename: model.uri.path.split('/').pop() || 'untitled',
                }, abortController.signal);

                // 再次检查是否已取消（API 请求期间用户可能继续输入）
                if (token.isCancellationRequested || !completion) {
                    return { items: [] };
                }

                // 返回补全建议
                return {
                    items: [{
                        // 插入内容
                        insertText: completion,
                        // 插入位置
                        range: new monaco.Range(
                            position.lineNumber,
                            position.column,
                            position.lineNumber,
                            position.column
                        ),
                    }],
                };
            } catch (error: any) {
                // AbortError 取消行为 不需要报错
                if (error?.name === 'AbortError') {
                    return { items: [] };
                }

                console.error('[InlineCompletion] Error:', error);
                return { items: [] };
            } finally {
                // 通知 Loading 状态结束
                onLoadingChange?.(false);
            }
        },

        // Monaco 要求的清理方法
        freeInlineCompletions: () => {
            // 清理资源
        },
    };
}


// 注册Inline Completion Provider 到 Monaco 在 Editor 的 onMount 回调中调用此函数
export function registerInlineCompletionProvider(
    monaco: typeof import('monaco-editor'),
    languages: string[] = ['typescript', 'typescriptreact', 'javascript', 'javascriptreact', 'css', 'html', 'json'],
    onLoadingChange?: LoadingCallback
): monaco.IDisposable {
    // 创建 Provider 实例
    const provider = createInlineCompletionProvider(onLoadingChange);
    // 注册到指定语言
    return monaco.languages.registerInlineCompletionsProvider(languages, provider as any);
}

// 注册 AI 补全相关快捷键
export function registerCompletionKeybindings(
    editor: monaco.editor.IStandaloneCodeEditor,
    monacoInstance: typeof monaco
): monaco.IDisposable[] {
    //快捷键 可以调用dispose()清理
    const disposables: monaco.IDisposable[] = [];

    // Ctrl+I 
    const action1 = editor.addAction({
        id: 'ai.triggerInlineSuggest',
        label: '触发 AI 补全',
        keybindings: [monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyI],
        run: () => {
           
            editor.trigger('keyboard', 'editor.action.inlineSuggest.trigger', {});
        }
    });
    if (action1) disposables.push(action1);
    
    // Alt+/
    const action2 = editor.addAction({
        id: 'ai.triggerInlineSuggestAlt',
        label: '触发 AI 补全 ',
        keybindings: [monacoInstance.KeyMod.Alt | monacoInstance.KeyCode.Slash],
        run: () => {
          
            editor.trigger('keyboard', 'editor.action.inlineSuggest.trigger', {});
        }
    });
    if (action2) disposables.push(action2);

    // Alt+]: 接受下一个单词
    const action3 = editor.addAction({
        id: 'ai.acceptNextWord',
        label: '接受下一个单词',
        keybindings: [monacoInstance.KeyMod.Alt | monacoInstance.KeyCode.BracketRight],
        run: () => {
            editor.trigger('keyboard', 'editor.action.inlineSuggest.acceptNextWord', {});
        }
    });
    if (action3) disposables.push(action3);

    return disposables;
}
