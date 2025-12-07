import { type Files } from '../types/types'
import { fileName2Language } from '../utils/judgeLangyage'

// 导入新模板文件（使用 ?raw 导入原始内容）
import appTsx from '../../code-start/react-ts/src/App.tsx?raw'
import indexTsx from '../../code-start/react-ts/src/index.tsx?raw'
import styleCss from '../../code-start/react-ts/src/style.css?raw'
import indexHtml from '../../code-start/react-ts/public/index.html?raw'
import packageJson from '../../code-start/react-ts/package.json?raw'
import tsconfigJson from '../../code-start/react-ts/tsconfig.json?raw'

// app 文件名
export const APP_COMPONENT_FILE_NAME = 'src/App.tsx'
// esm 模块映射文件名
export const IMPORT_MAP_FILE_NAME = 'import-map.json'
// app 入口文件名
export const ENTRY_FILE_NAME = 'src/index.tsx'

// 创建 import-map.json 内容（基于 package.json 的依赖）
const createImportMap = (): string => {
  try {
    const pkg = JSON.parse(packageJson)
    const dependencies = pkg.dependencies || {}
    
    // 创建 import map，使用 CDN 链接
    const imports: Record<string, string> = {
      'react': 'https://esm.sh/react@18',
      'react-dom': 'https://esm.sh/react-dom@18',
      'react-dom/client': 'https://esm.sh/react-dom@18/client'
    }
    
    // 添加其他依赖
    Object.keys(dependencies).forEach(dep => {
      if (!imports[dep]) {
        imports[dep] = `https://esm.sh/${dep}@${dependencies[dep].replace(/[\^~]/g, '')}`
      }
    })

    return JSON.stringify({ imports }, null, 2)
  
  } catch (e) {
    // 如果解析失败，返回默认的 import map
    return JSON.stringify({
      imports: {
        'react': 'https://esm.sh/react@18',
        'react-dom': 'https://esm.sh/react-dom@18',
        'react-dom/client': 'https://esm.sh/react-dom@18/client'
      }
    }, null, 2)
  }
}

export const initFiles: Files = {
  // 入口文件
  [ENTRY_FILE_NAME]: {
    name: ENTRY_FILE_NAME,
    language: fileName2Language(ENTRY_FILE_NAME),
    value: indexTsx,
  },
  // App 组件
  [APP_COMPONENT_FILE_NAME]: {
    name: APP_COMPONENT_FILE_NAME,
    language: fileName2Language(APP_COMPONENT_FILE_NAME),
    value: appTsx,
  },
  // 样式文件
  'src/style.css': {
    name: 'src/style.css',
    language: 'css',
    value: styleCss,
  },
  // HTML 模板
  'public/index.html': {
    name: 'public/index.html',
    language: 'html',
    value: indexHtml,
  },
  // package.json
  'package.json': {
    name: 'package.json',
    language: 'json',
    value: packageJson,
  },
  // tsconfig.json
  'tsconfig.json': {
    name: 'tsconfig.json',
    language: 'json',
    value: tsconfigJson,
  },
  // import-map.json（动态生成，初始为空依赖）
  [IMPORT_MAP_FILE_NAME]: {
    name: IMPORT_MAP_FILE_NAME,
    language: fileName2Language(IMPORT_MAP_FILE_NAME),
    value: createImportMap(),
  },
 
}