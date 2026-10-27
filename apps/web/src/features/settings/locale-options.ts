/** Locales offered in Settings (BCP 47 tags). */
export const LOCALE_TAGS = [
  'en-US',
  'en-GB',
  'de-DE',
  'fr-FR',
  'es-ES',
  'it-IT',
  'nl-NL',
  'pt-BR',
  'pl-PL',
  'cs-CZ',
  'sv-SE',
  'uk-UA',
  'ja-JP',
  'zh-CN',
] as const

/** "English (United States) · en-US": the language name in its own language, then the tag. Falls back to the tag. */
export const localeLabel = (tag: string): string => {
  try {
    const name = new Intl.DisplayNames([tag], { type: 'language' }).of(tag)
    return name && name !== tag ? `${name} · ${tag}` : tag
  } catch {
    return tag
  }
}

/** The browser's own locale, for the "Browser default" option. */
export const browserLocaleLabel = (): string => localeLabel(navigator.language)
