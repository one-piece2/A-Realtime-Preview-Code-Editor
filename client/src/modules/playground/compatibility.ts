/**
 * 兼容层 - 提供与旧 PlaygroundContext 相同的接口
 * 用于渐进式迁移，迁移完成后可删除此文件
 */

import { usePlaygroundStore } from './store';
import { useTheme } from '@/core/config';
import { useShallow } from 'zustand/react/shallow';

/**
 * 兼容旧的 PlaygroundContext 接口
 * 用于快速迁移，后续应逐步替换为更细粒度的 hooks
 */
export function usePlaygroundCompat() {
  const { theme, setTheme } = useTheme();
  
  const playgroundState = usePlaygroundStore(
    useShallow((state) => ({
      files: state.files,
      selectedFileName: state.selectedFileName,
      setSelectedFileName: state.setSelectedFileName,
      setFiles: state.setFiles,
      addFile: state.addFile,
      removeFile: state.removeFile,
      updateFileName: state.updateFileName,
      leetCodes: state.leetCodes,
      setLeetCodes: state.setLeetCodes,
      dependencies: state.dependencies,
      addDependency: state.addDependency,
    }))
  );

  // 返回与旧 Context 完全相同的接口
  return {
    ...playgroundState,
    theme,
    setTheme,
  };
}
