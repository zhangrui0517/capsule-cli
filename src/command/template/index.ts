import { Command } from 'commander'
import { readCustomDir, readInnerDir } from './util.js'

/**
 *  Generate inner template or custom template
 */
export function templateCommand (commandObj: Command) {
    commandObj.command('template')
        .description('Generate code template')
        .action(async (/* str, options */) => {
            // Inner template
            const innerTemplate = await readInnerDir()
            innerTemplate
            // Custom template
            const customTemplate = await readCustomDir()
            console.log('customTemplate: ', customTemplate)
        })
}