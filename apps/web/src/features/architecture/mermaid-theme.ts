/**
 * Builds Mermaid `themeVariables` from the design tokens in `src/styles/index.css`.
 * The tokens are oklch(); Mermaid's color library can't reliably parse that, so each
 * token is drawn on a 1x1 canvas and read back as sRGB hex.
 */

const SENTINEL = '#010203'

const toHex = (channel: number) => channel.toString(16).padStart(2, '0')

const createConverter = () => {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  return (css: string): string | null => {
    if (!ctx) return null
    // An invalid color leaves fillStyle unchanged, so start from a sentinel to detect that.
    ctx.fillStyle = SENTINEL
    ctx.fillStyle = css
    if (ctx.fillStyle === SENTINEL) return null
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  }
}

export const readMermaidTheme = (isDark: boolean): Record<string, string | boolean> => {
  const styles = getComputedStyle(document.documentElement)
  const convert = createConverter()

  const token = (name: string): string => {
    const value = styles.getPropertyValue(`--${name}`).trim()
    const hex = value ? convert(value) : null
    if (!hex) throw new Error(`Design token --${name} could not be read as a color`)
    return hex
  }

  const background = token('card')
  const foreground = token('foreground')
  const muted = token('muted')
  const mutedForeground = token('muted-foreground')
  const border = token('input')
  const primary = token('primary')
  const primarySoft = token('primary-soft')
  const primarySoftText = token('primary-soft-foreground')
  const neutralSoft = token('neutral-soft')
  const neutralSoftText = token('neutral-soft-foreground')
  const info = token('info')
  const infoSoft = token('info-soft')
  const infoSoftText = token('info-soft-foreground')
  const warning = token('warning')
  const warningSoft = token('warning-soft')
  const warningSoftText = token('warning-soft-foreground')

  return {
    darkMode: isDark,
    fontFamily: styles.fontFamily,
    fontSize: '14px',
    background,

    // Flowchart nodes and clusters
    primaryColor: primarySoft,
    primaryTextColor: primarySoftText,
    primaryBorderColor: primary,
    secondaryColor: neutralSoft,
    secondaryTextColor: neutralSoftText,
    secondaryBorderColor: border,
    tertiaryColor: muted,
    tertiaryTextColor: foreground,
    tertiaryBorderColor: border,
    mainBkg: primarySoft,
    nodeBorder: primary,
    nodeTextColor: primarySoftText,
    clusterBkg: muted,
    clusterBorder: border,
    titleColor: foreground,
    lineColor: mutedForeground,
    defaultLinkColor: mutedForeground,
    textColor: foreground,
    edgeLabelBackground: background,

    // Class diagram
    classText: primarySoftText,

    // State diagram
    stateBkg: primarySoft,
    stateLabelColor: primarySoftText,
    transitionColor: mutedForeground,
    transitionLabelColor: foreground,
    labelBackgroundColor: background,
    labelColor: primarySoftText,
    compositeBackground: muted,
    compositeTitleBackground: neutralSoft,
    compositeBorder: border,
    altBackground: muted,
    specialStateColor: mutedForeground,
    innerEndBackground: primary,

    // Sequence diagram
    actorBkg: infoSoft,
    actorBorder: info,
    actorTextColor: infoSoftText,
    actorLineColor: mutedForeground,
    signalColor: foreground,
    signalTextColor: foreground,
    labelBoxBkgColor: neutralSoft,
    labelBoxBorderColor: border,
    labelTextColor: neutralSoftText,
    loopTextColor: foreground,
    noteBkgColor: warningSoft,
    noteBorderColor: warning,
    noteTextColor: warningSoftText,
    activationBkgColor: primarySoft,
    activationBorderColor: primary,
    sequenceNumberColor: primarySoftText,
  }
}
