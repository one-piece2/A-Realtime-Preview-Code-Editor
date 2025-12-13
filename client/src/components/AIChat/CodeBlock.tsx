// 代码块渲染组件（带语法高亮）
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
    code: string;
    language?: string;
    inline?: boolean;
}

export function CodeBlock({ code, language = 'plaintext', inline = false }: CodeBlockProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // 行内代码
    if (inline) {
        return (
            <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">
                {code}
            </code>
        );
    }
// 代码块
    return (
        <div className="my-3 rounded-lg overflow-hidden border border-border">
            {/* 头部：语言标签 + 复制按钮 */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/80">
                <span className="text-xs text-muted-foreground font-mono">
                    {language}
                </span>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                    {copied ? (
                        <>
                            <Check className="size-3 mr-1" />
                            已复制
                        </>
                    ) : (
                        <>
                            <Copy className="size-3 mr-1" />
                            复制
                        </>
                    )}
                </Button>
            </div>

            {/* 代码内容（带语法高亮） */}
            <SyntaxHighlighter
                language={language}
                style={oneDark}
                customStyle={{
                    margin: 0,
                    padding: '1rem',
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                    background: '#1e1e1e',
                }}
                showLineNumbers={code.split('\n').length > 3}
                wrapLines
            >
                {code}
            </SyntaxHighlighter>
        </div>
    );
}
