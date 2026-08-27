/**
 * Controller: follows the shared describe mirror (SettingsDescribeFace),
 * derives the page snapshot from this plugin's namespace, and serializes edits
 * as path ops through `connection.api.settings.mutate`, fenced by the
 * namespace revision the mirror holds. Same discipline as dsh-ui-settings-yaml.
 * @module dsh-web-search-custom/client-controller
 */

import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import type { SettingsDescribeFace } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { SettingsPathOpView } from '@deepseek-ai/dsh-api-remotes/client'
import { collectCustomConfig, emptyCustomState, isObject } from './custom-settings-state.ts'
import type { CustomNamespaceView, CustomSectionConfig, CustomSettingsState } from './custom-settings-state.ts'

/** One field write: an object-keyed path inside the namespace. */
export interface CustomFieldWrite {
  kind: 'field'
  path: string[]
  value: unknown
}

/** A write target this controller accepts. */
export type CustomWriteTarget = CustomFieldWrite

/** The write face the controller needs (a structural subset of `connection.api.settings`). */
export interface SettingsWriteApi {
  settings: {
    mutate(payload: {
      ns: string
      ops: SettingsPathOpView[]
      expectedRevision?: number
    }): Promise<{ result: { ok: boolean; value?: unknown; error?: { message: string } } }>
  }
}

/** Build the mutation payload for a field write. */
function buildWrite(target: CustomWriteTarget): { ns: string; ops: SettingsPathOpView[] } {
  return { ns: 'web-search-custom', ops: [{ op: 'set', path: target.path, value: target.value }] }
}

/** Follows the shared describe mirror, derives the page snapshot, and serializes edits. */
export class CustomSettingsController {
  /** uSES-safe state source the section renders from. */
  readonly store: SnapshotStore<CustomSettingsState> = createSnapshotStore<CustomSettingsState>(emptyCustomState())

  private readonly unsubscribe: () => void

  private disposed = false

  /**
   * @param describeFace - the shared mirror's describe face; its refreshes keep
   * this page current, and its per-namespace revision fences each write.
   * @param api - the settings write face.
   */
  constructor(
    private readonly describeFace: SettingsDescribeFace,
    private readonly api: SettingsWriteApi,
  ) {
    this.unsubscribe = describeFace.subscribe(() => { this.publish() })
    // Cheap if the mirror already holds an answer; it is ensured by ui-settings.
    void describeFace.ensure()
    this.publish()
  }

  /** Stop following the mirror. */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.unsubscribe()
  }

  /**
   * Write one value back to the `web-search-custom` namespace, fenced by the
   * latest revision the mirror holds. Resolves when the write settles; the
   * mirror refreshes on the Host document-commit event and republishes.
   * @param target - the field to write.
   */
  async save(target: CustomWriteTarget): Promise<void> {
    const { ns, ops } = buildWrite(target)
    const scope = this.describeFace.getSnapshot().view?.namespaces
      .find(candidate => candidate.ns === ns)
    const response = await this.api.settings.mutate({
      ns,
      ops,
      ...(scope?.revision === undefined ? {} : { expectedRevision: scope.revision }),
    })
    if (!response.result.ok) throw new Error(response.result.error?.message ?? 'settings write failed')
  }

  /** Commit a whole edited section object as one path write (root set). */
  async saveConfig(config: Partial<CustomSectionConfig>): Promise<void> {
    // Root-level sets replace the authored layer wholesale; send only keys the
    // author can edit so credential planes outside this slice stay untouched.
    for (const [key, value] of Object.entries(config)) {
      if (value !== undefined) await this.save({ kind: 'field', path: [key], value })
    }
  }

  private publish(): void {
    /* v8 ignore next -- dispose() unsubscribes, so publish() is never re-entered after
     * disposal; the guard defends a subscription callback that was already queued. */
    if (this.disposed) return
    const mirrored = this.describeFace.getSnapshot()
    if (mirrored.status === 'unavailable') {
      // A remote browser: settings RPCs are loopback-only, so no answer exists.
      this.store.set({ status: 'unavailable', writable: false, config: {}, revision: undefined })
      return
    }
    const view = mirrored.view
    if (view === undefined) {
      // No answer yet; the mirror is loading or idle. Keep the loading state.
      this.store.set(emptyCustomState())
      return
    }
    const projected = collectCustomConfig(view.namespaces as readonly CustomNamespaceView[])
    this.store.set({
      status: 'ready',
      writable: view.writable,
      config: projected.config,
      ...(typeof projected.revision === 'number' ? { revision: projected.revision } : {}),
    })
  }
}

export { isObject }
