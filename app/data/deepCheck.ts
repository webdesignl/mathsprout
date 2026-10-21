/**
 * Deep Check: short, fun quizzes that test real understanding of a rule, not just the steps.
 * Every rule has five items, one of each type. All the items here are original. Code decides every answer
 * (see app/utils/deepCheck.ts); AI never grades.
 */

export type ItemType = 'asn' | 'spotMistake' | 'oddOneOut' | 'reverse' | 'draw'

export const ITEM_TYPES: { type: ItemType; label: string; icon: string }[] = [
  { type: 'asn', label: 'Always, sometimes, never', icon: '🎯' },
  { type: 'spotMistake', label: 'Spot the mistake', icon: '🔍' },
  { type: 'oddOneOut', label: 'Which doesn’t belong?', icon: '🧩' },
  { type: 'reverse', label: 'Reverse it', icon: '🔄' },
  { type: 'draw', label: 'Draw it', icon: '✏️' },
]

/** A row of fraction bars for the pictures: whole bars, then extra pieces, each bar cut into `den` pieces. */
export interface BarRow {
  den: number
  wholes?: number
  extra: number
  label: string
  /** Show the cut lines inside the whole bars as dotted lines (a bar being cut into smaller pieces). */
  dotted?: boolean
}

export type Frame =
  | { kind: 'bars'; rows: BarRow[]; caption: string }
  | { kind: 'line'; max: number; marks: { at: number; label: string }[]; gap?: { from: number; to: number; label: string }; caption: string }
  /** An area model: a rectangle of cols × rows boxes. `a` columns are shaded one way and `b` rows another; the overlap is the product. */
  | { kind: 'area'; cols: number; rows: number; a: number; b: number; aLabel: string; bLabel: string; bothLabel: string; caption: string }
  /** A double number line: the amount on top, and jumps of one size on the bottom. Positions are counted in `parts` per 1. */
  | { kind: 'jumps'; parts: number; target: number; top: string; arcs: { from: number; to: number; label: string }[]; caption: string }
  /** Worked lines, like "Wrong: ..." and "Right: ...". */
  | { kind: 'steps'; title: string; lines: { tone: 'wrong' | 'right' | 'plain'; text: string }[]; caption: string }
  /** Keep, change, flip, with a balance showing why it works. */
  | { kind: 'flow'; steps: { word: string; text: string }[]; result: string; balance: { left: string; right: string }; caption: string }

export interface Rule {
  id: string
  title: string
  /** The rule, in plain words. */
  statement: string
  /** The wrong idea this rule fixes. */
  misconception: string
  /** The picture(s) shown in Learn mode. */
  frames: Frame[]
}

/** What the bar builder starts with and what it must end up showing. */
export interface BarStart {
  wholes: number
  pieces: number
  den: number
}

export interface BarTarget {
  den: number
  /** The whole amount counted in pieces of 1/den. */
  total: number
  /** Must be a whole number of bars plus fewer than `den` pieces. */
  proper?: boolean
  /** Must be exactly this many bars and pieces (for regrouping). */
  exact?: { wholes: number; pieces: number }
}

export type ReverseCheck =
  | { kind: 'fractionEqualsNotSimplest'; target: string }
  | { kind: 'mixedEqualsNotSimplest'; target: string }
  | { kind: 'equalsButDifferent'; target: string }
  | { kind: 'fractionEqualsWithDen'; target: string; den: number }
  | { kind: 'fractionEquals'; target: string }
  | { kind: 'fractionSmallerThan'; den: number; than: number }
  | { kind: 'greaterThan'; target: string }
  | { kind: 'divisionEquals'; target: string }
  /** Equal to the target and written as an improper fraction (top not smaller than the bottom). */
  | { kind: 'improperEquals'; target: string }
  /** Any proper fraction: more than 0 and less than 1. */
  | { kind: 'properFraction' }

interface ItemBase {
  id: string
  ruleId: string
  prompt: string
  /** Shown after she answers, right or wrong: the idea in a sentence or two. */
  explanation: string
}

export type AsnAnswer = 'always' | 'sometimes' | 'never'

export type Item =
  | (ItemBase & { type: 'asn'; answer: AsnAnswer })
  | (ItemBase & { type: 'spotMistake'; options: string[]; answer: number })
  | (ItemBase & { type: 'oddOneOut'; options: string[]; answer: number })
  | (ItemBase & { type: 'reverse'; check: ReverseCheck; format: string })
  | (ItemBase & { type: 'draw'; start: BarStart; dens: number[]; target: BarTarget })

