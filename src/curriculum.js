// English National Curriculum topic samples. Change the repertoire and milestones here.
export const LEARNING = {
  saveKey: 'cloudkeepers-learning-v2',
  players: [{ id: 'player-1', name: 'Player 1', year: 1 }, { id: 'player-2', name: 'Player 2', year: 3 }],
  years: [1, 2, 3],
  bands: ['With support', 'Practice', 'Challenge'],
  routePoints: 3,
  mastery: { window: 8, independent: 6, challenge: 4, forms: 2 },
  raiseAfter: 2,
  lowerAfter: 2,
  levels: [
    { task: 'bridge', type: 'place', titles: ['Counting & tens', 'Tens & ones', 'Hundreds, tens & ones'] },
    { task: 'nest', type: 'compare', titles: ['More, less & order', 'Compare to 100', 'Compare to 1,000'] },
    { task: 'fountain', type: 'add', titles: ['Addition to 20', 'Addition to 100', 'Addition & exchanging'] },
    { task: 'windmill', type: 'subtract', titles: ['Subtraction to 20', 'Subtraction to 100', 'Subtraction & exchanging'] },
    { task: 'ship', type: 'table', table: [2, 2, 3], titles: ['Groups of 2', 'The 2 times table', 'The 3 times table'] },
    { task: 'house', type: 'table', table: [5, 5, 4], titles: ['Groups of 5', 'The 5 times table', 'The 4 times table'] },
    { task: 'balloon', type: 'table', table: [10, 10, 8], titles: ['Groups of 10', 'The 10 times table', 'The 8 times table'] },
    { task: 'light-1', type: 'groups', titles: ['Sharing & doubles', 'Multiplying & sharing', 'Bigger groups & division'] },
    { task: 'light-2', type: 'fraction', titles: ['Halves & quarters', 'Fractions of a group', 'Tenths & fractions'] },
    { task: 'light-3', type: 'practical', titles: ['Coins & measures', 'Money & measures', 'Money, measures & perimeter'] },
    { task: 'light-4', type: 'timeShape', titles: ['Clocks & shapes', 'Clocks & shape properties', 'Time, shapes & right angles'] },
    { task: 'light-5', type: 'chart', titles: ['The sky picnic', 'Picture charts', 'Charts & comparisons'] },
  ],
};

export const levelFor = id => LEARNING.levels.find(l => l.task === id);
export const levelTitle = (id, year) => levelFor(id).titles[year - 1];
export function difficultyDescription(task, year, band) {
  const level = levelFor(task), type = level.type;
  if (type === 'place') return year === 1 && band === 0 ? 'Count crystals and one more, around 10.' : `${year === 3 ? 'Hundreds, tens and ones' : 'Tens and ones'} in numbers up to ${(year === 1 ? [10, 50, 99] : year === 2 ? [30, 70, 99] : [299, 699, 999])[band]}.`;
  if (type === 'compare') return `Compare and order numbers up to ${(year === 1 ? [10, 50, 100] : year === 2 ? [30, 70, 100] : [200, 600, 1000])[band]}.`;
  if (type === 'add' || type === 'subtract') return year === 3 ? ['Three-digit numbers with ones.', 'Three-digit numbers with tens and missing numbers.', 'Three-digit numbers with exchanging and missing numbers.'][band] : `${type === 'add' ? 'Addition' : 'Subtraction'} within ${(year === 1 ? [5, 10, 20] : [20, 50, 100])[band]}.`;
  if (type === 'table') return `Groups of ${level.table[year - 1]} and sharing, with up to ${(year === 1 ? [3, 5, 10] : [5, 10, 12])[band]} groups.`;
  if (type === 'groups') return year === 3 && band > 0 ? `Two-digit groups up to ${band === 2 ? 24 : 15}, multiplied or shared.` : 'Equal groups, counting and sharing.';
  if (type === 'fraction') return year === 3 && band > 0 ? 'Fraction quantities, equivalent fractions and fraction sums.' : year === 1 ? band === 0 ? 'Halves of a group or a ribbon.' : 'Halves and quarters of groups and ribbons.' : 'Simple fractions of groups and ribbons.';
  if (type === 'practical') return year === 1 ? 'Coin values and joined lengths.' : year === 3 ? 'Money, measures and perimeter.' : band === 0 ? 'Coin values and lengths.' : 'Change and joined lengths.';
  if (type === 'timeShape') return year === 3 ? ['Quarter-hour clocks and shape sides.', 'Five-minute clocks and right angles.', 'Exact-minute clocks and right angles.'][band] : year === 1 ? band === 0 ? 'Hour clocks and shape names.' : 'Hour and half-hour clocks, and shape sides.' : band === 0 ? 'Hour and half-hour clocks, and shapes.' : 'Quarter-hour clocks and shape sides.';
  return year === 1 || band === 0 ? 'Count, total and compare picnic groups.' : 'Read chart keys, find totals and compare groups.';
}
const pick = (items, rng) => items[Math.floor(rng() * items.length)];
const integer = (lo, hi, rng) => lo + Math.floor(rng() * (hi - lo + 1));
function shuffle(items, rng) { return items.map(value => ({ value, order: rng() })).sort((a, b) => a.order - b.order).map(x => x.value); }
function choices(answer, alternatives, rng) { return shuffle([...new Set([String(answer), ...alternatives.map(String)])].slice(0, 4), rng); }

