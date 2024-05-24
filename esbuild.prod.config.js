import { build } from "esbuild"
import fse from "fs-extra"
import path from "node:path"

// Clean dist
const distDir = path.resolve(process.cwd(), "./lib")
const hasDist = fse.existsSync(distDir)
if (hasDist) {
  fse.rmSync(distDir, { recursive: true, force: true })
}

build({
  entryPoints: ["./src/index.ts"],
  platform: "node",
  external: [
    "capsule-cli",
    "esbuild",
    "commander",
    "execa",
    "ora",
    "axios",
    "fs-extra",
    "@inquirer/prompts",
  ],
  outdir: "./lib",
  bundle: true,
  format: "esm",
  minify: true,
  treeShaking: true,
  target: ["node16"],
  tsconfig:'./tsconfig.json',
})
  .then(() => {
    console.log("Build completed!")
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
