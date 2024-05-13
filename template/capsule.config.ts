import { defineConfig } from '../src/utils/defineConfig.js'

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
            npmName: 'execa',
            label: 'run lib label',
            description: 'run lib desc',
        }
    ]
})