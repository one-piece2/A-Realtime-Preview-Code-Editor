import { useState } from "react"
import { useTheme, useLanguage } from "@/core/config"
import { useAuth } from "@/modules/auth"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Moon, Sun, Github, Code2, Users, Zap, Sparkles, Terminal, Eye, LogOut, Settings, User, Languages } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function Dashboard() {
  const { theme, toggleTheme } = useTheme()
  const { language, toggleLanguage } = useLanguage()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [activeButton, setActiveButton] = useState<string>("")
  const { user, logout } = useAuth()

  const handleCodeEditorClick = () => {
    setActiveButton("codeEditor")
    navigate("/editor/files")
  }

  const handleEditorWithFriendsClick = () => {
    setActiveButton("editorWithFriends")
    navigate("/rooms")
  }

  const handleLogout = () => {
    logout()
    navigate("/login", { replace: true })
  }

  const isDark = theme === "dark"

  return (
    <div className={`h-screen overflow-hidden transition-colors duration-500 flex flex-col ${isDark ? "bg-[#0a0a0f]" : "bg-[#fafafa]"}`}>
      {/* Header */}
      <header
        className={`sticky top-0 z-50 backdrop-blur-xl border-b transition-colors duration-300 ${
          isDark ? "bg-[#0a0a0f]/80 border-white/10" : "bg-white/80 border-black/5"
        }`}
      >
        <div className="flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                isDark
                  ? "bg-gradient-to-br from-emerald-500 to-cyan-500"
                  : "bg-gradient-to-br from-emerald-600 to-cyan-600"
              }`}
            >
              <img src="/onepiece.png" alt="logo" className="h-8 w-8" />
            </div>
            <div>
              <h1 className={`font-semibold text-lg tracking-tight ${isDark ? "text-white" : "text-gray-900"}`}>
                Code Editor
              </h1>
              <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className={`h-9 w-9 flex items-center justify-center rounded-lg transition-all duration-200 ${
                isDark
                  ? "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                  : "bg-black/5 hover:bg-black/10 text-gray-600 hover:text-gray-900"
              }`}
            >
              <Github className="h-4 w-4" />
            </a>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="focus:outline-none">
                  <Avatar className="h-9 w-9 ring-2 ring-offset-2 ring-offset-transparent ring-emerald-500/50 cursor-pointer hover:ring-emerald-400 transition-all">
                    <AvatarImage src={user?.githubAvatar || "/1.png"} alt="Avatar" />
                    <AvatarFallback className={isDark ? "bg-gray-800 text-white" : "bg-gray-200"}>
                      {user?.username?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className={`w-56 ${isDark ? "bg-[#1a1a1f] border-white/10" : "bg-white border-gray-200"}`}
              >
                <DropdownMenuLabel className={isDark ? "text-gray-300" : "text-gray-700"}>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.username || t('user.profile')}</p>
                    <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                      {user?.email || t('user.noEmail')}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className={isDark ? "bg-white/10" : "bg-gray-200"} />
                <DropdownMenuItem 
                  className={`cursor-pointer ${isDark ? "text-gray-300 focus:bg-white/10 focus:text-white" : "text-gray-700 focus:bg-gray-100"}`}
                  onClick={() => navigate("/profile")}
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>{t('user.profile')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className={`cursor-pointer ${isDark ? "text-gray-300 focus:bg-white/10 focus:text-white" : "text-gray-700 focus:bg-gray-100"}`}
                  onClick={() => navigate("/settings")}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>{t('user.settings')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className={isDark ? "bg-white/10" : "bg-gray-200"} />
                <DropdownMenuItem 
                  className="cursor-pointer text-red-500 focus:bg-red-500/10 focus:text-red-500"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('user.logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              onClick={toggleLanguage}
              className={`h-9 px-3 flex items-center justify-center gap-1.5 rounded-lg transition-all duration-200 ${
                isDark
                  ? "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                  : "bg-black/5 hover:bg-black/10 text-gray-600 hover:text-gray-900"
              }`}
              aria-label={t('header.switchLanguage')}
              title={t('header.switchLanguage')}
            >
              <Languages className="h-4 w-4" />
              <span className="text-xs font-medium">{language === 'zh-CN' ? '中' : 'EN'}</span>
            </button>

            <button
              onClick={toggleTheme}
              className={`h-9 w-9 flex items-center justify-center rounded-lg transition-all duration-200 ${
                isDark
                  ? "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                  : "bg-black/5 hover:bg-black/10 text-gray-600 hover:text-gray-900"
              }`}
              aria-label={theme === "light" ? t('header.switchTheme') : t('header.switchTheme')}
            >
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* 关键：Flex-1 占满剩余高度，不允许溢出 */}
      <div className="flex-1 flex">
        {/* Sidebar：固定宽度，内容不多无需滚动 */}
        <aside
          className={`w-72 border-r p-6 transition-colors duration-300 ${
            isDark ? "bg-[#0d0d12] border-white/5" : "bg-white border-gray-200"
          }`}
        >
          <div className="space-y-6">
            <div>
              <h2
                className={`text-xs font-medium uppercase tracking-wider mb-4 ${
                  isDark ? "text-gray-500" : "text-gray-400"
                }`}
              >
                {t('dashboard.editorOptions')}
              </h2>
              <div className="space-y-2">
                <button
                  onClick={handleCodeEditorClick}
                  className={`w-full h-14 rounded-xl font-medium transition-all duration-200 flex items-center gap-3 px-4 ${
                    activeButton === "codeEditor"
                      ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25"
                      : isDark
                        ? "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                  }`}
                >
                  <Terminal className="h-5 w-5" />
                  <span>{t('dashboard.codeEditor')}</span>
                </button>
                <button
                  onClick={handleEditorWithFriendsClick}
                  className={`w-full h-14 rounded-xl font-medium transition-all duration-200 flex items-center gap-3 px-4 ${
                    activeButton === "editorWithFriends"
                      ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25"
                      : isDark
                        ? "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                  }`}
                >
                  <Users className="h-5 w-5" />
                  <span>{t('dashboard.editorWithFriends')}</span>
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className={`rounded-xl p-4 ${isDark ? "bg-white/5" : "bg-gray-50"}`}>
              <p className={`text-xs font-medium mb-3 ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t('dashboard.quickStats')}</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{t('dashboard.projects')}</span>
                  <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>12</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>{t('dashboard.collaborators')}</span>
                  <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>5</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content：Flex-1 占满剩余宽度，内容自适应高度 */}
        <main className="flex-1 p-8 flex flex-col justify-between">
          <div className="max-w-4xl mx-auto w-full">
            {/* Welcome Section */}
            <div className="text-center mb-8">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-4 ${
                  isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                }`}
              >
                <Sparkles className="h-3 w-3" />
                {t('dashboard.welcomeBack')}
              </div>
              <h1 className={`text-3xl md:text-4xl font-bold mb-3 tracking-tight ${isDark ? "text-white" : "text-gray-900"}`}>
                {t('dashboard.title')}
              </h1>
              <p className={`text-base md:text-lg max-w-2xl mx-auto leading-relaxed ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                {t('dashboard.subtitle')}
              </p>
            </div>

            {/* Features Grid：自适应高度，不溢出 */}
            <div className="grid md:grid-cols-2 gap-4 mb-8 flex-grow">
              <Card
                className={`border transition-all duration-200 hover:scale-[1.02] flex flex-col ${
                  isDark
                    ? "bg-white/5 border-white/10 hover:border-white/20"
                    : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
                }`}
              >
                <CardHeader className="pb-2">
                  <div
                    className={`h-10 w-10 rounded-lg flex items-center justify-center mb-2 ${
                      isDark ? "bg-emerald-500/20" : "bg-emerald-100"
                    }`}
                  >
                    <Zap className={`h-5 w-5 ${isDark ? "text-emerald-400" : "text-emerald-600"}`} />
                  </div>
                  <CardTitle className={isDark ? "text-white" : "text-gray-900"}>{t('features.realTimeEditing')}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <CardDescription className={isDark ? "text-gray-400" : "text-gray-600"}>
                    {t('features.realTimeEditingDesc')}
                  </CardDescription>
                </CardContent>
              </Card>

              <Card
                className={`border transition-all duration-200 hover:scale-[1.02] flex flex-col ${
                  isDark
                    ? "bg-white/5 border-white/10 hover:border-white/20"
                    : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
                }`}
              >
                <CardHeader className="pb-2">
                  <div
                    className={`h-10 w-10 rounded-lg flex items-center justify-center mb-2 ${
                      isDark ? "bg-cyan-500/20" : "bg-cyan-100"
                    }`}
                  >
                    <Users className={`h-5 w-5 ${isDark ? "text-cyan-400" : "text-cyan-600"}`} />
                  </div>
                  <CardTitle className={isDark ? "text-white" : "text-gray-900"}>{t('features.collaboration')}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <CardDescription className={isDark ? "text-gray-400" : "text-gray-600"}>
                    {t('features.collaborationDesc')}
                  </CardDescription>
                </CardContent>
              </Card>

              <Card
                className={`border transition-all duration-200 hover:scale-[1.02] flex flex-col ${
                  isDark
                    ? "bg-white/5 border-white/10 hover:border-white/20"
                    : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
                }`}
              >
                <CardHeader className="pb-2">
                  <div
                    className={`h-10 w-10 rounded-lg flex items-center justify-center mb-2 ${
                      isDark ? "bg-amber-500/20" : "bg-amber-100"
                    }`}
                  >
                    <Code2 className={`h-5 w-5 ${isDark ? "text-amber-400" : "text-amber-600"}`} />
                  </div>
                  <CardTitle className={isDark ? "text-white" : "text-gray-900"}>{t('features.syntaxHighlighting')}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <CardDescription className={isDark ? "text-gray-400" : "text-gray-600"}>
                    {t('features.syntaxHighlightingDesc')}
                  </CardDescription>
                </CardContent>
              </Card>

              <Card
                className={`border transition-all duration-200 hover:scale-[1.02] flex flex-col ${
                  isDark
                    ? "bg-white/5 border-white/10 hover:border-white/20"
                    : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
                }`}
              >
                <CardHeader className="pb-2">
                  <div
                    className={`h-10 w-10 rounded-lg flex items-center justify-center mb-2 ${
                      isDark ? "bg-rose-500/20" : "bg-rose-100"
                    }`}
                  >
                    <Eye className={`h-5 w-5 ${isDark ? "text-rose-400" : "text-rose-600"}`} />
                  </div>
                  <CardTitle className={isDark ? "text-white" : "text-gray-900"}>{t('features.instantPreview')}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <CardDescription className={isDark ? "text-gray-400" : "text-gray-600"}>
                    {t('features.instantPreviewDesc')}
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* CTA Section：固定在底部，不随内容滚动 */}
          <div className="max-w-4xl mx-auto w-full mt-auto">
            <div
              className={`rounded-2xl p-6 text-center ${
                isDark
                  ? "bg-gradient-to-br from-emerald-500/10 via-cyan-500/10 to-transparent border border-white/10"
                  : "bg-gradient-to-br from-emerald-50 via-cyan-50 to-white border border-gray-200"
              }`}
            >
              <h3 className={`text-xl font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                {t('dashboard.readyToStart')}
              </h3>
              <p className={`mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                {t('dashboard.selectEditor')}
              </p>
              <Button
                onClick={handleCodeEditorClick}
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white shadow-lg shadow-emerald-500/25 h-11 px-6"
              >
                <Terminal className="h-4 w-4 mr-2" />
                {t('dashboard.openCodeEditor')}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}