/**
 * Editable combobox for the settings rows: a text input plus a preset
 * dropdown button. Clicking the chevron opens the native popup with the
 * presets plus a "Custom…" entry that just focuses the input; typing always
 * wins, so any gateway value remains reachable.
 * @module dsh-web-search-custom/client-combobox
 */

import { useEffect, useRef } from 'react'
import styles from './settings-custom.module.css'

/** One preset row in the dropdown. */
export interface ComboboxPreset {
  /** Value written when picked (also shown as-is). */
  readonly value: string
}

/**
 * Render the combobox. Controlled: `value` is the committed config value,
 * every keystroke calls {@link onChange} and the describe mirror republishes.
 */
export function Combo({ value, presets, customLabel, placeholder, disabled, ariaLabel, onChange }: {
  value: string
  presets: readonly string[]
  customLabel: string
  placeholder?: string
  disabled?: boolean
  ariaLabel: string
  onChange: (next: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = `custom-combo-list-${ariaLabel.replace(/\s+/gu, '-')}`

  // Keep the visible text aligned with the committed value when it changes
  // underneath us (mirror refresh), without fighting in-flight edits.
  const input = inputRef.current
  useEffect(() => {
    if (input !== null && document.activeElement !== input) input.value = value
  }, [value, input])

  return (
    <span className={styles.combo}>
      <input
        ref={inputRef}
        className={styles.control}
        type='text'
        defaultValue={value}
        placeholder={placeholder}
        disabled={disabled === true}
        aria-label={ariaLabel}
        list={listId}
        onChange={(event) => {
          onChange(event.target.value)
        }}
      />
      <select
        className={`${styles.comboChevron}`}
        disabled={disabled === true}
        aria-label={`${ariaLabel} presets`}
        value=''
        onChange={(event) => {
          const picked = event.target.value
          event.target.value = ''
          if (picked.length > 0) {
            onChange(picked)
            if (inputRef.current !== null) inputRef.current.value = picked
          }
        }}
      >
        <option value='' hidden />
        {presets.map((preset) => (
          <option key={preset} value={preset}>{preset}</option>
        ))}
        <option value='' disabled>{customLabel}</option>
      </select>
    </span>
  )
}