export const RULES: Rule[] = [
  {
    id: 'R1',
    title: 'Simplest form',
    statement: 'A fraction is in simplest form when the top and bottom numbers share no factor except 1.',
    misconception: '“Simplest form means the top is smaller.”',
    frames: [
      {
        kind: 'bars',
        rows: [
          { den: 8, extra: 4, label: '4/8' },
          { den: 4, extra: 2, label: '2/4' },
          { den: 2, extra: 1, label: '1/2' },
        ],
        caption: 'Same amount, fewer and bigger pieces. 1/2 cannot be merged any more: 1 and 2 share no factor except 1.',
      },
    ],
  },
  {
    id: 'R2',
    title: 'Mixed numbers in simplest form',
    statement: 'A mixed number in simplest form has a proper fraction part that is also in simplest form.',
    misconception: '“3 6/5 is fine as a mixed number.”',
    frames: [
      {
        kind: 'bars',
        rows: [
          { den: 5, wholes: 3, extra: 6, label: '3 6/5' },
          { den: 5, wholes: 4, extra: 1, label: '4 1/5' },
        ],
        caption: 'Five pieces of 1/5 fill one whole bar. The 6/5 has a whole inside it, so 3 6/5 = 4 1/5.',
      },
    ],
  },
  {
    id: 'R3',
    title: 'Equal forms',
    statement: 'Different-looking numbers can be equal. 2 6/8 = 2 3/4 = 11/4, even though not every form is the simplest.',
    misconception: '“If they look different, they are different amounts.”',
    frames: [
      {
        kind: 'bars',
        rows: [
          { den: 4, wholes: 2, extra: 3, label: '2 3/4' },
          { den: 8, wholes: 2, extra: 6, label: '2 6/8' },
          { den: 4, wholes: 0, extra: 11, label: '11/4' },
        ],
        caption: 'The same length of bar, cut in different ways. Same amount.',
      },
    ],
  },
  {
    id: 'R4',
    title: 'Same bottom first',
    statement: 'To add or subtract fractions, rename them so the bottom numbers match first. Then add or subtract the tops.',
    misconception: '“Add the tops and add the bottoms.”',
    frames: [
      {
        kind: 'bars',
        rows: [
          { den: 2, extra: 1, label: '1/2' },
          { den: 3, extra: 1, label: '1/3' },
          { den: 6, extra: 3, label: '3/6' },
          { den: 6, extra: 2, label: '2/6' },
          { den: 6, extra: 5, label: '3/6 + 2/6 = 5/6' },
        ],
        caption: 'Cut both bars into sixths so the pieces are the same size. Now 3 pieces and 2 pieces make 5 pieces.',
      },
    ],
  },
  {
    id: 'R5',
    title: 'Regroup one whole',
    statement: 'When the fraction part you take away is bigger, break one whole into pieces first. Then subtract.',
    misconception: '“8 4/20 − 4 15/20: just do 15 − 4.”',
    frames: [
      {
        kind: 'bars',
        rows: [
          { den: 20, wholes: 8, extra: 4, label: '8 4/20' },
          { den: 20, wholes: 7, extra: 24, label: '7 24/20' },
        ],
        caption: 'Break one whole bar into 20/20. Now there are 24 pieces, enough to take 15 away: 7 24/20 − 4 15/20 = 3 9/20.',
      },
    ],
  },
  {
    id: 'R6',
    title: 'Check by adding back',
    statement: 'Check a subtraction by adding the answer back to the part you took away. You should get the number you started with.',
    misconception: '“My first answer must be right.”',
    frames: [
      {
        kind: 'bars',
        rows: [
          { den: 4, extra: 3, label: '3/4 − 1/4 = 2/4' },
          { den: 4, extra: 2, label: '2/4' },
          { den: 4, extra: 3, label: '2/4 + 1/4 = 3/4 ✓' },
        ],
        caption: 'Join the parts back together. If they fill the first bar again, the answer is right.',
      },
    ],
  },
  {
    id: 'R7',
    title: 'Greatest difference',
    statement: 'The greatest difference is the biggest first number take away the smallest second number.',
    misconception: '“Just try pairs until one looks big.”',
    frames: [
      {
        kind: 'line',
        max: 8,
        marks: [
          { at: 0.75, label: '3/4' },
          { at: 7.75, label: '7 3/4' },
        ],
        gap: { from: 0.75, to: 7.75, label: 'gap = 7' },
        caption: 'The most spread out pair gives the longest gap: the biggest number and the smallest number.',
      },
    ],
  },
  {
    id: 'R8',
    title: 'Division is a fraction',
    statement: 'a ÷ b is the same as a/b. Sharing 5 tarts equally among 8 friends gives each friend 5/8 of a tart.',
    misconception: '“Division and fractions are not related.”',
    frames: [
      {
        kind: 'bars',
        rows: [{ den: 8, extra: 5, label: '5 ÷ 8 = 5/8' }],
        caption: 'Cut each of the 5 tarts into 8 parts and give each friend one part from every tart. Or: 5 pieces out of 8 in one bar.',
      },
    ],
  },
  {
    id: 'R9',
    title: 'The Setup Rule: improper fractions',
    statement: 'Always change mixed numbers into improper fractions before you multiply or divide. A whole number gets a 1 underneath, like 5 = 5/1.',
    misconception: '“Multiply the wholes together and the fractions together: 2 1/2 × 2 1/2 = 4 1/4.”',
    frames: [
      {
        kind: 'bars',
        rows: [{ den: 2, wholes: 2, extra: 1, label: '2 1/2 is 3 candy bars: two full and one half', dotted: true }],
        caption: 'Cut every bar in half (the dotted lines). Now you can count 5 half-bars, so 2 1/2 = 5/2. The wholes cannot be left on their own.',
      },
      {
        kind: 'bars',
        rows: [{ den: 2, extra: 7, label: '3 1/2 metres is 7 halves: 7/2' }],
        caption: 'An improper fraction is just counting pieces. 7/2 is seven things, and each thing is a half.',
      },
      {
        kind: 'steps',
        title: '2 1/2 × 2 1/2',
        lines: [
          { tone: 'wrong', text: 'Wrong: 2 × 2 = 4 and 1/2 × 1/2 = 1/4, so 4 1/4' },
          { tone: 'right', text: 'Right: 5/2 × 5/2 = 25/4 = 6 1/4' },
        ],
        caption: 'Splitting a mixed number into parts leaves out the pieces where the whole and the fraction multiply each other.',
      },
    ],
  },
  {
    id: 'R10',
    title: 'The Multiplication Meaning Rule',
    statement: 'Multiplying by a proper fraction means taking a part of something, so the answer is smaller.',
    misconception: '“Multiplication always makes a number bigger.”',
    frames: [
      {
        kind: 'area',
        cols: 4,
        rows: 2,
        a: 3,
        b: 1,
        aLabel: 'Blue: 3/4 of the rectangle',
        bLabel: 'Yellow: 1/2 of the rectangle',
        bothLabel: 'Green: both, 3 of 8 boxes',
        caption: 'Take 1/2 of 3/4. The part with both colors is 3 of the 8 boxes: 3/4 × 1/2 = 3/8. A part of a part is smaller.',
      },
      {
        kind: 'area',
        cols: 4,
        rows: 5,
        a: 3,
        b: 2,
        aLabel: 'Blue: 3/4 (3 of 4 columns)',
        bLabel: 'Yellow: 2/5 (2 of 5 rows)',
        bothLabel: 'Green: both, 6 of 20 boxes',
        caption: 'Slicing two ways makes 4 × 5 = 20 new, smaller boxes. The tops multiply (3 × 2 = 6) and the bottoms multiply (4 × 5 = 20): 3/4 × 2/5 = 6/20 = 3/10.',
      },
    ],
  },
  {
    id: 'R11',
    title: 'The Division Meaning Rule',
    statement: 'Dividing by a proper fraction asks how many times a small piece fits into a bigger amount, so the answer is bigger.',
    misconception: '“Division always makes things smaller”, or thinking 3/4 ÷ 1/2 means taking half of 3/4.',
    frames: [
      {
        kind: 'jumps',
        parts: 4,
        target: 3,
        top: '3/4',
        arcs: [
          { from: 0, to: 2, label: '1 jump of 1/2' },
          { from: 2, to: 3, label: 'half a jump' },
        ],
        caption: 'How many jumps of 1/2 fit into 3/4? One full jump, and then half a jump to land on 3/4. So 3/4 ÷ 1/2 = 1 1/2.',
      },
      {
        kind: 'steps',
        title: 'A snail climbs 2/3 of a foot every hour. How long to climb 6 feet?',
        lines: [
          { tone: 'plain', text: '6 feet is 18 thirds, because every foot is 3 thirds.' },
          { tone: 'plain', text: 'Each jump is 2 thirds.' },
          { tone: 'right', text: '18 ÷ 2 = 9 jumps: more jumps than feet, because each jump is smaller than 1 foot.' },
        ],
        caption: 'Dividing by a number less than 1 always gives a bigger answer than the number you started with.',
      },
    ],
  },
  {
    id: 'R12',
    title: 'The Keep-Change-Flip Rule',
    statement: 'To divide fractions, multiply the first fraction by the reciprocal (the flipped version) of the second fraction.',
    misconception: '“Divide the tops and divide the bottoms straight across”, which makes messy fractions inside fractions.',
    frames: [
      {
        kind: 'flow',
        steps: [
          { word: 'Keep', text: 'Keep the first fraction: 3/4' },
          { word: 'Change', text: 'Change ÷ into ×' },
          { word: 'Flip', text: 'Flip the second fraction: 2/3 becomes 3/2' },
        ],
        result: '3/4 ÷ 2/3 = 3/4 × 3/2 = 9/8 = 1 1/8',
        balance: { left: 'Total ÷ size of a group', right: 'Total × groups in one whole' },
        caption: 'Dividing by a size and multiplying by how many of them fit in 1 give the same amount, so the two sides of the scale balance.',
      },
    ],
  },
  {
    id: 'R13',
    title: 'What is the whole right now?',
    statement: 'A fraction is always a fraction of something. When the amount changes, the whole changes too. Ask: what is the whole right now?',
    misconception: '“Every fraction in the story is a fraction of the very first amount.”',
    frames: [
      {
        kind: 'bars',
        rows: [
          { den: 2, extra: 1, label: 'Morning: sells 1/2 of the batch. 1/2 of the batch is left.' },
          { den: 4, extra: 1, label: 'Afternoon: sells 1/2 of what is left. 1/4 of the batch is left.' },
        ],
        caption: 'The second 1/2 is half of the half that is left, not half of the whole batch.',
      },
      {
        kind: 'steps',
        title: '24 tarts: sell 1/2, then 1/2 of the rest',
        lines: [
          { tone: 'wrong', text: 'Wrong: 1/2 + 1/2 = all of them, so none are left.' },
          { tone: 'right', text: 'Right: 12 are left. Half of those 12 is 6 sold, so 6 are left. 6 is 1/4 of 24.' },
        ],
        caption: 'Before each step, ask: what is the whole right now?',
      },
    ],
  },
  {
    id: 'R14',
    title: '“Of” means multiply',
    statement: '“Of” means multiply. 1/2 of 3/4 is 1/2 × 3/4 = 3/8. It is not a division.',
    misconception: '“1/2 of 3/4 means divide 3/4 by 1/2.”',
    frames: [
      {
        kind: 'bars',
        rows: [
          { den: 4, extra: 3, label: '3/4' },
          { den: 8, extra: 3, label: 'Half of 3/4 = 3/8' },
        ],
        caption: 'Cut every quarter in half. 3/4 is 6 eighths, and half of them is 3 eighths: 3/8.',
      },
      {
        kind: 'steps',
        title: '1/2 of 3/4',
        lines: [
          { tone: 'wrong', text: 'Wrong: 3/4 ÷ 1/2 = 1 1/2. That is bigger, but half of something is smaller.' },
          { tone: 'right', text: 'Right: 1/2 of 3/4 = 1/2 × 3/4 = 3/8. A part of a part is smaller.' },
        ],
        caption: 'If the question says “of”, multiply.',
      },
    ],
  },
  {
    id: 'R15',
    title: 'Multiply straight across',
    statement: 'To multiply fractions, multiply the tops together and the bottoms together. You do not need a common bottom number. A whole number is a fraction over 1.',
    misconception: '“You have to rename to a common bottom number before you multiply.”',
    frames: [
      {
        kind: 'area',
        cols: 4,
        rows: 3,
        a: 3,
        b: 2,
        aLabel: 'Blue: 3/4 (3 of 4 columns)',
        bLabel: 'Yellow: 2/3 (2 of 3 rows)',
        bothLabel: 'Green: both, 6 of 12 boxes',
        caption: 'The tops multiply: 2 × 3 = 6. The bottoms multiply: 3 × 4 = 12. So 2/3 × 3/4 = 6/12 = 1/2.',
      },
    ],
  },
  {
    id: 'R16',
    title: 'Simplify before you multiply',
    statement: 'Before you multiply, simplify a top with a bottom that share a factor. Only a top with a bottom, never two tops or two bottoms.',
    misconception: '“Cancel any two numbers that match, even two tops.”',
    frames: [
      {
        kind: 'steps',
        title: '4/9 × 3/8',
        lines: [
          { tone: 'plain', text: 'The top 4 and the bottom 8 share 4: 4 becomes 1 and 8 becomes 2.' },
          { tone: 'plain', text: 'The top 3 and the bottom 9 share 3: 3 becomes 1 and 9 becomes 3.' },
          { tone: 'right', text: 'Now it is 1/3 × 1/2 = 1/6, with small numbers all the way.' },
          { tone: 'wrong', text: 'Never cancel two tops, like 2/5 × 2/3. That is 4/15, not 1/15.' },
        ],
        caption: 'Simplifying first keeps the numbers small and the answer already in simplest form.',
      },
    ],
  },
  {
    id: 'R17',
    title: 'Times 1/n is divided by n',
    statement: 'Multiplying by 1/3 is the same as dividing by 3. Both take one equal part out of 3.',
    misconception: '“Multiplying and dividing always do opposite things, so × 1/3 cannot be ÷ 3.”',
    frames: [
      {
        kind: 'bars',
        rows: [
          { den: 5, extra: 2, label: '2/5' },
          { den: 15, extra: 2, label: '2/5 × 1/3 = 2/15' },
        ],
        caption: 'Cut every fifth into 3 equal pieces: 2 fifths become 2 fifteenths. One third of 2/5 is the same as 2/5 ÷ 3.',
      },
    ],
  },
  {
    id: 'R18',
    title: 'Digit cards: the greatest product',
    statement: 'To make the greatest product from four digit cards in □ × □ □/□, put the biggest digit in front, the next biggest as the whole part, and use the two smallest digits for the fraction with the smaller on top. The fraction must be proper and in simplest form.',
    misconception: '“Just try every arrangement until one looks big.”',
    frames: [
      {
        kind: 'steps',
        title: 'Digits 2, 3, 4 and 8 in □ × □ □/□',
        lines: [
          { tone: 'plain', text: '1. The biggest digit, 8, goes in front, on its own.' },
          { tone: 'plain', text: '2. The next biggest, 4, is the whole part of the mixed number.' },
          { tone: 'plain', text: '3. The two smallest digits, 2 and 3, make the fraction. The smaller goes on top, so it is 2/3.' },
          { tone: 'right', text: '8 × 4 2/3 = 8 × 14/3 = 112/3 = 37 1/3' },
        ],
        caption: 'The digit in front multiplies both the whole part and the fraction part, so the biggest digit there adds the most.',
      },
    ],
  },
]

