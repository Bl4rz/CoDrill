// A 5x7 bitmap alphabet, used to draw text in places that can't load a font
// file (the OG image). One string per row; X is a lit pixel.
const G: Record<string, string[]> = {
  A: [".XXX.", "X...X", "X...X", "XXXXX", "X...X", "X...X", "X...X"],
  B: ["XXXX.", "X...X", "X...X", "XXXX.", "X...X", "X...X", "XXXX."],
  C: [".XXX.", "X...X", "X....", "X....", "X....", "X...X", ".XXX."],
  D: ["XXXX.", "X...X", "X...X", "X...X", "X...X", "X...X", "XXXX."],
  E: ["XXXXX", "X....", "X....", "XXXX.", "X....", "X....", "XXXXX"],
  F: ["XXXXX", "X....", "X....", "XXXX.", "X....", "X....", "X...."],
  G: [".XXX.", "X...X", "X....", "X.XXX", "X...X", "X...X", ".XXXX"],
  H: ["X...X", "X...X", "X...X", "XXXXX", "X...X", "X...X", "X...X"],
  I: [".XXX.", "..X..", "..X..", "..X..", "..X..", "..X..", ".XXX."],
  J: ["..XXX", "...X.", "...X.", "...X.", "...X.", "X..X.", ".XX.."],
  K: ["X...X", "X..X.", "X.X..", "XX...", "X.X..", "X..X.", "X...X"],
  L: ["X....", "X....", "X....", "X....", "X....", "X....", "XXXXX"],
  M: ["X...X", "XX.XX", "X.X.X", "X.X.X", "X...X", "X...X", "X...X"],
  N: ["X...X", "XX..X", "X.X.X", "X..XX", "X...X", "X...X", "X...X"],
  O: [".XXX.", "X...X", "X...X", "X...X", "X...X", "X...X", ".XXX."],
  P: ["XXXX.", "X...X", "X...X", "XXXX.", "X....", "X....", "X...."],
  Q: [".XXX.", "X...X", "X...X", "X...X", "X.X.X", "X..X.", ".XX.X"],
  R: ["XXXX.", "X...X", "X...X", "XXXX.", "X.X..", "X..X.", "X...X"],
  S: [".XXXX", "X....", "X....", ".XXX.", "....X", "....X", "XXXX."],
  T: ["XXXXX", "..X..", "..X..", "..X..", "..X..", "..X..", "..X.."],
  U: ["X...X", "X...X", "X...X", "X...X", "X...X", "X...X", ".XXX."],
  V: ["X...X", "X...X", "X...X", "X...X", "X...X", ".X.X.", "..X.."],
  W: ["X...X", "X...X", "X...X", "X.X.X", "X.X.X", "XX.XX", "X...X"],
  X: ["X...X", "X...X", ".X.X.", "..X..", ".X.X.", "X...X", "X...X"],
  Y: ["X...X", "X...X", ".X.X.", "..X..", "..X..", "..X..", "..X.."],
  Z: ["XXXXX", "....X", "...X.", "..X..", ".X...", "X....", "XXXXX"],
  ".": [".....", ".....", ".....", ".....", ".....", ".XX..", ".XX.."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
};

/** Rows of a single-color bitmap line of text, glyphs separated by one blank column. */
export function pixelTextRows(text: string): string[] {
  const rows = Array<string>(7).fill("");
  [...text.toUpperCase()].forEach((ch, i) => {
    const glyph = G[ch] ?? G[" "];
    for (let y = 0; y < 7; y++) rows[y] += (i > 0 ? "." : "") + glyph[y].replace(/X/g, "X");
  });
  return rows;
}
