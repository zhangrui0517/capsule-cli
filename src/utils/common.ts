import path from 'path'
import url from 'url'
import module from 'module'
import fse from 'fs-extra'

/** __firename */
export function filename(importMeta: Record<string, any>) {
	return url.fileURLToPath(importMeta.url)
}

/** __dirname */
export function dirname(importMeta: Record<string, any>) {
	return path.dirname(filename(importMeta))
}

export function requireFile (filePath: string) {
	return module.createRequire(import.meta.url)(filePath)
}

/** Get root path */
export function getRootPath () {
	return path.resolve(dirname(import.meta), '../../')
}

/** Generate unique string */
export function generateId (withTime = true) {
	return withTime 
		? `${Date.now()}-${Math.random() .toString(16) .slice(2)}` 
		: `${Math.random() .toString(16) .slice(2)}}`
}

export function isEsmFile(filePath) {
    // 1. 检查文件扩展名是否为 .mjs
    if (filePath.endsWith('.mjs')) {
        return true
    }

    // 2. 读取文件内容，检查是否包含 ESM 的导入语句
    const content = fse.readFileSync(filePath, 'utf-8')
    if (content.includes('import') || content.includes('export')) {
        return true
    }

    return false
}
