import { checkbox, select, input, confirm } from '@inquirer/prompts'
import path from 'node:path'
import ora from 'ora'
import { execa } from 'execa'
import fse from 'fs-extra'
import { dirname, getRootPath, promiseByStep } from '../../utils'

enum EConfigType {
	'husky' = 'husky',
	'prettier' = 'prettier',
	'editorconfig' = 'editorconfig',
	'commitlint' = 'commitlint',
	'commitizen' = 'commitizen',
	'lint-staged' = 'lint-staged'
}

enum EPackageManager {
	'npm' = 'npm',
	'pnpm' = 'pnpm',
	'cnpm' = 'cnpm',
	'yarn' = 'yarn',
	'other' = 'other'
}
export async function setBaseConfig() {
	const packageJsonPath = path.resolve(process.cwd(), './package.json')
	let packageManager: EPackageManager | (string & {}) = await getPackageManager()
	if (packageManager === EPackageManager.other) {
		packageManager = await input({
			message: 'Input your package manager'
		})
	}
	const result = await getConfigList()
	if (result.length) {
		const task = result.map((item) => {
			switch (item) {
				case 'husky': {
					return async () => {
						const spinner = ora('Start install husky').start()
						const { stderr: installStderr } = await execa(packageManager, ['install', 'husky', '-D'])
						if (!installStderr) {
							spinner.start('Run npx husky init')
							const { stderr: initStderr } = await execa('npx', ['husky', 'init'])
							if (!initStderr) {
								spinner.start('Setting commit-msg')
								await execa('echo', ['npx --no --commitlint --edit $1', '>', '.husky/commit-msg'], { shell: true })
								spinner.start('Setting pre-commit')
								await execa('echo', ['npx', 'lint-staged', '>', '.husky/pre-commit'], { shell: true })
								spinner.succeed('husky install success')
							} else {
								spinner.fail('husky install fail')
								console.error(initStderr)
							}
						} else {
							console.error(installStderr)
						}
						return true
					}
				}
				case 'commitlint': {
					return async () => {
						const spinner = ora('Start install commitlint').start()
						const { stderr } = await execa(packageManager, [
							'install',
							'commitlint',
							'@commitlint/cli',
							'@commitlint/config-conventional',
							'-D'
						])
						if (!stderr) {
							spinner.start('Create .commitlintrc.json')
							const commitlintrcPath = path.resolve(process.cwd(), './.commitlintrc.json')
							let overwrite = true
							if (fse.existsSync(commitlintrcPath)) {
								spinner.stop()
								overwrite = await confirm({
									message: '.commitlintrc.json is already exists, do you want to overwrite it?\n'
								})
							}
							if (overwrite) {
								await fse.copy(path.resolve(getRootPath(), './asset/config/.commitlintrc.json'), commitlintrcPath)
								spinner.succeed('commitlint install success')
							} else {
								spinner.fail('.editorconfig is already exists')
							}
						} else {
							console.error(stderr)
						}
						return true
					}
				}
				case 'lint-staged': {
					return async () => {
						const spinner = ora('Start install lint-staged').start()
						const { stderr } = await execa(packageManager, ['install', 'lint-staged', '-D'])
						if (!stderr) {
							const packageJson = await fse.readJSON(packageJsonPath)
							spinner.start('Write config to package.json')
							packageJson['lint-staged'] = {
								'*.{js,ts,json,css,md,jsx,tsx,scss,less}': ['prettier --write']
							}
							await fse.writeJSON(packageJsonPath, packageJson, { spaces: 2 })
							spinner.succeed('lint-staged install success')
						}
						return true
					}
				}
				case 'editorconfig': {
					return async () => {
						const spinner = ora('Start creating editorconfig').start()
						const editorconfigPath = path.resolve(process.cwd(), '.editorconfig')
						let overwrite = true
						if (fse.existsSync(editorconfigPath)) {
							spinner.stop()
							overwrite = await confirm({
								message: '.editorconfig is already exists, do you want to overwrite it?\n'
							})
						}
						if (overwrite) {
							await fse.copy(path.resolve(getRootPath(), './asset/config/.editorconfig'), editorconfigPath)
							spinner.succeed('Creating editorconfig success')
							return true
						} else {
							spinner.fail('.editorconfig is already exists')
							return true
						}
					}
				}
				case 'prettier': {
					return async () => {
						const spinner = ora('Start install prettier').start()
						const { stderr } = await execa(packageManager, ['install', 'prettier', '-D'])
						if (!stderr) {
							const prettierconfig = path.resolve(process.cwd(), './.prettierrc')
							let prettierconfigOver = true
							const prettierIgnoreconfig = path.resolve(process.cwd(), './.prettierignore')
							let prettierIgnoreconfigOver = true
							if (fse.existsSync(prettierconfig)) {
								spinner.stop()
								prettierconfigOver = await confirm({
									message: '.prettierrc is already exists, do you want to overwrite it?\n'
								})
							}
							if (prettierconfigOver) {
								await fse.copy(path.resolve(getRootPath(), './asset/config/.prettierrc'), prettierconfig)
								spinner.succeed('Creating prettierrc success')
							}
							if (fse.existsSync(prettierIgnoreconfig)) {
								spinner.stop()
								prettierIgnoreconfigOver = await confirm({
									message: '.prettierignore is already exists, do you want to overwrite it?\n'
								})
							}
							if (prettierIgnoreconfigOver) {
								await fse.copy(path.resolve(getRootPath(), './asset/config/.prettierignore'), prettierIgnoreconfig)
								spinner.succeed('Creating prettierignore success')
							}
							spinner.succeed('Prettier install success')
						}
						return true
					}
				}
			}
		})
		promiseByStep(task)
	}
}

export async function getConfigList(): Promise<Array<EConfigType>> {
	return await checkbox<EConfigType>({
		message: 'Select basic configuration',
		choices: [
			{
				name: 'husky',
				value: EConfigType.husky,
				checked: true
			},
			{
				name: 'prettier',
				value: EConfigType.prettier,
				checked: true
			},
			{
				name: 'editorconfig',
				value: EConfigType.editorconfig,
				checked: true
			},
			{
				name: 'commitlint',
				value: EConfigType.commitlint,
				checked: true
			},
			{
				name: 'lint-staged',
				value: EConfigType['lint-staged'],
				checked: true
			}
		]
	})
}

export async function getPackageManager(): Promise<EPackageManager> {
	return await select({
		message: 'Select your package manager',
		choices: [
			{
				name: 'npm',
				value: EPackageManager.npm
			},
			{
				name: 'yarn',
				value: EPackageManager.yarn
			},
			{
				name: 'pnpm',
				value: EPackageManager.pnpm
			},
			{
				name: 'cnpm',
				value: EPackageManager.cnpm
			},
			{
				name: 'other',
				value: EPackageManager.other
			}
		]
	})
}
