import path from 'path'
import { Command } from 'commander'
import { templateCommand } from './command/index.js'
import { requireFile, dirname } from './utils/index.js'
import { defineConfig } from './utils/defineConfig.js'

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
    mainCommand.parse(process.argv)
}

export { defineConfig }
export default runCli