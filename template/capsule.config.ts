import { defineConfig } from '../src/command/template/util.js'

export default defineConfig({
    // 需要动态替换文本的文件
    parseFiles: [],
    templates: [
        {
            name: 'widget',
            label: '组件',
            description: '组件模板',
        },
        {
            npmName: 'widget2',
            label: '组件2',
            description: '组件模板2',
        }
    ]
})