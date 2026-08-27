/**
 * dsh-web-search-custom, browser half. Contributes the `settings.section`
 * "Custom Web Search" page: one enable switch plus the gateway route fields
 * (model, base URL, context size, token bound). Reads the shared describe
 * mirror owned by ui-settings and writes edits back through the loopback
 * settings.mutate face — same discipline as dsh-ui-settings-yaml.
 * Export discipline: packages/client/AGENTS.md.
 * @module dsh-web-search-custom/client
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the settings shell's SlotMap merge ('settings.section'),
// the ctx.settingsScope Context merge, and the SettingsDescribeFace typing.
// Cross-plugin collaboration goes through the service, never a value import
// (client bundle purity gate).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { SettingsCustomSection } from './SettingsCustomSection.tsx'
import type { SettingsCustomSectionInjected } from './SettingsCustomSection.tsx'
import { CustomSettingsController } from './custom-settings-controller.ts'
import type { SettingsWriteApi } from './custom-settings-controller.ts'
import type { CustomSettingsKey } from './custom-settings-state.ts'
import { en, zh } from './locales.ts'

export type { SettingsCustomSectionInjected, SettingsCustomSectionProps } from './SettingsCustomSection.tsx'
export { CustomSettingsController } from './custom-settings-controller.ts'
export type { CustomWriteTarget, SettingsWriteApi } from './custom-settings-controller.ts'
export { collectCustomConfig, emptyCustomState, isObject } from './custom-settings-state.ts'
export type {
  CustomNamespaceView,
  CustomSectionConfig,
  CustomSettingsKey,
  CustomSettingsState,
} from './custom-settings-state.ts'
export { en, zh }

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The custom web-search settings page copy. */
    'web-search-custom': CustomSettingsKey
  }
}

/** Dictionary namespace owned by this plugin (page copy). */
const NS = 'web-search-custom'

/**
 * Required services. The target slot is declared by ui-settings-general's
 * General entry; registration depends on it through `slots.inject()`.
 * `connection` supplies the loopback settings write face.
 */
export const inject = ['slots', 'locale', 'settingsScope', 'connection']

/** id used for the settings.section ledger entry. */
const SECTION_ID = 'jay-web-search-custom'

/**
 * Register the section once the `settings.section` declaration is on the
 * ledger, follow the shared describe mirror, and wire the write face.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'jay-web-search-custom: copy dictionaries')

  const t = ctx.locale.bind(NS) as SettingsCustomSectionInjected['t']
  const connection = ctx.get('connection') as { api?: { settings?: SettingsWriteApi['settings'] } } | undefined
  const settingsFace = connection?.api?.settings
  if (settingsFace === undefined) return
  const controller = new CustomSettingsController(ctx.settingsScope.describe(), { settings: settingsFace })
  ctx.effect(() => () => controller.dispose(), 'jay-web-search-custom: controller teardown')

  const injected = (): Omit<SettingsCustomSectionInjected, never> => ({
    controller,
    hooks: { customSettings: controller.store },
    t,
  })
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: SECTION_ID,
    order: 40,
    label: () => t('title'),
    locale: NS,
    inject: injected,
  }, SettingsCustomSection))
}
