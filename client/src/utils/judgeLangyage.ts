export const fileName2Language = (name: string) => {
    //通过文件名后缀来判断语言类型
    const suffix = name.split('.').pop() || ''
    if (['js', 'jsx'].includes(suffix)) return 'javascript'
    if (['ts', 'tsx'].includes(suffix)) return 'typescript'
    if (['json'].includes(suffix)) return 'json'
    if (['css'].includes(suffix)) return 'css'
    return 'javascript'
}