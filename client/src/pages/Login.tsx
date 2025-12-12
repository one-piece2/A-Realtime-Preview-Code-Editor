
import { useState, type FormEvent } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Github, Mail, Lock, Loader2, Anchor, Skull } from "lucide-react"
import { useAuth, loginWithGitHub } from "@/modules/auth"
function PirateSkull() {
  return (
    <div className="relative w-16 h-16">
      <Skull className="w-14 h-14 text-primary drop-shadow-[0_0_15px_rgba(255,215,0,0.6)]" strokeWidth={1.5} />
    </div>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const { login, authError, clearAuthError } = useAuth()
  const [formData, setFormData] = useState({ email: "", password: "" })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = "请输入邮箱"
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "邮箱格式不正确"
    }

    if (!formData.password) {
      newErrors.password = "请输入密码"
    } else if (formData.password.length < 6) {
      newErrors.password = "密码至少需要6个字符"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setGlobalError("")

    if (!validateForm()) return

    setIsLoading(true)

    try {
      await login(formData.email, formData.password)
      navigate("/", { replace: true })
    } catch (error) {
      setGlobalError("登录失败，请稍后重试")
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
    if (globalError) {
      setGlobalError("")
    }
  }

  const handleGitHubLogin = () => {
    loginWithGitHub()
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* 背景图片 + 虚化 */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/one-piece-bg-login.jpg')" }}
      />
      <div className="absolute inset-0 bg-background/70 backdrop-blur-md" />

      {/* 居中的登录卡片 */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo and Brand */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <PirateSkull />
          </div>
          <h1 className="text-4xl font-black tracking-wider text-primary drop-shadow-[0_0_15px_rgba(255,215,0,0.4)]">
            LUXIE
          </h1>
          <p className="text-muted-foreground mt-1 text-sm tracking-wide"></p>
        </div>

        {/* Card with glassmorphism effect */}
        <div className="bg-card/60 backdrop-blur-xl border border-border/30 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 显示认证错误（如 token 过期） */}
            {authError && (
              <div className="p-3 text-sm text-amber-500 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skull className="w-4 h-4" />
                  {authError}
                </div>
                <button 
                  onClick={clearAuthError} 
                  className="text-amber-500/70 hover:text-amber-500 text-xs"
                >
                  ×
                </button>
              </div>
            )}

            {/* 显示登录表单错误 */}
            {globalError && (
              <div className="p-3 text-sm text-accent bg-accent/10 border border-accent/30 rounded-lg flex items-center gap-2">
                <Skull className="w-4 h-4" />
                {globalError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground/80 text-sm font-medium">
                邮箱
              </Label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="email"
                  type="email"
                  placeholder="captain@onepiece.com"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className={`pl-11 h-12 bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-primary/20 transition-all ${errors.email ? "border-accent focus:ring-accent/20" : ""}`}
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-accent flex items-center gap-1">
                  <Skull className="w-3 h-3" />
                  {errors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground/80 text-sm font-medium">
                密码
              </Label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  className={`pl-11 pr-11 h-12 bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-primary/20 transition-all ${errors.password ? "border-accent focus:ring-accent/20" : ""}`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm  flex items-center gap-1 text-red-500">
                  <Skull className="w-3 h-3" />
                  {errors.password}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base tracking-wide shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:shadow-[0_0_30px_rgba(255,215,0,0.5)] transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  登录中...
                </>
              ) : (
                <>
                  <Anchor className="mr-2 h-5 w-5" />
                  登录
                </>
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card/60 px-4 text-xs text-muted-foreground uppercase tracking-widest">或者</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full h-12 bg-secondary/30 border-border/50 text-foreground hover:bg-secondary/50 hover:border-primary/50 transition-all"
            onClick={handleGitHubLogin}
            disabled={isLoading}
          >
            <Github className="mr-2 h-5 w-5" />
            使用 GitHub 登录
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            没有账号？{" "}
            <Link
              to="/register"
              className="text-primary hover:text-primary/80 font-semibold hover:underline transition-colors"
            >
              注册一个
            </Link>
          </p>
        </div>

        {/* Footer quote */}
        <p className="text-center text-xs text-foreground/40 mt-6 italic">{'one-piece！"'}</p>
      </div>
    </div>
  )
}
