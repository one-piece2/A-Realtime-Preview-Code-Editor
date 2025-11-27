"use client"

import type { HeaderProps } from "../types/types"
import { Moon, Sun, Copy, Download, Settings, Home, LogOut, X, ChevronDown } from "lucide-react"
import copy from "copy-to-clipboard"
import { downloadFiles } from "../utils/loadandcompress"
import { PlaygroundContext } from "../Context/playgroundcontent"
import { useContext, useState, useEffect, useRef } from "react"
import {  useNavigate } from "react-router-dom"
import { message } from "antd"

export default function Header(props: HeaderProps) {
  const { word, photoUrl } = props
  const { theme, setTheme, files } = useContext(PlaygroundContext)
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
    messageApi.success("已回到首页")
  }

  // 处理设置
  const handleSettings = () => {
    messageApi.info("设置功能即将上线")
    setIsMenuOpen(false)
  }

  // 处理退出登录
  const handleLogout = () => {
    messageApi.success("已退出登录")
    setIsMenuOpen(false)
  }

  return (
    <header
      className={`
        z-9999
        flex justify-between items-center px-6 py-3 w-full
        backdrop-blur-md border-b
        ${
          theme === "dark"
            ? "bg-slate-900/80 text-slate-100 border-slate-700/50"
            : "bg-white/80 text-slate-800 border-slate-200/50"
        }
        transition-all duration-300
      `}
    >
      {/* Logo 区域 */}
      <div className="flex items-center gap-3">
        <div
          className={`
          p-1.5 rounded-xl
          ${theme === "dark" ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20" : "bg-gradient-to-br from-amber-100 to-orange-100"}
        `}
        >
          <img alt="logo" src={photoUrl || "/placeholder.svg"} className="h-9 w-9 rounded-lg object-cover" />
        </div>
        <div className="flex flex-col">
          <span
            className={`
            font-bold text-lg tracking-tight
            ${theme === "dark" ? "text-white" : "text-slate-900"}
          `}
          >
            {word}
          </span>
         
        </div>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center gap-1">
        {/* 复制按钮 */}
        <button
          title="复制当前代码"
          onClick={() => {
            copy(window.location.href)
            messageApi.success("分享链接已复制。")
          }}
          className={`
            p-2.5 rounded-xl transition-all duration-200
            ${
              theme === "dark"
                ? "hover:bg-slate-700/50 text-slate-400 hover:text-slate-200"
                : "hover:bg-slate-100 text-slate-500 hover:text-slate-700"
            }
            active:scale-95
          `}
        >
          <Copy className="h-4.5 w-4.5" />
        </button>

        {/* 下载按钮 */}
        <button
          title="下载当前代码"
          onClick={async () => {
            try {
              await downloadFiles(files)
              messageApi.success("代码已下载。")
            } catch (error) {
              messageApi.error("下载失败，请稀后重试。")
            }
          }}
          className={`
            p-2.5 rounded-xl transition-all duration-200
            ${
              theme === "dark"
                ? "hover:bg-slate-700/50 text-slate-400 hover:text-slate-200"
                : "hover:bg-slate-100 text-slate-500 hover:text-slate-700"
            }
            active:scale-95
          `}
        >
          <Download className="h-4.5 w-4.5" />
        </button>

        {/* 分隔线 */}
        <div
          className={`
          w-px h-6 mx-2
          ${theme === "dark" ? "bg-slate-700" : "bg-slate-200"}
        `}
        />

        {/* 主题切换按钮 */}
        <button
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className={`
            p-2.5 rounded-xl transition-all duration-200
            ${
              theme === "dark"
                ? "hover:bg-amber-500/20 text-amber-400 hover:text-amber-300"
                : "hover:bg-indigo-100 text-indigo-500 hover:text-indigo-600"
            }
            active:scale-95
          `}
          aria-label={theme === "light" ? "切换暗色主题" : "切换亮色主题"}
        >
          {theme === "light" ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
        </button>

        {/* 分隔线 */}
        <div
          className={`
          w-px h-6 mx-2
          ${theme === "dark" ? "bg-slate-700" : "bg-slate-200"}
        `}
        />

        {/* 用户头像和下拉菜单 */}
        <div className="relative" ref={avatarRef}>
          <button
            onClick={handleAvatarClick}
            className={`
              flex items-center gap-2 p-1.5 pr-3 rounded-xl transition-all duration-200
              ${theme === "dark" ? "hover:bg-slate-700/50" : "hover:bg-slate-100"}
              ${isMenuOpen ? (theme === "dark" ? "bg-slate-700/50" : "bg-slate-100") : ""}
            `}
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
              className={`
              h-4 w-4 transition-transform duration-200
              ${theme === "dark" ? "text-slate-400" : "text-slate-500"}
              ${isMenuOpen ? "rotate-180" : ""}
            `}
            />
          </button>

          {/* 下拉菜单 */}
          {isMenuOpen && (
            <div
              ref={menuRef}
              className={`
                absolute right-0 mt-2 w-52 rounded-xl shadow-xl py-2 z-9999
                border backdrop-blur-md
                ${theme === "dark" ? "bg-slate-800/95 border-slate-700/50" : "bg-white/95 border-slate-200/50"}
                animate-in fade-in slide-in-from-top-2 duration-200
              `}
            >
              {/* 用户信息 */}
              <div
                className={`
                px-4 py-3 mb-2 border-b
                ${theme === "dark" ? "border-slate-700/50" : "border-slate-100"}
              `}
              >
                <p className={`font-medium ${theme === "dark" ? "text-white" : "text-slate-900"}`}>用户名</p>
                <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>user@example.com</p>
              </div>

              <button
                className={`
                  flex items-center gap-3 px-4 py-2.5 text-sm w-full text-left transition-colors
                  ${
                    theme === "dark"
                      ? "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }
                `}
                onClick={handleGoHome}
              >
                <Home className="h-4 w-4" />
                回到首页
              </button>

              <button
                className={`
                  flex items-center gap-3 px-4 py-2.5 text-sm w-full text-left transition-colors
                  ${
                    theme === "dark"
                      ? "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }
                `}
                onClick={handleSettings}
              >
                <Settings className="h-4 w-4" />
                设置
              </button>

              <div
                className={`
                my-2 border-t
                ${theme === "dark" ? "border-slate-700/50" : "border-slate-100"}
              `}
              />

              <button
                className={`
                  flex items-center gap-3 px-4 py-2.5 text-sm w-full text-left transition-colors
                  ${
                    theme === "dark"
                      ? "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }
                `}
                onClick={() => setIsMenuOpen(false)}
              >
                <X className="h-4 w-4" />
                关闭
              </button>

              <button
                className={`
                  flex items-center gap-3 px-4 py-2.5 text-sm w-full text-left transition-colors
                  text-red-500 hover:bg-red-500/10
                `}
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>

      {contextHolder}
    </header>
  )
}
