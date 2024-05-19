import fse from 'fs-extra'
import path from 'node:path'
import module from 'node:module'
import url from 'node:url'
import os from 'node:os'
import { execa } from 'execa'
import axios from 'axios'
import { input, select, Separator } from '@inquirer/prompts'
import { generateId, getRootPath, isEsmFile, promiseByStep, readFile } from '../../utils/index.js'
import { ConfigFile, TemplateCommandOption, TemplateInfos } from '../../types.js'
import { build } from 'esbuild'
import { CONFIG_NAME } from '../../constant.js'
import ora from 'ora'

export const parseFileExts = [
  '.js',
  '.ts',
  '.mjs',
  '.cjs',
  '.json',
  '.jsx',
  '.tsx',
  '.txt'
]

/** Output template list */
export async function selectTemplate (options: TemplateCommandOption) {
  const { config, template } = options
  // Read inner configuration file
  const innerConfigResult = await loadInnerConfigFile() || {}
  const { templates: innerTemplates, templatePath: innerTemplatePath } = await readInnerTemplate()

  // Read Custom configuration file
  const customConfigResult = await loadCustomConfigFile(config) || {}
  const { templates: customTemplates, templatePath: customTemplatePath } = await readCustomTemplate(template)

  const innerTemplateInfos = getTemplateInfos(innerTemplates, innerTemplatePath, innerConfigResult)
  const customTemplateInfos = getTemplateInfos(customTemplates, customTemplatePath, customConfigResult)

  const [innerChoices, customChoices] = generateTemplatesChoices([innerTemplateInfos, customTemplateInfos])

  return select({
      message: 'Please select a template',
      choices: [
          new Separator(`Preset templates${!innerChoices.length ? '(Empty)' : ''}`),
          ...innerChoices,
          new Separator(`Custom templates${!customChoices.length ? '(Empty)' : ''}`),
          ...customChoices
      ]
  })
}

/** Read inner template directory */
export async function readInnerTemplate() {
  const templatePath = path.resolve(getRootPath(), './template')
  if(fse.existsSync(templatePath)) {
    const innerTemplate = await fse.readdir(templatePath)
    return {
      templates: innerTemplate?.length ? innerTemplate : [],
      templatePath
    }
  }
  return {
    templates: [],
    templatePath
  }
}

/** Read custom template directory */
export async function readCustomTemplate(template?: string) {
  let customPath: string
  if(template && path.isAbsolute(template)) {
    customPath = template
  }
  if(!customPath) {
    customPath = path.resolve(process.cwd(), template || './template')
  }
  if (fse.existsSync(customPath)) {
    const customTemplate = fse.readdirSync(customPath)
    return {
      templates: customTemplate?.length ? customTemplate : [],
      templatePath: customPath
    }
  }
  return {
    templates: [],
    templatePath: customPath
  }
}

/** Load inner config file */
export async function loadInnerConfigFile () {
  const rootPath = getRootPath()
  const rootFileList = await fse.readdir(getRootPath())
  let configFilePath: string
  for(const fileName of rootFileList) {
    if(fileName.indexOf(CONFIG_NAME) > -1) {
      configFilePath = path.resolve(rootPath, fileName)
      break
    }
  }
  if(configFilePath) {
    return loadConfigFile(configFilePath)
  }
  return null
}

/** Load custom config file */
export async function loadCustomConfigFile (customConfig?: string) {
  let customConfigPath: string
  if(customConfig && path.isAbsolute(customConfig)) {
    customConfigPath = customConfig
  }
  if(!customConfigPath) {
    const projectPath = process.cwd()
    const projectFileList = await fse.readdir(projectPath)
    for(const fileName of projectFileList) {
      if(fileName.indexOf(customConfig || CONFIG_NAME) > -1) {
        customConfigPath = path.resolve(projectPath, fileName)
      }
    }
  }
  if(customConfigPath && fse.existsSync(customConfigPath)) {
    return loadConfigFile(customConfigPath)
  }
  return null
}

export function getTemplateInfos (templateList: string[], currentPath: string, config?: ConfigFile) {
  const result: TemplateInfos = []
  const configTemplateMapByName = config?.templates?.reduce((acc, cur) => {
    const { name, npmName } = cur
    if (name) {
      acc[name] = cur
    } else if (npmName) {
      acc[npmName] = cur
    }
    return acc
  }, {})
  if (templateList.length) {
    templateList.forEach((fileName) => {
      const fileResult = {
        name: fileName,
        path: path.resolve(currentPath, `./${fileName}`),
      }
      const configTemplateItem = configTemplateMapByName?.[fileName]
      if (configTemplateItem) {
        Object.assign(fileResult, configTemplateItem)
        delete configTemplateMapByName[fileName]
      }
      result.push(fileResult)
    })
  }
  // config template
  const configTemplates =
    configTemplateMapByName &&
    (Object.values(configTemplateMapByName) as ConfigFile['templates'])
  if (configTemplates?.length) {
    configTemplates.forEach((templateItem) => {
      templateItem.npmName &&
        result.push({
          ...templateItem,
          name: templateItem.npmName,
        })
    })
  }
  return result
}

