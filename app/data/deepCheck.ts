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
}

export type Frame =
  | { kind: 'bars'; rows: BarRow[]; caption: string }
  | { kind: 'line'; max: number; marks: { at: number; label: string }[]; gap?: { from: number; to: number; label: string }; caption: string }

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
  | (ItemBase & { type: 'reverse'; check: ReverseCheck; placeholder: string })
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
    placeholder: 'For example 6/8',
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
    placeholder: 'For example 1 4/3',
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
    placeholder: 'For example 2 3/4',
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
    placeholder: 'Type it like 3/6',
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
    placeholder: 'Type it like 3/8',
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
    placeholder: 'Type it like 3/8',
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
    placeholder: 'Type a number, like 6 1/2',
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
    placeholder: 'For example 3 ÷ 5',
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
]
