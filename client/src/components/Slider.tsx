import Client from "./Client"
import { useTheme } from "@/core/config"
import { useTranslation } from "react-i18next"
import { Copy, LogOut, Users } from "lucide-react"
import { useCollaborators, useConnectionStatus } from "@/modules/collaboration"

interface SliderProps {
  copyRoomId: () => void
  leaveRoom: () => void
}

export default function Slider({ copyRoomId, leaveRoom }: SliderProps) {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const isDark = theme === "dark"
  
  // 直接从 collaboration store 获取协作者
  const collaborators = useCollaborators()
  const connectionStatus = useConnectionStatus()
  
  // 将 Map 转换为数组用于渲染
  const collaboratorsList = Array.from(collaborators.values())

  return (
    <div
      className={`h-full w-[260px] flex flex-col transition-all duration-300 ${
        isDark
          ? "bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100"
          : "bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-800"
      }`}
    >
      {/* Logo Section */}
      <div className={`px-6 py-5 border-b ${isDark ? "border-slate-700/50" : "border-slate-200"}`}>
        <div className="flex items-center justify-center">
          <div className={`p-3 rounded-2xl ${isDark ? "bg-slate-800/50" : "bg-white shadow-sm"}`}>
            <img src="/onepiece.png" alt="one-piece-logo" className="h-[90px] w-[100px] object-contain" />
          </div>
        </div>
      </div>

      {/* Connected Users Section */}
      <div className="flex-1 px-4 py-5 overflow-y-auto">
        <div
          className={`flex items-center gap-2 mb-4 px-2 py-2 rounded-lg ${isDark ? "bg-slate-800/30" : "bg-slate-100"}`}
        >
          <Users className="w-4 h-4 text-emerald-500" />
          <h3 className="font-semibold text-sm tracking-wide">{t('slider.connectedUsers')}</h3>
          {/* 连接状态指示器 */}
          <div 
            className={`w-2 h-2 rounded-full ${
              connectionStatus === 'online' ? 'bg-emerald-500' :
              connectionStatus === 'offline' ? 'bg-red-500' :
              'bg-yellow-500 animate-pulse'
            }`}
            title={connectionStatus === 'online' ? '已连接' : connectionStatus === 'offline' ? '离线' : '同步中'}
          />
          <span
            className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${
              isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-600"
            }`}
          >
            {collaboratorsList.length}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {collaboratorsList.map((user) => (
            <Client 
              key={user.awarenessId ?? user.name} 
              username={user.name}
              avatarUrl={user.avatarUrl}
              color={user.color}
              isOnline={connectionStatus === 'online'}
            />
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className={`p-4 space-y-3 border-t ${isDark ? "border-slate-700/50" : "border-slate-200"}`}>
        <button
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
            isDark
              ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm"
          } active:scale-[0.98]`}
          onClick={copyRoomId}
        >
          <Copy className="w-4 h-4" />
          {t('slider.copyRoomId')}
        </button>

        <button
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/25 transition-all duration-200 active:scale-[0.98]"
          onClick={leaveRoom}
        >
          <LogOut className="w-4 h-4" />
          {t('slider.leaveRoom')}
        </button>
      </div>
    </div>
  )
}
