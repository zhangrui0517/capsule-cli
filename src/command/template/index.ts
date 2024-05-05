import { Command } from 'commander'
import { readInnerDir } from './util.js'

/**
 *  Generate inner template or custom template
 */
export function templateCommand (commandObj: Command) {
    commandObj.command('template')
        .description('Generate code template')
        .action(async (/* str, options */) => {
            // innerTemplate
            readInnerDir()
        })
}