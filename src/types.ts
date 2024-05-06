export type ConfigFile = {
	/** Need to parse files, if empty, default parse all js | ts | mjs | cjs | json file */
	parseFiles?: Array<string>
    /** Parse file ext */
    parseFileExts?: Array<string>
    /** Template list, use npm package as template */
	templates?: Array<{
		/** npm package name */
		npmName?: string
        /** template name, if empty, default to use npmName */
        name?: string
        /** description */
        description?: string
	}>
}