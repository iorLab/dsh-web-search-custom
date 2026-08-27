/**
 * The "DIY Web Search" settings page: an enable switch plus the gateway
 * route fields, laid out as native-style two-column rows (label + description
 * left, control right). State arrives through the slot outlet's synthesized
 * `useDiySettings` selector hook (bound from the inject face's
 * `hooks.diySettings` store); edits write one field back through the
 * controller, so the describe mirror's refresh republishes the committed value.
 * @module dsh-web-search-diy/client-section
 */

import type { InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import styles from './settings-diy.module.css'
import type { DiySettingsController, DiyWriteTarget } from './diy-settings-controller.ts'
import type { DiySettingsKey, DiySettingsState } from './diy-settings-state.ts'

/** Injected dependencies of {@link SettingsDiySection} (slot `inject`). */
export interface SettingsDiySectionInjected {
  /** The page controller (mirror-following + write face; the component never loads it). */
  controller: DiySettingsController
  hooks: {
    /** Page snapshot bound by the UI renderer as useDiySettings. */
    diySettings: SnapshotStore<DiySettingsState>
  }
  /** Section copy. */
  t: (key: DiySettingsKey) => string
}

/** Props delivered by the slot outlet: the inject face spread flat. */
export type SettingsDiySectionProps = Partial<InjectFace<SettingsDiySectionInjected>>

/**
 * Render nothing until the shell injects dependencies — mirrors the
 * settings-yaml section's contract so unrelated pages stay unaffected.
 */
export function SettingsDiySection(props: SettingsDiySectionProps) {
  const { useDiySettings, t } = props
  if (useDiySettings === undefined || t === undefined) return null
  return <Page useDiySettings={useDiySettings} t={t} controller={props.controller} />
}

function Page({ useDiySettings, t, controller }: {
  useDiySettings: NonNullable<SettingsDiySectionProps['useDiySettings']>
  t: (key: DiySettingsKey) => string
  controller?: DiySettingsController
}) {
  const state = useDiySettings(snapshot => snapshot)
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
          <input
            className={styles.control}
            type='text'
            value={config.model ?? ''}
            placeholder={t('modelPlaceholder')}
            disabled={!state.writable}
            onChange={(event) => {
              void write(controller, () => ({ kind: 'field', path: ['model'], value: event.target.value }))
            }}
          />
        </Row>
        <Row label={t('baseURL')}>
          <input
            className={styles.control}
            type='text'
            value={config.baseURL ?? ''}
            placeholder={t('baseURLPlaceholder')}
            disabled={!state.writable}
            onChange={(event) => {
              void write(controller, () => ({ kind: 'field', path: ['baseURL'], value: event.target.value }))
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
            value={config.maxOutputTokens ?? ''}
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
async function write(controller: DiySettingsController, target: () => DiyWriteTarget): Promise<void> {
  try {
    await controller.save(target())
  } catch {
    // The mirror's committed value is authoritative; nothing to reconcile here.
  }
}
