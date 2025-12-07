import { useMemo, useContext, useRef, useEffect, useState } from 'react';
import { Tree } from 'react-arborist';
import { PlaygroundContext } from '@/Context/playgroundcontent';
import buildFileTree from '@/utils/filetree';
import { 
  FolderOpenIcon, 
  FolderIcon, 
  FileIcon, 
  FileCode,
  FileText,
  FileImage,
  FileJson,
  MoreVertical,
  Trash2,
  Pencil,
  Plus
} from 'lucide-react';
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

// 根据文件扩展名获取对应的图标和颜色
const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'tsx':
    case 'jsx':
      return { Icon: FileCode, color: 'text-blue-500 dark:text-blue-400' };
    case 'ts':
      return { Icon: FileCode, color: 'text-blue-600 dark:text-blue-400' };
    case 'js':
      return { Icon: FileCode, color: 'text-yellow-500 dark:text-yellow-400' };
    case 'json':
      return { Icon: FileJson, color: 'text-yellow-600 dark:text-yellow-400' };
    case 'css':
    case 'scss':
    case 'sass':
      return { Icon: FileCode, color: 'text-purple-500 dark:text-purple-400' };
    case 'html':
    case 'htm':
      return { Icon: FileCode, color: 'text-orange-500 dark:text-orange-400' };
    case 'md':
    case 'txt':
      return { Icon: FileText, color: 'text-gray-500 dark:text-gray-400' };
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return { Icon: FileImage, color: 'text-pink-500 dark:text-pink-400' };
    default:
      return { Icon: FileIcon, color: 'text-gray-600 dark:text-gray-400' };
  }
};

// 文件菜单组件
function FileMenu({ 
  onRename, 
  onDelete 
}: { 
  onRename: () => void;
  onDelete: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={cn(
          "opacity-0 group-hover:opacity-100 transition-all duration-200",
          "h-6 w-6 p-0 rounded-md",
          "text-muted-foreground hover:text-foreground",
          "hover:bg-accent",
          isOpen && "opacity-100"
        )}
        title="更多选项"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <MoreVertical size={14} />
      </Button>

      {isOpen && (
        <div
          className="absolute right-0 top-7 z-50 min-w-[120px] rounded-md border border-border bg-popover shadow-md p-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onRename();
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Pencil size={14} />
            <span>重命名</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onDelete();
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <Trash2 size={14} />
            <span>删除</span>
          </button>
        </div>
      )}
    </div>
  );
}

// 文件夹菜单组件
function FolderMenu({ 
  onAddFile
}: { 
  onAddFile: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={cn(
          "opacity-0 group-hover:opacity-100 transition-all duration-200",
          "h-6 w-6 p-0 rounded-md",
          "text-muted-foreground hover:text-foreground",
          "hover:bg-accent",
          isOpen && "opacity-100"
        )}
        title="更多选项"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <MoreVertical size={14} />
      </Button>

      {isOpen && (
        <div
          className="absolute right-0 top-7 z-50 min-w-[120px] rounded-md border border-border bg-popover shadow-md p-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onAddFile();
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Plus size={14} />
            <span>添加文件</span>
          </button>
        </div>
      )}
    </div>
  );
}

