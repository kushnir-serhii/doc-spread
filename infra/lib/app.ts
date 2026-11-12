import { App, type AppProps } from 'aws-cdk-lib'
import { DocSpreadStack } from './doc-spread-stack.ts'
import { REGION, STAGES } from './stage-config.ts'

/** Builds the app with both stages. Needs no credentials: the account is only a token when it is unknown. */
export function createApp(props?: AppProps): App {
  const app = new App(props)
  for (const config of Object.values(STAGES)) {
    new DocSpreadStack(app, `DocSpread-${config.stage}`, {
      config,
      env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: REGION },
    })
  }
  return app
}
