import { transform } from '@babel/standalone'
import { type Files } from '../types/types'
import { ENTRY_FILE_NAME } from '../utils/files'

import customResolver from './babelPlug'



export const babelTransform = (filename: string, code: string, files: Files) => {
  let result = ''
  try {
    result = transform(code, {
      presets: ['react', 'typescript'],
      filename,
      plugins: [customResolver(files)],
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