// 重命名对话框组件
function RenameDialog({
  open,
  onOpenChange,
  fileName,
  nodePath,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  nodePath: string;
  onConfirm: (newPath: string) => void;
}) {
  const [newName, setNewName] = useState(fileName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setNewName(fileName);
      // 延迟聚焦，确保对话框已渲染
      setTimeout(() => {
        inputRef.current?.focus();
        // 选中文件名（不含扩展名）
        const lastDotIndex = fileName.lastIndexOf('.');
        if (lastDotIndex > 0) {
          inputRef.current?.setSelectionRange(0, lastDotIndex);
        } else {
          inputRef.current?.select();
        }
      }, 100);
    }
  }, [open, fileName]);

  const handleSubmit = () => {
    const trimmedName = newName.trim();
    if (!trimmedName || trimmedName === fileName) {
      onOpenChange(false);
      return;
    }

    // 构建新路径（保持相同的目录结构）
    const pathParts = nodePath.split('/');
    pathParts[pathParts.length - 1] = trimmedName;
    const newPath = pathParts.join('/');
    
    onConfirm(newPath);
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>重命名文件</DialogTitle>
          <DialogDescription>
            请输入新的文件名
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            ref={inputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="文件名"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit}>
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 添加文件对话框组件
function AddFileDialog({
  open,
  onOpenChange,
  defaultPath,
  onConfirm,
  existingFiles,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPath: string;
  onConfirm: (filePath: string) => void;
  existingFiles: Record<string, any>;
}) {
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setFileName('');
      // 延迟聚焦，确保对话框已渲染
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const handleSubmit = () => {
    const trimmedName = fileName.trim();
    if (!trimmedName) {
      onOpenChange(false);
      return;
    }

    // 构建文件路径
    let filePath: string;
    if (defaultPath && defaultPath.trim()) {
      // 如果提供了默认路径（文件夹），在该文件夹下创建文件
      const normalizedPath = defaultPath.replace(/\/+$/, ''); // 移除末尾的斜杠
      filePath = `${normalizedPath}/${trimmedName}`;
    } else {
      // 否则在根目录创建，或者如果输入包含路径，使用输入的路径
      filePath = trimmedName;
    }

    // 规范化路径（移除多余的斜杠）
    filePath = filePath.replace(/\/+/g, '/').replace(/^\//, '');

    // 检查文件是否已存在
    if (existingFiles[filePath]) {
      toast.error(`文件 "${filePath}" 已存在`);
      return;
    }

    // 验证文件名是否包含扩展名
    if (!trimmedName.includes('.')) {
      toast.error('文件名必须包含扩展名（如 .tsx, .js, .css 等）');
      return;
    }

    onConfirm(filePath);
    onOpenChange(false);
    setFileName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>添加文件</DialogTitle>
          <DialogDescription>
            {defaultPath 
              ? `在 "${defaultPath}" 文件夹下创建新文件`
              : '请输入文件名（可包含路径，如 src/NewFile.tsx）'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            ref={inputRef}
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={defaultPath ? "文件名（如 NewFile.tsx）" : "文件路径（如 src/NewFile.tsx）"}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit}>
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FileTree() {
  const { files, setSelectedFileName, removeFile, selectedFileName, updateFileName, addFile } = useContext(PlaygroundContext);
  const treeData = useMemo(() => buildFileTree(files), [files]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(600);
  const [renameDialog, setRenameDialog] = useState<{
    open: boolean;
    nodePath: string;
    fileName: string;
  }>({ open: false, nodePath: '', fileName: '' });
  //控制添加文件对话框的显示
  const [addFileDialog, setAddFileDialog] = useState<{
    open: boolean;
    defaultPath: string;
  }>({ open: false, defaultPath: '' });
  //控制选中的文件夹路径
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>('');

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setHeight(containerRef.current.clientHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);

    // 使用 ResizeObserver 监听容器大小变化
    const resizeObserver = new ResizeObserver(updateHeight);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateHeight);
      resizeObserver.disconnect();
    };
  }, []);
  const handleSelect = (nodes: any[]) => {
    try {
      // react-arborist 的 onSelect 传递的是 NodeApi[] 数组
      if (Array.isArray(nodes) && nodes.length > 0) {
        const node = nodes[0];
        // 检查节点是否存在且有 data 属性
        if (node?.data?.type === 'file' && node.data.path) {
          setSelectedFileName(node.data.path);
          setSelectedFolderPath(node.data.path.split('/').slice(0, -1).join('/')); // 选中文件后，记录文件夹路径
        } else if (node?.data?.type === 'folder' && node.data.path) {
          // 如果选中的是文件夹，记录文件夹路径
          setSelectedFolderPath(node.data.path);
        }
      }
    } catch (error) {
      console.error('Error in handleSelect:', error, nodes);
    }
  };

 

  // 删除文件的处理函数
  const handleDeleteFile = (nodePath: string, fileName: string) => {
    console.log('删除文件',nodePath, fileName);  
    // 显示确认对话框
    toast.error(`确定要删除 ${fileName} 吗？`, {
      action: {
        label: '删除',
        onClick: () => {
          removeFile(nodePath);
          toast.success(`${fileName} 已删除`);
        },
      },
      cancel: {
        label: '取消',
        onClick: () => {
          // 点击取消按钮，toast 会自动关闭
        },
      },
      duration: 5000, // 5秒后自动消失
    });
  };

  // 打开重命名对话框
  const handleRenameFile = (nodePath: string, fileName: string) => {
    setRenameDialog({ open: true, nodePath, fileName });
  };

  // 确认重命名
  const handleRenameConfirm = (newPath: string) => {
    const { nodePath } = renameDialog;
    
    // 检查新路径是否已存在
    if (files[newPath]) {
      const newFileName = newPath.split('/').pop() || '';
      toast.error(`文件 "${newFileName}" 已存在`);
      return;
    }
    
    updateFileName(nodePath, newPath);
    
    // 如果重命名的是当前选中的文件，更新选中状态
    if (nodePath === selectedFileName) {
      setSelectedFileName(newPath);
    }
    
    const newFileName = newPath.split('/').pop() || '';
    toast.success(`文件已重命名为 "${newFileName}"`);
  };

  // 打开添加文件对话框
  const handleAddFile = (folderPath?: string) => {
    setAddFileDialog({ 
      open: true, 
      defaultPath: folderPath || selectedFolderPath || '' 
    });
  };

  // 确认添加文件
  const handleAddFileConfirm = (filePath: string) => {
    addFile(filePath);
    setSelectedFileName(filePath); // 自动选中新创建的文件
    const fileName = filePath.split('/').pop() || '';
    toast.success(`文件 "${fileName}" 已创建`);
  };

  return (
    <>
      <RenameDialog
        open={renameDialog.open}
        onOpenChange={(open) => setRenameDialog({ ...renameDialog, open })}
        fileName={renameDialog.fileName}
        nodePath={renameDialog.nodePath}
        onConfirm={handleRenameConfirm}
      />
      <AddFileDialog
        open={addFileDialog.open}
        onOpenChange={(open) => setAddFileDialog({ ...addFileDialog, open })}
        defaultPath={addFileDialog.defaultPath}
        onConfirm={handleAddFileConfirm}
        existingFiles={files}
      />
      <div ref={containerRef} className="h-full w-full bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* 添加文件按钮 */}
        <div className="p-2 border-b border-sidebar-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddFile(selectedFolderPath)}
            className="w-full justify-start gap-2"
          >
            <Plus size={16} />
            <span>添加文件</span>
          </Button>
        </div>
        {/* 文件树 */}
        <div className="flex-1 overflow-hidden">
        <Tree
        data={treeData}
        width="100%"
        paddingTop={8}
        paddingBottom={8}
        rowHeight={32}
        height={height}
        indent={20}
      >
        {({ node, style, dragHandle }) => {
          const isSelected = node.data.type === 'file' && node.data.path === selectedFileName;
          const isFolder = node.data.type === 'folder';
          const fileIcon = !isFolder ? getFileIcon(node.data.name) : null;

          return (
            <div
              style={style}
              className={cn(
                "group relative flex items-center gap-2 px-3 py-1.5 mx-2 rounded-md",
                "transition-all duration-150 ease-in-out",
                "cursor-pointer select-none",
                isSelected
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "hover:bg-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground",
                // 选中状态的左边框指示器
                isSelected && "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-4 before:bg-primary before:rounded-r-full"
              )}
              ref={dragHandle}
              onClick={() => {
                if (node.data.type === 'folder') {
                  node.toggle();
                } else {
                  handleSelect([node]);
                }
              }}
            >
              {/* 文件夹图标 */}
              {isFolder ? (
                node.isOpen ? (
                  <FolderOpenIcon 
                    size={18} 
                    className="text-amber-500 dark:text-amber-400 shrink-0 transition-transform duration-200" 
                  />
                ) : (
                  <FolderIcon 
                    size={18} 
                    className="text-amber-600 dark:text-amber-500 shrink-0 transition-transform duration-200" 
                  />
                )
              ) : (
                // 文件图标
                fileIcon && (
                  <fileIcon.Icon 
                    size={16} 
                    className={cn("shrink-0", fileIcon.color)} 
                  />
                )
              )}
              
              {/* 文件名 */}
              <span 
                className={cn(
                  "flex-1 text-sm font-medium truncate",
                  isSelected && "font-semibold"
                )}
              >
                {node.data.name}
              </span>
              
              {/* 文件菜单 - 仅对文件显示，hover 时显示 */}
              {!isFolder && (
                <FileMenu
                  onRename={() => handleRenameFile(node.data.path, node.data.name)}
                  onDelete={() => handleDeleteFile(node.data.path, node.data.name)}
                />
              )}
              
              {/* 文件夹菜单 - 仅对文件夹显示，hover 时显示 */}
              {isFolder && (
                <FolderMenu
                  onAddFile={() => handleAddFile(node.data.path)}
                />
              )}
            </div>
          );
        }}
      </Tree>
        </div>
      </div>
    </>
  );
}
export default FileTree;