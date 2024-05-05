import path from 'node:path'
import module from 'node:module'
import fse from 'fs-extra'
import { build } from 'esbuild'
import { generateId, isEsmFile } from './common.js'

/** Capsule confinuration define function */
export function defineConfig (config: {
	/** Need to parse files */
	parseFiles: Array<string | {
		[key: string]: any
	}>
	/** Template list, use npm package as template */
	templates?: Array<{
		/** npm package name */
		npmName?: string
	}>
}) {
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