import fse from 'fs-extra'
import path from 'path'
import module from 'module'
import { build } from 'esbuild'
import { generateId, getRootPath, isEsmFile } from '../../utils/index.js'
import { CONFIG_NAME } from '../../constant.js'
import { ConfigFile } from '../../types.js'

export const parseFileExts = ['.js', '.ts', '.mjs', '.cjs', '.json', 'jsx', 'tsx']

/** Read inner template directory */
export async function readInnerDir () {
   try {
      const innerPath = path.resolve(getRootPath(), './template')
      const innerTemplate = fse.readdirSync(innerPath)
      if(innerTemplate?.length) {
         const configIndex = innerTemplate.findIndex(fileName => fileName.indexOf(CONFIG_NAME) > -1)
         // Is there a configuration file exist
         if(configIndex > -1) {
            const config = await loadConfigFile(path.resolve(innerPath, `./${innerTemplate[configIndex]}`))
            console.log('config: ', config)
            innerTemplate.splice(configIndex, 1)
         }
		if(innerTemplate.length) {
			innerTemplate.forEach(name => {
				const filePath = path.resolve(innerPath, `./${name}`)
				readFile(filePath, (fileContent) => {
					console.log('fileContent: ', fileContent)
				}, {
					deep: true
				})
			})
		}
      }
   } catch (err) {
      console.error(err)
   }
   return []
}

export function readFile (filePath: string, callback: (fileContent) => void, options: {
	deep?: boolean
	readExts?: string[]
} = {}) {
	const { deep, readExts = [] } = options
	const stat = fse.statSync(filePath)
	const exts = parseFileExts.concat(readExts)
	const isDirectory = stat.isDirectory()
	debugger
	if(isDirectory) {
		if(deep) {
			const subFileList = fse.readdirSync(filePath)
			subFileList.forEach(name => {
				readFile(path.resolve(filePath, `./${name}`), callback, options)
			})
		}
	}
	// It's file
	const { ext } = path.parse(filePath)
	if(exts.includes(ext)) {
		const fileContent = fse.readFileSync(filePath)
		callback(fileContent)
	}
}

/** Capsule confinuration define function */
export function defineConfig (config: ConfigFile) {
	return config
}

export async function transformTsToJs (filePath: string) {
	const buildResult = await build({
		entryPoints: [filePath],
		bundle: true,
		platform: 'node',
		write: false,
		external: ['esbuild'],
		format: 'esm',
		minify: true
	})
	return buildResult.outputFiles[0].text
}

/** Load config file */
export async function loadConfigFile (configPath: string) {
	const { ext, name, dir } = path.parse(configPath)
	const isESM = isEsmFile(configPath)
	switch(ext) {
		case '.js': {
			if(isESM) {
				const config = await import(configPath)
				return config.default
			} else {
				return module.createRequire(import.meta.url)(configPath)
			}
		}
		case '.ts': {
			const code = await transformTsToJs(configPath)
			const tempConfigFilePath = path.resolve(dir, `.${name}_temp_${generateId()}.js`)
			fse.writeFileSync(tempConfigFilePath, code)
			const config = await import(tempConfigFilePath)
			fse.unlinkSync(tempConfigFilePath)
			return config.default
		}
	}
}