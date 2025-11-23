import YAML from 'yamljs'
import path from 'path'

// Load OpenAPI specification from YAML file
const openapiPath = path.join(__dirname, '../../openapi.yaml')
export const swaggerSpec = YAML.load(openapiPath)
