import { useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Ship } from "lucide-react"
import { useAuth } from "@/Context/AuthContext/useAuth"
import { type AuthResponse } from "@/api/auth/types"

function LoadingShip() {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-28 h-28 border-4 border-primary/20 rounded-full" />
        <div className="absolute w-28 h-28 border-4 border-transparent border-t-primary rounded-full animate-spin" />
      </div>
      <Ship className="w-12 h-12 text-primary drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]" />
    </div>
  )
}

export default function AuthCallback() {
  const navigate = useNavigate()  
  const { setAuthState } = useAuth()
  //获取url参数 token
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const tokensParam = searchParams.get("tokens")

    if (tokensParam) {
      try {
        const tokens = JSON.parse(decodeURIComponent(tokensParam)) as AuthResponse
        const token = tokens?.accessToken
        const user = tokens?.user
        const refreshToken = tokens?.refreshToken

        if (token && user && refreshToken) {
          // 使用 AuthContext 的 setAuthState 同时更新 localStorage 和 Context 状态
          setAuthState(token, user, refreshToken)
          navigate("/", { replace: true })
          return
        }
      } catch (error) {
        console.error("Failed to parse tokens from callback:", error)
      }
    }

    // 解析失败或缺少必要数据，回退到登录页
    navigate("/login", { replace: true })
  }, [searchParams, navigate, setAuthState])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative overflow-hidden">
      {/* 背景图片 + 虚化 */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/one-piece-bg-callback.jpg')" }}
      />
      <div className="absolute inset-0 bg-background/75 backdrop-blur-lg" />

      <div className="text-center relative z-10">
        <div className="mb-8 flex justify-center">
          <LoadingShip />
        </div>

        <h1 className="text-3xl font-black text-primary mb-3 tracking-wider drop-shadow-[0_0_15px_rgba(255,215,0,0.4)]">
          LUXIE
        </h1>

        <div className="space-y-2">
          <p className="text-xl font-semibold text-foreground">正在登录...</p>
          <p className="text-sm text-muted-foreground">船长正在确认你的身份</p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-8">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.2s" }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.4s" }} />
        </div>

        <p className="text-xs text-foreground/40 mt-8 italic">{'"冒险还在继续..."'}</p>
      </div>
    </div>
  )
}
