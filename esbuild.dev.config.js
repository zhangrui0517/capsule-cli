import { context } from "esbuild"

context({
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
  treeShaking: true,
  target: ["node16"],
  tsconfig:'./tsconfig.json',
})
  .then((context) => {
    context.watch()
    console.log("Build completed!")
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
