import { Command } from 'commander'
import { templateCommand } from './command.js'

function runCli () {
    const mainCommand = new Command()
    mainCommand
        .name('capsule-cli')
        .description('CLI to some JavaScript string utilities')
        .version('0.8.0')
    templateCommand(mainCommand)
    mainCommand.parse()
}

export default runCli