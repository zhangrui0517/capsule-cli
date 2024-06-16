import { Command } from "commander"
import path from "node:path"
import fse from "fs-extra"
import { setBaseConfig } from "./utils"

export function baseCommand(commandObj: Command) {
	commandObj
		.command("base")
		.description("Generate project basic configuration")
		.action(async () => {
			try {
				const packageJsonPath = path.resolve(process.cwd(), "./package.json")
				// Check package.json exist
				if (fse.existsSync(packageJsonPath)) {
					setBaseConfig()
				} else {
					console.error("package.json is not exist!")
				}
			} catch (err) {
				console.error(err)
			}
		})
}