export async function transformTsToJs(filePath: string) {
  const buildResult = await build({
    entryPoints: [filePath],
    platform: 'node',
    external: ['capsule-cli'],
    bundle: true,
    write: false,
    format: 'esm',
    minify: true,
    treeShaking: true
  })
  return buildResult.outputFiles[0].text
}

/** Load config file */
export async function loadConfigFile(
  configPath: string
): Promise<ConfigFile | undefined> {
  const { ext, name, dir } = path.parse(configPath)
  const isESM = isEsmFile(configPath)
  switch (ext) {
    case '.js': {
      if (isESM) {
        const config = await import(configPath)
        return config.default
      } else {
        return module.createRequire(import.meta.url)(configPath)
      }
    }
    case '.ts': {
      const code = await transformTsToJs(configPath)
      const tempConfigFilePathBase = path.resolve(
        dir,
        `${name}_temp_${generateId()}`
      )
      const tempConfigFielPath = `${tempConfigFilePathBase}.mjs`
      fse.writeFileSync(tempConfigFielPath, code)
      const config = await import(`${url.pathToFileURL(tempConfigFilePathBase)}.mjs`)
      fse.unlinkSync(tempConfigFielPath)
      return config.default
    }
    default: {
      return undefined
    }
  }
}

/** Generate inquirer choices */
export function generateTemplatesChoices (templateInfosArr: TemplateInfos[]) {
  const result: Array<Array<{
    name: string
    description: string
    value: {
      path?: string
      npmName?: string
    }
  }>> = []
  templateInfosArr.forEach((templateInfos, index) => {
    result[index] = templateInfos.length ? templateInfos.map(infoItem => {
      const { name, npmName, description, path } = infoItem
      return {
        name: name || npmName,
        description,
        value: {
          path,
          npmName
        }
      }
    }) : []
  })
  return result
}

/** Parse file to replace template string */
export async function parseFileToReplace (filePath: string) {
  const replaceFileInfos: Array<{
    filePath: string
    fileContent: string
    replaceStr: string
  }> = []
  const inquirerPromise: Promise<string>[] = []
  readFile(filePath, (content, filePath) => {
    const fileContent = content.toString()
    const matchResult = fileContent.match(/\<\=(.*)\>/g)
    if(matchResult?.length) {
      matchResult.forEach(replaceStr => {
        const replaceKeyItem = replaceStr.replace(/[<>=]/g, '').trim()
        inquirerPromise.push(input({
          message: `[${replaceKeyItem}] replace to`,
          default: replaceKeyItem
        }))
        replaceFileInfos.push({
          filePath,
          fileContent,
          replaceStr
        })
      })
    }
  }, {
    deep: true,
    readExts: parseFileExts
  })
  if(inquirerPromise.length) {
    const inquirerResult = await Promise.all(inquirerPromise)
    inquirerResult.forEach((result, index) => {
      const { filePath, fileContent, replaceStr } = replaceFileInfos[index]!
      const newFileContent = fileContent.replace(replaceStr, result)
      fse.writeFileSync(filePath, newFileContent)
    })
  }
}

enum ECopyOverwrite {
  'default' = 0,
  'no' = -1,
  'allNo' = -2,
  'yes' = 1,
  'allYes' = 2
}

type CopyToTargetResultItem = {
  fullTargetPath?: string
  overwrite: ECopyOverwrite
}

