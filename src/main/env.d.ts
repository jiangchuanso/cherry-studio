import type { AppEdition } from '@shared/types/appEdition'

declare global {
  const __APP_EDITION__: AppEdition

  interface ImportMetaEnv {
    readonly MAIN_VITE_CHERRYAI_CLIENT_SECRET: string
    readonly MAIN_VITE_CHERRY_CLOUD_CLIENT_SECRET?: string
    readonly MAIN_VITE_CHERRY_CLOUD_API_ORIGIN?: string
    /** Build-time override for `app.network.automatic_requests.enabled`. */
    readonly MAIN_VITE_AUTOMATIC_NETWORK?: string
  }
}
