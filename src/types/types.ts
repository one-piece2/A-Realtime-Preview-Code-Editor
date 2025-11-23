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
    actived: boolean
    onClick: () => void
}

 export interface EditorFile {
    name: string
    value: string
    language: string
}