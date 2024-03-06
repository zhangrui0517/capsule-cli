import fs from 'fs-extra'
import { dirname as pathDirname, resolve, isAbsolute, parse as pathParse } from 'path'
import { fileURLToPath } from 'url'
import { replaceTemplateVarInquirer } from './inquirer.js'
import { fileInfo } from './types'

/** __firename */
export function filename(importMeta: Record<string, any>) {
	return fileURLToPath(importMeta.url)
}

/** __dirname */
export function dirname(importMeta: Record<string, any>) {
	return pathDirname(filename(importMeta))
}

/** 获取本项目根目录的模板文件 */
export function getRootPath () {
	return resolve(dirname(import.meta), '../template')
}

/** 
 * 读取目录
 * @param pathname string
 */
export function readDir (pathname: string): {
	fileList: fileInfo[]
	fileMap: Record<string, fileInfo>
} {
	try {
		const fileStat = fs.statSync(pathname)
		if(fileStat.isDirectory()) {
			const fileList = fs.readdirSync(pathname)
			const map = {}
			const list = fileList.map(item => {
				const filePath = resolve(pathname, item)
				const stat = fs.statSync(filePath)
				const result = {
					name: item,
					stat: stat,
					path: filePath,
					isDirectory: stat.isDirectory(),
					isFile: stat.isFile()
				}
				map[item] = result
				return result
			})
			return {
				fileList: list,
				fileMap: map
			}
		} else {
			console.error('请输入有效的目录路径')
		}
	} catch(error) {
		// debugger模式
	}
	return {
		fileList: [],
		fileMap: {}
	}
}

/** 读取目录，深度遍历 */
export function readDirDeep (pathname: string) {
	try {
		const fileStat = fs.statSync(pathname)
		if(fileStat.isDirectory()) {
			const fileList = fs.readdirSync(pathname)
			const list = []
			const map = []
			for(let i = 0; i < fileList.length; i ++) {
				const item = list[i]
				const itemPath = resolve(pathname, item)
				const itemStat = fs.statSync(itemPath)
				const fileInfo = {
					name: item,
					stat: itemStat,
					isDirectory: itemStat.isDirectory(),
					isFile: itemStat.isFile(),
					path: itemPath
				}
				list.push(fileInfo)
				map[item] = fileInfo
				if(itemStat.isDirectory) {
					const { fileList, fileMap } = readDirDeep(itemPath)
					list.push(...fileList)
					Object.assign(map, fileMap)
				}
			}
			return {
				fileList: list,
				fileMap: map
			}
		} else {
			console.error('请输入有效的目录路径')
		}
	} catch(error) {
		// debugger模式可输出
	}
	return {
		fileList: [],
		fileMap: {}
	}
}

/** 读取内置模板 */
export function readInnerTemplate () {
	const libRoot = getRootPath()
	return readDir(libRoot)
}

/** 读取自定义模板 */
export function readCustomTemplate () {
	const currentPath = resolve(process.cwd(), './template')
	return readDir(currentPath)
}

/** 解析模板文件，替换模板文件中的模板变量*/
export async function replacetemplateVar (path: string, fileType?: 'dir' | 'file') {
	const variableReg = /<%-(\s+)?(.*?)(\s+)?%>/g
	if(!fileType) {
		const pathStat = fs.statSync(path)
		fileType = pathStat.isDirectory() ? 'dir' : 'file'
	}
	switch(fileType) {
		case 'dir': {
			const fileList = fs.readdirSync(path)
			for(let i = 0; i < fileList.length; i++) {
				const fileItem = fileList[i]
				replacetemplateVar(resolve(path, fileItem))
			}
			break
		}
		case 'file': {
			let fileContent = fs.readFileSync(path, 'utf-8')
			let isReplace = false
			const templateVars = fileContent.match(variableReg)
			if(templateVars?.length) {
				const foramtTemplateVars = templateVars.filter((item, index) => templateVars.indexOf(item) === index)
				for(let i = 0; i < foramtTemplateVars.length; i++) {
					const templateVarItem = foramtTemplateVars[i]
					const result = await replaceTemplateVarInquirer(templateVarItem)
					if(result) {
						const templateVarItemReg = new RegExp(templateVarItem, 'g')
						fileContent = fileContent.replace(templateVarItemReg, result)
						isReplace = true
					}
				}
				isReplace && fs.writeFileSync(path, fileContent)
			}
		}
	}
}

/** 
 * 复制文件到指定目录
 * @param sourceFilePath 源文件路径
 * @param toPath 目标路径	
 * @param fileType 源文件类型（文件夹｜文件）
 */
export function copyTo (sourceFilePath: string, toPath: string) {
	const cwdPath = process.cwd()
	const absSourceFilePath = isAbsolute(sourceFilePath) ? sourceFilePath : resolve(cwdPath, sourceFilePath)
	const absToPath = isAbsolute(toPath) ? toPath : resolve(cwdPath, toPath)
	const { base } = pathParse(absSourceFilePath)
	const copyToPath = resolve(absToPath, base)
	fs.copySync(absSourceFilePath, copyToPath)
	return copyToPath
}