/** Copy template to target path */
export async function copyToTarget (filePath: string, targetPath: string, options?: {
  inside?: boolean
  overwrite?: ECopyOverwrite
}) {
  const { inside = false, overwrite = 0 } = options || {}
  if(inside) {
    const filePathStat = await fse.stat(filePath)
    if(filePathStat.isDirectory()) {
      const fileList = await fse.readdir(filePath)
      const copyResult: Array<CopyToTargetResultItem> = []
      let overwrite = 0
      await promiseByStep(fileList.map(fileItem => {
        return () => copyToTarget(path.resolve(filePath, fileItem), targetPath, {
          overwrite
        })
      }), (result) => {
        const currentResult = result[0]
        const { overwrite: currentOverwrite } = currentResult
        copyResult.push(currentResult)
        if([-1, 0, 1].includes(currentOverwrite)) {
          overwrite = 0
        } else {
          overwrite = currentOverwrite
        }
      })
      return copyResult.filter(item => item.fullTargetPath)
    }
  }
  const { name, ext } = path.parse(filePath)
  const fullTargetPath = path.resolve(targetPath, `./${name}${ext}`)
  if(overwrite <= 0 && fse.existsSync(fullTargetPath)) {
    if(overwrite === -1 || overwrite === -2) {
      console.log('Skip repeat files with file names:', `${name}${ext}`)
      return [{
        fullTargetPath: undefined,
        overwrite
      }]
    }
    const comfirmResult = await select<ECopyOverwrite>({
      message: `The file or directory already exists, do you want to overwrite it? The file path is ${name}${ext}`,
      choices: [
        {
          name: 'No',
          value: -1
        },
        {
          name: 'Yes',
          value: 1
        },
        {
          name: 'All Yes',
          value: 2
        },
        {
          name: 'All No',
          value: -2
        },
      ]
    })
    if(comfirmResult > 0) {
      await fse.copy(filePath, fullTargetPath)
      return [{
        fullTargetPath,
        overwrite: comfirmResult
      }]
    }
    return [{
      fullTargetPath: undefined,
      overwrite: comfirmResult
    }]
  } else {
    await fse.copy(filePath, fullTargetPath)
    return [{
      fullTargetPath,
      overwrite
    }]
  }
}

export async function initPackage (dirPath: string) {
  return await execa('npm', ['init', '-y'], {
    cwd: dirPath
  })
}

export async function installNpmPackage (npmName: string, options?: {
  version?: string
  installDir?: string
  commandProps?: Array<string>
}) {
  const { version = 'latest', installDir = process.cwd(), commandProps = [] } = options || {}
  const installDirStat = await fse.stat(installDir)
  if(installDirStat.isDirectory()) {
    const isExistPackageJson = await fse.existsSync(path.resolve(installDir, './package.json'))
    if(!isExistPackageJson) {
      await initPackage(installDir)
    }
    try {
      const installResult = await execa('npm', ['install', `${npmName}@${version}`, ...commandProps], {
        cwd: installDir
      })
      return {
        error: null,
        data: installResult
      }
    } catch (err) {
      return {
        error: err,
        data: null
      }
    }
  }
  return {
    error: 'The installation location is wrong!',
    data: null
  }
}

/** Download template from npm package */
export async function requestNpmPackage (npmName: string, options?: {
  version?: string
  installDir?: string
  commandProps?: Array<string>
}) {
  const { version } = options || {}
  const tempDir = os.tmpdir()
  const cacheDir = path.resolve(tempDir, 'capsule-cli-cache')
  await fse.ensureDir(cacheDir)
  const packagePath = path.resolve(cacheDir, `./node_modules/${npmName}`)
  const spinner = ora('Start requesting npm template package').start()
  if(fse.existsSync(packagePath)) {
    const packageJson = await fse.readJSON(path.resolve(cacheDir, './package.json'))
    const currentVersion = packageJson.dependencies[npmName]
    if(version && currentVersion !== version) {
      const { error } = await installNpmPackage(npmName, {
        installDir: cacheDir,
        version
      })
      if(error) {
        spinner.fail(error)
        return undefined
      }
    }
    spinner.succeed()
    return packagePath
  }
  !fse.existsSync(path.resolve(cacheDir, './package.json')) && initPackage(cacheDir)
  const { error } = await installNpmPackage(npmName, {
    installDir: cacheDir,
    version
  })
  if(error) {
    spinner.fail('Npm template download fail!')
    debugger
    console.error(error?.shot)
    return undefined
  }
  spinner.succeed()
  return packagePath
}

export async function getLatestVersion (npmName: string) {
  return axios.get(`https://registry.npmjs.org/${npmName}`).then(res => {
    return res.data?.['dist-tags']?.['latest']
  }).catch(() => {
    return ''
  })
}

export async function copyAndParseTemplate (filePath: string, targetPath: string, options?: {
  inside?: boolean
}) {
  // copy template
  const copyResult = await copyToTarget(filePath, targetPath, options)
  if(copyResult.length) {
      await promiseByStep(copyResult.map(copyItem => () => parseFileToReplace(copyItem.fullTargetPath)))
      console.log('Template generate success!')
      return true
  } else {
      console.log('Copy template abort')
      return false
  }
} 