function make(level, year, band, rng) {
  const type = level.type;
  let form = integer(0, 2, rng), prompt, expression, answer, options, visual, hint, operands;
  if (type === 'place') {
    const max = year === 1 ? [10, 50, 99][band] : year === 2 ? [30, 70, 99][band] : [299, 699, 999][band];
    const n = integer(year === 3 ? 100 : 1, max, rng);
    const ones = n % 10, tens = Math.floor(n / 10) % 10, hundreds = Math.floor(n / 100);
    if (year === 1 && band === 0) { form %= 2; prompt = form ? 'One more crystal joins the group. How many now?' : 'Count the crystals. How many are there?'; answer = n + (form ? 1 : 0); expression = form ? `${n} + 1 =` : 'Crystals ='; visual = { type: 'count', a: n, b: form }; hint = `Count each crystal once.${form ? ` Then count one more after ${n}.` : ''}`; }
    else {
      const unit = year === 3 ? ['hundreds', 'tens', 'ones'][form] : ['tens', 'ones', 'number'][form];
      prompt = unit === 'number' ? 'Build the number from these tens and ones.' : `Which digit is in the ${unit} place in ${n}?`;
      answer = unit === 'number' ? n : unit === 'hundreds' ? hundreds : unit === 'tens' ? tens : ones;
      expression = unit === 'number' ? `${Math.floor(n / 10)} tens + ${ones} ones =` : `${unit[0].toUpperCase() + unit.slice(1)} =`;
      visual = { type: 'place', number: n };
      hint = `${n} = ${hundreds ? hundreds + ' hundred' + (hundreds === 1 ? '' : 's') + ' + ' : ''}${tens} tens + ${ones} ones. Each ten is worth 10; each hundred is worth 100.`;
    }
    operands = [n, form];
  } else if (type === 'compare') {
    const max = year === 1 ? [10, 50, 100][band] : year === 2 ? [30, 70, 100][band] : [200, 600, 1000][band];
    const a = integer(year === 3 && band === 2 ? 100 : 1, max - 1, rng), b = integer(a + 1, band === 2 ? Math.min(max, a + (year === 3 ? 110 : 20)) : max, rng);
    if (form === 2) { const n = integer(year === 3 && band === 2 ? 100 : 2, max - 1, rng); prompt = `Which number comes between ${n - 1} and ${n + 1}?`; expression = `${n - 1}, ?, ${n + 1}`; answer = n; operands = [n, form]; hint = `Count forwards by one from ${n - 1}.`; visual = { type: 'numberCards', numbers: [n - 1, '?', n + 1] }; }
    else { const nums = shuffle([a, b], rng); prompt = `Which number is ${form ? 'smaller' : 'greater'}?`; answer = form ? a : b; expression = 'Choose the number'; options = shuffle(nums.map(String), rng); operands = [a, b, form]; visual = { type: 'numberCards', numbers: nums }; hint = 'Compare hundreds first, then tens, then ones. On a number line, greater numbers are further to the right.'; }
  } else if (type === 'add' || type === 'subtract') {
    const minus = type === 'subtract';
    const limit = year === 1 ? [5, 10, 20][band] : year === 2 ? [20, 50, 100][band] : [199, 499, 999][band];
    let a, b;
    if (year === 3) {
      a = integer(100, limit - 10, rng); b = band === 0 ? integer(1, 9, rng) : band === 1 ? integer(10, 99, rng) : integer(101, 399, rng);
      if (!minus && a + b > limit) a = Math.max(100, limit - b);
      if (minus && b > a) [a, b] = [b, a];
      // At the challenge band, deliberately include exchanging.
      if (band === 2 && (minus ? a % 10 >= b % 10 : a % 10 + b % 10 < 10)) {
        a = Math.floor(a / 10) * 10 + (minus ? 2 : 7); b = Math.floor(b / 10) * 10 + (minus ? 7 : 8);
        if (!minus && a + b > 999) a -= 100;
        if (minus && a < b) a += 10;
      }
    } else {
      a = integer(1, limit - 1, rng); b = integer(1, minus ? a : limit - a, rng);
    }
    const total = minus ? a - b : a + b;
    if (form === 1 && band > 0) { answer = b; expression = `${a} ${minus ? '−' : '+'} ? = ${total}`; prompt = 'Find the missing number.'; }
    else { answer = total; expression = `${a} ${minus ? '−' : '+'} ${b} =`; prompt = form === 2 ? `The keeper ${minus ? `has ${a} crystals and uses ${b}. How many are left?` : `packs ${a} crystals, then ${b} more. How many altogether?`}` : `${minus ? 'Find what is left' : 'Bring the two amounts together'}.`; }
    visual = a + b <= 20 ? { type: minus ? 'takeAway' : 'count', a, b } : { type: 'column', a, b, op: minus ? '−' : '+' };
    hint = form === 1 && band > 0 ? `Use the inverse: ${minus ? `${a} − ${total}` : `${total} − ${a}`} gives the missing number.` : columnHint(a, b, minus);
    operands = [a, b, form];
  } else if (type === 'table' || type === 'groups') {
    const table = type === 'table' ? level.table[year - 1] : pick(year === 1 ? [2, 5] : year === 2 || band === 0 ? [2, 5, 10] : [2, 3, 4, 5, 8], rng);
    const groups = type === 'groups' && year === 3 && band > 0 ? integer(11, band === 2 ? 24 : 15, rng) : integer(1, year === 1 ? [3, 5, 10][band] : [5, 10, 12][band], rng);
    const total = groups * table;
    const sharing = form === 1;
    if (sharing) { prompt = `Share ${total} moonberries equally between ${table} friends. How many each?`; answer = groups; expression = `${total} ÷ ${table} =`; visual = { type: 'sharing', groups: table, each: groups, total }; hint = `${table} equal shares must make ${total}. Think: ${table} × ? = ${total}.`; }
    else if (form === 2 && year > 1) { prompt = 'Find the missing number of groups.'; answer = groups; expression = `? × ${table} = ${total}`; visual = { type: groups > 12 ? 'partition' : 'array', groups, each: table }; hint = `Count in ${table}s until you reach ${total}. The number of steps is the missing number.`; }
    else { prompt = form === 2 ? 'Add the equal groups. How many moonberries altogether?' : `${groups === 1 ? 'There is 1 group' : `There are ${groups} groups`} of ${table} moonberries. How many altogether?`; answer = total; expression = year === 1 ? form === 2 ? `${Array.from({ length: groups }, () => table).join(' + ')} =` : `${groups} ${groups === 1 ? 'group' : 'groups'} of ${table} =` : `${groups} × ${table} =`; visual = groups <= 12 ? { type: 'array', groups, each: table } : { type: 'partition', groups, each: table }; hint = groups > 12 ? `Split ${groups} into ${Math.floor(groups / 10) * 10} + ${groups % 10}. Multiply each part by ${table}, then add.` : `Count in ${table}s: ${Array.from({ length: groups }, (_, i) => (i + 1) * table).join(', ')}.`; }
    operands = [groups, table, form];
  } else if (type === 'fraction') {
    const denominator = year === 1 ? (band === 0 ? 2 : pick([2, 4], rng)) : year === 2 ? pick([2, 3, 4], rng) : pick(band === 0 ? [2, 4] : [3, 4, 5, 8, 10], rng);
    const numerator = year < 3 || band === 0 ? 1 : integer(1, denominator - 1, rng);
    const quantity = denominator * integer(1, year === 1 ? 4 : 8, rng);
    if (year === 3 && band > 0 && form === 2) {
      const b = integer(1, denominator - numerator, rng), subtract = band === 2 && numerator > 1 && rng() > .5;
      const second = subtract ? integer(1, numerator - 1, rng) : b;
      answer = `${subtract ? numerator - second : numerator + second}/${denominator}`; expression = `${numerator}/${denominator} ${subtract ? '−' : '+'} ${second}/${denominator} =`;
      prompt = 'The pieces are the same size. Find the resulting fraction.'; options = choices(answer, [`${numerator}/${denominator}`, `${numerator + second}/${denominator * 2}`, `${Math.max(0, numerator - second)}/${denominator}`], rng);
      visual = { type: 'fraction', numerator, denominator }; hint = `Keep the denominator ${denominator}: it names the size of each piece. ${subtract ? 'Subtract' : 'Add'} the numerators ${numerator} and ${second}.`; operands = [numerator, second, denominator, subtract];
    } else if (year === 3 && band > 0 && form === 1) {
      const factor = pick([2, 3], rng); answer = `${numerator * factor}/${denominator * factor}`; expression = `${numerator}/${denominator} = ?`;
      prompt = 'Choose the equivalent fraction.'; options = choices(answer, [`${numerator + factor}/${denominator * factor}`, `${numerator}/${denominator * factor}`, `${numerator * factor}/${denominator}`], rng);
      visual = { type: 'fraction', numerator, denominator }; hint = `Multiply both the numerator and denominator by the same number. The amount stays the same.`; operands = [numerator, denominator, factor];
    } else if (form === 1) {
      answer = `${numerator}/${denominator}`; expression = 'The shaded fraction is'; prompt = 'What fraction of this ribbon is shaded?';
      options = choices(answer, ['1/2', '1/4', '1/3', `${denominator - numerator}/${denominator}`, `${numerator}/${denominator + 1}`], rng);
      visual = { type: 'fraction', numerator, denominator }; hint = `The whole is split into ${denominator} equal parts. Count the shaded parts for the numerator.`; operands = [numerator, denominator];
    } else { form = 0; answer = quantity / denominator * numerator; expression = `${numerator}/${denominator} of ${quantity} =`; prompt = 'Share the moonberries into equal groups. Find the fraction.'; visual = { type: 'fraction', numerator, denominator, quantity }; hint = `First divide ${quantity} into ${denominator} equal groups. ${numerator === 1 ? 'Take one group.' : `Take ${numerator} of those groups.`}`; operands = [numerator, denominator, quantity]; }
  } else if (type === 'practical') {
    const range = year === 1 ? 2 : year === 2 ? 3 : 5; form = integer(0, range - 1, rng);
    if (form === 0) {
      const coins = year === 1 ? [1, 2, 5, 10] : [5, 10, 20, 50];
      const a = pick(coins, rng), b = pick(coins, rng); const paid = year === 1 ? a + b : (a + b <= 50 ? 50 : 100);
      const change = year > 1 && band > 0;
      answer = change ? paid - a - b : a + b; expression = change ? `${paid}p − (${a}p + ${b}p) =` : `${a}p + ${b}p =`;
      prompt = change ? `Two supplies cost ${a}p and ${b}p. Pay ${paid}p. How much change, in pence?` : 'Find the total value of these two coins, in pence.';
      visual = { type: 'coins', coins: [a, b], paid: change ? paid : null }; hint = change ? `Add the two prices first. Subtract that total from ${paid}p.` : 'Count the value written on each coin, then add the two values.'; operands = [a, b, paid, change];
    } else if (form === 1) {
      const a = integer(2, year === 1 ? 10 : 30, rng), b = integer(1, year === 1 ? 10 : 20, rng);
      answer = a + b; expression = `${a} cm + ${b} cm =`; prompt = 'Two ribbons join to make a bridge. How long is the joined ribbon, in centimetres?'; visual = { type: 'ribbon', a, b }; hint = 'The two lengths use the same unit. Add their numbers and keep cm.'; operands = [a, b];
    } else if (form === 2) {
      const width = integer(2, 12, rng), height = integer(2, 9, rng); answer = year === 3 ? 2 * (width + height) : width + height;
      expression = year === 3 ? 'Perimeter in cm =' : `${width} cm + ${height} cm =`; prompt = year === 3 ? 'A rectangular garden has these side lengths. Find the distance all the way around.' : 'Join these two lengths. Find their total in centimetres.';
      visual = { type: 'rectangle', width, height }; hint = year === 3 ? `Add all four sides: ${width} + ${height} + ${width} + ${height}.` : 'Add the two lengths.'; operands = [width, height];
    } else {
      const unit = form === 3 ? 'm' : 'kg', multiplier = form === 3 ? 100 : 1000, output = form === 3 ? 'cm' : 'g';
      const whole = integer(1, band === 2 ? 8 : 4, rng), rest = band === 0 ? 0 : integer(1, 9, rng) * (form === 3 ? 5 : 50);
      answer = whole * multiplier + rest; expression = `${whole} ${unit}${rest ? ` + ${rest} ${output}` : ''} =`; prompt = `Write this measurement in ${output === 'cm' ? 'centimetres' : 'grams'}.`; visual = { type: 'measure', whole, unit, rest, output };
      hint = `1 ${unit} = ${multiplier} ${output}. Multiply ${whole} by ${multiplier}${rest ? `, then add ${rest}` : ''}.`; operands = [whole, rest, unit];
    }
  } else if (type === 'timeShape') {
    form %= 2;
    if (form === 0) {
      const hour = integer(1, 12, rng), minutes = year === 1 ? (band === 0 ? 0 : pick([0, 30], rng)) : year === 2 ? pick(band === 0 ? [0, 30] : [0, 15, 30, 45], rng) : band === 0 ? pick([0, 15, 30, 45], rng) : band === 1 ? integer(0, 11, rng) * 5 : integer(0, 59, rng);
      const time = m => `${hour}:${String(m).padStart(2, '0')}`;
      answer = time(minutes); expression = 'The time is'; prompt = 'Read the clock. Choose its time.'; options = choices(answer, [time((minutes + 15) % 60), time((minutes + 30) % 60), `${hour % 12 + 1}:${String(minutes).padStart(2, '0')}`], rng);
      visual = { type: 'clock', hour, minutes }; hint = 'The short hand shows hours; the long hand shows minutes. Each numbered step is five minutes. Count the small minute marks for the exact minute.'; operands = [hour, minutes];
    } else {
      const shape = pick([{ name: 'triangle', sides: 3, corners: 3, right: 0 }, { name: 'square', sides: 4, corners: 4, right: 4 }, { name: 'rectangle', sides: 4, corners: 4, right: 4 }, { name: 'pentagon', sides: 5, corners: 5, right: 0 }, { name: 'hexagon', sides: 6, corners: 6, right: 0 }], rng);
      const angles = year === 3 && band > 0;
      if (year === 1 && band === 0) { answer = shape.name; options = choices(answer, ['triangle', 'square', 'rectangle', 'pentagon', 'hexagon'].filter(n => n !== answer), rng); prompt = 'Choose the name of this shape.'; expression = 'This shape is a'; }
      else { answer = angles ? shape.right : shape.sides; prompt = angles ? 'How many right angles does this shape have?' : 'How many straight sides does this shape have?'; expression = angles ? 'Right angles =' : 'Straight sides ='; }
      visual = { type: 'shape', ...shape }; hint = angles ? 'A right angle is a square corner, like the corner of a book. Look at each corner.' : 'Trace around the edge and count each straight side once.'; operands = [shape.name, angles, year === 1 && band === 0];
    }
  } else if (type === 'chart') {
    const scale = year === 1 ? 1 : band === 0 ? 1 : pick([1, 2, 5], rng);
    const labels = ['Foxes', 'Owls', 'Rabbits']; const units = shuffle([integer(1, 3, rng), integer(4, 5, rng), integer(6, 7, rng)], rng);
    const values = units.map(n => n * scale); const total = values.reduce((a, b) => a + b, 0);
    if (form === 0) { answer = total; prompt = 'How many friends are at the sky picnic altogether?'; expression = 'Friends altogether ='; }
    else if (form === 1) { answer = Math.abs(values[0] - values[1]); prompt = `How many more ${values[0] > values[1] ? labels[0].toLowerCase() : labels[1].toLowerCase()} than ${values[0] > values[1] ? labels[1].toLowerCase() : labels[0].toLowerCase()} are there?`; expression = 'The difference is'; }
    else { answer = labels[values.indexOf(Math.max(...values))]; prompt = 'Which group has the most friends?'; expression = 'The largest group is'; options = shuffle(labels, rng); }
    visual = { type: 'chart', labels, units, scale }; hint = `Each ${year === 1 ? 'picture' : 'block'} represents ${scale} ${scale === 1 ? 'friend' : 'friends'}. ${form === 0 ? 'Find each row’s total, then add the rows.' : form === 1 ? 'Find the two row totals, then subtract the smaller from the greater.' : 'Compare the row lengths.'}`; operands = [...units, scale, form];
  }
  return { key: `${type}:${form}:${JSON.stringify(operands)}`, family: type, form: String(form), band, prompt, expression, answer: String(answer), options, visual, hint };
}

