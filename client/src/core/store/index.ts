/**
 * Store 核心模块导出
 */

export {
  registerStore,
  getStore,
  hasStore,
  getRegisteredStoreNames,
  unregisterStore,
  clearAllStores,
  createStoreAccessor,
  registry,
  type RegisteredStoreNames,
} from './registry';

// 使用官方中间件: import { persist, devtools } from 'zustand/middleware'
