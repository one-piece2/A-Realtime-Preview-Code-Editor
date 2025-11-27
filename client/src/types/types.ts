export interface File {
  name: string;
  value: string;
  language: string;
}

export interface Files {
  [key: string]: File;
}

export interface Clienttype {
  socketid: string;
  username: string;
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