/** The topics the rules sit under. A group with no rules yet shows "coming soon". */
export interface RuleGroup {
  id: string
  title: string
  summary: string
  ruleIds: string[]
}

export const RULE_GROUPS: RuleGroup[] = [
  {
    id: 'addsub',
    title: 'Fraction addition and subtraction',
    summary: 'Simplest form, mixed numbers, equal forms, renaming, regrouping and checking.',
    ruleIds: ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8'],
  },
  {
    id: 'muldiv',
    title: 'Fraction multiplication and division',
    summary: 'Setting up mixed numbers, what multiplying and dividing by fractions mean, the shortcuts, and the greatest-product plan.',
    ruleIds: ['R9', 'R10', 'R11', 'R12', 'R13', 'R14', 'R15', 'R16', 'R17', 'R18'],
  },
]

export const ITEMS: Item[] = [
  // ---------------- R1: simplest form ----------------
  {
    id: 'R1-asn', ruleId: 'R1', type: 'asn',
    prompt: 'A fraction whose top number is smaller than its bottom number is in simplest form.',
    answer: 'sometimes',
    explanation: '3/5 is in simplest form, but 4/8 is not, even though 4 is smaller than 8. What matters is whether the top and bottom share a factor, not which is bigger.',
  },
  {
    id: 'R1-spot', ruleId: 'R1', type: 'spotMistake',
    prompt: 'Dev says 6/9 is in simplest form because 6 is smaller than 9. What should Dev check instead?',
    options: [
      'Whether 6 and 9 share a factor other than 1',
      'Whether 9 is an even number',
      'Whether 6 is bigger than 3',
      'Whether the fraction is bigger than 1/2',
    ],
    answer: 0,
    explanation: '6 and 9 are both in the 3 times table, so 6/9 can be merged into 2/3. Always look for a shared factor.',
  },
  {
    id: 'R1-odd', ruleId: 'R1', type: 'oddOneOut',
    prompt: 'Three of these are NOT in simplest form. Which one does not belong?',
    options: ['2/4', '3/6', '4/8', '5/8'],
    answer: 3,
    explanation: '2/4, 3/6 and 4/8 can all be merged into 1/2. 5/8 has no shared factor, so it is already in simplest form.',
  },
  {
    id: 'R1-rev', ruleId: 'R1', type: 'reverse',
    prompt: 'Write a fraction that equals 3/4 but is NOT in simplest form.',
    format: 'Write a fraction with a slash.',
    check: { kind: 'fractionEqualsNotSimplest', target: '3/4' },
    explanation: 'Any fraction made by doubling or tripling both numbers works: 6/8, 9/12, 12/16. They all equal 3/4, but they can still be merged.',
  },
  {
    id: 'R1-draw', ruleId: 'R1', type: 'draw',
    prompt: 'The bar shows 4/8. Merge the pieces until it shows the fraction in simplest form.',
    start: { wholes: 0, pieces: 4, den: 8 },
    dens: [8, 4, 2],
    target: { den: 2, total: 1 },
    explanation: '4/8 merges into 2/4, and then into 1/2. You cannot merge 1/2 any more.',
  },

  // ---------------- R2: mixed numbers ----------------
  {
    id: 'R2-asn', ruleId: 'R2', type: 'asn',
    prompt: 'In a mixed number in simplest form, the fraction part is less than 1.',
    answer: 'always',
    explanation: 'If the fraction part were 1 or more, there would be another whole hiding inside it. Regroup it into the whole number.',
  },
  {
    id: 'R2-spot', ruleId: 'R2', type: 'spotMistake',
    prompt: 'Ria wrote her answer as 5 7/5. What should she fix?',
    options: [
      'Regroup: 7/5 is more than a whole, so the answer is 6 2/5',
      'Make the whole number smaller',
      'Change the 5 on the bottom to a 7',
      'Nothing, it is fine as it is',
    ],
    answer: 0,
    explanation: '7/5 = 1 2/5, so 5 7/5 = 5 + 1 + 2/5 = 6 2/5. The fraction part must be less than 1.',
  },
  {
    id: 'R2-odd', ruleId: 'R2', type: 'oddOneOut',
    prompt: 'These all equal the same amount. Only one is in simplest mixed-number form. Which one?',
    options: ['4 1/5', '3 6/5', '21/5', '4 2/10'],
    answer: 0,
    explanation: '3 6/5 has a fraction part bigger than 1. 21/5 is not a mixed number. 4 2/10 can be merged. 4 1/5 is the only simplest one.',
  },
  {
    id: 'R2-rev', ruleId: 'R2', type: 'reverse',
    prompt: 'Write a mixed number that is NOT in simplest form but equals 2 1/3.',
    format: 'Write a mixed number: a whole number, a space, then a fraction.',
    check: { kind: 'mixedEqualsNotSimplest', target: '2 1/3' },
    explanation: 'You can regroup a whole into thirds: 1 4/3 = 2 1/3. Or cut every piece smaller: 2 2/6 = 2 1/3. Both are equal but not simplest.',
  },
  {
    id: 'R2-draw', ruleId: 'R2', type: 'draw',
    prompt: 'The bars show 3 6/5. Regroup the pieces so it shows the mixed number in simplest form.',
    start: { wholes: 3, pieces: 6, den: 5 },
    dens: [5],
    target: { den: 5, total: 21, proper: true },
    explanation: 'Five pieces of 1/5 make a whole. Take them out of the 6/5 and add a whole: 4 1/5.',
  },

  // ---------------- R3: equal forms ----------------
  {
    id: 'R3-asn', ruleId: 'R3', type: 'asn',
    prompt: 'Two numbers that look different are worth different amounts.',
    answer: 'sometimes',
    explanation: '1/2 and 2/3 are different amounts, but 1/2 and 2/4 look different and are equal. You have to check the value.',
  },
  {
    id: 'R3-spot', ruleId: 'R3', type: 'spotMistake',
    prompt: 'Mina says 2 6/8 and 11/4 cannot be equal because they look so different. What is wrong with her thinking?',
    options: [
      'Different-looking numbers can name the same amount: 2 6/8 = 2 3/4 = 11/4',
      '11/4 is the smaller one',
      'A mixed number is always bigger',
      'She should only compare the bottom numbers',
    ],
    answer: 0,
    explanation: '2 6/8 merges to 2 3/4, and 2 3/4 is 11 quarters. All three name the same amount.',
  },
  {
    id: 'R3-odd', ruleId: 'R3', type: 'oddOneOut',
    prompt: 'Three of these name the same amount. Which one does not belong?',
    options: ['11/4', '2 3/4', '1 7/4', '2 4/5'],
    answer: 3,
    explanation: '11/4, 2 3/4 and 1 7/4 are all 2 and 3 quarters. 2 4/5 is a little bigger.',
  },
  {
    id: 'R3-rev', ruleId: 'R3', type: 'reverse',
    prompt: 'Write a different way to show 11/4. It must look different from 11/4.',
    format: 'You can write a fraction, a mixed number or a whole number.',
    check: { kind: 'equalsButDifferent', target: '11/4' },
    explanation: 'Some ways: 2 3/4, 22/8, 1 7/4. They are all the same amount cut or grouped differently.',
  },
  {
    id: 'R3-draw', ruleId: 'R3', type: 'draw',
    prompt: 'Show 11/4 on bars cut into 8ths. Add whole bars and pieces until the amount is the same.',
    start: { wholes: 0, pieces: 0, den: 8 },
    dens: [8],
    target: { den: 8, total: 22 },
    explanation: '11/4 is the same as 22/8, or 2 6/8. Any way that makes 22 eighths works.',
  },

  // ---------------- R4: same bottom first ----------------
  {
    id: 'R4-asn', ruleId: 'R4', type: 'asn',
    prompt: 'To add fractions with different bottom numbers, first rename them so the bottoms match.',
    answer: 'always',
    explanation: 'You can only add pieces that are the same size. Renaming makes the pieces the same size.',
  },
  {
    id: 'R4-spot', ruleId: 'R4', type: 'spotMistake',
    prompt: 'Sam worked out 1/4 + 2/5 and wrote 3/9. What did Sam do wrong?',
    options: [
      'Added the tops and also added the bottoms; the bottoms must be renamed to match first',
      'Forgot to simplify the answer',
      'Should have subtracted instead',
      'Nothing, 3/9 is right',
    ],
    answer: 0,
    explanation: 'Quarters and fifths are different sizes. Rename both as twentieths: 5/20 + 8/20 = 13/20.',
  },
  {
    id: 'R4-odd', ruleId: 'R4', type: 'oddOneOut',
    prompt: 'Three of these can be a common bottom number for 1/2 and 1/3. Which one cannot?',
    options: ['6', '12', '18', '10'],
    answer: 3,
    explanation: '6, 12 and 18 are all in both the 2 and the 3 times tables. 10 is not in the 3 times table.',
  },
  {
    id: 'R4-rev', ruleId: 'R4', type: 'reverse',
    prompt: 'Write a fraction that equals 1/2 and has 6 on the bottom.',
    format: 'Write a fraction with a slash.',
    check: { kind: 'fractionEqualsWithDen', target: '1/2', den: 6 },
    explanation: '1/2 is half of the bar. In sixths, half of 6 pieces is 3 pieces: 3/6.',
  },
  {
    id: 'R4-draw', ruleId: 'R4', type: 'draw',
    prompt: 'The bar shows 1/2. Re-cut it into sixths so you can add it to other sixths.',
    start: { wholes: 0, pieces: 1, den: 2 },
    dens: [2, 3, 6],
    target: { den: 6, total: 3 },
    explanation: 'Cutting each half into 3 pieces gives 3 sixths. 1/2 = 3/6.',
  },

  // ---------------- R5: regroup one whole ----------------
  {
    id: 'R5-asn', ruleId: 'R5', type: 'asn',
    prompt: 'In 8 4/20 − 4 15/20, you can find the fraction part by doing 15 − 4.',
    answer: 'never',
    explanation: '4/20 is smaller than 15/20, so you cannot take 15 pieces from 4. Break one whole into 20 more pieces first.',
  },
  {
    id: 'R5-spot', ruleId: 'R5', type: 'spotMistake',
    prompt: 'Kai worked out 8 4/20 − 4 15/20 and got 4 11/20 by doing 15 − 4 for the fraction part. What should Kai do first?',
    options: [
      'Regroup: break one whole into 20/20, so 8 4/20 becomes 7 24/20',
      'Add 4/20 and 15/20',
      'Subtract the bottom numbers',
      'Turn the answer into a mixed number',
    ],
    answer: 0,
    explanation: '7 24/20 − 4 15/20 = 3 9/20. Checking by adding back: 3 9/20 + 4 15/20 = 8 4/20.',
  },
  {
    id: 'R5-odd', ruleId: 'R5', type: 'oddOneOut',
    prompt: 'Three of these need regrouping before you subtract. Which one does not?',
    options: ['5 3/8 − 1 5/8', '7 1/6 − 2 4/6', '6 5/9 − 2 4/9', '4 2/5 − 1 3/5'],
    answer: 2,
    explanation: 'Only 6 5/9 − 2 4/9 has a big enough fraction part: 5/9 is more than 4/9. In the others, the first fraction part is smaller.',
  },
  {
    id: 'R5-rev', ruleId: 'R5', type: 'reverse',
    prompt: 'In 6 ?/8 − 2 5/8, which fraction on the ? would make you need to regroup? Type a fraction with 8 on the bottom.',
    format: 'Write a fraction with a slash.',
    check: { kind: 'fractionSmallerThan', den: 8, than: 5 },
    explanation: 'You need to regroup when the first fraction part is smaller than 5/8. 1/8, 2/8, 3/8 and 4/8 all work.',
  },
  {
    id: 'R5-draw', ruleId: 'R5', type: 'draw',
    prompt: 'The bars show 8 4/20. Break one whole into twentieths so you can subtract 4 15/20.',
    start: { wholes: 8, pieces: 4, den: 20 },
    dens: [20],
    target: { den: 20, total: 164, exact: { wholes: 7, pieces: 24 } },
    explanation: 'Breaking a whole gives 20 more pieces: 8 wholes and 4 pieces becomes 7 wholes and 24 pieces. Same amount.',
  },

  // ---------------- R6: check by adding back ----------------
  {
    id: 'R6-asn', ruleId: 'R6', type: 'asn',
    prompt: 'If you add your subtraction answer to the number you took away, you get the number you started with.',
    answer: 'always',
    explanation: 'Subtracting and adding back undo each other. If they do not match, there is a mistake somewhere.',
  },
  {
    id: 'R6-spot', ruleId: 'R6', type: 'spotMistake',
    prompt: 'Lee worked out 9/10 − 3/10 = 7/10 and says it looks about right. How can Lee check?',
    options: [
      'Add 7/10 and 3/10. It makes 10/10, not 9/10, so the answer is wrong',
      'Subtract again, the same way',
      'Add the bottom numbers',
      'Ask which answer looks biggest',
    ],
    answer: 0,
    explanation: 'The right answer is 6/10, because 6/10 + 3/10 = 9/10. Adding back finds the mistake.',
  },
  {
    id: 'R6-odd', ruleId: 'R6', type: 'oddOneOut',
    prompt: 'Three of these are good ways to check 5/6 − 2/6 = 3/6. Which one is not?',
    options: ['3/6 + 2/6 = 5/6', '5/6 − 3/6 = 2/6', '5/6 + 2/6 = 7/6', 'Draw 5 sixths and cross out 2'],
    answer: 2,
    explanation: 'Adding 2/6 to the starting number goes the wrong way. A check must get back to the start or find the part taken away.',
  },
  {
    id: 'R6-rev', ruleId: 'R6', type: 'reverse',
    prompt: '7/8 − 3/8 = 4/8. To check, you add 4/8 and a fraction to get 7/8. What is the fraction?',
    format: 'Write a fraction with a slash.',
    check: { kind: 'fractionEquals', target: '3/8' },
    explanation: 'The part you took away, 3/8, goes back: 4/8 + 3/8 = 7/8.',
  },
  {
    id: 'R6-draw', ruleId: 'R6', type: 'draw',
    prompt: '3/4 − 1/4 = 2/4. The bar shows 2/4. Add the piece you took away to check you get 3/4.',
    start: { wholes: 0, pieces: 2, den: 4 },
    dens: [4],
    target: { den: 4, total: 3 },
    explanation: '2/4 plus the 1/4 you took away makes 3/4 again. The check works.',
  },

  // ---------------- R7: greatest difference ----------------
  {
    id: 'R7-asn', ruleId: 'R7', type: 'asn',
    prompt: 'To get the greatest difference, subtract the smallest second number from the biggest first number.',
    answer: 'always',
    explanation: 'The biggest number take away the smallest number leaves the longest gap.',
  },
  {
    id: 'R7-spot', ruleId: 'R7', type: 'spotMistake',
    prompt: 'Pia wants the greatest difference. The first list is 4 1/2, 6 1/4, 5. The second list is 1 1/2, 2 1/4, 3/4. She did 6 1/4 − 2 1/4. What is wrong?',
    options: [
      'She should use the smallest number from the second list, 3/4',
      'She should use the smallest number from the first list',
      'She should add the numbers',
      'Nothing, it is the greatest difference',
    ],
    answer: 0,
    explanation: '6 1/4 − 3/4 = 5 1/2, which is bigger than 6 1/4 − 2 1/4 = 4.',
  },
  {
    id: 'R7-odd', ruleId: 'R7', type: 'oddOneOut',
    prompt: 'The first list is 5 1/2, 7 3/4, 6 1/4. The second list is 1 1/4, 2 1/2, 3/4. Only one of these is the greatest difference. Which one?',
    options: ['7 3/4 − 3/4', '7 3/4 − 2 1/2', '6 1/4 − 3/4', '5 1/2 − 3/4'],
    answer: 0,
    explanation: 'Biggest first number, 7 3/4, take away the smallest second number, 3/4, leaves 7.',
  },
  {
    id: 'R7-rev', ruleId: 'R7', type: 'reverse',
    prompt: 'Write a number to put at the start so that [number] − 1/4 has a greater difference than 5 − 1/4.',
    format: 'You can write a whole number, a fraction or a mixed number.',
    check: { kind: 'greaterThan', target: '5' },
    explanation: 'Any number bigger than 5 works, because a bigger first number leaves a longer gap.',
  },
  {
    id: 'R7-draw', ruleId: 'R7', type: 'draw',
    prompt: 'Show the gap between 1/2 and 7/8: shade the pieces of eighths that fill the gap.',
    start: { wholes: 0, pieces: 0, den: 8 },
    dens: [8],
    target: { den: 8, total: 3 },
    explanation: '1/2 is 4/8. From 4/8 up to 7/8 is 3 pieces, so the gap is 3/8.',
  },

  // ---------------- R8: division is a fraction ----------------
  {
    id: 'R8-asn', ruleId: 'R8', type: 'asn',
    prompt: '5 ÷ 8 is the same amount as 5/8.',
    answer: 'always',
    explanation: 'Sharing 5 equally among 8 gives each share 5/8. A fraction bar means divide.',
  },
  {
    id: 'R8-spot', ruleId: 'R8', type: 'spotMistake',
    prompt: 'Noor shares 3 pies equally among 4 friends and says each friend gets 4/3 of a pie. What should Noor fix?',
    options: [
      'The amount being shared goes on top: each friend gets 3/4 of a pie',
      'Each friend gets 3 whole pies',
      'Each friend gets 1/4 of a pie',
      'Each friend gets 7/4 of a pie',
    ],
    answer: 0,
    explanation: '3 ÷ 4 = 3/4. The number being shared is the top number.',
  },
  {
    id: 'R8-odd', ruleId: 'R8', type: 'oddOneOut',
    prompt: 'Three of these equal 2/3. Which one does not belong?',
    options: ['2 ÷ 3', '4/6', '3 ÷ 2', '6 ÷ 9'],
    answer: 2,
    explanation: '3 ÷ 2 is 3/2, not 2/3. The other three are all 2/3.',
  },
  {
    id: 'R8-rev', ruleId: 'R8', type: 'reverse',
    prompt: 'Write a division of two whole numbers that equals 3/5. Use ÷ or the words “divided by”.',
    format: 'Use ÷ or the words “divided by”.',
    check: { kind: 'divisionEquals', target: '3/5' },
    explanation: '3 ÷ 5 = 3/5. A bigger pair also works if it is equal, like 6 ÷ 10.',
  },
  {
    id: 'R8-draw', ruleId: 'R8', type: 'draw',
    prompt: '5 tarts are shared equally among 8 friends. Show one friend’s share: 5 pieces of a bar cut into eighths.',
    start: { wholes: 0, pieces: 0, den: 8 },
    dens: [8],
    target: { den: 8, total: 5 },
    explanation: '5 ÷ 8 = 5/8. One friend’s share is 5 of the 8 equal pieces.',
  },
  // ---------------- R9: the setup rule ----------------
  {
    id: 'R9-asn', ruleId: 'R9', type: 'asn',
    prompt: 'To multiply 2 1/2 × 2 1/2, you can multiply the whole numbers together and the fractions together.',
    answer: 'never',
    explanation: '2 × 2 and 1/2 × 1/2 gives 4 1/4, but 5/2 × 5/2 = 25/4 = 6 1/4. Splitting the mixed numbers leaves out some of the pieces.',
  },
  {
    id: 'R9-spot', ruleId: 'R9', type: 'spotMistake',
    prompt: 'Tia worked out 2 1/2 × 2 1/2 and got 4 1/4 by doing 2 × 2 and 1/2 × 1/2. What should Tia do first?',
    options: [
      'Change each mixed number to an improper fraction: 5/2 × 5/2 = 25/4 = 6 1/4',
      'Add the whole numbers together',
      'Subtract the fractions',
      'Nothing, 4 1/4 is right',
    ],
    answer: 0,
    explanation: '2 1/2 is 5 halves. 5/2 × 5/2 = 25/4, which is 6 1/4.',
  },
  {
    id: 'R9-odd', ruleId: 'R9', type: 'oddOneOut',
    prompt: 'Three of these equal 2 1/2. Which one does not belong?',
    options: ['5/2', '10/4', '2 2/4', '2 1/3'],
    answer: 3,
    explanation: '5/2, 10/4 and 2 2/4 are all 2 and a half. 2 1/3 is a little smaller.',
  },
  {
    id: 'R9-rev', ruleId: 'R9', type: 'reverse',
    prompt: 'Write 3 1/4 as an improper fraction.',
    format: 'Write a fraction with a slash.',
    check: { kind: 'improperEquals', target: '3 1/4' },
    explanation: '3 wholes are 12 quarters, plus 1 more quarter is 13 quarters: 13/4.',
  },
  {
    id: 'R9-draw', ruleId: 'R9', type: 'draw',
    prompt: 'The bars show 2 1/2. Break the whole bars into halves so all of it is counted in halves.',
    start: { wholes: 2, pieces: 1, den: 2 },
    dens: [2],
    target: { den: 2, total: 5, exact: { wholes: 0, pieces: 5 } },
    explanation: 'Each whole bar breaks into 2 halves. 2 bars and 1 half is 5 halves, so 2 1/2 = 5/2.',
  },

  // ---------------- R10: multiplication meaning ----------------
  {
    id: 'R10-asn', ruleId: 'R10', type: 'asn',
    prompt: 'When you multiply a number bigger than 0 by a fraction less than 1, the answer is smaller than the number you started with.',
    answer: 'always',
    explanation: 'Multiplying by a fraction less than 1 takes a part of the number. A part is smaller than the whole.',
  },
  {
    id: 'R10-spot', ruleId: 'R10', type: 'spotMistake',
    prompt: 'Ben says 8 × 1/2 must be bigger than 8, because multiplying makes numbers bigger. What is wrong with his thinking?',
    options: [
      'Multiplying by 1/2 takes half of 8, so the answer is 4, which is smaller',
      '8 × 1/2 is 16',
      'He should have divided',
      'Nothing, he is right',
    ],
    answer: 0,
    explanation: '8 × 1/2 means half of 8, which is 4. Multiplying makes a number bigger only when you multiply by more than 1.',
  },
  {
    id: 'R10-odd', ruleId: 'R10', type: 'oddOneOut',
    prompt: 'Start with 12. Three of these make an answer smaller than 12. Which one does not?',
    options: ['12 × 1/2', '12 × 3/4', '12 × 5/4', '12 × 1/3'],
    answer: 2,
    explanation: '5/4 is more than 1, so 12 × 5/4 = 15 is bigger than 12. The other three fractions are less than 1.',
  },
  {
    id: 'R10-rev', ruleId: 'R10', type: 'reverse',
    prompt: 'Write a fraction to multiply 20 by, so the answer is smaller than 20 but not 0.',
    format: 'Write a fraction with a slash.',
    check: { kind: 'properFraction' },
    explanation: 'Any fraction between 0 and 1 works, like 1/2, 3/5 or 7/8. It takes a part of 20.',
  },
  {
    id: 'R10-draw', ruleId: 'R10', type: 'draw',
    prompt: 'The bar shows 3/4. Cut it into eighths, then keep half of the shaded pieces to show 1/2 of 3/4.',
    start: { wholes: 0, pieces: 3, den: 4 },
    dens: [4, 8],
    target: { den: 8, total: 3 },
    explanation: '3/4 is 6/8. Half of 6 pieces is 3 pieces, so 1/2 × 3/4 = 3/8.',
  },

  // ---------------- R11: division meaning ----------------
  {
    id: 'R11-asn', ruleId: 'R11', type: 'asn',
    prompt: 'When you divide a number bigger than 0 by a fraction less than 1, the answer is bigger than the number you started with.',
    answer: 'always',
    explanation: 'Dividing by a small piece asks how many of those pieces fit in. 3 ÷ 1/2 = 6, because 6 halves fit in 3.',
  },
  {
    id: 'R11-spot', ruleId: 'R11', type: 'spotMistake',
    prompt: 'Mo says 3/4 ÷ 1/2 is the same as taking half of 3/4, so it is 3/8. What should Mo fix?',
    options: [
      'Dividing by 1/2 asks how many halves fit in 3/4. That is 1 1/2, not 3/8',
      'Half of 3/4 is 1/4',
      'He should add instead',
      'Nothing, 3/8 is right',
    ],
    answer: 0,
    explanation: 'Taking half of 3/4 is multiplying: 3/4 × 1/2 = 3/8. Dividing by 1/2 counts jumps of 1/2 in 3/4: one jump and half a jump, 1 1/2.',
  },
  {
    id: 'R11-odd', ruleId: 'R11', type: 'oddOneOut',
    prompt: 'Start with 6. Three of these make an answer bigger than 6. Which one does not?',
    options: ['6 ÷ 1/2', '6 ÷ 2/3', '6 ÷ 3/2', '6 ÷ 1/3'],
    answer: 2,
    explanation: '3/2 is more than 1, so 6 ÷ 3/2 = 4 is smaller than 6. Dividing by a fraction less than 1 makes it bigger.',
  },
  {
    id: 'R11-rev', ruleId: 'R11', type: 'reverse',
    prompt: '4 ÷ ☐ = 8. What fraction goes in the box?',
    format: 'Write a fraction with a slash.',
    check: { kind: 'fractionEquals', target: '1/2' },
    explanation: 'How many halves fit in 4? 8 of them. So 4 ÷ 1/2 = 8.',
  },
  {
    id: 'R11-draw', ruleId: 'R11', type: 'draw',
    prompt: 'Cut each of 3 whole bars into halves. How many halves fit in 3? Break the bars so all of them are halves.',
    start: { wholes: 3, pieces: 0, den: 1 },
    dens: [1, 2],
    target: { den: 2, total: 6, exact: { wholes: 0, pieces: 6 } },
    explanation: '3 bars cut into halves give 6 halves. So 3 ÷ 1/2 = 6.',
  },

  // ---------------- R12: keep, change, flip ----------------
  {
    id: 'R12-asn', ruleId: 'R12', type: 'asn',
    prompt: 'You can divide by a fraction by multiplying by its reciprocal (the fraction flipped).',
    answer: 'always',
    explanation: 'Dividing by 2/3 and multiplying by 3/2 give the same amount. That is why keep, change, flip works.',
  },
  {
    id: 'R12-spot', ruleId: 'R12', type: 'spotMistake',
    prompt: 'Lia worked out 3/4 ÷ 2/3 by dividing the tops (3 ÷ 2) and the bottoms (4 ÷ 3), and got a messy fraction with fractions inside it. What is an easier way?',
    options: [
      'Keep 3/4, change ÷ to ×, flip 2/3 to 3/2: 3/4 × 3/2 = 9/8 = 1 1/8',
      'Add the tops and the bottoms',
      'Flip the first fraction instead',
      'Multiply straight across without flipping',
    ],
    answer: 0,
    explanation: 'Keep, change, flip turns the division into one multiplication: 3/4 × 3/2 = 9/8, which is 1 1/8.',
  },
  {
    id: 'R12-odd', ruleId: 'R12', type: 'oddOneOut',
    prompt: 'Three of these equal 3/5 ÷ 2/7. Which one does not belong?',
    options: ['3/5 × 7/2', '21/10', '2 1/10', '3/5 × 2/7'],
    answer: 3,
    explanation: '3/5 ÷ 2/7 = 3/5 × 7/2 = 21/10 = 2 1/10. The last one did not flip the second fraction, so it is only 6/35.',
  },
  {
    id: 'R12-rev', ruleId: 'R12', type: 'reverse',
    prompt: 'Write the reciprocal of 2/5. That is, flip it.',
    format: 'Write a fraction with a slash.',
    check: { kind: 'fractionEquals', target: '5/2' },
    explanation: 'Flipping swaps the top and the bottom: 2/5 becomes 5/2.',
  },
  {
    id: 'R12-draw', ruleId: 'R12', type: 'draw',
    prompt: 'Flip 2/3 to get 3/2. Show 3/2 with bars cut into halves.',
    start: { wholes: 0, pieces: 0, den: 2 },
    dens: [2],
    target: { den: 2, total: 3 },
    explanation: '3/2 is 3 halves, which is 1 1/2. It is the flipped version of 2/3.',
  },
  // ---------------- R13: what is the whole right now? ----------------
  {
    id: 'R13-asn', ruleId: 'R13', type: 'asn',
    prompt: 'When some tarts have already been sold, half of the tarts that are left is the same amount as half of the original batch.',
    answer: 'never',
    explanation: 'With 24 tarts, half of the batch is 12. After selling 12, half of the 12 that are left is only 6. The whole has changed.',
  },
  {
    id: 'R13-spot', ruleId: 'R13', type: 'spotMistake',
    prompt: 'Leo baked 24 tarts. He sold 1/2 of them in the morning and 1/2 of the tarts that were left in the afternoon. Kim says he sold 1/2 + 1/2 = all 24, so none are left. What should Kim fix?',
    options: [
      'The second 1/2 is of the 12 that were left, not of all 24: he sold 12 + 6 = 18, so 6 are left',
      'Add 1/2 and 1/2 to get 2 wholes',
      'He sold 1/2 of 24 twice, so all 24 are sold',
      'Nothing, none are left',
    ],
    answer: 0,
    explanation: 'In the afternoon the whole is the 12 tarts that are left. Half of 12 is 6, so 12 + 6 = 18 were sold and 6 are left.',
  },
  {
    id: 'R13-odd', ruleId: 'R13', type: 'oddOneOut',
    prompt: 'Leo has 24 tarts. He sells 1/2 of the batch, then 1/2 of what is left. Three of these are true. Which one is NOT true?',
    options: ['After the morning, 12 are left', 'In the afternoon he sells 6', 'In all he sells 18', 'In the afternoon he sells 12'],
    answer: 3,
    explanation: 'In the afternoon he sells half of the 12 that are left, which is 6. So he does not sell 12.',
  },
  {
    id: 'R13-rev', ruleId: 'R13', type: 'reverse',
    prompt: 'Leo sold 1/2 of his tarts in the morning and 1/2 of the rest in the afternoon. 5 tarts were left at the end. How many tarts did he bake?',
    format: 'Type a number.',
    check: { kind: 'fractionEquals', target: '20' },
    explanation: 'Work backwards. 5 is half of what he had in the afternoon, so he had 10. 10 is half of the batch, so he baked 20.',
  },
  {
    id: 'R13-draw', ruleId: 'R13', type: 'draw',
    prompt: 'The bar is the whole batch: 4 fourths. Take away 1/2 of the batch, then 1/2 of what is left. Show what is left.',
    start: { wholes: 0, pieces: 4, den: 4 },
    dens: [4],
    target: { den: 4, total: 1 },
    explanation: 'Half of 4 fourths is 2 fourths, so 2 fourths are left. Half of those is 1 fourth, so 1 fourth of the batch is left.',
  },

  // ---------------- R14: "of" means multiply ----------------
  {
    id: 'R14-asn', ruleId: 'R14', type: 'asn',
    prompt: '“1/2 of 3/4” means 1/2 × 3/4.',
    answer: 'always',
    explanation: '“Of” means multiply. Taking a part of an amount is multiplying by that part.',
  },
  {
    id: 'R14-spot', ruleId: 'R14', type: 'spotMistake',
    prompt: 'Raj says 1/2 of 3/4 means 3/4 ÷ 1/2, which is 1 1/2. What is wrong with his thinking?',
    options: [
      '“Of” means multiply: 1/2 of 3/4 = 1/2 × 3/4 = 3/8, which is smaller',
      'It should be 3/4 + 1/2',
      '1 1/2 is right',
      'It should be 3/4 − 1/2',
    ],
    answer: 0,
    explanation: 'Half of something is smaller than the something. 3/8 is smaller than 3/4. Dividing by 1/2 would make it bigger.',
  },
  {
    id: 'R14-odd', ruleId: 'R14', type: 'oddOneOut',
    prompt: 'Three of these equal 1/2 of 3/4. Which one does not belong?',
    options: ['1/2 × 3/4', '3/8', '3/4 ÷ 2', '3/4 ÷ 1/2'],
    answer: 3,
    explanation: 'Half of 3/4 is 3/8, and 3/4 ÷ 2 is also 3/8. 3/4 ÷ 1/2 is 1 1/2, a different question.',
  },
  {
    id: 'R14-rev', ruleId: 'R14', type: 'reverse',
    prompt: 'Write 1/3 of 3/5 as a single fraction.',
    format: 'Write a fraction with a slash.',
    check: { kind: 'fractionEquals', target: '1/5' },
    explanation: '1/3 × 3/5 = 3/15 = 1/5.',
  },
  {
    id: 'R14-draw', ruleId: 'R14', type: 'draw',
    prompt: 'The bar shows 1/2. Cut it into fourths, then keep half of the shaded pieces to show 1/2 of 1/2.',
    start: { wholes: 0, pieces: 1, den: 2 },
    dens: [2, 4],
    target: { den: 4, total: 1 },
    explanation: '1/2 is 2 fourths. Half of 2 pieces is 1 piece. 1/2 of 1/2 = 1/4.',
  },

  // ---------------- R15: multiply straight across ----------------
  {
    id: 'R15-asn', ruleId: 'R15', type: 'asn',
    prompt: 'To multiply 2/3 × 3/4, you must first rename both fractions so the bottom numbers match.',
    answer: 'never',
    explanation: 'Renaming to a common bottom number is for adding and subtracting. To multiply, multiply the tops and multiply the bottoms.',
  },
  {
    id: 'R15-spot', ruleId: 'R15', type: 'spotMistake',
    prompt: 'Sia worked out 2/3 × 3/4 by renaming both fractions as twelfths (8/12 and 9/12) and then adding the tops to get 17/12. What should she do instead?',
    options: [
      'Multiply the tops and the bottoms straight across: 2 × 3 = 6 and 3 × 4 = 12, so 6/12 = 1/2',
      'Add the bottoms as well',
      'Subtract the tops',
      'Nothing, 17/12 is right',
    ],
    answer: 0,
    explanation: 'Multiplying slices the pieces again, so the bottoms multiply too. 2/3 × 3/4 = 6/12, which is 1/2.',
  },
  {
    id: 'R15-odd', ruleId: 'R15', type: 'oddOneOut',
    prompt: 'Three of these equal 2/3 × 3/4. Which one does not belong?',
    options: ['6/12', '1/2', '3/6', '5/12'],
    answer: 3,
    explanation: '2/3 × 3/4 = 6/12, and 6/12, 1/2 and 3/6 all name the same amount. 5/12 is a little smaller.',
  },
  {
    id: 'R15-rev', ruleId: 'R15', type: 'reverse',
    prompt: '5 × 2/3: write 5 as 5/1, then multiply straight across. What is the answer?',
    format: 'You can write a fraction or a mixed number.',
    check: { kind: 'fractionEquals', target: '10/3' },
    explanation: '5/1 × 2/3 = 10/3, which is 3 1/3.',
  },
  {
    id: 'R15-draw', ruleId: 'R15', type: 'draw',
    prompt: 'Show 2/3 × 3/4 on a bar cut into twelfths. The tops multiply to 6, so shade 6 pieces.',
    start: { wholes: 0, pieces: 0, den: 12 },
    dens: [12],
    target: { den: 12, total: 6 },
    explanation: '6 of the 12 pieces is 6/12, which is 1/2.',
  },

  // ---------------- R16: simplify before you multiply ----------------
  {
    id: 'R16-asn', ruleId: 'R16', type: 'asn',
    prompt: 'In 4/9 × 3/8, you can simplify the 4 on top with the 8 on the bottom before you multiply.',
    answer: 'always',
    explanation: 'The 4 and the 8 share a factor of 4, and one is a top and one is a bottom. 4 becomes 1 and 8 becomes 2.',
  },
  {
    id: 'R16-spot', ruleId: 'R16', type: 'spotMistake',
    prompt: 'Tom worked out 2/5 × 2/3 by cancelling the two 2s (both are tops) and wrote 1/5 × 1/3 = 1/15. What is wrong?',
    options: [
      'Only a top and a bottom can be simplified together. Two tops cannot be cancelled: 2/5 × 2/3 = 4/15',
      'He should cancel the 5 and the 3',
      '1/15 is right',
      'He should add the tops',
    ],
    answer: 0,
    explanation: 'The tops multiply, 2 × 2 = 4, and the bottoms multiply, 5 × 3 = 15. So the answer is 4/15.',
  },
  {
    id: 'R16-odd', ruleId: 'R16', type: 'oddOneOut',
    prompt: 'Before multiplying 6/10 × 5/9, three of these are good moves. Which one is NOT?',
    options: [
      'Simplify the top 6 and the bottom 9 by 3',
      'Simplify the top 5 and the bottom 10 by 5',
      'Simplify the top 6 and the bottom 10 by 2',
      'Cancel the two tops, 6 and 5',
    ],
    answer: 3,
    explanation: 'Simplifying works between a top and a bottom that share a factor. Two tops do not simplify with each other.',
  },
  {
    id: 'R16-rev', ruleId: 'R16', type: 'reverse',
    prompt: 'Simplify first, then multiply: 4/9 × 3/8. Type the answer.',
    format: 'Write a fraction with a slash.',
    check: { kind: 'fractionEquals', target: '1/6' },
    explanation: '4/8 becomes 1/2 and 3/9 becomes 1/3. 1/3 × 1/2 = 1/6.',
  },
  {
    id: 'R16-draw', ruleId: 'R16', type: 'draw',
    prompt: 'The answer to 4/9 × 3/8 is 1/6. Show 1/6 on a bar cut into sixths.',
    start: { wholes: 0, pieces: 0, den: 6 },
    dens: [6],
    target: { den: 6, total: 1 },
    explanation: '1 piece out of 6 equal pieces is 1/6.',
  },

  // ---------------- R17: times 1/n is divided by n ----------------
  {
    id: 'R17-asn', ruleId: 'R17', type: 'asn',
    prompt: 'Multiplying a number by 1/4 gives the same answer as dividing that number by 4.',
    answer: 'always',
    explanation: 'Both find one quarter of the number. 8 × 1/4 = 2 and 8 ÷ 4 = 2.',
  },
  {
    id: 'R17-spot', ruleId: 'R17', type: 'spotMistake',
    prompt: 'Jo says 8 × 1/4 and 8 ÷ 4 must give different answers, because one is multiplying and one is dividing. What is wrong?',
    options: [
      'Both find one quarter of 8, so both are 2',
      '8 × 1/4 = 32',
      '8 ÷ 4 = 32',
      'Nothing, Jo is right',
    ],
    answer: 0,
    explanation: 'Taking 1/4 of 8 and splitting 8 into 4 equal parts give the same amount: 2.',
  },
  {
    id: 'R17-odd', ruleId: 'R17', type: 'oddOneOut',
    prompt: 'Three of these equal 2/5 × 1/3. Which one does not belong?',
    options: ['2/5 ÷ 3', '2/15', '4/30', '2/5 ÷ 1/3'],
    answer: 3,
    explanation: '2/5 × 1/3 = 2/15, and 2/5 ÷ 3 = 2/15 too. 2/5 ÷ 1/3 asks how many thirds fit in 2/5, which is 1 1/5.',
  },
  {
    id: 'R17-rev', ruleId: 'R17', type: 'reverse',
    prompt: '2/5 ÷ 3 = 2/5 × ☐. What fraction goes in the box?',
    format: 'Write a fraction with a slash.',
    check: { kind: 'fractionEquals', target: '1/3' },
    explanation: 'Dividing by 3 is the same as multiplying by 1/3.',
  },
  {
    id: 'R17-draw', ruleId: 'R17', type: 'draw',
    prompt: 'The bar shows 2/5. Cut it into fifteenths, then keep one third of the shaded pieces to show 2/5 ÷ 3.',
    start: { wholes: 0, pieces: 2, den: 5 },
    dens: [5, 15],
    target: { den: 15, total: 2 },
    explanation: '2/5 is 6/15. One third of 6 pieces is 2 pieces, so 2/5 ÷ 3 = 2/15.',
  },

  // ---------------- R18: digit cards, products ----------------
  {
    id: 'R18-asn', ruleId: 'R18', type: 'asn',
    prompt: 'Using four different digits in □ × □ □/□, the biggest digit in front gives the greatest product, as long as the two smallest digits can make a proper fraction in simplest form.',
    answer: 'always',
    explanation: 'The digit in front multiplies both the whole part and the fraction part, so the biggest digit there adds the most.',
  },
  {
    id: 'R18-spot', ruleId: 'R18', type: 'spotMistake',
    prompt: 'Dev used the digits 2, 3, 4 and 8 in □ × □ □/□ and wrote 4 × 8 2/3 = 34 2/3 as the greatest product. What should Dev change?',
    options: [
      'Swap the 4 and the 8 so the biggest digit stands in front: 8 × 4 2/3 = 37 1/3',
      'Put the 8 on the bottom of the fraction',
      'Make the fraction 3/8',
      'Nothing, 34 2/3 is the greatest',
    ],
    answer: 0,
    explanation: 'With 8 in front, the 8 multiplies the whole part 4 and also the fraction 2/3. 8 × 4 2/3 = 37 1/3, which is greater than 34 2/3.',
  },
  {
    id: 'R18-odd', ruleId: 'R18', type: 'oddOneOut',
    prompt: 'The digits 2, 3, 4 and 8 make these four products. Only one is the greatest. Which one?',
    options: ['4 × 8 2/3', '8 × 4 2/3', '2 × 8 3/4', '8 × 2 3/4'],
    answer: 1,
    explanation: '8 × 4 2/3 = 37 1/3. The others are 34 2/3, 17 1/2 and 22.',
  },
  {
    id: 'R18-rev', ruleId: 'R18', type: 'reverse',
    prompt: 'Use the digits 1, 5, 6 and 9 once each in □ × □ □/□ to make the greatest product. The fraction must be proper and in simplest form. Type the product.',
    format: 'You can write a mixed number or a fraction.',
    check: { kind: 'fractionEquals', target: '279/5' },
    explanation: 'The biggest digit, 9, goes in front. 6 is the whole part. 1 and 5 make the fraction 1/5. 9 × 6 1/5 = 9 × 31/5 = 279/5 = 55 4/5.',
  },
  {
    id: 'R18-draw', ruleId: 'R18', type: 'draw',
    prompt: 'For the greatest product, the two smallest digits, 2 and 3, make the fraction 2/3. Show 2/3 on a bar cut into thirds.',
    start: { wholes: 0, pieces: 0, den: 3 },
    dens: [3],
    target: { den: 3, total: 2 },
    explanation: 'The smaller digit goes on top so the fraction is proper: 2/3.',
  },
]

