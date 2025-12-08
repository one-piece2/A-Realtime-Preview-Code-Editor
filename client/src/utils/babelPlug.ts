import { type Files } from '../types/types'
import { type PluginObj } from '@babel/core'
import { type Dependencies } from '../types/types'
import { type File } from '../types/types'
import { babelTransform } from './compiler'
// 自定义 Babel 插件，用于解析模块路径并替换为实际代码
export default function customResolver(files: Files, currentFilename: string, dependencies: Dependencies): PluginObj {
    return {
        visitor: {
            ImportDeclaration(path) {
                //modulePath:导入的模块路径
                const modulePath = path.node.source.value
                //处理相对路径的导入
                if (modulePath.startsWith('.')) {
                    // 获取当前文件路径（从 state 或 filename 获取）

                    //getMiduleFile：根据模块路径获取对应的文件内容 如果是./App这种得话 还会帮忙补全后缀
                    const file = getModuleFile(files, modulePath, currentFilename)
                    if (!file)
                        return

                    if (file.name.endsWith('.css')) {
                        path.node.source.value = css2Js(file)
                    } else if (file.name.endsWith('.json')) {
                        path.node.source.value = json2Js(file)
                    } else {

                        path.node.source.value = URL.createObjectURL(
                            //递归调用babelTransform，将导入的模块代码中再递归调用babelTransform，直到所有模块都被解析
                            new Blob([babelTransform(file.name, file.value, files, dependencies)], {
                                type: 'application/javascript',
                            })
                        )
                    }
                } else {
                    //处理外部依赖
                    const parts = modulePath.split('/');
                    let pkgName = parts[0];
                    // 处理带 @ 的 scope 包，如 @types/react
                    if (modulePath.startsWith('@') && parts.length > 1) {
                        pkgName = `${parts[0]}/${parts[1]}`;
                    }
                    const version = dependencies[pkgName]
                    if (version) {
                        console.log(`%c🔨 [Babel] 正在编译: ${modulePath} -> 使用版本: ${version}`, 'color: orange')
                        path.node.source.value = `https://esm.sh/${modulePath}`;
                    }
                }
            }
        }
    }
}

const getModuleFile = (files: Files, modulePath: string, currentFilename: string = '') => {
    // 获取当前文件所在目录
    const currentDir = currentFilename.includes('/')
        ? currentFilename.substring(0, currentFilename.lastIndexOf('/') + 1)
        : ''

    // 构建完整路径：当前目录 + 相对路径
    let fullPath = currentDir + modulePath.replace(/^\.\//, '')

    // 如果路径没有扩展名，尝试添加扩展名
    if (!fullPath.includes('.')) {
        const extensions = ['.tsx', '.ts', '.jsx', '.js']
        for (const ext of extensions) {
            if (files[fullPath + ext]) {
                return files[fullPath + ext]
            }
        }
    } else {
        // 如果有扩展名，直接查找
        if (files[fullPath]) {
            return files[fullPath]
        }
    }

    // 如果找不到，返回 undefined
    return undefined
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