import fse from 'fs-extra'
import path from 'path'
import { getRootPath, loadConfigFile } from '../../utils/index.js'
import { CONFIG_NAME } from '../../constant.js'



/** Read inner template directory */
export async function readInnerDir () {
   try {
      const innerPath = path.resolve(getRootPath(), './template')
      const innerTemplate = fse.readdirSync(innerPath)
      if(innerTemplate?.length) {
         const configIndex = innerTemplate.findIndex(fileName => fileName.indexOf(CONFIG_NAME) > -1)
         // Is there a configuration file exist
         if(configIndex > -1) {
            const config = await loadConfigFile(path.resolve(innerPath, `./${innerTemplate[configIndex]}`))
            console.log('config: ', config)
            innerTemplate.splice(configIndex, 1)
         }

      }
   } catch (err) {
      console.error(err)
   }
   return []
}