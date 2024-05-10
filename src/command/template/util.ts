import fse from 'fs-extra'
import path from 'path'
import module from 'module'
import { confirm } from '@inquirer/prompts'
import { generateId, getRootPath, isEsmFile, readFile } from '../../utils/index.js'
import { CONFIG_NAME } from '../../constant.js'
import { ConfigFile, TemplateInfos } from '../../types.js'
import { build } from 'esbuild'

export const parseFileExts = [
  '.js',
  '.ts',
  '.mjs',
  '.cjs',
  '.json',
  'jsx',
  'tsx',
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
      const tempConfigFilePath = path.resolve(
        dir,
        `.${name}_temp_${generateId()}.js`
      )
      fse.writeFileSync(tempConfigFilePath, code)
      const config = await import(tempConfigFilePath)
      fse.unlinkSync(tempConfigFilePath)
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
  readFile(filePath, (content) => {
    console.log('content: ', content)
  }, {
    deep: true
  })
}

/** Copy template to target path */
export async function copyToTarget (filePath: string, targetPath: string) {
  const { name } = path.parse(filePath)
  const fullTargetPath = path.resolve(targetPath, `./${name}`)
  if(fse.existsSync(fullTargetPath)) {
    const confimResult = await confirm({
      message: 'The file or directory already exists, do you want to overwrite it?',
      default: false
    })
    if(confimResult) {
      fse.copySync(filePath, path.resolve(targetPath, `./${name}`))
      return fullTargetPath
    }
    return undefined
  } else {
    fse.copySync(filePath, path.resolve(targetPath, `./${name}`))
    return fullTargetPath
  }
}

/** Download template from npm package */
export async function requestNpmPackage (npmName: string) {
  npmName
}