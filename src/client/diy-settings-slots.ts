/**
 * Shared UI label types for the bbg settings section. Values live in
 * `locales.ts`; this module exists so the slots declaration and the section
 * component agree on one key set.
 * @module @jay/dsh-web-search-diy/client-slots
 */

import type { en } from './locales.ts'

/** Locales shared between the injection entry and the section component. */
export type BbgSettingsLocales = typeof en
