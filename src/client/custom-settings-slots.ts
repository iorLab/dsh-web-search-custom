/**
 * Shared UI label types for the custom settings section. Values live in
 * `locales.ts`; this module exists so the slots declaration and the section
 * component agree on one key set.
 * @module dsh-web-search-custom/client-slots
 */

import type { en } from './locales.ts'

/** Locales shared between the injection entry and the section component. */
export type CustomSettingsLocales = typeof en
