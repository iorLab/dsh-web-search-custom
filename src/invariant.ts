/**
 * Package-owned invariant companion for `@jay/dsh-web-search-diy`.
 * @module @jay/dsh-web-search-diy/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@jay/dsh-web-search-diy'

/** Cordis companion plugin name. */
export const name = 'web-search-diy-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: the host half registers a `web` search provider whose
 * options are projected per operation from its own settings namespace, and the
 * client half contributes a `settings.section` fed by the shared describe
 * mirror. Registration and mirror invalidation are owned and observed by the
 * packages that implement them, so there is no package-local consistency
 * property to assert here.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns The installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
