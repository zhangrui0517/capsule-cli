import path from 'node:path'
import { Command } from 'commander'
import { input } from '@inquirer/prompts'
import { copyAndParseTemplate, requestNpmPackage, selectTemplate } from './util.js'
import { TemplateCommandOption } from '../../types.js'

/**
 *  Generate inner template or custom template
 */
export function templateCommand(commandObj: Command) {
	commandObj
		.command('template')
		.option('-t, --template <template>', 'Set template directory or absolute path')
		.option('-c, --config <config>', 'Set config file name or absolute path')
		.description('Generate code template')
		.action(async (options: TemplateCommandOption) => {
			try {
				const { path: filePath, npmName } = await selectTemplate(options)
				const targetPath = await input({
					message: 'Please enter the template generation path',
					default: process.cwd()
				})
				if (filePath) {
					copyAndParseTemplate(filePath, targetPath)
				} else {
					// request npm package
					const result = await requestNpmPackage(npmName)
					if (result) {
						copyAndParseTemplate(path.resolve(result, './template'), targetPath, {
							inside: true
						})
					}
				}
			} catch (err) {
				console.error(err)
			}
		})
}
