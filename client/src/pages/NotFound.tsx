"use client"

import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Home, ArrowLeft, Skull } from "lucide-react"

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 relative overflow-hidden">
      {/* 背景图片 + 虚化 */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/one-piece-bg-404.jpg')" }}
      />
      <div className="absolute inset-0 bg-background/75 backdrop-blur-lg" />

      <div className="text-center relative z-10">
        {/* 404 with pirate styling */}
        <div className="relative mb-6">
          <div className="flex items-center justify-center gap-2">
            <span className="text-8xl md:text-9xl font-black text-primary drop-shadow-[0_0_20px_rgba(255,215,0,0.4)]">
              4
            </span>
            <div className="relative">
              <Skull className="w-20 h-20 md:w-24 md:h-24 text-primary drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]" />
            </div>
            <span className="text-8xl md:text-9xl font-black text-primary drop-shadow-[0_0_20px_rgba(255,215,0,0.4)]">
              4
            </span>
          </div>
        </div>

        <div className="h-1 w-32 bg-primary/30 mx-auto mb-6 rounded-full" />

        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">迷失在大海中了！</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
         
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="h-12 px-6 bg-secondary/30 border-border/50 text-foreground hover:bg-secondary/50 hover:border-primary/50 transition-all"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            返回上一站
          </Button>
          <Button
            onClick={() => navigate("/")}
            className="h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:shadow-[0_0_30px_rgba(255,215,0,0.5)] transition-all"
          >
            <Home className="w-5 h-5 mr-2" />
            返回首页
          </Button>
        </div>

        <p className="text-xs text-foreground/40 mt-10 italic">{'"迷路也是冒险的一部分！"'}</p>
      </div>
    </div>
  )
}
