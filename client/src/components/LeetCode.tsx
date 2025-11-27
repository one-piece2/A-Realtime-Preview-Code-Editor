

import { useContext, useState } from "react"
import { PlaygroundContext } from "../Context/playgroundcontent"
import {
  Play,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Hash,
  Type,
  SlidersHorizontal,
  TrendingUp,
  Users,
} from "lucide-react"

// 实现无重复字符的最长子串算法
function lengthOfLongestSubstring(s: string): number {
  const charSet = new Set<string>()
  let left = 0
  let maxLength = 0

  for (let right = 0; right < s.length; right++) {
    while (charSet.has(s[right])) {
      charSet.delete(s[left])
      left++
    }
    charSet.add(s[right])
    maxLength = Math.max(maxLength, right - left + 1)
  }

  return maxLength
}

// 可视化算法过程的函数
function visualizeAlgorithm(s: string): { step: string; window: string; length: number }[] {
  const steps = []
  const charSet = new Set<string>()
  let left = 0
  let maxLength = 0

  for (let right = 0; right < s.length; right++) {
    const currentWindow = s.substring(left, right + 1)

    if (charSet.has(s[right])) {
      steps.push({
        step: `发现重复字符 '${s[right]}'，移除窗口中重复字符及其之前的字符`,
        window: currentWindow,
        length: right - left + 1,
      })

      while (charSet.has(s[right])) {
        charSet.delete(s[left])
        left++
      }
    } else {
      steps.push({
        step: `将字符 '${s[right]}' 添加到窗口`,
        window: currentWindow,
        length: right - left + 1,
      })
    }

    charSet.add(s[right])
    maxLength = Math.max(maxLength, right - left + 1)

    steps.push({
      step: `当前窗口: '${s.substring(left, right + 1)}'，当前长度: ${right - left + 1}，最长长度: ${maxLength}`,
      window: s.substring(left, right + 1),
      length: maxLength,
    })
  }

  return steps
}

