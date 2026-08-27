/**
 * The "Custom Web Search" settings page: an enable switch plus the gateway
 * route fields, laid out as native-style two-column rows (label + description
 * left, control right). State arrives through the slot outlet's synthesized
 * `useCustomSettings` selector hook (bound from the inject face's
 * `hooks.customSettings` store); edits write one field back through the
 * controller, so the describe mirror's refresh republishes the committed value.
 * @module dsh-web-search-custom/client-section
 */

import type { InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import styles from './settings-custom.module.css'
import { Combo } from './Combo.tsx'
import type { CustomSettingsController, CustomWriteTarget } from './custom-settings-controller.ts'
import type { CustomSettingsKey, CustomSettingsState } from './custom-settings-state.ts'

/** Model presets for the gateway-route combobox. */
const MODEL_PRESETS = [
  'deepseek-v4-flash',
  'deepseek-v4-pro',
  'deepseek-v4-flash-vision-exp',
  'gpt-5.6-luna',
  'gpt-5.6-terra',
  'claude-sonnet-5',
  'gemini-3.7-flash',
  'gemini-3.5-flash-lite',
  'grok-4.6',
  'glm-5.3',
  'kimi-k3',
  'qwen3.8-max',
] as const

/** Base-URL presets; the shipped default is the single entry for now. */
const BASE_URL_PRESETS = [
  'https://your-gateway.example.com/v1',
] as const

/** Schema defaults mirrored on the client so empty config still renders values. */
const DEFAULT_MODEL = 'deepseek-v4-flash'
const DEFAULT_BASE_URL = 'https://your-gateway.example.com/v1'

/** Injected dependencies of {@link SettingsCustomSection} (slot `inject`). */
export interface SettingsCustomSectionInjected {
  /** The page controller (mirror-following + write face; the component never loads it). */
  controller: CustomSettingsController
  hooks: {
    /** Page snapshot bound by the UI renderer as useCustomSettings. */
    customSettings: SnapshotStore<CustomSettingsState>
  }
  /** Section copy. */
  t: (key: CustomSettingsKey) => string
}

/** Props delivered by the slot outlet: the inject face spread flat. */
export type SettingsCustomSectionProps = Partial<InjectFace<SettingsCustomSectionInjected>>

/**
 * Render nothing until the shell injects dependencies — mirrors the
 * settings-yaml section's contract so unrelated pages stay unaffected.
 */
export function SettingsCustomSection(props: SettingsCustomSectionProps) {
  const { useCustomSettings, t } = props
  if (useCustomSettings === undefined || t === undefined) return null
  return <Page useCustomSettings={useCustomSettings} t={t} controller={props.controller} />
}

function Page({ useCustomSettings, t, controller }: {
  useCustomSettings: NonNullable<SettingsCustomSectionProps['useCustomSettings']>
  t: (key: CustomSettingsKey) => string
  controller?: CustomSettingsController
}) {
  const state = useCustomSettings(snapshot => snapshot)
  if (state.status !== 'ready' || controller === undefined) return null

  const config = state.config
  return (
    <div className={styles.page}>
      <p className={styles.description}>{t('intro')}</p>
      {!state.writable && <p className={styles.readonlyHint}>{t('writableHint')}</p>}
      <div className={styles.rows}>
        <Row
          label={t('enabled')}
          hint={t('enabledDescription')}
        >
          <span className={styles.switch}>
            <input
              type='checkbox'
              checked={config.enabled !== false}
              disabled={!state.writable}
              onChange={(event) => {
                void write(controller, () => ({ kind: 'field', path: ['enabled'], value: event.target.checked }))
              }}
            />
            <span className={styles.track} />
          </span>
        </Row>
        <Row label={t('model')}>
          <Combo
            value={config.model ?? DEFAULT_MODEL}
            presets={MODEL_PRESETS}
            customLabel={t('modelCustom')}
            placeholder={DEFAULT_MODEL}
            disabled={!state.writable}
            ariaLabel={t('model')}
            onChange={(next) => {
              void write(controller, () => ({ kind: 'field', path: ['model'], value: next }))
            }}
          />
        </Row>
        <Row label={t('baseURL')}>
          <Combo
            value={config.baseURL ?? DEFAULT_BASE_URL}
            presets={BASE_URL_PRESETS}
            customLabel={t('baseURLCustom')}
            placeholder={DEFAULT_BASE_URL}
            disabled={!state.writable}
            ariaLabel={t('baseURL')}
            onChange={(next) => {
              void write(controller, () => ({ kind: 'field', path: ['baseURL'], value: next }))
            }}
          />
        </Row>
        <Row label={t('searchContextSize')} hint={t('searchContextSizeDescription')}>
          <select
            className={`${styles.control} ${styles.select}`}
            value={config.searchContextSize ?? 'low'}
            disabled={!state.writable}
            onChange={(event) => {
              void write(controller, () => ({
                kind: 'field',
                path: ['searchContextSize'],
                value: event.target.value,
              }))
            }}
          >
            <option value='low'>low</option>
            <option value='medium'>medium</option>
            <option value='high'>high</option>
          </select>
        </Row>
        <Row label={t('maxOutputTokens')}>
          <input
            className={styles.control}
            type='number'
            min={1}
            max={16384}
            value={config.maxOutputTokens ?? 1024}
            disabled={!state.writable}
            onChange={(event) => {
              const parsed = Number(event.target.value)
              if (Number.isInteger(parsed) && parsed > 0) {
                void write(controller, () => ({ kind: 'field', path: ['maxOutputTokens'], value: parsed }))
              }
            }}
          />
        </Row>
      </div>
    </div>
  )
}

/** One settings row: label (+ optional description) on the left, control right. */
function Row({ label, hint, children }: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className={styles.row}>
      <span className={styles.rowHead}>
        <span className={styles.label}>{label}</span>
        {hint !== undefined && <span className={styles.hintText}>{hint}</span>}
      </span>
      <span className={styles.controlCell}>{children}</span>
    </label>
  )
}

/** Fire one field write; a rejected write leaves the last committed value on screen. */
async function write(controller: CustomSettingsController, target: () => CustomWriteTarget): Promise<void> {
  try {
    await controller.save(target())
  } catch {
    // The mirror's committed value is authoritative; nothing to reconcile here.
  }
}
