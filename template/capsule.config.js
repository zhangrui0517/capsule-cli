import { defineConfig } from '../lib/utils/index.js'
export default defineConfig({
    // 需要动态替换文本的文件
    parseFiles: [{}],
    templates: [
        {
            npmName: '',
        }
    ]
})