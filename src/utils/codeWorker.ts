type MessageType = "log" | "error" | "success" | "run";
export interface Message {
  type: MessageType;
  Output?: any[];
  result?: any;
  Code: string;
}

self.onmessage = function (e: MessageEvent<Message>) {
  const { type, Code } = e.data;
  if (type === "run") {
    try {
      const output: any[] = [];
      try {
        // 捕获 console 输出并转发到主线程
        const originalLog = console.log;
        //重新定义console.log，将输出内容发送到主线程
        //意义：用户在代码中使用console.log时，能够在主线程中看到输出内容。
        console.log = function (...args) {
          output.push(...args);

          originalLog(...args);
        };

        // 执行代码
        const result = eval(Code); // 使用 eval 执行传递的代码
        postMessage({
          type: "success",
          Output: output,
          result: result === undefined ? "undefined" : result,
        });
      } catch (error) {
        throw error;
      }
    } catch (error) {
      postMessage({
        type: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
};
class ProxyConsole {
  methods: string[] = [];
  constructor() {
    this.methods = [
      "debug",
      "info",
      "warn",
      "error",
      "log",
      "dir",
      "dirxml",
      "table",
      "trace",
      "group",
      "groupCollapsed",
      "groupEnd",
      "clear",
      "count",
      "countReset",
      "assert",
      "profile",
      "profileEnd",
      "time",
      "timeEnd",
      "timeLog",
      "memory",
      "context",
      "exception",
      "groupEnd",
      "groupCollapsed",
      "groupEnd",
      "groupCollapsed",
      "groupEnd",
      "groupCollapsed",
      "groupEnd",
      "groupCollapsed",
      "groupEnd",
      "groupCollapsed",
      "groupEnd",
      "groupCollapsed",
      "groupEnd",
      "groupCollapsed",
      "groupEnd",
      "groupCollapsed",
      "groupEnd",
      "groupCollapsed",
      "groupEnd",
      "groupCollapsed",
      "groupEnd",
      "groupCollapsed",
    ];
  }
}
