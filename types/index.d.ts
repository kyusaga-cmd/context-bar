export type Fill = { percent: number; tokens: number; window: number }
export type Pending = 'handoff' | 'fork' | null

declare module 'claude-code' {
  interface PluginState {
    'context-bar': { fill: Fill | null; pending: Pending }
  }
}
