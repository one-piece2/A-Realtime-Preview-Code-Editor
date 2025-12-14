

import type { HeaderProps } from "../types/types"
import { Moon, Sun, Copy, Download, Settings, Home, LogOut, X, ChevronDown, Languages } from "lucide-react"
import copy from "copy-to-clipboard"
import { downloadFiles } from "../utils/loadandcompress"
import { useTheme, useLanguage } from "@/core/config"
import { useTranslation } from "react-i18next"
import { useFiles } from "@/modules/playground"
import { useState, useEffect, useRef } from "react"
import {  useNavigate } from "react-router-dom"
import { message } from "antd"

export default function Header(props: HeaderProps) {
  const { word, photoUrl } = props
  const { theme, setTheme } = useTheme()
  const { language, toggleLanguage } = useLanguage()
  const { t } = useTranslation()
  const files = useFiles()
  // 注意：theme 只用于切换按钮的图标显示，样式使用 Tailwind 的 dark: 前缀
  const navigate = useNavigate()
  const [messageApi, contextHolder] = message.useMessage()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const avatarRef = useRef<HTMLDivElement>(null)


  // 处理点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        avatarRef.current &&
        !avatarRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // 处理头像点击
  const handleAvatarClick = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  // 处理回到首页
  const handleGoHome = () => {
    navigate("/")
    setIsMenuOpen(false)
    messageApi.success(t('header.backToHome'))
  }

  // 处理设置
  const handleSettings = () => {
    messageApi.info(t('header.settingsComingSoon'))
    setIsMenuOpen(false)
  }

  // 处理退出登录
  const handleLogout = () => {
    messageApi.success(t('header.loggedOut'))
    setIsMenuOpen(false)
  }

  return (
    <header
      className="z-9999 flex justify-between items-center px-6 py-3 w-full backdrop-blur-md border-b bg-white/80 dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 border-slate-200/50 dark:border-slate-700/50 transition-all duration-300"
    >
      {/* Logo 区域 */}
      <div className="flex items-center gap-3">
        <div
          className={`
          p-1.5 rounded-xl
        
        `}
        >
          <img alt="logo" src={photoUrl || "/placeholder.svg"} className="h-9 w-9 rounded-lg object-cover" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
            {word}
          </span>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center gap-1">
        {/* 复制按钮 */}
        <button
          title={t('header.copyCode')}
          onClick={() => {
            copy(window.location.href)
            messageApi.success(t('header.shareLinkCopied'))
          }}
          className="p-2.5 rounded-xl transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 active:scale-95"
        >
          <Copy className="h-4.5 w-4.5" />
        </button>

        {/* 下载按钮 */}
        <button
          title={t('header.downloadCode')}
          onClick={async () => {
            try {
              await downloadFiles(files)
              messageApi.success(t('header.codeDownloaded'))
            } catch (error) {
              messageApi.error(t('header.downloadFailed'))
            }
          }}
          className="p-2.5 rounded-xl transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 active:scale-95"
        >
          <Download className="h-4.5 w-4.5" />
        </button>

        {/* 分隔线 */}
        <div className="w-px h-6 mx-2 bg-slate-200 dark:bg-slate-700" />

        {/* 语言切换按钮 */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 active:scale-95"
          aria-label={t('header.switchLanguage')}
          title={t('header.switchLanguage')}
        >
          <Languages className="h-4 w-4" />
          <span className="text-xs font-medium">{language === 'zh-CN' ? '中' : 'EN'}</span>
        </button>

        {/* 主题切换按钮 */}
        <button
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="p-2.5 rounded-xl transition-all duration-200 hover:bg-indigo-100 dark:hover:bg-amber-500/20 text-indigo-500 dark:text-amber-400 hover:text-indigo-600 dark:hover:text-amber-300 active:scale-95"
          aria-label={t('header.switchTheme')}
        >
          {theme === "light" ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
        </button>

        {/* 分隔线 */}
        <div className="w-px h-6 mx-2 bg-slate-200 dark:bg-slate-700" />

        {/* 用户头像和下拉菜单 */}
        <div className="relative" ref={avatarRef}>
          <button
            onClick={handleAvatarClick}
            className={`flex items-center gap-2 p-1.5 pr-3 rounded-xl transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 ${
              isMenuOpen ? "bg-slate-100 dark:bg-slate-700/50" : ""
            }`}
          >
            <div className="relative">
              <img
                src="/1.png"
                alt="Avatar"
                className="h-8 w-8 rounded-lg object-cover ring-2 ring-offset-1 ring-emerald-500/50"
              />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            </div>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 text-slate-500 dark:text-slate-400 ${
                isMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* 下拉菜单 */}
          {isMenuOpen && (
            <div
              ref={menuRef}
              className="absolute right-0 mt-2 w-52 rounded-xl shadow-xl py-2 z-9999 border backdrop-blur-md bg-white/95 dark:bg-slate-800/95 border-slate-200/50 dark:border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-200"
            >
              {/* 用户信息 */}
              <div className="px-4 py-3 mb-2 border-b border-slate-100 dark:border-slate-700/50">
                <p className="font-medium text-slate-900 dark:text-white">{t('header.username')}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">user@example.com</p>
              </div>

              <button
                className="flex items-center gap-3 px-4 py-2.5 text-sm w-full text-left transition-colors text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white"
                onClick={handleGoHome}
              >
                <Home className="h-4 w-4" />
                {t('header.goHome')}
              </button>

              <button
                className="flex items-center gap-3 px-4 py-2.5 text-sm w-full text-left transition-colors text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white"
                onClick={handleSettings}
              >
                <Settings className="h-4 w-4" />
                {t('header.settings')}
              </button>

              <div className="my-2 border-t border-slate-100 dark:border-slate-700/50" />

              <button
                className="flex items-center gap-3 px-4 py-2.5 text-sm w-full text-left transition-colors text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white"
                onClick={() => setIsMenuOpen(false)}
              >
                <X className="h-4 w-4" />
                {t('header.close')}
              </button>

              <button
                className={`
                  flex items-center gap-3 px-4 py-2.5 text-sm w-full text-left transition-colors
                  text-red-500 hover:bg-red-500/10
                `}
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                {t('header.logout')}
              </button>
            </div>
          )}
        </div>
      </div>

      {contextHolder}
    </header>
  )
}
