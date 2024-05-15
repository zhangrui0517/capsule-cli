import fse from 'fs-extra'
import path from 'node:path'
import module from 'node:module'
import url from 'node:url'
import os from 'node:os'
import { execa } from 'execa'
import axios from 'axios'
import { confirm, input } from '@inquirer/prompts'
import { generateId, getRootPath, isEsmFile, promiseByStep, readFile } from '../../utils/index.js'
import { CONFIG_NAME } from '../../constant.js'
import { ConfigFile, TemplateInfos } from '../../types.js'
import { build } from 'esbuild'

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

/** Read inner template directory */
export async function readInnerDir() {
  try {
    const innerPath = path.resolve(getRootPath(), './template')
    const innerTemplate = fse.readdirSync(innerPath)
    if (innerTemplate?.length) {
      const configIndex = innerTemplate.findIndex(
        (fileName) => fileName.indexOf(CONFIG_NAME) > -1
      )
      let config: ConfigFile | undefined
      // Is there a configuration file exist
      if (configIndex > -1) {
        config = await loadConfigFile(
          path.resolve(innerPath, `./${innerTemplate[configIndex]}`)
        )
        innerTemplate.splice(configIndex, 1)
      }
      return getTemplateInfos(innerTemplate, config, innerPath)
    }
  } catch (err) {
    console.error(err)
  }
  return []
}

/** Read custom template directory */
export async function readCustomDir() {
  const customPath = path.resolve(process.cwd(), './template')
  if (fse.existsSync(customPath)) {
    const customTemplate = fse.readdirSync(customPath)
    const configIndex = customTemplate.findIndex(
      (fileItem) => fileItem.indexOf(CONFIG_NAME) > -1
    )
    let config: ConfigFile | undefined
    if (configIndex > -1) {
      config = await loadConfigFile(
        path.resolve(customPath, `./${customTemplate[configIndex]}`)
      )
      customTemplate.splice(configIndex, 1)
    }
    return getTemplateInfos(customTemplate, config, customPath)
  }
  return []
}

export function getTemplateInfos (templateList: string[], config: ConfigFile | undefined, currentPath: string) {
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
      const configTemplateItem = configTemplateMapByName[fileName]
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
    bundle: true,
    platform: 'node',
    write: false,
    external: ['esbuild', 'inquirer'],
    format: 'esm',
    minify: true,
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

/** Copy template to target path */
export async function copyToTarget (filePath: string, targetPath: string, options?: {
  inside?: boolean
}) {
  const { inside = false } = options || {}
  if(inside) {
    const filePathStat = await fse.stat(filePath)
    if(filePathStat.isDirectory()) {
      const fileList = await fse.readdir(filePath)
      const result = []
      await promiseByStep(fileList.map(fileItem => {
        result.push(path.resolve(targetPath, fileItem))
        return () => copyToTarget(path.resolve(filePath, fileItem), targetPath)
      }), (e) => {
        console.log('e: ', e)
      })
      return result
    }
  }
  const { name, ext } = path.parse(filePath)
  const fullTargetPath = path.resolve(targetPath, `./${name}${ext}`)
  if(fse.existsSync(fullTargetPath)) {
    const comfirmResult = await confirm({
      message: 'The file or directory already exists, do you want to overwrite it?',
      default: false
    })
    if(comfirmResult) {
      await fse.copy(filePath, fullTargetPath)
      return fullTargetPath
    }
    return undefined
  } else {
    await fse.copy(filePath, fullTargetPath)
    return fullTargetPath
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
    const installResult = await execa('npm', ['install', `${npmName}@${version}`, ...commandProps], {
      cwd: installDir
    })
    const { stderr } = installResult
    if(stderr) {
      return {
        error: stderr,
        data: null
      }
    }
    return {
      error: null,
      data: installResult
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
  const packePath = path.resolve(cacheDir, `./node_modules/${npmName}`)
  try {
    // Exist cache dir, if not exist, throw error to cache
    fse.statSync(cacheDir)
    const packageJson = await fse.readJSON(path.resolve(cacheDir, './package.json'))
    const currentVersion = packageJson.dependencies[npmName]
    if(version && currentVersion !== version) {
       const { error } = await installNpmPackage(npmName, {
        installDir: cacheDir,
        version
      })
      if(error) {
        throw new Error(error)
      }
      return packePath
    }
    if(!version) {
      // Check latest version
      const lastVersion = await getLatestVersion(npmName)
      if(lastVersion && currentVersion !== lastVersion) {
        const { error } = await installNpmPackage(npmName, {
          installDir: cacheDir
        })
        if(error) {
          throw new Error(error)
        }
        return packePath
      }
      if(!lastVersion) {
        console.warn('Failed to obtain the latest version of the current template, currently using version is ', currentVersion)
      }
      return packePath
    }
    return null
  } catch (e) {
    console.log(e)
    fse.mkdirSync(cacheDir)
    const { error, data } = await installNpmPackage(npmName, {
      installDir: cacheDir
    })
    if(!error) {
      console.log(data)
      return packePath
    }
    console.error(error)
    return null
  }
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
  const fullTargetPath = await copyToTarget(filePath, targetPath, options)
  console.log('fullTargetPath: ', fullTargetPath)
  if(fullTargetPath) {
      Array.isArray(fullTargetPath) 
        ? await promiseByStep(fullTargetPath.map(pathItem => () => parseFileToReplace(pathItem)))
        : await parseFileToReplace(fullTargetPath)
      console.log('Template generate success!')
      return true
  } else {
      console.log('Copy template abort')
      return false
  }
} 