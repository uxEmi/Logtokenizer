/**
 * Hash a token string to an HSL color. Same token → same color, every time.
 * This is the visual continuity rule that makes the comparison tab readable.
 */
export function tokenColor(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return {
    bg: `hsl(${hue}, 35%, 15%)`,
    fg: `hsl(${hue}, 50%, 72%)`,
  };
}

export function Token({ text, bold }) {
  // Display whitespace as a visible glyph so chips don't look broken
  const display = text === ' ' ? '·' : text === '\n' ? '↵' : text === '\t' ? '→' : text;
  const c = tokenColor(text);
  return (
    <span
      className="token"
      style={{
        background: c.bg,
        color: c.fg,
        fontWeight: bold ? 500 : 400,
      }}
      title={JSON.stringify(text)}
    >
      {display}
    </span>
  );
}
