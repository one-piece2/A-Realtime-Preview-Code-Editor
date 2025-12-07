import { transform } from '@babel/standalone'
import { type Files } from '../types/types'
import { ENTRY_FILE_NAME } from '../utils/files'

import customResolver from './babelPlug'
// 编译前处理代码，主要是添加 React 导入语句
export const beforeTransformCode = (filename: string, code: string) => {
    let _code = code
    const regexReact = /import\s+React/g
    if ((filename.endsWith('.jsx') || filename.endsWith('.tsx')) && !regexReact.test(code)) {
      _code = `import React from 'react';\n${code}`
    }
    return _code
}

export const babelTransform = (filename: string, code: string, files: Files) => {
    // 编译前处理代码，主要是添加 React 导入语句
    code = beforeTransformCode(filename, code)
  let result = ''
  try {
    result = transform(code, {
      presets: ['react', 'typescript'],
      filename,
      plugins: [customResolver(files, filename)],
      retainLines: true
    }).code!
  } catch (e) {
    console.error('编译出错', e);
  }
  return result
}

export const compile = (files: Files) => {
  const main = files[ENTRY_FILE_NAME]
  return babelTransform(ENTRY_FILE_NAME, main.value, files)
}

self.onmessage = (event: MessageEvent<any>) => {
  const { type, files } = event.data;
  if (type === 'compile') {
    try{
      const result = compile(files);
      self.postMessage({ type: 'success', result: result });
    }catch(e){
      self.postMessage({ type: 'error', message: String(e) });
    }
  }
}