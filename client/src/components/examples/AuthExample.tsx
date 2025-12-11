/**
 * 示例组件：展示如何使用 Auth 模块的 hooks
 * 
 * 这是一个完整的 UI 示例，展示如何通过 Hooks 获取状态
 * UI 组件完全与业务逻辑解耦
 */

import { useAuth, useUser, useIsAuthenticated, useLogout } from '@/modules/auth';

// ============ 示例 1: 用户信息展示组件 ============
export function UserProfile() {
  // 使用选择器 hook，仅订阅 user 状态变化
  const user = useUser();

  if (!user) {
    return <div className="text-gray-500">未登录</div>;
  }

  return (
    <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      {user.githubAvatar && (
        <img
          src={user.githubAvatar}
          alt={user.username}
          className="w-10 h-10 rounded-full"
        />
      )}
      <div>
        <p className="font-medium text-gray-900 dark:text-white">
          {user.username}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {user.email}
        </p>
      </div>
    </div>
  );
}

// ============ 示例 2: 登录表单组件 ============
export function LoginForm() {
  // 使用完整的 auth hook
  const { login, isLoading, authError, clearAuthError } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      await login(email, password);
      // 登录成功后的逻辑（如跳转）
    } catch (error) {
      // 错误已在 store 中处理
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      {authError && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg flex justify-between">
          <span>{authError}</span>
          <button type="button" onClick={clearAuthError}>×</button>
        </div>
      )}
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          邮箱
        </label>
        <input
          type="email"
          name="email"
          id="email"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>
      
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          密码
        </label>
        <input
          type="password"
          name="password"
          id="password"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
      </div>
      
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg disabled:opacity-50"
      >
        {isLoading ? '登录中...' : '登录'}
      </button>
    </form>
  );
}

// ============ 示例 3: 条件渲染组件 ============
export function AuthGuard({ children }: { children: React.ReactNode }) {
  // 仅订阅认证状态
  const isAuthenticated = useIsAuthenticated();

  if (!isAuthenticated) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600">请先登录</p>
      </div>
    );
  }

  return <>{children}</>;
}

// ============ 示例 4: 登出按钮组件 ============
export function LogoutButton() {
  // 仅获取登出函数
  const logout = useLogout();

  return (
    <button
      onClick={logout}
      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
    >
      退出登录
    </button>
  );
}

// ============ 示例 5: 完整的用户菜单组件 ============
export function UserMenu() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <a href="/login" className="text-blue-600 hover:underline">
        登录
      </a>
    );
  }

  return (
    <div className="relative group">
      <button className="flex items-center gap-2">
        <span>{user.username}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
        <div className="p-3 border-b">
          <p className="font-medium">{user.username}</p>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
        <button
          onClick={logout}
          className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50"
        >
          退出登录
        </button>
      </div>
    </div>
  );
}
