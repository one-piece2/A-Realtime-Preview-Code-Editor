import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Moon, Sun, Github, Code2, Users, Zap, Sparkles, Terminal, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function Dashboard() {
  const [theme, setTheme] = useState<"light" | "dark">("dark")
  const navigate = useNavigate()
  const [activeButton, setActiveButton] = useState<string>("")

  const handleCodeEditorClick = () => {
    setActiveButton("codeEditor")
    navigate("/editor/files")
  }

  const handleEditorWithFriendsClick = () => {
    setActiveButton("editorWithFriends")
    navigate("/home")
  }

  const isDark = theme === "dark"

  return (
    <div className={`min-h-screen transition-colors duration-500 ${isDark ? "bg-[#0a0a0f]" : "bg-[#fafafa]"}`}>
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

            <Avatar className="h-9 w-9 ring-2 ring-offset-2 ring-offset-transparent ring-emerald-500/50">
              <AvatarImage src="/1.png" alt="Avatar" />
              <AvatarFallback className={isDark ? "bg-gray-800 text-white" : "bg-gray-200"}>U</AvatarFallback>
            </Avatar>

            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className={`h-9 w-9 flex items-center justify-center rounded-lg transition-all duration-200 ${
                isDark
                  ? "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                  : "bg-black/5 hover:bg-black/10 text-gray-600 hover:text-gray-900"
              }`}
              aria-label={theme === "light" ? "切换暗色主题" : "切换亮色主题"}
            >
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-64px)]">
        {/* Sidebar */}
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
                Editor Options
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
                  <span>Code Editor</span>
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
                  <span>Editor with Friends</span>
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className={`rounded-xl p-4 ${isDark ? "bg-white/5" : "bg-gray-50"}`}>
              <p className={`text-xs font-medium mb-3 ${isDark ? "text-gray-500" : "text-gray-400"}`}>Quick Stats</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Projects</span>
                  <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>12</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Collaborators</span>
                  <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>5</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-auto">
          <div className="max-w-4xl mx-auto">
            {/* Welcome Section */}
            <div className="text-center mb-12">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6 ${
                  isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                }`}
              >
                <Sparkles className="h-3 w-3" />
                Welcome back
              </div>
              <h1 className={`text-4xl font-bold mb-4 tracking-tight ${isDark ? "text-white" : "text-gray-900"}`}>
                Code Editor Dashboard
              </h1>
              <p className={`text-lg max-w-2xl mx-auto leading-relaxed ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                Choose an editor option from the left panel to get started. Create amazing code with our powerful
                editors or collaborate with friends in real-time.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <Card
                className={`border transition-all duration-200 hover:scale-[1.02] ${
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
                  <CardTitle className={isDark ? "text-white" : "text-gray-900"}>Real-time Editing</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className={isDark ? "text-gray-400" : "text-gray-600"}>
                    Experience lightning-fast code editing with instant feedback and auto-save functionality.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card
                className={`border transition-all duration-200 hover:scale-[1.02] ${
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
                  <CardTitle className={isDark ? "text-white" : "text-gray-900"}>Collaboration</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className={isDark ? "text-gray-400" : "text-gray-600"}>
                    Work together with your team in real-time with live cursors and instant sync.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card
                className={`border transition-all duration-200 hover:scale-[1.02] ${
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
                  <CardTitle className={isDark ? "text-white" : "text-gray-900"}>Syntax Highlighting</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className={isDark ? "text-gray-400" : "text-gray-600"}>
                    Support for multiple programming languages with beautiful syntax highlighting.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card
                className={`border transition-all duration-200 hover:scale-[1.02] ${
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
                  <CardTitle className={isDark ? "text-white" : "text-gray-900"}>Instant Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className={isDark ? "text-gray-400" : "text-gray-600"}>
                    See your changes come to life instantly with our built-in preview functionality.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>

            {/* CTA Section */}
            <div
              className={`rounded-2xl p-8 text-center ${
                isDark
                  ? "bg-gradient-to-br from-emerald-500/10 via-cyan-500/10 to-transparent border border-white/10"
                  : "bg-gradient-to-br from-emerald-50 via-cyan-50 to-white border border-gray-200"
              }`}
            >
              <h3 className={`text-xl font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                Ready to start coding?
              </h3>
              <p className={`mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                Select an editor from the sidebar to begin your coding journey.
              </p>
              <Button
                onClick={handleCodeEditorClick}
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white shadow-lg shadow-emerald-500/25 h-11 px-6"
              >
                <Terminal className="h-4 w-4 mr-2" />
                Open Code Editor
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
