import { Error, constants, verify as verifyApi } from '@ora-io/cle-api'
import { ethers } from 'ethers'
import { logger } from '../logger'
import { loadJsonRpcProviderUrl, loadYamlFromPath, logDivider, readProofParamsFile } from '../utils'
import type { UserConfig } from '../config'
import { parseTemplateTag } from '../tag'
import { TAGS } from '../constants'

export interface VerifyOptions {
  taskId: string
  yamlPath: string
  zkWasmProviderUrl: string
  jsonRpcProviderUrl: UserConfig['JsonRpcProviderUrl']
  outputProofFilePath: string
}
export async function verify(options: VerifyOptions) {
  logger.info('>> VERIFY PROOF ONCHAIN')
  const { yamlPath, taskId, jsonRpcProviderUrl, outputProofFilePath } = options

  const cleYaml = loadYamlFromPath(yamlPath)
  if (!cleYaml) {
    logger.error('[-] ERROR: Failed to get yaml')
    return
  }

  const jsonRpcUrl = loadJsonRpcProviderUrl(cleYaml, jsonRpcProviderUrl, false)

  // Get deployed verification contract address.
  // TODO: I reused this func to save code, but the naming is a bit misleading, fix it later.
  // const verifierAddress = loadJsonRpcProviderUrl(cleYaml, AggregatorVerifierAddress, false)

  const proofFilPath = parseTemplateTag(outputProofFilePath, {
    ...TAGS,
    taskId: taskId || '',
  })

  const proofParams = readProofParamsFile(proofFilPath)
  const network = cleYaml.decidePublishNetwork()
  if (!network) {
    logger.error('[-] ERROR: Failed to get network')
    return
  }
  const verifierAddress = (constants.AggregatorVerifierAddress as any)[network]

  const verifyResult = await verifyApi(
    proofParams,
    { verifierAddress, provider: new ethers.providers.JsonRpcProvider(jsonRpcUrl) },
  ).catch((error: Error) => {
    if (error instanceof Error.ProveTaskNotReady)
      logger.error(`>> PROOF IS NOT READY. ${error.message}`)
  })

  logDivider()

  if (verifyResult)
    logger.info('>> VERIFY PROOF ONCHAIN SUCCESS')

  else
    logger.error('>> VERIFY PROOF ONCHAIN FAILED')

  return verifyResult
}
