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
  return { M: model(), currentRate, osv: typeof osv === 'function' ? osv : null, fxToday: typeof fxToday === 'function' ? fxToday : null, controlSums: typeof controlSums === 'function' ? controlSums : null };`);
const { M, currentRate, osv } = run(E);
let bad = 0, skipped = 0;
for (const x of EXPECTED) {
  if (!osv && x.group === 'Рахунки') { skipped++; continue; }
  const a = actualValue(M, { currentRate, osv, month }, x.key);
  const ok = a != null && Math.abs(a - x.value) < 0.005;
  if (!ok) bad++;
  console.log((ok ? '✅ ' : '❌ ') + x.label + ': очікується ' + x.value + ', є ' + a);
}
// Контрольні суми (мають бути 0) — на еталоні і на варіантах нижче.
const csCheck = (name, R) => { if (!R.controlSums) return; for (const x of R.controlSums(R.M)) { const ok = Math.abs(x.v) < 0.01; if (!ok) bad++; console.log((ok ? '✅ ' : '❌ ') + `[${name}] ${x.label}: ${x.v}`); } };
csCheck('еталон', run(E));
// Додатково: подвійний запис має сходитися за будь-якого курсу і будь-якого обміну.
if (osv) {
  const variants = [['курс 44', E2 => { E2.config.rates = { USD: 44 }; }],
                    ['обмін дорожче + курс 38', E2 => { for (const d in E2.days) for (const id in E2.days[d]) { const o = E2.days[d][id]; if (o.type === 'exchange') o.amount2 = 4500; } E2.config.rates = { USD: 38 }; }]];
  for (const [name, f] of variants) {
    const E2 = etalonData(month); f(E2);
    const R = run(E2), O = R.osv(R.M.posts, '', '', '', '');
    csCheck(name, R);
    let sum = 0, pl = 0; for (const k in O) { sum += O[k].close; if (/^[79]/.test(k) && k !== '714' && k !== '945') pl -= O[k].close; }
    const fx = -((O['714'] ? O['714'].close : 0) + (O['945'] ? O['945'].close : 0));
    const ft = R.fxToday ? R.fxToday(R.M.ops, R.M.nowR, R.M.opR).reduce((t, r) => t + r.v, 0) : R.M.fxDiff;
    const checks = [['таблиця «з сьогоднішнім курсом» = курсова різниця', ft, R.M.fxDiff], ['сума сальдо = 0', sum, 0], ['курсова різниця = як на екрані «Гроші»', fx, R.M.fxDiff], ['P&L з рахунків = P&L з початку', pl, R.M.plAll]];
    for (const [l, v, e] of checks) { const ok = Math.abs(v - e) < 0.01; if (!ok) bad++; console.log((ok ? '✅ ' : '❌ ') + `[${name}] ${l}: ${Math.round(v * 100) / 100} / ${e}`); }
  }
}
if (skipped) console.log(`ℹ️ Пропущено ${skipped} показників по рахунках: у цій версії рахунків ще немає`);
console.log(bad ? `\n❌ Помилок: ${bad} (${file})` : `\n✅ Усі ${EXPECTED.length - skipped} показників збігаються (${file})`);
process.exit(bad ? 1 : 0);
