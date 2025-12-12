//Playground 模块 Zustand Store

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { registerStore } from "@/core/store";
import type { PlaygroundStore, PlaygroundState, Files } from "./types";
import {
  getFilesFromHash,
  saveFilesToHash,
  createFile,
  renameFile,
  getInitialDependencies,
  initFiles,
} from "./services";

// 初始状态
const initialState: PlaygroundState = {
  files: getFilesFromHash(),
  selectedFileName: "src/App.tsx",
  dependencies: getInitialDependencies(),
  leetCodes: undefined,
};

// 创建 Playground Store
export const usePlaygroundStore = create<PlaygroundStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // 文件操作

        setFiles: (files: Files) => {
          set({ files });
        },

        addFile: (fileName: string) => {
          const { files } = get();
          const newFile = createFile(fileName);
          set({
            files: {
              ...files,
              [fileName]: newFile,
            },
          });
        },
        //删除文件
        removeFile: (fileName: string) => {
          const { files, selectedFileName } = get();
          //给要删除的文件赋值一个别名:removed
          const { [fileName]: removed, ...rest } = files;

          // 如果删除的是当前选中的文件，切换到另一个文件
          let newSelectedFileName = selectedFileName;
          if (selectedFileName === fileName) {
            const remainingFiles = Object.keys(rest);
            newSelectedFileName = remainingFiles[0] || "src/App.tsx";
          }

          set({
            files: rest,
            selectedFileName: newSelectedFileName,
          });
        },

        updateFileName: (oldFileName: string, newFileName: string) => {
          const { files, selectedFileName } = get();
          const updatedFiles = renameFile(files, oldFileName, newFileName);

          if (!updatedFiles) return;

          // 如果重命名的是当前选中的文件，更新选中文件名
          const newSelectedFileName =
            selectedFileName === oldFileName ? newFileName : selectedFileName;

          set({
            files: updatedFiles,
            selectedFileName: newSelectedFileName,
          });
        },

        updateFileContent: (fileName: string, content: string) => {
          const { files } = get();
          if (!files[fileName]) return;

          set({
            files: {
              ...files,
              [fileName]: {
                ...files[fileName],
                value: content,
              },
            },
          });
        },

        //  选中文件
        setSelectedFileName: (fileName: string) => {
          set({ selectedFileName: fileName });
        },

        // 依赖管理服务

        addDependency: (name: string, version: string) => {
          const { dependencies } = get();
          set({
            dependencies: {
              ...dependencies,
              [name]: version,
            },
          });
        },

        removeDependency: (name: string) => {
          const { dependencies } = get();
          const { [name]: removed, ...rest } = dependencies;
          set({ dependencies: rest });
        },

        setDependencies: (dependencies) => {
          set({ dependencies });
        },

        //LeetCode

        setLeetCodes: (leetCodes) => {
          set({ leetCodes });
        },

        // Hash 同步服务

        initFromHash: () => {
          const files = getFilesFromHash();
          set({ files });
        },

        syncToHash: () => {
          const { files } = get();
          saveFilesToHash(files);
        },

        // 重置服务

        reset: () => {
          set({
            files: initFiles,
            selectedFileName: "src/App.tsx",
            dependencies: getInitialDependencies(),
            leetCodes: undefined,
          });
        },
      }),
      { name: "playground-store" }
    )
  )
);



// 注册到全局 store registry
registerStore("playground", usePlaygroundStore);

// 导出选择器
export const playgroundSelectors = {
  files: (state: PlaygroundStore) => state.files,
  selectedFileName: (state: PlaygroundStore) => state.selectedFileName,
  selectedFile: (state: PlaygroundStore) => state.files[state.selectedFileName],
  dependencies: (state: PlaygroundStore) => state.dependencies,
  leetCodes: (state: PlaygroundStore) => state.leetCodes,
};
