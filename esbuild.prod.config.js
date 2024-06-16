import { build } from "esbuild"
import fse from "fs-extra"
import path from "node:path"
import baseConfig from "./esbuild.base.config.js"

// Clean dist
const distDir = path.resolve(process.cwd(), "./lib")
const hasDist = fse.existsSync(distDir)
if (hasDist) {
	fse.rmSync(distDir, { recursive: true, force: true })
}

build({
	...baseConfig,
	minify: true
})
	.then(() => {
		console.log("Build completed!")
	})
	.catch((err) => {
		console.error(err)
		process.exit(1)
	})
