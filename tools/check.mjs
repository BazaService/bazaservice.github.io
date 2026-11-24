// Автоперевірка: проганяє розрахунки застосунку на еталонних даних і порівнює з очікуваними.
// Використання: node tools/check.mjs [шлях до index.html]   (за замовчуванням test/index.html)
import fs from 'fs';
import { etalonData, EXPECTED, actualValue } from '../test/etalon.js';

const file = process.argv[2] || 'test/index.html';
const html = fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const m = html.match(/\/\*LOGIC\*\/([\s\S]*)\/\*ENDLOGIC\*\//);
if (!m) { console.error('Не знайдено блок /*LOGIC*/ у ' + file); process.exit(1); }
const month = '2026-11';
const E = etalonData(month);
const run = new Function('E', m[1] + `
  cfg = E.config; clients = E.clients; days = E.days;
  return { M: model(), currentRate };`);
const { M, currentRate } = run(E);
let bad = 0;
for (const x of EXPECTED) {
  const a = actualValue(M, { currentRate, month }, x.key);
  const ok = a != null && Math.abs(a - x.value) < 0.005;
  if (!ok) bad++;
  console.log((ok ? '✅ ' : '❌ ') + x.label + ': очікується ' + x.value + ', є ' + a);
}
console.log(bad ? `\n❌ Помилок: ${bad} (${file})` : `\n✅ Усі ${EXPECTED.length} показників збігаються (${file})`);
process.exit(bad ? 1 : 0);
