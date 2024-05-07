export type TemplateItem = {
    /** template name, if empty, default to use npmName */
    name?: never
    /** npm package name */
    npmName: string
    /** template label */
    label?: string
    /** description */
    description?: string
} | {
    /** template name, if empty, default to use npmName */
    name: string
    /** npm package name */
    npmName?: never
    /** template label */
    label?: string
    /** description */
    description?: string
}

export type ConfigFile = {
	/** Need to parse files, if empty, default parse all js | ts | mjs | cjs | json file */
	parseFiles?: Array<string>
    /** Parse file ext */
    parseFileExts?: Array<string>
    /** Template list, use npm package as template */
	templates?: Array<TemplateItem>
}