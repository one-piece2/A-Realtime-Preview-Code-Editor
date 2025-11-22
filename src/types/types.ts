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