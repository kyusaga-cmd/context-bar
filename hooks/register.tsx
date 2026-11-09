import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Fill, Pending } from '../types'

// Progi zapełnienia okna kontekstu (%).
const WARN = 50
const HIGH = 75

// Pasek w stylu Apple: smukła kapsuła, kolory systemowe iOS/macOS.
const BAR_WIDTH = 160
const BAR_HEIGHT = 6
const TRACK = 'rgba(120,120,128,0.22)'
const TONES = {
  ok: ['#34C759', '#30D158'],
  warn: ['#FF9F0A', '#FFB340'],
  high: ['#FF453A', '#FF6961'],
} as const

const fill = atom({ plugin: 'context-bar', key: 'fill' } as const, null)
const pending = atom({ plugin: 'context-bar', key: 'pending' } as const, null)

const HANDOFF_PROMPT = [
  'Przenieś pracę do nowej sesji z kontekstem tej rozmowy.',
  'Użyj mcp__ccd_session__start_session z initiation "user_asked" i context "fresh" (nie "fork" — chodzi o to, żeby nowa sesja zaczynała z małym kontekstem).',
  'W briefie zawrzyj zwięźle: cel, co już zrobione, kluczowe pliki/ścieżki i decyzje, otwarte problemy, następny krok.',
  'Nie kontynuuj zadania tutaj; po starcie sesji odpowiedz jednym zdaniem z linkiem do niej.',
].join('\n')

const FORK_PROMPT = [
  'Rozgałęź tę rozmowę do nowej sesji.',
  'Użyj mcp__ccd_session__start_session z initiation "user_asked" i context "fork".',
  'Brief: kontynuuj od tego miejsca rozmowy i poczekaj na moją następną wiadomość, nic nie zmieniaj na start.',
  'Nie rób nic więcej tutaj; po starcie odpowiedz jednym zdaniem z linkiem do nowej sesji.',
].join('\n')

const formatTokens = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n)

const capsule = (pct: number) => {
  const tone = pct >= HIGH ? TONES.high : pct >= WARN ? TONES.warn : TONES.ok
  const w = pct <= 0 ? 0 : Math.max(BAR_HEIGHT, Math.round((pct / 100) * BAR_WIDTH))
  const r = BAR_HEIGHT / 2
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${BAR_WIDTH}" height="${BAR_HEIGHT}" viewBox="0 0 ${BAR_WIDTH} ${BAR_HEIGHT}">` +
    `<defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="0">` +
    `<stop offset="0" stop-color="${tone[0]}"/><stop offset="1" stop-color="${tone[1]}"/>` +
    `</linearGradient></defs>` +
    `<rect width="${BAR_WIDTH}" height="${BAR_HEIGHT}" rx="${r}" fill="${TRACK}"/>` +
    (w > 0 ? `<rect width="${w}" height="${BAR_HEIGHT}" rx="${r}" fill="url(#g)"/>` : '') +
    `</svg>`
  )
}

export const register: Register = on => {
  on('session.measure', async ($, e, next) => {
    const { percent, tokens, window } = e.context
    const value: Fill | null =
      percent !== undefined && tokens !== undefined ? { percent, tokens, window } : null
    await update($, fill, () => value)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await update($, pending, () => null)

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // Tylko aplikacja desktopowa (zakładka Code).
    if (e.surface !== 'desktop' || e.props.hasSurvey) {
      return next(e)
    }
    const current = await read($, fill)
    if (current === null) {
      return next(e)
    }

    const { Box, Button, Svg, Text } = $.ui.resolve(e)
    const busy = await read($, pending)

    const pct = Math.max(0, Math.min(100, Math.round(current.percent)))
    const hint = pct >= HIGH ? 'Czas na nową sesję' : pct >= WARN ? 'Rośnie zużycie' : null

    const start = (kind: Exclude<Pending, null>) => async () => {
      if ((await read($, pending)) !== null) return
      await update($, pending, () => kind)
      await $.prompt.submit({ text: kind === 'handoff' ? HANDOFF_PROMPT : FORK_PROMPT, asUser: true })
    }

    return (
      <Box flexDirection="row" alignItems="center" justifyContent="space-between" gap="md" paddingX="sm" paddingY="xs">
        <Box flexDirection="row" alignItems="center" gap="sm">
          <Text size="footnote" weight="medium">
            Kontekst
          </Text>
          <Svg source={capsule(pct)} alt={`Kontekst zapełniony w ${pct}%`} width={BAR_WIDTH} height={BAR_HEIGHT} />
          <Text size="footnote" weight="semibold" tabular>
            {pct}%
          </Text>
          <Text size="caption" dimColor tabular>
            {formatTokens(current.tokens)} z {formatTokens(current.window)}
            {hint ? ` · ${hint}` : ''}
          </Text>
        </Box>
        <Box flexDirection="row" alignItems="center" gap="xs">
          {busy ? (
            <Text size="caption" dimColor>
              {busy === 'handoff' ? 'Tworzę nową sesję…' : 'Rozgałęziam…'}
            </Text>
          ) : null}
          {busy ? null : <Button key="fork" label="Rozgałęź" variant="secondary" onPress={start('fork')} />}
          {busy ? null : (
            <Button
              key="handoff"
              label="Nowa sesja z kontekstem"
              variant={pct >= WARN ? 'primary' : 'secondary'}
              onPress={start('handoff')}
            />
          )}
        </Box>
      </Box>
    )
  })
}
