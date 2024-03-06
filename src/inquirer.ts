import { select, Separator, input } from '@inquirer/prompts'
import '@inquirer/type'
import { fileInfos } from './types'


/** 生成模板选择提示 */
export function templateGeneratorInquirer (innerTemplate: fileInfos, customTemplate: fileInfos) {
    const innerChoices = innerTemplate.map((item) => {
        const { name } = item
        return {
            name: name,
            value: `${name}~inner`,
        }
    })
    const customChoices = customTemplate.map((item) => {
        const { name } = item
        return {
            name: name,
            value: `${name}~custom`
        }
    })
    return select({
        message: '请选择模板',
        choices: [
            new Separator(`内置模板列表${!innerChoices.length ? '(空)' : ''}`),
            ...innerChoices,
            new Separator(`自定义模板列表${!customChoices.length ? '(空)' : ''}`),
            ...customChoices
        ]
    })
}

/** 确认模板放置的路径 */
export function comfirmTemplatePathInquirer () {
    return input({
        message: '请输入模板生成路径',
        default: process.cwd()
    })
}

/** 询问如何替换模板文件中的模板变量 */
export function replaceTemplateVarInquirer (replaceStr: string) {
    return input({
        message: `${replaceStr}（为空则不替换）: `,
    })
}