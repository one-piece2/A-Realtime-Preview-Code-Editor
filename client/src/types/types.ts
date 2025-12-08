export interface File {
  name: string;
  value: string;
  language: string;

}
export type Dependencies = Record<string, string>;

export interface Files {
  [key: string]: File;
}

export interface Clienttype {
  socketid: string;
  username: string;
  avatarUrl?: string;
  color?: string;
}

export interface HeaderProps {
  word: string;
  photoUrl: string;
}

export interface FileNameItemProps {
    value: string
    readonly: boolean
    actived: boolean
    onClick: () => void
    onEditComplete: (name: string) => void;
  onRemove: () => void;
  creating: boolean;
}

 export interface EditorFile {
    name: string
    value: string
    language: string
}

//文件树节点类型
export interface TreeNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
  isOpen?: boolean;
}