function columnHint(a, b, minus) {
  if (a + b <= 20) return minus ? `Start with ${a}. Take away ${b}, or count back ${b} steps.` : `Start at ${a} and count on ${b}. You can make ten first if the total crosses ten.`;
  if (!minus) {
    let carry = 0; const steps = [];
    for (const [index, label] of ['ones', 'tens', 'hundreds'].entries()) {
      const x = Math.floor(a / 10 ** index) % 10, y = Math.floor(b / 10 ** index) % 10, total = x + y + carry;
      steps.push(`${label}: ${x} + ${y}${carry ? ' + 1 carried' : ''} = ${total}${total >= 10 ? `; write ${total % 10} and exchange ten ${label} for one in the next column` : ''}`); carry = total >= 10 ? 1 : 0;
    }
    return steps.join('. ') + '.';
  }
  const digits = [a % 10, Math.floor(a / 10) % 10, Math.floor(a / 100)]; const steps = [];
  for (let i = 0; i < 3; i++) {
    const y = Math.floor(b / 10 ** i) % 10, label = ['ones', 'tens', 'hundreds'][i];
    if (digits[i] < y) {
      let donor = i + 1; while (donor < 3 && digits[donor] === 0) donor++;
      if (donor < 3) { digits[donor]--; for (let j = donor - 1; j > i; j--) digits[j] = 9; digits[i] += 10; steps.push(`Exchange from the next available column to make ${digits[i]} ${label}`); }
    }
    steps.push(`${label}: ${digits[i]} − ${y} = ${digits[i] - y}`);
  }
  return steps.join('. ') + '.';
}

export function generateQuestion(task, year, band, seen = [], rng = Math.random) {
  const level = levelFor(task); if (!level || !LEARNING.years.includes(year) || ![0, 1, 2].includes(band)) throw new Error('Unknown maths level');
  let question;
  for (let attempt = 0; attempt < 120; attempt++) { question = make(level, year, band, rng); if (!seen.includes(question.key)) return question; }
  // A small fluency bank can eventually be exhausted. Revisit older facts after its alternatives.
  return question;
}
