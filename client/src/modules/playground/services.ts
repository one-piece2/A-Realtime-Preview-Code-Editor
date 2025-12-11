// Playground 模块业务服务

import { compress, uncompress } from '@/utils/loadandcompress';
import { fileName2Language } from '@/utils/judgeLangyage';
import { initFiles } from '@/utils/files';
import type { Files, Dependencies } from './types';

// URL Hash 服务

/**
 * 从 URL hash 获取文件数据
 */
export function getFilesFromHash(): Files {
  const hash = window.location.hash;
  if (!hash) return initFiles;
  
  try {
    return JSON.parse(uncompress(decodeURIComponent(hash.slice(1))));
  } catch (e) {
    console.error('从 URL 中获取 files 失败', e);
    return initFiles;
  }
}

/**
 * 将文件数据保存到 URL hash
 */
export function saveFilesToHash(files: Files): void {
  const hash = compress(JSON.stringify(files));
  window.location.hash = encodeURIComponent(hash);
}

// ============ 文件操作服务 ============

/**
 * 创建新文件
 */
export function createFile(name: string): { name: string; value: string; language: string } {
  return {
    name,
    language: fileName2Language(name),
    value: '',
  };
}

/**
 * 重命名文件
 */
export function renameFile(
  files: Files,
  oldFileName: string,
  newFileName: string
): Files | null {
  if (!files[oldFileName] || !newFileName) {
    return null;
  }

  const { [oldFileName]: oldFile, ...rest } = files;
  
  return {
    ...rest,
    [newFileName]: {
      ...oldFile,
      name: newFileName,
      language: fileName2Language(newFileName),
    },
  };
}

// ============ 依赖管理服务 ============


 //从初始文件解析依赖
 
export function getInitialDependencies(): Dependencies {
  try {
    const pkgStr = initFiles['package.json']?.value;
    if (!pkgStr) {
      return getDefaultDependencies();
    }
    const pkg = JSON.parse(pkgStr);
    return { ...getDefaultDependencies(), ...(pkg.dependencies || {}) };
  } catch (e) {
    return getDefaultDependencies();
  }
}

// 获取默认依赖
export function getDefaultDependencies(): Dependencies {
  return {
    'react': '18.2.0',
    'react-dom': '18.2.0',
  };
}

// 语言判断服务

export { fileName2Language };

// 初始文件导出

export { initFiles };
