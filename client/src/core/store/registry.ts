/**
 * Store 注册中心 - 统一管理所有业务模块的 Zustand Store
 * - 注册模块 store
 * - 提供模块间协作能力
 * - 支持懒加载 store
 * - 提供 store 访问入口
 */

import type { StoreApi } from 'zustand';

// Store 类型定义
type AnyStore = StoreApi<any>;

interface StoreModule {
  store: AnyStore;
  name: string;
  //是否加载
  loaded: boolean;
}

// Store 注册表
const storeRegistry = new Map<string, StoreModule>();

// 已注册的 store 名称类型（动态扩展）
export type RegisteredStoreNames = 'auth' | 'playground' | 'editor' | 'files';


// 注册一个 store 到注册中心
 
export function registerStore<T>(name: string, store: StoreApi<T>): void {
  if (storeRegistry.has(name)) {
    console.warn(`Store "${name}" is already registered. Skipping...`);
    return;
  }
  
  storeRegistry.set(name, {
    store,
    name,
    loaded: true,
  });
}


 //获取已注册的 store

export function getStore<T>(name: string): StoreApi<T> | undefined {
  const module = storeRegistry.get(name);
  return module?.store as StoreApi<T> | undefined;
}

//检查 store 是否已注册
export function hasStore(name: string): boolean {
  return storeRegistry.has(name);
}

//获取所有已注册的 store 名称
export function getRegisteredStoreNames(): string[] {
  return Array.from(storeRegistry.keys());
}

//注销一个 store
export function unregisterStore(name: string): boolean {
  return storeRegistry.delete(name);
}

//清空所有 store（
export function clearAllStores(): void {
  storeRegistry.clear();
}

//Store 间通信工具 - 允许 store 之间安全地访问状态
export function createStoreAccessor<T>(name: string) {
  return {
    getState: (): T | undefined => {
      const store = getStore<T>(name);
      return store?.getState();
    },
    // 订阅store状态变化  当store状态发生变化时，会自动调用listener
    subscribe: (listener: (state: T) => void) => {
      const store = getStore<T>(name);
      return store?.subscribe(listener);
    },
  };
}

// 导出注册表实例
export const registry = storeRegistry;
