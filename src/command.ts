import { Command } from 'commander'
import { templateGeneratorInquirer, comfirmTemplatePathInquirer } from './inquirer.js'
import { readCustomTemplate, readInnerTemplate, replacetemplateVar, copyTo } from './util.js'
/** 模板生成命令 */
export function templateCommand (commandObj: Command) {
    commandObj.command('template')
        .description('生成代码模板')
        .action(async (/* str, options */) => {
            const { fileList: innerFileList, fileMap: innerFileMap } = readInnerTemplate()
            const { fileList: customFileList, fileMap: customFileMap } = readCustomTemplate()
            const templateFileName = await templateGeneratorInquirer(innerFileList, customFileList)
            const [fileName, templateType] = templateFileName.split('~')
            const templateFileInfo = templateType === 'inner' ? innerFileMap[fileName] : customFileMap[fileName]
            const templateToPath = await comfirmTemplatePathInquirer()
            // 开始复制
            const copyToPath = copyTo(templateFileInfo.path, templateToPath)
            // 开始解析
            await replacetemplateVar(copyToPath, templateFileInfo.isDirectory ? 'dir' : 'file')
        })
}