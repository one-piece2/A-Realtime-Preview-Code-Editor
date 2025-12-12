

import type React from "react"

import { useState } from "react"
import { v4 as uuidv4 } from "uuid"
import { message } from "antd"
import { useNavigate } from "react-router-dom"
import { Code2, Users, Sparkles, ArrowRight, Terminal, Zap, Globe } from "lucide-react"

const Home = () => {
  const [messageApi, contextHolder] = message.useMessage()
  const [roomId, setRoomId] = useState<string>("")
  const [username, setUsername] = useState<string>("")
  const navigate = useNavigate()

  const createNewRoom = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const id = uuidv4()
    console.log(id)
    setRoomId(id)
    messageApi.open({
      type: "success",
      content: "Created a new room",
    })
  }

  const joinRoom = () => {
    if (!roomId || !username) {
      messageApi.open({
        type: "error",
        content: "ROOM ID & username is Required",
      })
      return
    }
    navigate(`/editor/${roomId}`, {
      state: {
        username,
      },
    })
  }

  const handleInputEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.code === "Enter") {
      joinRoom()
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden relative">
      {contextHolder}

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
        <div
          className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-glow"
          style={{ animationDelay: "1.5s" }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(var(--color-foreground) 1px, transparent 1px),
                           linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        {/* Header section */}
        <div className="text-center mb-12 animate-float">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Real-time collaboration</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-4 text-balance">
            Code with{" "}
            <span className="text-primary relative">
              Friends
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none">
                <path
                  d="M2 10C50 4 150 4 198 10"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="text-primary/50"
                />
              </svg>
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-md mx-auto text-pretty">
            Collaborative code editor for seamless pair programming and team coding sessions
          </p>
        </div>

        {/* Features badges */}
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          {[
            { icon: Terminal, text: "Real-time sync" },
            { icon: Users, text: "Multi-user" },
            { icon: Zap, text: "Instant" },
            { icon: Globe, text: "Anywhere" },
          ].map((feature, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50 text-sm text-muted-foreground"
            >
              <feature.icon className="w-3.5 h-3.5 text-primary" />
              {feature.text}
            </div>
          ))}
        </div>

        {/* Main card */}
        <div className="w-full max-w-md">
          <div className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-8 shadow-2xl shadow-primary/5">
            {/* Logo area */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                <div className="relative w-20 h-20 bg-muted rounded-2xl border border-border flex items-center justify-center">
               <img src="/onepiece.png" alt="logo" className="w-20 h-20" />
                </div>
              </div>
            </div>

            <h2 className="text-xl font-semibold text-center mb-2 text-foreground">Join a Session</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Enter your room ID and username to start coding
            </p>

            {/* Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Room ID</label>
                <input
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  type="text"
                  autoComplete="off"
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 font-mono text-sm"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  type="text"
                  autoComplete="off"
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 text-sm"
                  placeholder="Enter your username"
                  onKeyUp={handleInputEnter}
                />
              </div>

              <button
                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-all duration-200 group"
                onClick={joinRoom}
              >
                Join Room
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Create new room */}
            <p className="text-center text-sm text-muted-foreground">
              Don't have an invite?{" "}
              <a
                onClick={createNewRoom}
                href=""
                className="text-primary text-xl hover:underline underline-offset-4 transition-colors font-bold"
              >
                Create a new room
              </a>
            </p>
          </div>

      
        
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Built with <span className="text-red-500 animate-pulse inline-block">❤️</span> by{" "}
          <a
            href="https://www.google.com/search?sca_esv=8994b4a378b58ce1&sxsrf=AE3TifOpUrVKyyzfATXIWXA-Pg69gXdp2g:1763540161843&udm=2&fbs=AIIjpHybaGNnaZw_4TckIDK59RtxzhN-zPLOQlOthwdFc1z8xdIAyg6_Ea865cNowKrZE6NSTLBfFrq-gxzZeTs5ToMTBmV283UPaENpTjrvARNPv_qIFy_HKftDQO2-rnZIb1uvjz_Z9RIhaM27HZ1aJ5uP1PPpyBDXTwbzjA7cqwe9SdD9AfKnweFdvW7s0EY4wdiSDRZSRUNgnXr3tAIcpgBJmbExeA&q=%E6%B5%B7%E8%B4%BC%E7%8E%8B%E5%90%A7&sa=X&ved=2ahUKEwj1_JKH4_2QAxWLs1YBHer2HYoQtKgLegQIFRAB&biw=1707&bih=825&dpr=2.25#vhid=8G4C5ZT15-KAnM&vssid=mosaic"
            className="text-primary hover:underline underline-offset-4 font-medium transition-colors"
          >
            lyy
          </a>
        </p>
      </footer>
    </div>
  )
}

export default Home
