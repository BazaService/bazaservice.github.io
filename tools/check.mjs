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
  return { M: model(), currentRate, osv: typeof osv === 'function' ? osv : null, fxToday: typeof fxToday === 'function' ? fxToday : null, controlSums: typeof controlSums === 'function' ? controlSums : null, interestDue: typeof interestDue === 'function' ? interestDue : null, interestPending: typeof interestPending === 'function' ? interestPending : null };`);
const { M, currentRate, osv, interestDue, interestPending } = run(E);
let bad = 0, skipped = 0;
for (const x of EXPECTED) {
  if (!osv && x.group === 'Рахунки') { skipped++; continue; }
  const a = actualValue(M, { currentRate, osv, month, interestDue, interestPending }, x.key);
  const ok = a != null && Math.abs(a - x.value) < 0.005;
  if (!ok) bad++;
  console.log((ok ? '✅ ' : '❌ ') + x.label + ': очікується ' + x.value + ', є ' + a);
}
// Контрольні суми (мають бути 0) — на еталоні і на варіантах нижче.
const csCheck = (name, R) => { if (!R.controlSums) return; for (const x of R.controlSums(R.M)) { const ok = Math.abs(x.v) < 0.01; if (!ok) bad++; console.log((ok ? '✅ ' : '❌ ') + `[${name}] ${x.label}: ${x.v}`); } };
csCheck('еталон', run(E));
// Відсотки по днях: окремий сценарій (листопад, 30 днів). Інвестор дав 1 000 $ 01.11, повернули 500 $ 16.11,
// інвестор додав 3 000 $ 21.11. День отримання рахується, день повернення — ні:
// 1 000 × 15 дн. + 500 × 5 дн. + 3 500 × 10 дн. = 15 000 + 2 500 + 35 000 = 52 500 $·дн × 1% / 30 = 17,50 $
{
  const R = run(etalonData(month));
  if (R.interestDue) {
    const t0 = Date.parse('2026-11-01T08:00:00Z');
    const ops = [
      { id: 'i1', type: 'clientIn', client: 'X', to: 'b-a', cur: 'USD', amount: 1000, date: '2026-11-01', ts: t0 },
      { id: 'i2', type: 'clientOut', client: 'X', from: 'b-a', cur: 'USD', amount: 500, date: '2026-11-16', ts: t0 + 1 },
      { id: 'i3', type: 'clientIn', client: 'X', to: 'b-a', cur: 'USD', amount: 3000, date: '2026-11-21', ts: t0 + 2 }];
    const v = R.interestDue(ops, 'X', '2026-11', 1, '2026-11-01', 'USD').amount;
    const v2 = R.interestDue(ops, 'X', '2026-11', 1, '2026-11-21', 'USD').amount; // відсотки лише з 21.11: 3 500 × 10 дн. = 11,67
    for (const [l, a, e] of [['відсотки по днях (1 000 / 500 / 3 500)', v, 17.5], ['відсотки з дати початку 21.11', v2, 11.67]]) {
      const ok = Math.abs(a - e) < 0.005; if (!ok) bad++; console.log((ok ? '✅ ' : '❌ ') + `[відсотки] ${l}: ${a} / ${e}`);
    }
  }
}
// Нарахування 25-го і коригування наступного місяця: інвестор дав 1 000 $ 01.11, 25.11 нараховано 10 $ за листопад,
// 28.11 інвестор додав 3 000 $ → насправді за листопад 10 + 3 000 × 3 дн. × 1% / 30 = 13 $ → 25.12: коригування +3 $,
// грудень (прогноз) 4 000 × 1% = 40 $ → разом 43 $.
{
  const E3 = etalonData(month);
  const R = run(E3);
  if (R.interestPending) {
    const t0 = Date.parse('2026-11-01T08:00:00Z');
    E3.days = { '2026-11-01': { a: { type: 'clientIn', date: '2026-11-01', client: 'c-inv', to: 'b-a', cur: 'USD', amount: 1000, ts: t0 } },
      '2026-11-25': { b: { type: 'expense', date: '2026-11-25', payVia: 'client', client: 'c-int', cur: 'USD', amount: 10, rate: 42, category: 'Відсотки інвестору', ts: t0 + 1, interestFor: { client: 'c-inv', month: '2026-11', pct: 1, parts: { '2026-11': 10 } } } },
      '2026-11-28': { c: { type: 'clientIn', date: '2026-11-28', client: 'c-inv', to: 'b-a', cur: 'USD', amount: 3000, ts: t0 + 2 } } };
    E3.config.acct.interest = { 'c-inv': { pct: 1, from: '2026-11-01', cur: 'USD' } };
    const R3 = run(E3);
    const before = R3.interestPending(R3.M.ops, '2026-12-24').length;
    const p = R3.interestPending(R3.M.ops, '2026-12-25')[0] || {};
    for (const [l, a, e] of [['до 25.12 вікна немає', before, 0], ['25.12: коригування за листопад', p.corr && p.corr[0] ? p.corr[0].v : null, 3], ['25.12: разом до нарахування', p.total, 43]]) {
      const ok = a != null && Math.abs(a - e) < 0.005; if (!ok) bad++; console.log((ok ? '✅ ' : '❌ ') + `[відсотки 25-го] ${l}: ${a} / ${e}`);
    }
  }
}
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
