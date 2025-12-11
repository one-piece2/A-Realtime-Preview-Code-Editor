
 //全局配置 Context - 仅用于全局配置项 不放业务逻辑

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';
export type Language = 'zh-CN' | 'en-US';

export interface GlobalConfig {

  theme: Theme;

  language: Language;

  apiBaseUrl: string;

  env: 'development' | 'production' | 'test';
}

export interface GlobalConfigContextType {
  config: GlobalConfig;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  //切换主题
  toggleTheme: () => void;
}


const defaultConfig: GlobalConfig = {
  theme: 'dark',
  language: 'zh-CN',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  env: (import.meta.env.MODE as GlobalConfig['env']) || 'development',
};

// Context 创建
export const GlobalConfigContext = createContext<GlobalConfigContextType | null>(null);


export function GlobalConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<GlobalConfig>(
    // useState传函数的话，只在组件初始化时从 localStorage 恢复主题设置 只执行一次
     () => {
    // 从 localStorage 恢复主题设置
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const savedLanguage = localStorage.getItem('language') as Language | null;
    
    return {
      ...defaultConfig,
      theme: savedTheme || defaultConfig.theme,
      language: savedLanguage || defaultConfig.language,
    };
  });

  // 主题变化时更新 DOM 和 localStorage
  useEffect(() => {
    const root = document.documentElement;
    
    if (config.theme === 'dark') {
      root.classList.add('dark');
      root.style.backgroundColor = '#111827';
      root.style.color = '#f3f4f6';
    } else {
      root.classList.remove('dark');
      root.style.backgroundColor = '#ffffff';
      root.style.color = '#1f2937';
    }
    
    localStorage.setItem('theme', config.theme);
  }, [config.theme]);

  // 语言变化时更新 localStorage
  useEffect(() => {
    localStorage.setItem('language', config.language);
  }, [config.language]);

  const setTheme = (theme: Theme) => {
    setConfig(prev => ({ ...prev, theme }));
  };

  const setLanguage = (language: Language) => {
    setConfig(prev => ({ ...prev, language }));
  };

  const toggleTheme = () => {
    setConfig(prev => ({
      ...prev,
      theme: prev.theme === 'light' ? 'dark' : 'light',
    }));
  };

  return (
    <GlobalConfigContext.Provider value={{ config, setTheme, setLanguage, toggleTheme }}>
      {children}
    </GlobalConfigContext.Provider>
  );
}

// Hooks的封装
export function useGlobalConfig() {
  const context = useContext(GlobalConfigContext);
  if (!context) {
    throw new Error('useGlobalConfig must be used within a GlobalConfigProvider');
  }
  return context;
}

// 便捷 hooks
export function useTheme() {
  const { config, setTheme, toggleTheme } = useGlobalConfig();
  return { theme: config.theme, setTheme, toggleTheme };
}

export function useLanguage() {
  const { config, setLanguage } = useGlobalConfig();
  return { language: config.language, setLanguage };
}
