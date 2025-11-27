import { strFromU8, strToU8, unzlibSync, zlibSync } from "fflate"
import { type Files } from "../types/types"
// 引入JSZip库 作用：把文件压缩为zip文件
import JSZip from 'jszip'
// 引入file-saver库 作用：把文件下载到本地
import {saveAs} from 'file-saver'


export function compress(data: string): string {
    // 先将字符串转换为字节数组
    const buffer = strToU8(data)
    //zlibSync  压缩数据 
    const zipped = zlibSync(buffer, { level: 9 })
    // 再将压缩后的字节数组转换为字符串
    const str = strFromU8(zipped, true)
    //btoa:将二进制字符串转换为base64编码的字符串
    return btoa(str)
}

export function uncompress(base64: string): string {
    //atob:将base64编码的字符串转换为二进制字符串
    const binary = atob(base64)
    // 将二进制字符串转换为字节数组
    const buffer = strToU8(binary, true)
    // 解压数据
    const unzipped = unzlibSync(buffer)
    // 将解压后的字节数组转换为字符串
    return strFromU8(unzipped)
}

export async function downloadFiles(files: Files) {
    
    const zip = new JSZip()
    Object.keys(files).forEach((name) => {
        zip.file(name, files[name].value)
    })

    const blob = await zip.generateAsync({ type: 'blob' })
    // 下载zip文件
    saveAs(blob, `code${Math.random().toString().slice(2, 8)}.zip`)
}