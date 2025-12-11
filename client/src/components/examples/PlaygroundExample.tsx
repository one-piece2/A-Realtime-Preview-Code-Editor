/**
 * 示例组件：展示如何使用 Playground 模块的 hooks
 * 
 * 这是一个完整的 UI 示例，展示如何通过 Hooks 获取状态
 * UI 组件完全与业务逻辑解耦
 */

import { 
  useFileList,
  useEditorContent,
  useDependencies,
  useLeetCodes,
} from '@/modules/playground';
import { useTheme } from '@/core/config';

// ============ 示例 1: 文件标签页组件 ============
export function FileTabs() {
  const { fileNames, selectedFileName, selectFile, removeFile } = useFileList();

  return (
    <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
      {fileNames.map((fileName) => (
        <div
          key={fileName}
          className={`
            flex items-center gap-2 px-4 py-2 cursor-pointer border-b-2 whitespace-nowrap
            ${selectedFileName === fileName 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
              : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'}
          `}
          onClick={() => selectFile(fileName)}
        >
          <span className="text-sm">{fileName}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeFile(fileName);
            }}
            className="text-gray-400 hover:text-red-500"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

// ============ 示例 2: 代码编辑器包装组件 ============
export function CodeEditorWrapper() {
  const { fileName, content, language, updateContent } = useEditorContent();
  const { theme } = useTheme();

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-sm">
        <span className="font-medium">{fileName}</span>
        <span className="ml-2 text-gray-500">({language})</span>
      </div>
      
      {/* 这里替换为实际的 Monaco Editor */}
      <textarea
        value={content}
        onChange={(e) => updateContent(e.target.value)}
        className={`
          flex-1 p-4 font-mono text-sm resize-none
          ${theme === 'dark' 
            ? 'bg-gray-900 text-gray-100' 
            : 'bg-white text-gray-900'}
        `}
        placeholder="// 在这里编写代码..."
      />
    </div>
  );
}

// ============ 示例 3: 文件列表侧边栏 ============
export function FileExplorer() {
  const { fileNames, selectedFileName, selectFile, addFile } = useFileList();

  const handleAddFile = () => {
    const fileName = prompt('请输入文件名：');
    if (fileName) {
      addFile(fileName);
    }
  };

  return (
    <div className="w-64 border-r border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-medium">文件</h3>
        <button
          onClick={handleAddFile}
          className="text-blue-500 hover:text-blue-600"
        >
          + 新建
        </button>
      </div>
      
      <ul className="py-2">
        {fileNames.map((fileName) => (
          <li
            key={fileName}
            onClick={() => selectFile(fileName)}
            className={`
              px-4 py-2 cursor-pointer text-sm
              ${selectedFileName === fileName 
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'}
            `}
          >
            📄 {fileName}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============ 示例 4: 依赖管理面板 ============
export function DependencyPanel() {
  const { dependencies, addDependency, removeDependency } = useDependencies();

  const handleAddDependency = () => {
    const name = prompt('请输入包名：');
    const version = prompt('请输入版本号：') || 'latest';
    if (name) {
      addDependency(name, version);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">依赖包</h3>
        <button
          onClick={handleAddDependency}
          className="text-sm text-blue-500 hover:text-blue-600"
        >
          + 添加依赖
        </button>
      </div>
      
      <ul className="space-y-2">
        {Object.entries(dependencies).map(([name, version]) => (
          <li
            key={name}
            className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
          >
            <div>
              <span className="font-mono text-sm">{name}</span>
              <span className="ml-2 text-xs text-gray-500">@{version}</span>
            </div>
            <button
              onClick={() => removeDependency(name)}
              className="text-red-500 hover:text-red-600 text-sm"
            >
              删除
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============ 示例 5: LeetCode 面板 ============
export function LeetCodePanel() {
  const { leetCodes, setLeetCodes } = useLeetCodes();

  return (
    <div className="p-4">
      <h3 className="font-medium mb-4">LeetCode</h3>
      
      <textarea
        value={leetCodes || ''}
        onChange={(e) => setLeetCodes(e.target.value || undefined)}
        placeholder="在这里粘贴 LeetCode 题目..."
        className="w-full h-40 p-3 border rounded-lg resize-none"
      />
    </div>
  );
}

// ============ 示例 6: 完整的 Playground 布局 ============
export function PlaygroundLayout() {
  return (
    <div className="flex h-screen">
      {/* 侧边栏 */}
      <FileExplorer />
      
      {/* 主编辑区 */}
      <div className="flex-1 flex flex-col">
        <FileTabs />
        <CodeEditorWrapper />
      </div>
      
      {/* 右侧面板 */}
      <div className="w-80 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
        <DependencyPanel />
        <hr className="border-gray-200 dark:border-gray-700" />
        <LeetCodePanel />
      </div>
    </div>
  );
}
