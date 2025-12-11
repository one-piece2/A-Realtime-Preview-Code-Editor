/**
 * Playground 模块类型定义
 */

export interface EditorFile {
  name: string;
  value: string;
  language: string;
}

export interface Files {
  [key: string]: EditorFile;
}

export type Dependencies = Record<string, string>;

export interface PlaygroundState {
  files: Files;
  selectedFileName: string;
  dependencies: Dependencies;
  leetCodes: string | undefined;
}

export interface PlaygroundActions {
  // 文件操作
  setFiles: (files: Files) => void;
  addFile: (fileName: string) => void;
  removeFile: (fileName: string) => void;
  updateFileName: (oldFileName: string, newFileName: string) => void;
  updateFileContent: (fileName: string, content: string) => void;
  
  // 选中文件
  setSelectedFileName: (fileName: string) => void;
  
  // 依赖管理
  addDependency: (name: string, version: string) => void;
  removeDependency: (name: string) => void;
  setDependencies: (dependencies: Dependencies) => void;
  
  // LeetCode
  setLeetCodes: (leetCodes: string | undefined) => void;
  
  // 初始化
  initFromHash: () => void;
  syncToHash: () => void;
  
  // 重置
  reset: () => void;
}

export type PlaygroundStore = PlaygroundState & PlaygroundActions;
