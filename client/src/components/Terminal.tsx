import { useEffect, useRef, useContext, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from 'xterm-addon-fit';
import '@xterm/xterm/css/xterm.css';
import { PlaygroundContext } from '../Context/playgroundcontent';

// 主题配置
const getTheme = (isDark: boolean) => ({
  background: isDark ? '#1e1e1e' : '#ffffff',
  foreground: isDark ? '#d4d4d4' : '#000000',
  cursor: isDark ? '#aeafad' : '#000000',
  cursorAccent: isDark ? '#1e1e1e' : '#ffffff',
  black: '#000000',
  red: '#cd3131',
  green: '#0dbc79',
  yellow: '#e5e510',
  blue: '#2472c8',
  magenta: '#bc3fbc',
  cyan: '#11a8cd',
  white: '#e5e5e5',
  brightBlack: '#666666',
  brightRed: '#f14c4c',
  brightGreen: '#23d18b',
  brightYellow: '#f5f543',
  brightBlue: '#3b8eea',
  brightMagenta: '#d670d6',
  brightCyan: '#29b8db',
  brightWhite: '#e5e5e5',
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
  const { theme, addDependency } = useContext(PlaygroundContext);
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
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      cursorBlink: true,
      cursorStyle: 'block',
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
        padding: '8px',
        backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
      }}
    >
      <div 
        ref={terminalRef} 
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
