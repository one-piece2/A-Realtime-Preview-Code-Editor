import { useTheme } from '@/core/config';

interface ClientProps {
  username: string;
  avatarUrl?: string;
  color?: string;
}

const Client = ({ username, avatarUrl, color }: ClientProps) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  // 如果没有提供颜色，生成一个基于用户名的稳定颜色
  const getColorFromName = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  };
  
  const userColor = color || getColorFromName(username);
  const initial = username.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col items-center p-2 group">
      <div className="relative">
        {/* 头像容器 */}
        <div 
          className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg transition-transform duration-200 group-hover:scale-110 border-2 border-white/20"
          style={{ backgroundColor: userColor }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={username}
              className="w-full h-full rounded-full object-cover"
              onError={(e) => {
                // 图片加载失败时显示首字母
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  parent.textContent = initial;
                }
              }}
            />
          ) : (
            initial
          )}
        </div>
        {/* 在线状态指示器 */}
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 shadow-sm"></div>
      </div>
      {/* 用户名 */}
      <span 
        className={`mt-2 text-xs font-semibold text-center max-w-full truncate px-1 ${
          isDark ? 'text-slate-200' : 'text-slate-700'
        }`}
        title={username}
      >
        {username}
      </span>
    </div>
  );
};

export default Client;