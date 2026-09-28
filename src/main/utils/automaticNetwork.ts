import { application } from '@application'
import { loggerService } from '@logger'

const logger = loggerService.withContext('AutomaticNetwork')

/**
 * Master switch for outbound requests the app makes on its own initiative:
 * update checks, model registry pulls, egress-country detection, analytics and
 * crash reports.
 *
 * User-initiated traffic is out of scope — "Check for updates", opening the
 * website/docs and Cherry Cloud sign-in keep working regardless of this flag.
 */
export const AUTOMATIC_NETWORK_PREFERENCE_KEY = 'app.network.automatic_requests.enabled' as const

/** Runtime override (process env), highest precedence. */
const RUNTIME_ENV_VAR = 'CHERRY_STUDIO_AUTOMATIC_NETWORK'
/** Build-time override for prebuilt distros: `MAIN_VITE_AUTOMATIC_NETWORK` (see `src/main/env.d.ts`). */

const TRUTHY_VALUES = new Set(['1', 'true', 'on', 'yes', 'enabled'])
const FALSY_VALUES = new Set(['0', 'false', 'off', 'no', 'disabled'])

function parseBooleanEnv(raw: string | undefined | null): boolean | null {
  if (raw === undefined || raw === null) return null
  const value = raw.trim().toLowerCase()
  if (TRUTHY_VALUES.has(value)) return true
  if (FALSY_VALUES.has(value)) return false
  logger.warn(`Ignoring unrecognized ${RUNTIME_ENV_VAR} value: ${raw}`)
  return null
}

/** Env override, or `null` when neither the runtime nor the build-time var is set. */
function readEnvOverride(): boolean | null {
  return parseBooleanEnv(process.env[RUNTIME_ENV_VAR]) ?? parseBooleanEnv(import.meta.env.MAIN_VITE_AUTOMATIC_NETWORK)
}

let hasLoggedDecision = false

/**
 * Whether automatic outbound requests are allowed.
 *
 * Precedence: `CHERRY_STUDIO_AUTOMATIC_NETWORK` > `MAIN_VITE_AUTOMATIC_NETWORK`
 * > the `app.network.automatic_requests.enabled` preference (default `false`,
 * i.e. automatic requests are off unless explicitly opted in).
 *
 * Safe to call during preboot: an unready or stopped PreferenceService falls
 * back to the default (off) rather than touching the store.
 */
export function isAutomaticNetworkAllowed(): boolean {
  const override = readEnvOverride()
  const preferenceService = application.getExisting('PreferenceService')
  // Fall back to the default (off) when the store is unavailable or not ready
  // yet — e.g. Sentry's preboot consent check.
  const storeReadable = preferenceService !== undefined && preferenceService.isReady !== false
  const allowed = override ?? (storeReadable ? preferenceService.get(AUTOMATIC_NETWORK_PREFERENCE_KEY) : false)

  if (!hasLoggedDecision) {
    hasLoggedDecision = true
    logger.info(
      override === null
        ? `automatic outbound requests: ${allowed ? 'enabled' : 'disabled'} (preference)`
        : `automatic outbound requests: ${allowed ? 'enabled' : 'disabled'} (env override)`
    )
  }

  return allowed
}
