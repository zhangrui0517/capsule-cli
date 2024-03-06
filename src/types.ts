import { Stats } from 'fs'

export type fileInfo = {
    name: string
    stat: Stats
    path: string
    isDirectory: boolean
    isFile: boolean
}

export type fileInfos = fileInfo[]