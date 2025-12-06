import {type Files } from '../types/types';
import {type TreeNode } from '../types/types';

/**
 * 规范化文件路径
 * 去除多余斜杠、处理空路径等
 */
const normalizePath = (path: string): string => {
  if (!path || typeof path !== 'string') {
    return '';
  }
  // 去除首尾空格和斜杠，然后规范化
  return path.trim().replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
};

/**
 * 验证路径是否有效
 */
const isValidPath = (path: string): boolean => {
  if (!path || typeof path !== 'string') {
    return false;
  }
  const normalized = normalizePath(path);
  return normalized.length > 0 && !normalized.startsWith('.');
};

/**
 * 把扁平的文件对象转换为树形结构
 * @param files - 扁平的文件对象，键为文件路径，值为文件信息
 * @returns 树形结构的节点数组
 */
const buildFileTree = (files: Files | null | undefined): TreeNode[] => {
  // 处理空数据情况
  if (!files || typeof files !== 'object') {
    return [];
  }

  // 记录所有节点
  const tree: Record<string, TreeNode> = {};
  // 结果树的根节点列表
  const rootNodes: TreeNode[] = [];
  // 用于跟踪已添加的根节点，避免重复
  const rootNodeSet = new Set<string>();

  // 获取所有文件路径并过滤无效路径
  const filePaths = Object.keys(files).filter(isValidPath);

  // 如果没有有效路径，返回空数组
  if (filePaths.length === 0) {
    return [];
  }

  // 遍历所有文件路径
  filePaths.forEach(filePath => {
    const normalizedPath = normalizePath(filePath);
    if (!normalizedPath) {
      return; // 跳过无效路径
    }

    // 分割路径
    const parts = normalizedPath.split('/').filter(part => part.length > 0);
    
    if (parts.length === 0) {
      return; // 跳过空路径
    }

    // 当前路径
    let currentPath = '';

    parts.forEach((part, index) => {
      // 完整路径
      const fullPath = currentPath ? `${currentPath}/${part}` : part;
      // 是否是文件（以/分割路径后，最后一个路径是文件）
      const isFile = index === parts.length - 1;

      // 如果节点不存在，创建新节点
      if (!tree[fullPath]) {
        const node: TreeNode = {
          id: fullPath,
          name: part,
          path: fullPath,
          type: isFile ? 'file' : 'folder',
          children: isFile ? undefined : [],
        };

        tree[fullPath] = node;

        // 如果是根节点，添加到根节点列表
        if (index === 0) {
          if (!rootNodeSet.has(fullPath)) {
            rootNodes.push(node);
            rootNodeSet.add(fullPath);
          }
        } else {
          // 添加到父节点的 children
          const parentPath = currentPath;
          const parentNode = tree[parentPath];
          
          if (parentNode) {
            // 确保父节点的 children 数组存在
            if (!parentNode.children) {
              parentNode.children = [];
            }
            // 避免重复添加
            if (!parentNode.children.some(child => child.id === fullPath)) {
              parentNode.children.push(node);
            }
          }
        }
      }

      currentPath = fullPath;
    });
  });

  // 对根节点和子节点进行排序（文件夹在前，文件在后）
  const sortNodes = (nodes: TreeNode[]): void => {
    nodes.sort((a, b) => {
      // 文件夹优先
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      // 同类型按名称排序
      return a.name.localeCompare(b.name);
    });

    // 递归排序子节点
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        sortNodes(node.children);
      }
    });
  };

  sortNodes(rootNodes);

  return rootNodes;
};

export default buildFileTree;