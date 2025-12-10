import { createContext } from 'react';
export interface User {
    id: string;
    email: string;
    username: string;
    githubNickname?: string | null;
    githubAvatar?: string | null;
  }