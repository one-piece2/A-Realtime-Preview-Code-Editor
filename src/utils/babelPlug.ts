import { type Files } from '../types/types'
import { type PluginObj } from '@babel/core'

import { type File } from '../types/types'
import { babelTransform } from './compiler'

 export default function customResolver(files: Files): PluginObj {
    return {
        visitor: {
            ImportDeclaration(path) {
                const modulePath = path.node.source.value
                if(modulePath.startsWith('.')) {
                    const file = getModuleFile(files, modulePath)
                    if(!file) 
                        return

                    if (file.name.endsWith('.css')) {
                        path.node.source.value = css2Js(file)
                    } else if (file.name.endsWith('.json')) {
                        path.node.source.value = json2Js(file)
                    } else {
                        path.node.source.value = URL.createObjectURL(
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
    const js = `export default ${file.value}`
    return URL.createObjectURL(new Blob([js], { type: 'application/javascript' }))
}
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