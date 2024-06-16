const baseConfig = {
	entryPoints: ["./src/index.ts"],
	platform: "node",
	external: ["capsule-cli", "esbuild", "commander", "execa", "ora", "axios", "fs-extra", "@inquirer/prompts"],
	outdir: "./lib",
	bundle: true,
	format: "esm",
	treeShaking: true,
	target: ["node16"],
	tsconfig: "./tsconfig.json"
}

export default baseConfig
