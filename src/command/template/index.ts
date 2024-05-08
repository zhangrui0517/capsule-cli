import { Command } from 'commander'
import path from 'node:path'
import { input, select, Separator } from '@inquirer/prompts'
import { copyToTarget, generateTemplatesChoices, parseFileToReplace, readCustomDir, readInnerDir, requestNpmPackage } from './util.js'

/**
 *  Generate inner template or custom template
 */
export function templateCommand (commandObj: Command) {
    commandObj.command('template')
        .description('Generate code template')
        .action(async (/* str, options */) => {
            try {
                // Inner template
                const innerTemplate = await readInnerDir()
                // Custom template
                const customTemplate = await readCustomDir()
                const [innerChoices, customChoices] = generateTemplatesChoices([innerTemplate, customTemplate])
                const { path: filePath, npmName } = await select({
                    message: 'Please select a template',
                    choices: [
                        new Separator(`内置模板列表${!innerChoices.length ? '(空)' : ''}`),
                        ...innerChoices,
                        new Separator(`自定义模板列表${!customChoices.length ? '(空)' : ''}`),
                        ...customChoices
                    ]
                })
                const targetPath = await input({
                    message: 'Please enter the template generation path',
                    default: process.cwd()
                })
                if(filePath) {
                    // copy template
                    await copyToTarget(filePath, targetPath)
                    const { name } = path.parse(filePath)
                    await parseFileToReplace(path.resolve(targetPath, `./${name}`))
                    console.log('template generate success!')
                } else {
                    // request npm package
                    const result = await requestNpmPackage(npmName)
                    result
                }
            } catch(err) {
                console.log('exit')
            }
        })
}