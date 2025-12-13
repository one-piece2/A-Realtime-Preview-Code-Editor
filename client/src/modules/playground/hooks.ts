// Playground 模块 Hooks
// UI 层通过这些 hooks 获取状态，禁止直接操作 store

import { useEffect } from "react";
import { usePlaygroundStore, playgroundSelectors } from "./store";
import { useShallow } from "zustand/react/shallow";
import type { Files } from "./types";

// 主要的 Playground Hook - 提供完整的编辑器功能

export function usePlayground() {
  return usePlaygroundStore(
    useShallow((state) => ({
      files: state.files,
      selectedFileName: state.selectedFileName,
      dependencies: state.dependencies,
      leetCodes: state.leetCodes,
      setFiles: state.setFiles,
      addFile: state.addFile,
      removeFile: state.removeFile,
      updateFileName: state.updateFileName,
      updateFileContent: state.updateFileContent,
      setSelectedFileName: state.setSelectedFileName,
      addDependency: state.addDependency,
      setLeetCodes: state.setLeetCodes,
    }))
  );
}

//  获取所有文件

export function useFiles() {
  return usePlaygroundStore(playgroundSelectors.files);
}

// 获取当前选中的文件名
export function useSelectedFileName() {
  const selectedFileName = usePlaygroundStore(
    playgroundSelectors.selectedFileName
  );
  const setSelectedFileName = usePlaygroundStore(
    (state) => state.setSelectedFileName
  );
  return { selectedFileName, setSelectedFileName };
}

// 获取当前选中的文件内容

export function useSelectedFile() {
  return usePlaygroundStore(playgroundSelectors.selectedFile);
}

// 文件操作 Hook

export function useFileActions() {
  return usePlaygroundStore(
    useShallow((state) => ({
      addFile: state.addFile,
      removeFile: state.removeFile,
      updateFileName: state.updateFileName,
      updateFileContent: state.updateFileContent,
      setFiles: state.setFiles,
    }))
  );
}

// 依赖管理 Hook

export function useDependencies() {
  const dependencies = usePlaygroundStore(playgroundSelectors.dependencies);
  const addDependency = usePlaygroundStore((state) => state.addDependency);
  const removeDependency = usePlaygroundStore(
    (state) => state.removeDependency
  );
  const setDependencies = usePlaygroundStore((state) => state.setDependencies);

  return { dependencies, addDependency, removeDependency, setDependencies };
}

// LeetCode 管理 Hook

export function useLeetCodes() {
  const leetCodes = usePlaygroundStore(playgroundSelectors.leetCodes);
  const setLeetCodes = usePlaygroundStore((state) => state.setLeetCodes);
  return { leetCodes, setLeetCodes };
}

// 编辑器内容 Hook - 用于代码编辑器组件
export function useEditorContent() {
  const files = usePlaygroundStore(playgroundSelectors.files);
  const selectedFileName = usePlaygroundStore(
    playgroundSelectors.selectedFileName
  );
  const updateFileContent = usePlaygroundStore(
    (state) => state.updateFileContent
  );

  const currentFile = files[selectedFileName];

  return {
    fileName: selectedFileName,
    content: currentFile?.value || "",
    language: currentFile?.language || "typescript",
    updateContent: (content: string) =>
      updateFileContent(selectedFileName, content),
  };
}

// 文件列表 Hook - 用于文件标签页组件
export function useFileList() {
  const files = usePlaygroundStore(playgroundSelectors.files);
  const selectedFileName = usePlaygroundStore(
    playgroundSelectors.selectedFileName
  );
  const setSelectedFileName = usePlaygroundStore(
    (state) => state.setSelectedFileName
  );
  const removeFile = usePlaygroundStore((state) => state.removeFile);
  const updateFileName = usePlaygroundStore((state) => state.updateFileName);
  const addFile = usePlaygroundStore((state) => state.addFile);

  const fileNames = Object.keys(files);

  return {
    files,
    fileNames,
    selectedFileName,
    selectFile: setSelectedFileName,
    removeFile,
    renameFile: updateFileName,
    addFile,
  };
}

// 重置 Playground

export function useResetPlayground() {
  return usePlaygroundStore((state) => state.reset);
}

// 订阅 files 变化（副作用）- 用于同步到 URL hash 等场景
export function useFilesSubscription(callback: (files: Files) => void) {
  useEffect(() => {
    const unsubscribe = usePlaygroundStore.subscribe((state) => {
      callback(state.files);
    });
    return () => unsubscribe();
  }, [callback]);
}