// ---------------------------------------------------------------------------
// Olympiad challenges: word problems and puzzles with a hint. Code checks every answer.
// ---------------------------------------------------------------------------

export type ChallengeField =
  | {
      id: string
      label: string
      kind: 'number'
      /** The right value, like "3/10" or "37 1/3". Any equal form is accepted, unless `simplest` is true. */
      answer: string
      /** How to write the answer, in words only. It never holds an example number, which could give the answer away. */
      format: string
      /** The answer must be a fraction in simplest form. */
      simplest?: boolean
    }
  | { id: string; label: string; kind: 'choice'; options: string[]; answer: number }

export interface Challenge {
  id: string
  title: string
  groupId: string
  /** The rules this challenge uses. */
  ruleIds: string[]
  story: string
  /** Hints, shown one at a time when she asks. A hint never gives the answer. */
  hints: string[]
  /** A picture shown with the first hint. */
  picture?: Frame
  fields: ChallengeField[]
  /** The working, shown after she solves it or asks to see it. */
  explanation: string
}

export const CHALLENGES: Challenge[] = [
  {
    id: 'C1',
    title: 'The Shaded Grid Mystery',
    groupId: 'muldiv',
    ruleIds: ['R10', 'R14', 'R15'],
    story:
      'A square piece of paper is divided into 4 equal vertical columns, and 3 of the columns are shaded red. The paper is then folded horizontally into 5 equal rows, and 2 of the rows are shaded blue. The places where red and blue overlap turn purple. What fraction of the whole paper is purple?',
    hints: ['Think about what fraction of a fraction you are taking. You are finding 2/5 of 3/4.'],
    picture: {
      kind: 'area',
      cols: 4,
      rows: 5,
      a: 3,
      b: 2,
      aLabel: 'Blue: 3 of the 4 columns',
      bLabel: 'Yellow: 2 of the 5 rows',
      bothLabel: 'Green: where they overlap',
      caption: 'The overlap is the purple part. Count its boxes out of all the boxes.',
    },
    fields: [{ id: 'purple', label: 'Fraction of the paper that is purple', kind: 'number', answer: '3/10', format: 'Write a fraction.' }],
    explanation: '2/5 of 3/4 is 3/4 × 2/5 = 6/20, which is 3/10. 6 of the 20 small boxes are purple.',
  },
  {
    id: 'C2',
    title: 'The Golden Ribbon',
    groupId: 'muldiv',
    ruleIds: ['R9', 'R11', 'R12'],
    story:
      'A crafter has a gold ribbon that is 3 1/2 metres long. She cuts it into pieces to make holiday bows. Each bow needs exactly 1/4 of a metre of ribbon. How many complete bows can she make, and how much ribbon is left over?',
    hints: ['This is a division problem. It asks how many 1/4 pieces fit into 3 1/2. Change the mixed number into an improper fraction first.'],
    fields: [
      { id: 'bows', label: 'Complete bows', kind: 'number', answer: '14', format: 'Type a number.' },
      { id: 'left', label: 'Ribbon left over (metres)', kind: 'number', answer: '0', format: 'Type a number.' },
    ],
    explanation: '3 1/2 = 7/2. 7/2 ÷ 1/4 = 7/2 × 4/1 = 28/2 = 14. There are exactly 14 bows and nothing is left over.',
  },
  {
    id: 'C3',
    title: 'The Snail’s Great Wall Climb',
    groupId: 'muldiv',
    ruleIds: ['R11', 'R12'],
    story: 'A snail climbs up a wall. Every hour it climbs 2/3 of a foot. The wall is 6 feet tall. How many hours does it take the snail to reach the exact top?',
    hints: ['You are dividing a whole number by a proper fraction. Write the whole number as a fraction over 1 before you flip and multiply.'],
    fields: [{ id: 'hours', label: 'Hours', kind: 'number', answer: '9', format: 'Type a number.' }],
    explanation: '6 ÷ 2/3 = 6/1 × 3/2 = 18/2 = 9 hours. Dividing by a number less than 1 gives a bigger answer than 6.',
  },
  {
    id: 'C4',
    title: 'The Half-Empty Bakery Case',
    groupId: 'muldiv',
    ruleIds: ['R13'],
    story:
      'Chef Leo baked a batch of chocolate tarts. In the morning he sold 1/2 of the whole batch. In the afternoon he sold 1/2 of the tarts that were left. By evening only 6 tarts were left. How many tarts did Chef Leo bake?',
    hints: ['Work backwards from the end. If 6 tarts is 1/2 of what he had in the afternoon, how many did he have then?'],
    fields: [{ id: 'tarts', label: 'Tarts baked', kind: 'number', answer: '24', format: 'Type a number.' }],
    explanation: '6 is half of what he had in the afternoon, so he had 12. 12 is half of the batch, so he baked 12 × 2 = 24.',
  },
  {
    id: 'C5',
    title: 'The Alligator Length',
    groupId: 'muldiv',
    ruleIds: ['R9', 'R15'],
    story:
      'A baby alligator is 2 1/4 feet long. An adult alligator is 3 1/2 times as long as the baby. Jason says the adult alligator is 6 1/8 feet long. Is Jason correct? If not, how long is the adult alligator?',
    hints: ['Jason multiplied 2 × 3 and 1/4 × 1/2 separately. Change both mixed numbers into improper fractions first.'],
    fields: [
      { id: 'correct', label: 'Is Jason correct?', kind: 'choice', options: ['Yes', 'No'], answer: 1 },
      { id: 'length', label: 'The real length of the adult alligator (feet)', kind: 'number', answer: '7 7/8', format: 'You can write a mixed number or a fraction.' },
    ],
    explanation: '2 1/4 = 9/4 and 3 1/2 = 7/2. 9/4 × 7/2 = 63/8 = 7 7/8 feet. Jason left out the parts where a whole number meets a fraction.',
  },
  {
    id: 'C6',
    title: 'The Fraction Detective',
    groupId: 'muldiv',
    ruleIds: ['R14', 'R17'],
    story:
      'A secret fraction is written on a piece of paper. Clue 1: when you multiply it by 1/3 you get 2/15. Clue 2: when you divide it by a mystery whole number you get the same answer, which looks like 4/30 before it is simplified. What is the secret fraction, and what is the whole number?',
    hints: [
      'Multiplying by 1/3 takes one third of the secret fraction. So the secret fraction is 3 times as much as 2/15.',
      'Dividing by a whole number cuts every piece into that many smaller pieces. How many pieces did each fifth need to be cut into to make fifteenths?',
    ],
    fields: [
      { id: 'secret', label: 'The secret fraction (simplest form)', kind: 'number', answer: '2/5', format: 'Write a fraction in simplest form.', simplest: true },
      { id: 'whole', label: 'The mystery whole number', kind: 'number', answer: '3', format: 'Type a number.' },
    ],
    explanation: '2/15 × 3 = 6/15 = 2/5, so the secret fraction is 2/5. 2/5 × 1/3 = 2/15. Dividing 2/5 by 3 also gives 2/15, so the whole number is 3.',
  },
  {
    id: 'C7',
    title: 'The Mystery Fractions',
    groupId: 'muldiv',
    ruleIds: ['R9', 'R15', 'R16'],
    story:
      'Find Fraction A and Fraction B, then multiply them. Clue 1: Fraction A is a proper fraction in simplest form. Its bottom number is the prime number that is more than 3 and less than 7. Its top number is the only even prime number. Clue 2: Fraction B is an improper fraction in simplest form. Dividing its top by its bottom gives 2 with 1 left over. Its bottom number is the smallest perfect square more than 1. Clue 3: A × B is a proper fraction.',
    hints: [
      'The only prime between 3 and 7 is 5. The only even prime is 2. The smallest perfect square more than 1 is 4.',
      'For B, the top is the bottom times the quotient, plus the remainder: 4 × 2 + 1.',
    ],
    fields: [
      { id: 'a', label: 'Fraction A', kind: 'number', answer: '2/5', format: 'Write a fraction in simplest form.', simplest: true },
      { id: 'b', label: 'Fraction B', kind: 'number', answer: '9/4', format: 'Write a fraction in simplest form.', simplest: true },
      { id: 'product', label: 'A × B', kind: 'number', answer: '9/10', format: 'Write a fraction in simplest form.', simplest: true },
    ],
    explanation: 'A = 2/5 and B = 9/4, because 4 × 2 + 1 = 9. A × B = 2/5 × 9/4 = 18/20 = 9/10, which is a proper fraction.',
  },
  {
    id: 'C8',
    title: 'The Digit Cards',
    groupId: 'muldiv',
    ruleIds: ['R9', 'R18'],
    story:
      'Use the digit cards 2, 3, 4 and 8 once each to fill □ × □ □/□ (a whole number times a mixed number) and then □ ÷ □ □/□. The fraction part must be a proper fraction in simplest form. Find the greatest product, the smallest product, the greatest quotient and the smallest quotient.',
    hints: [
      'For the greatest product, use the plan: the biggest digit stands in front on its own, the next biggest is the whole part, and the two smallest digits make the fraction with the smaller on top.',
      'For the other three, there is no single plan. List the arrangements that are allowed (the fraction must be proper and in simplest form, so 4/8 is not allowed), work out each one, and compare. Change the mixed number to an improper fraction first.',
    ],
    fields: [
      { id: 'gp', label: 'Greatest product', kind: 'number', answer: '37 1/3', format: 'You can write a mixed number or a fraction.' },
      { id: 'sp', label: 'Smallest product', kind: 'number', answer: '8 3/4', format: 'You can write a mixed number or a fraction.' },
      { id: 'gq', label: 'Greatest quotient', kind: 'number', answer: '2 10/11', format: 'You can write a mixed number or a fraction.' },
      { id: 'sq', label: 'Smallest quotient', kind: 'number', answer: '8/35', format: 'You can write a mixed number or a fraction.' },
    ],
    explanation:
      'Greatest product: 8 × 4 2/3 = 112/3 = 37 1/3. Smallest product: 2 × 4 3/8 = 70/8 = 8 3/4. Greatest quotient: 8 ÷ 2 3/4 = 32/11 = 2 10/11. Smallest quotient: 2 ÷ 8 3/4 = 8/35.',
  },
]
