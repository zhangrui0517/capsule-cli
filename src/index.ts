import path from 'path'
import { Command } from 'commander'
import { templateCommand } from './command/index.js'
import { requireFile, defineConfig, dirname } from './utils/index.js'

function runCli () {
    const packageJson = requireFile(path.resolve(dirname(import.meta), '../package.json'))
    const { version, name, description } = packageJson
    const mainCommand = new Command()
    mainCommand
        .usage('capsule')
        .name(name)
        .description(description)
        .version(version)
    templateCommand(mainCommand)
    mainCommand.parse()
}

export { defineConfig }
export default runCli