export default function LeetCode() {
  const { theme } = useContext(PlaygroundContext)
  const [inputValue, setInputValue] = useState<string>("abcabcbb")
  const [result, setResult] = useState<number | null>(null)
  const [algorithmSteps, setAlgorithmSteps] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const isDark = theme === "dark"

  const handleCalculate = () => {
    try {
      const res = lengthOfLongestSubstring(inputValue)
      setResult(res)
      setAlgorithmSteps(visualizeAlgorithm(inputValue))
      setError(null)
    } catch (err) {
      setError("计算过程中出现错误，请检查输入")
      setResult(null)
      setAlgorithmSteps([])
    }
  }

  return (
    <div
      className={`h-screen overflow-y-auto scrollbar-hide transition-colors duration-300 ${
        isDark ? "bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-900"
      }`}
      style={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {/* 题目头部 */}
      <header
        className={`sticky top-0 z-50 backdrop-blur-xl border-b ${
          isDark ? "bg-gray-900/80 border-gray-800" : "bg-white/80 border-gray-200"
        }`}
      >
        <div className="max-w-4xl mx-auto px-6 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <h1 className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-gray-900"}`}>
                3. 无重复字符的最长子串
              </h1>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    isDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  中等
                </span>
                <div className="flex items-center gap-2">
                  {[
                    { icon: Hash, label: "哈希表" },
                    { icon: Type, label: "字符串" },
                    { icon: SlidersHorizontal, label: "滑动窗口" },
                  ].map((tag, i) => (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        isDark
                          ? "bg-gray-800 text-gray-400 hover:bg-gray-700"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <tag.icon className="w-3 h-3" />
                      {tag.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className={`flex items-center gap-4 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                <span>45.8%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>4M+</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* 交互式输入区域 */}
        <section
          className={`rounded-2xl border p-6 ${
            isDark ? "bg-gray-900/50 border-gray-800" : "bg-white border-gray-200 shadow-sm"
          }`}
        >
          <h2
            className={`text-lg font-semibold mb-5 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}
          >
            <Play className="w-5 h-5 text-emerald-500" />
            解决问题
          </h2>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>输入字符串</label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value)
                  setError(null)
                }}
                placeholder="请输入一个字符串"
                maxLength={100}
                className={`w-full px-4 py-3 rounded-xl text-base font-mono transition-all outline-none ${
                  isDark
                    ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                } border`}
              />
            </div>

            <button
              onClick={handleCalculate}
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              计算最长无重复子串长度
            </button>

            {/* 错误提示 */}
            {error && (
              <div
                className={`flex items-start gap-3 p-4 rounded-xl ${
                  isDark ? "bg-red-500/10 border border-red-500/20" : "bg-red-50 border border-red-200"
                }`}
              >
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className={`font-medium ${isDark ? "text-red-400" : "text-red-700"}`}>错误</p>
                  <p className={`text-sm mt-0.5 ${isDark ? "text-red-400/80" : "text-red-600"}`}>{error}</p>
                </div>
              </div>
            )}

            {/* 成功结果 */}
            {result !== null && (
              <div
                className={`flex items-start gap-3 p-4 rounded-xl ${
                  isDark ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-emerald-50 border border-emerald-200"
                }`}
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className={`font-medium ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>计算结果</p>
                  <p className={`text-sm mt-0.5 ${isDark ? "text-emerald-400/80" : "text-emerald-600"}`}>
                    无重复字符的最长子串长度为: <span className="font-bold text-lg">{result}</span>
                  </p>
                </div>
              </div>
            )}

            {/* 算法步骤 */}
            {algorithmSteps.length > 0 && (
              <div className={`rounded-xl p-5 ${isDark ? "bg-gray-800/50" : "bg-gray-50"}`}>
                <h3 className={`font-semibold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                  <ChevronRight className="w-4 h-4 text-blue-500" />
                  算法执行步骤
                </h3>
                <div
                  className={`max-h-64 overflow-y-auto space-y-2 pr-2 rounded-lg ${
                    isDark ? "scrollbar-thin scrollbar-thumb-gray-700" : "scrollbar-thin scrollbar-thumb-gray-300"
                  }`}
                >
                  {algorithmSteps.map((step, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg text-sm ${
                        isDark ? "bg-gray-900/80 text-gray-300" : "bg-white text-gray-600 shadow-sm"
                      }`}
                    >
                      <span className={`font-medium ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                        步骤 {index + 1}:
                      </span>{" "}
                      {step.step}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 题目描述 */}
        <section
          className={`rounded-2xl border p-6 ${
            isDark ? "bg-gray-900/50 border-gray-800" : "bg-white border-gray-200 shadow-sm"
          }`}
        >
          <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>题目描述</h2>
          <p className={`leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>
            给定一个字符串{" "}
            <code
              className={`px-1.5 py-0.5 rounded font-mono text-sm ${
                isDark ? "bg-gray-800 text-blue-400" : "bg-gray-100 text-blue-600"
              }`}
            >
              s
            </code>
            ，请你找出其中不含有重复字符的最长子串的长度。
          </p>
        </section>

        {/* 示例 */}
        <section
          className={`rounded-2xl border p-6 space-y-6 ${
            isDark ? "bg-gray-900/50 border-gray-800" : "bg-white border-gray-200 shadow-sm"
          }`}
        >
          {[
            {
              input: "abcabcbb",
              output: "3",
              explanation: '因为无重复字符的最长子串是 "abc"，所以其长度为 3。注意 "bca" 和 "cab" 也是正确答案。',
            },
            { input: "bbbbb", output: "1", explanation: '因为无重复字符的最长子串是 "b"，所以其长度为 1。' },
            {
              input: "pwwkew",
              output: "3",
              explanation:
                '因为无重复字符的最长子串是 "wke"，所以其长度为 3。请注意，你的答案必须是子串的长度，"pwke" 是一个子序列，不是子串。',
            },
          ].map((example, index) => (
            <div key={index} className="space-y-3">
              <h3 className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>示例 {index + 1}</h3>
              <div className={`rounded-xl p-4 space-y-3 ${isDark ? "bg-gray-800/50" : "bg-gray-50"}`}>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium w-12 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    输入:
                  </span>
                  <code
                    className={`flex-1 px-3 py-2 rounded-lg font-mono text-sm ${
                      isDark ? "bg-gray-900 text-emerald-400" : "bg-white text-emerald-600 shadow-sm"
                    }`}
                  >
                    s = "{example.input}"
                  </code>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium w-12 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    输出:
                  </span>
                  <code
                    className={`flex-1 px-3 py-2 rounded-lg font-mono text-sm ${
                      isDark ? "bg-gray-900 text-amber-400" : "bg-white text-amber-600 shadow-sm"
                    }`}
                  >
                    {example.output}
                  </code>
                </div>
                <p className={`text-sm leading-relaxed pt-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  <span className="font-medium">解释: </span>
                  {example.explanation}
                </p>
              </div>
            </div>
          ))}
        </section>

        {/* 提示 */}
        <section
          className={`rounded-2xl border p-6 ${
            isDark ? "bg-gray-900/50 border-gray-800" : "bg-white border-gray-200 shadow-sm"
          }`}
        >
          <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>提示</h2>
          <ul className="space-y-2">
            <li className={`flex items-center gap-2 text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isDark ? "bg-blue-500" : "bg-blue-600"}`} />0 ≤
              s.length ≤ 5 × 10<sup>4</sup>
            </li>
            <li className={`flex items-center gap-2 text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isDark ? "bg-blue-500" : "bg-blue-600"}`} />s
              由英文字母、数字、符号和空格组成
            </li>
          </ul>
        </section>
      </main>
    </div>
  )
}
