import { useEffect, useRef, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from 'xterm-addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useTheme } from '@/core/config';
import { useDependencies } from '@/modules/playground';

// 主题配置 - 使用更现代、与黑色界面有明显区分的配色
const getTheme = (isDark: boolean) => ({
  // 使用深蓝灰色背景，与黑色界面有明显区分
  background: isDark ? '#0d1117' : '#ffffff',
  foreground: isDark ? '#c9d1d9' : '#24292e',
  cursor: isDark ? '#58a6ff' : '#0366d6',
  cursorAccent: isDark ? '#0d1117' : '#ffffff',
  // 优化的颜色方案
  black: '#484f58',
  red: '#f85149',
  green: '#3fb950',
  yellow: '#d29922',
  blue: '#58a6ff',
  magenta: '#bc8cff',
  cyan: '#39c5cf',
  white: '#b1bac4',
  brightBlack: '#6e7681',
  brightRed: '#ff7b72',
  brightGreen: '#56d364',
  brightYellow: '#e3b341',
  brightBlue: '#79c0ff',
  brightMagenta: '#d2a8ff',
  brightCyan: '#56d4dd',
  brightWhite: '#f0f6fc',
});

// 按键码常量
const KEY_CODES = {
  ENTER: 13,
  BACKSPACE: 127,
  CTRL_C: 3,
  CTRL_L: 12,
  CTRL_U: 21,
} as const;

// ANSI 颜色代码
const ANSICodes = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

export default function Terminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const { theme } = useTheme();
  const { addDependency } = useDependencies();
  const currentLineRef = useRef<string>('');
  
  // 使用 ref 存储最新的 addDependency，避免闭包问题
  const addDependencyRef = useRef(addDependency);
  useEffect(() => {
    addDependencyRef.current = addDependency;
  }, [addDependency]);

  const prompt = `${ANSICodes.green}user@ide${ANSICodes.reset}:${ANSICodes.blue}~${ANSICodes.reset}$ `;
  const welcomeMessage = 'Welcome to Virtual Terminal\nType your commands here...';

  // 写入提示符
  const writePrompt = useCallback(() => {
    xtermRef.current?.write(prompt);
  }, []);

  // 清除当前行
  const clearCurrentLine = useCallback(() => {
    const terminal = xtermRef.current;
    if (!terminal || !currentLineRef.current) return;
    
    const length = currentLineRef.current.length;
    terminal.write('\r' + ' '.repeat(length) + '\r');
  }, []);

  // 处理Enter执行
  const runCommand = useCallback(async (cmd: string) => {
    const terminal = xtermRef.current;
    if (!terminal || !cmd.trim()) {
      terminal?.write('\r\n');
      writePrompt();
      return;
    }

    terminal.write('\r\n');
    const args = cmd.trim().split(/\s+/);
    const mainCommand = args[0];

    // npm install 命令
    if (mainCommand === 'npm' && (args[1] === 'install' || args[1] === 'i')) {
      const pkgName = args[2];
      if (!pkgName) {
        terminal.write(`${ANSICodes.red}Error: Missing package name.${ANSICodes.reset}\r\n`);
        writePrompt();
        return;
      }
      
      terminal.write(`Dependencies resolved.\r\n`);
      terminal.write(`Fetching ${pkgName} metadata...\r\n`);
      console.log(`%c🔨 [Terminal] 正在安装: ${pkgName}`, 'color: orange')
      try {
        const response = await fetch(`https://registry.npmjs.org/${pkgName}/latest`);
        if (!response.ok) {
          throw new Error('Package not found');
        }
        const data = await response.json();
        const version = data.version;
        // 使用 ref 中的最新值，避免闭包问题
        addDependencyRef.current(pkgName, version);
        terminal.write(`${ANSICodes.green}+ ${pkgName}@${version}${ANSICodes.reset}\r\n`);
        terminal.write(`${pkgName}@${version} installed.\r\n`);
      } catch (error) {
        terminal.write(`${ANSICodes.red}Error: Failed to install package.${ANSICodes.reset}\r\n`);
      }
      writePrompt();
      return;
    }

    // 其他命令可以在这里添加
    // 未知命令
    terminal.write(`${ANSICodes.red}Unknown command: ${mainCommand}${ANSICodes.reset}\r\n`);
    terminal.write(`Type 'help' for available commands.\r\n`);
    writePrompt();
  }, [writePrompt]);

  // 处理输入数据
  const handleData = useCallback((data: string) => {
    const terminal = xtermRef.current;
    if (!terminal) return;

    const code = data.charCodeAt(0);

    // Enter - 执行命令
    if (code === KEY_CODES.ENTER || data === '\r' || data === '\n') {
      const cmd = currentLineRef.current.trim();
      currentLineRef.current = '';

      runCommand(cmd);
      return;
    }

    // Backspace - 删除字符
    if (code === KEY_CODES.BACKSPACE || data === '\x7f' || data === '\b') {
      if (currentLineRef.current.length > 0) {
        currentLineRef.current = currentLineRef.current.slice(0, -1);
        terminal.write('\b \b');
      }
      return;
    }

    // Ctrl+C - 中断命令
    if (code === KEY_CODES.CTRL_C) {
      terminal.write('^C\r\n');
      currentLineRef.current = '';
      writePrompt();
      return;
    }

    // Ctrl+L - 清屏
    if (code === KEY_CODES.CTRL_L) {
      terminal.clear();
      currentLineRef.current = '';
      writePrompt();
      return;
    }

    // Ctrl+U - 清除当前行
    if (code === KEY_CODES.CTRL_U) {
      clearCurrentLine();
      currentLineRef.current = '';
      return;
    }

    // 可打印字符 (ASCII 32-126)
    if (code >= 32 && code <= 126) {
      currentLineRef.current += data;
      terminal.write(data);
      return;
    }
  }, [runCommand, writePrompt, clearCurrentLine]);

  // 初始化终端
  useEffect(() => {
    if (!terminalRef.current) return;

    // 创建 xterm 实例
    const terminal = new XTerm({
      theme: getTheme(theme === 'dark'),
      fontSize: 13,
      fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", Consolas, "Courier New", monospace',
      fontWeight: '400',
      lineHeight: 1.4,
      letterSpacing: 0.3,
      cursorBlink: true,
      cursorStyle: 'block',
      cursorWidth: 2,
      // 优化滚动条
      scrollback: 1000,
    });

    // 创建并加载 FitAddon
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // 打开终端并适配大小
    terminal.open(terminalRef.current);
    fitAddon.fit();

    // 显示欢迎信息
    welcomeMessage.split('\n').forEach(line => terminal.writeln(line));
    terminal.write(prompt);

    currentLineRef.current = '';

    // 监听用户输入
    const dataListener = terminal.onData(handleData);

    // 监听容器大小变化，自动调整终端大小
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(terminalRef.current);

    // 清理函数
    return () => {
      resizeObserver.disconnect();
      dataListener.dispose();
      terminal.dispose();
    };
  }, [handleData]);
  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.theme = getTheme(theme === 'dark');
    }
  },[theme])

  return (
    <div 
      className="terminal-container"
      style={{ 
        width: '100%', 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme === 'dark' ? '#0d1117' : '#ffffff',
        borderTop: theme === 'dark' 
          ? '1px solid rgba(88, 166, 255, 0.2)' 
          : '1px solid rgba(0, 0, 0, 0.1)',
        boxShadow: theme === 'dark'
          ? '0 -4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(88, 166, 255, 0.1)'
          : '0 -2px 8px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* 终端标题栏 */}
      <div 
        style={{
          padding: '8px 16px',
          backgroundColor: theme === 'dark' ? '#161b22' : '#f6f8fa',
          borderBottom: theme === 'dark' 
            ? '1px solid rgba(88, 166, 255, 0.15)' 
            : '1px solid rgba(0, 0, 0, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          fontWeight: 500,
          color: theme === 'dark' ? '#c9d1d9' : '#24292e',
        }}
      >
        <div 
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: theme === 'dark' ? '#3fb950' : '#28a745',
            boxShadow: theme === 'dark' 
              ? '0 0 8px rgba(63, 185, 80, 0.4)' 
              : '0 0 4px rgba(40, 167, 69, 0.3)',
          }}
        />
        <span>Terminal</span>
        <span style={{ opacity: 0.5, marginLeft: 'auto', fontSize: '11px' }}>
          Press Ctrl+` to toggle
        </span>
      </div>
      
      {/* 终端内容区域 */}
      <div 
        ref={terminalRef} 
        className="terminal-content"
        style={{ 
          width: '100%', 
          flex: 1,
          padding: '12px',
          overflow: 'hidden',
        }}
      />
    </div>
  );
}
