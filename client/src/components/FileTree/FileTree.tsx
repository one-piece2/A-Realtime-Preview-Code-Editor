import { useMemo, useContext, useRef, useEffect, useState } from 'react';
import { Tree } from 'react-arborist';
import { PlaygroundContext } from '@/Context/playgroundcontent';
import buildFileTree from '@/utils/filetree';
import { FolderOpenIcon, FolderIcon, FileIcon, X } from 'lucide-react';

export function FileTree() {
    const { files, setSelectedFileName, removeFile } = useContext(PlaygroundContext);
    const treeData = useMemo(() => buildFileTree(files), [files]);
    const containerRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState(600);

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
                }
            }
        } catch (error) {
            console.error('Error in handleSelect:', error, nodes);
        }
    };

    const handleDelete = ({ nodes, ids }: { nodes: any[]; ids: string[] }) => {
        try {
            // react-arborist 的 onDelete 传递的是 { nodes, ids } 对象
            // 可以通过键盘 Delete 键触发
            if (Array.isArray(nodes) && nodes.length > 0) {
                const node = nodes[0];
                // 检查节点是否存在且有 data 属性
                if (node?.data?.type === 'file' && node.data.path) {
                    removeFile(node.data.path);
                }
            }
        } catch (error) {
            console.error('Error in handleDelete:', error, { nodes, ids });
        }
    };

    // 直接删除文件的处理函数（用于删除按钮）
    const handleDeleteFile = (e: React.MouseEvent, nodePath: string) => {
        e.stopPropagation(); // 阻止事件冒泡，避免触发选择
        if (window.confirm(`确定要删除 ${nodePath} 吗？`)) {
            removeFile(nodePath);
        }
    };
    return (
        <div ref={containerRef} className="h-full w-full">
            <Tree 
              onSelect={handleSelect}
              onDelete={handleDelete}
                data={treeData}
                width="100%"
                height={height}
                indent={20}
            >
                {({ node, style, dragHandle }) => (
          <div
            style={style}
            className="group flex items-center gap-2 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
            ref={dragHandle}
          >
            {node.data.type === 'folder' ? (
              node.isOpen ? (
                <FolderOpenIcon size={16} />
              ) : (
                <FolderIcon size={16} />
              )
            ) : (
              <FileIcon size={16} />
            )}
            <span className="flex-1">{node.data.name}</span>
            {/* 删除按钮 - 仅对文件显示，hover 时显示 */}
            {node.data.type === 'file' && (
              <button
                onClick={(e) => handleDeleteFile(e, node.data.path)}
                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                title="删除文件"
                onMouseDown={(e) => e.stopPropagation()} // 阻止触发选择
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
                </Tree>
        </div>
    );
}
export default FileTree;