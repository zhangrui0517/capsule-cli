import { context } from "esbuild"
import baseConfig from "./esbuild.base.config.js"

context(baseConfig)
	.then((context) => {
		context.watch()
		console.log("Build completed!")
	})
	.catch((err) => {
		console.error(err)
		process.exit(1)
	})
