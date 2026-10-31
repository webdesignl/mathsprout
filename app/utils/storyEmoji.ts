/**
 * A picture word for the story, found by simple keyword matching. No AI and no names are involved,
 * so nothing about the child can leave the app. Returns null when no known word is in the text.
 */
const WORDS: Array<[RegExp, string]> = [
  [/\bapples?\b/i, '🍎'],
  [/\boranges?\b/i, '🍊'],
  [/\bbananas?\b/i, '🍌'],
  [/\bstrawberr(?:y|ies)\b/i, '🍓'],
  [/\b(?:cookies?|biscuits?)\b/i, '🍪'],
  [/\b(?:cakes?|cupcakes?|muffins?)\b/i, '🧁'],
  [/\bpizzas?\b/i, '🍕'],
  [/\b(?:sweets?|candy|candies|chocolates?)\b/i, '🍬'],
  [/\b(?:eggs?)\b/i, '🥚'],
  [/\b(?:buckets?|pails?)\b/i, '🪣'],
  [/\b(?:books?|notebooks?)\b/i, '📘'],
  [/\b(?:pencils?|pens?)\b/i, '✏️'],
  [/\b(?:marbles?|balls?)\b/i, '⚽'],
  [/\b(?:stickers?|stars?)\b/i, '⭐'],
  [/\b(?:flowers?|roses?)\b/i, '🌸'],
  [/\b(?:balloons?)\b/i, '🎈'],
  [/\b(?:cars?|toy cars?)\b/i, '🚗'],
  [/\b(?:coins?|dollars?)\b/i, '🪙'],
  [/\b(?:fish)\b/i, '🐟'],
  [/\b(?:birds?)\b/i, '🐦'],
  [/\b(?:cups?|glasses)\b/i, '🥛'],
  [/\b(?:bottles?|juice|milk|water)\b/i, '🥤'],
  [/\b(?:rope|ribbon|string)\b/i, '🎀'],
  [/\b(?:bags?)\b/i, '👜'],
  [/\b(?:boxes|box)\b/i, '📦'],
  [/\b(?:friends?|children|kids|students|people)\b/i, '🧒'],
]

export function emojiFor(text: string): string | null {
  for (const [pattern, emoji] of WORDS) if (pattern.test(text)) return emoji
  return null
}
