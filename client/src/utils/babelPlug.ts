import { type Files } from '../types/types'
import { type PluginObj } from '@babel/core'

import { type File } from '../types/types'
import { babelTransform } from './compiler'
// 自定义 Babel 插件，用于解析模块路径并替换为实际代码
 export default function customResolver(files: Files): PluginObj {
    return {
        visitor: {
            ImportDeclaration(path) {
                const modulePath = path.node.source.value
                  //处理相对路径的导入
                if(modulePath.startsWith('.')) {
                     //getMiduleFile：根据模块路径获取对应的文件内容 如果是./App这种得话 还会帮忙补全后缀
                    const file = getModuleFile(files, modulePath)
                    if(!file) 
                        return

                    if (file.name.endsWith('.css')) {
                        path.node.source.value = css2Js(file)
                    } else if (file.name.endsWith('.json')) {
                        path.node.source.value = json2Js(file)
                    } else {
                        
                        path.node.source.value = URL.createObjectURL(
                            //递归调用babelTransform，将导入的模块代码中再递归调用babelTransform，直到所有模块都被解析
                            new Blob([babelTransform(file.name, file.value, files)], {
                                type: 'application/javascript',
                            })
                        )
                    }
                }
            }
        }
    }
}

const getModuleFile = (files: Files, modulePath: string) => {
    let moduleName = modulePath.split('./').pop() || ''
      // 处理没有后缀名的模块导入情况，比如 import './App' 会自动补全为 import './App.tsx'
    if (!moduleName.includes('.')) {
        const realModuleName = Object.keys(files).filter(key => {
            return key.endsWith('.ts') 
                || key.endsWith('.tsx') 
                || key.endsWith('.js')
                || key.endsWith('.jsx')
        }).find((key) => {
            return key.split('.').includes(moduleName)
        })
        if (realModuleName) {
            moduleName = realModuleName
        }
      }
    return files[moduleName]
}
const json2Js = (file: File) => {
    // 处理 JSON 文件，将其转换为 JS 模块
    const js = `export default ${file.value}`
    return URL.createObjectURL(new Blob([js], { type: 'application/javascript' }))
}
 //处理css不用默认导出，而是动态创建style标签的方式将样式注入到页面中，并且是立即执行函数，这样直接import './x.css' 就能执行生效
    //import a from './x' 这种情况，模块内部必须有export语句，否则会报错，所以这里不需要export 直接执行即可
const css2Js = (file: File) => {
    const randomId = new Date().getTime()
    const js = `
(() => {
    const stylesheet = document.createElement('style')
    stylesheet.setAttribute('id', 'style_${randomId}_${file.name}')
    document.head.appendChild(stylesheet)

    const styles = document.createTextNode(\`${file.value}\`)
    stylesheet.innerHTML = ''
    stylesheet.appendChild(styles)
})()
    `
    return URL.createObjectURL(new Blob([js], { type: 'application/javascript' }))
}