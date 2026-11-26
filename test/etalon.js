// Версія еталону: збільшувати, коли змінюються дані еталону. Якщо в базі старіша — «Перевірка» попросить скинути.
export const ETALON_VER = 3;
// Еталонні дані для тестової версії і очікувані результати. Погоджено з власником 26.11.2026.
// Усі суми круглі. Витрат у валюті немає (як у житті). Курс: 01 обмін по 40, 15 обмін по 42 → сьогодні 42.
//
//  01 Інвестор дав 1 000 $ → Каса А          01 Обмін 100 $ → 4 000 ₴ (40), Каса А
//  03 Переказ 1 000 ₴ А → Б                   04 Ремонт 1 000 ₴ з А
//  05 Зарплата 500 ₴ з Б                      05 Болгарка (ОЗ) 1 000 ₴ з А
//  06 Інший дохід 500 ₴ → Б                   07 Дали Клієнту 1 000 ₴ з А
//  08 Клієнт повернув 500 ₴ → Б               15 Обмін 200 $ → 8 400 ₴ (42), Каса А
//  + видалена витрата 900 ₴ — не має рахуватися ніде.
//
//  Каса А: 4000 − 1000 − 1000 − 1000 − 1000 + 8400 = 8 400 ₴ і 1000 − 100 − 200 = 700 $.  Каса Б: 1000 − 500 + 500 + 500 = 1 500 ₴.
//  У касах: 9 900 + 700 × 42 = 39 300.  Інвестору винні 1 000 $ = 42 000.  Клієнт винен 500.
//  Баланс: 39 300 + 500 − 42 000 = −2 200.  P&L: 500 − 1 500 − 1 000 = −2 000.
//  Курсова різниця −200: обмін 100 $ по 40 при курсі сьогодні 42 → −200; обмін 200 $ по 42 → 0. Треба докупити 300 $.
//
//  Рахунки (FIFO-партії): 301 = 9 900; 302 = 700 $ (облік по 40 = 28 000, переоцінка до 42 → 29 400);
//    377 = 500; 60 = −42 000; 91 = 1 500 (Ремонт + Зарплата); 949 = 1 000 (ОЗ); 719 = −500;
//    714 = −1 800 (обмін 200 $ дорожче на 400 + переоцінка каси 1 400), 945 = 2 000 (переоцінка боргу інвестору) → курсова −200.
//    Оборот Дт = Оборот Кт = 61 300 (усі проводки, разом з переоцінкою). Сума сальдо = 0.

export function etalonData(month) {
  const d = n => month + '-' + String(n).padStart(2, '0');
  const t0 = Date.parse(month + '-01T08:00:00Z');
  let i = 0;
  const op = (n, o) => ({ id: 'e' + String(++i).padStart(2, '0'), day: d(n), op: Object.assign({
    date: d(n), payVia: null, from: null, to: null, client: null, cur: 'UAH', amount: 0,
    cur2: null, amount2: null, rate: null, category: null, isAsset: false, assetName: null,
    comment: '', deleted: false, by: 'etalon', ts: t0 + i * 60000, editedBy: null, editedTs: null
  }, o) });
  const list = [
    op(1,  { type: 'clientIn',  client: 'c-inv', to: 'b-a', cur: 'USD', amount: 1000, comment: 'Еталон: інвестор дав 1 000 $' }),
    op(1,  { type: 'exchange',  from: 'b-a', to: 'b-a', cur: 'USD', amount: 100, cur2: 'UAH', amount2: 4000, rate: 40, comment: 'Еталон: обмін 100 $ по 40' }),
    op(3,  { type: 'transfer',  from: 'b-a', to: 'b-b', amount: 1000, comment: 'Еталон: переказ' }),
    op(4,  { type: 'expense',   payVia: 'box', from: 'b-a', amount: 1000, category: 'Ремонт', comment: 'Еталон' }),
    op(5,  { type: 'expense',   payVia: 'box', from: 'b-b', amount: 500, category: 'Зарплата', comment: 'Еталон' }),
    op(5,  { type: 'expense',   payVia: 'box', from: 'b-a', amount: 1000, category: 'Основні засоби', isAsset: true, assetName: 'Болгарка', comment: 'Еталон: ОЗ' }),
    op(6,  { type: 'income',    payVia: 'box', to: 'b-b', amount: 500, category: 'Інший дохід', comment: 'Еталон' }),
    op(7,  { type: 'clientOut', client: 'c-cl', from: 'b-a', amount: 1000, comment: 'Еталон: дали клієнту' }),
    op(8,  { type: 'clientIn',  client: 'c-cl', to: 'b-b', amount: 500, comment: 'Еталон: клієнт повернув' }),
    op(10, { type: 'expense',   payVia: 'box', from: 'b-a', amount: 900, category: 'Ремонт', deleted: true, comment: 'Еталон: ВИДАЛЕНА, не має рахуватись' }),
    op(15, { type: 'exchange',  from: 'b-a', to: 'b-a', cur: 'USD', amount: 200, cur2: 'UAH', amount2: 8400, rate: 42, comment: 'Еталон: обмін 200 $ по 42 (курс зріс)' }),
  ];
  const days = {};
  for (const x of list) (days[x.day] = days[x.day] || {})[x.id] = x.op;
  return {
    config: {
      boxes: [{ id: 'b-a', name: 'Каса А', archived: false }, { id: 'b-b', name: 'Каса Б', archived: false }],
      categories: ['Ремонт', 'Зарплата', 'Інше'], incomeCategories: ['Інший дохід'],
      currencies: ['UAH', 'USD'], rates: {}, legacyNames: { etalon: 'Еталон' }, etalonMonth: month, etalonVer: ETALON_VER,
      acct: { clients: { 'c-inv': 'investor' }, exp: {}, inc: {} }
    },
    clients: { 'c-inv': { name: 'Інвестор', archived: false }, 'c-cl': { name: 'Клієнт', archived: false } },
    days
  };
}

export const EXPECTED = [
  { group: 'Каси',    label: 'Каса А, гривня',            key: 'box:b-a:UAH', value: 8400,   cur: 'UAH' },
  { group: 'Каси',    label: 'Каса А, долари',            key: 'box:b-a:USD', value: 700,    cur: 'USD' },
  { group: 'Каси',    label: 'Каса Б, гривня',            key: 'box:b-b:UAH', value: 1500,   cur: 'UAH' },
  { group: 'Каси',    label: 'Каса Б, долари',            key: 'box:b-b:USD', value: 0,      cur: 'USD' },
  { group: 'Каси',    label: 'У касах (усе в гривні)',    key: 'cash',        value: 39300,  cur: 'UAH' },
  { group: 'Клієнти', label: 'Інвестор, долари',          key: 'cli:c-inv:USD', value: -1000, cur: 'USD' },
  { group: 'Клієнти', label: 'Клієнт, гривня',            key: 'cli:c-cl:UAH',  value: 500,   cur: 'UAH' },
  { group: 'Клієнти', label: 'Мені винні',                key: 'owed',        value: 500,    cur: 'UAH' },
  { group: 'Клієнти', label: 'Я винен',                   key: 'owe',         value: 42000,  cur: 'UAH' },
  { group: 'Гроші',   label: 'Баланс',                    key: 'balance',     value: -2200,  cur: 'UAH' },
  { group: 'Гроші',   label: 'P&L з початку',             key: 'plAll',       value: -2000,  cur: 'UAH' },
  { group: 'Гроші',   label: 'P&L за місяць',             key: 'plMonth',     value: -2000,  cur: 'UAH' },
  { group: 'Гроші',   label: 'Курсова різниця',           key: 'fx',          value: -200,      cur: 'UAH' },
  { group: 'Гроші',   label: 'Треба докупити доларів',    key: 'need:USD',    value: 300,       cur: 'USD' },
  { group: 'Звіт',    label: 'Доходи за місяць',          key: 'month:inc',   value: 500,     cur: 'UAH' },
  { group: 'Звіт',    label: 'Витрати за місяць (без ОЗ)', key: 'month:exp',  value: 1500,    cur: 'UAH' },
  { group: 'Звіт',    label: 'Основні засоби за місяць',  key: 'month:oz',    value: 1000,    cur: 'UAH' },
  { group: 'Рахунки', label: '301 Каса в гривні',          key: 'acc:301',     value: 9900,   cur: 'UAH' },
  { group: 'Рахунки', label: '302 Каса в валюті (у гривні)', key: 'acc:302',   value: 29400,  cur: 'UAH' },
  { group: 'Рахунки', label: '302 Каса в валюті, долари',  key: 'acccur:302:USD', value: 700, cur: 'USD' },
  { group: 'Рахунки', label: '377 Інші дебітори (Клієнт)',  key: 'acc:377',    value: 500,    cur: 'UAH' },
  { group: 'Рахунки', label: '60 Позики (Інвестор), кредит', key: 'acc:60',    value: -42000, cur: 'UAH' },
  { group: 'Рахунки', label: '91 Загальновиробничі витрати', key: 'acc:91',    value: 1500,    cur: 'UAH' },
  { group: 'Рахунки', label: '949 Інші витрати (ОЗ)',      key: 'acc:949',     value: 1000,    cur: 'UAH' },
  { group: 'Рахунки', label: '719 Інші доходи, кредит',    key: 'acc:719',     value: -500,    cur: 'UAH' },
  { group: 'Рахунки', label: '714 − 945 Курсова різниця',  key: 'accfx',       value: -200,      cur: 'UAH' },
  { group: 'Рахунки', label: 'Оборот Дт (усі проводки)',        key: 'turn:dt',     value: 61300,  cur: 'UAH' },
  { group: 'Рахунки', label: 'Оборот Кт (усі проводки)',        key: 'turn:kt',     value: 61300,  cur: 'UAH' },
  { group: 'Рахунки', label: 'Сума всіх сальдо (має бути 0)', key: 'accsum',   value: 0,      cur: 'UAH' },
  { group: 'Інше',    label: 'Курс долара',               key: 'rate:USD',    value: 42,     cur: 'UAH' },
  { group: 'Інше',    label: 'Кількість операцій (без видалених)', key: 'ops', value: 10,    cur: '' },
];

// Фактичне значення показника з розрахунків застосунку (model()).
export function actualValue(M, ctx, key) {
  const p = key.split(':');
  const O = p[0].startsWith('acc') || p[0] === 'turn' ? ctx.osv(M.posts, '', '', '', '') : null;
  const bal = a => O[a] ? O[a].close : 0;
  const mm = M.months[ctx.month] || { inc: 0, exp: 0, oz: 0 };
  switch (p[0]) {
    case 'box': return ((M.boxes[p[1]] || {})[p[2]]) || 0;
    case 'cli': return ((M.cli[p[1]] || {})[p[2]]) || 0;
    case 'cash': return M.cashU;
    case 'owed': return M.owedToMe;
    case 'owe': return M.iOwe;
    case 'balance': return M.balance;
    case 'plAll': return M.plAll;
    case 'plMonth': return Math.round((mm.inc - mm.exp - mm.oz) * 100) / 100;
    case 'fx': return M.fxDiff;
    case 'month': return Math.round((mm[p[1]] || 0) * 100) / 100;
    case 'rate': return ctx.currentRate(p[1], M.hist);
    case 'ops': return M.ops.length;
    case 'need': { const c = p[1]; let have = (M.cash[c] || 0), owe = 0; for (const k in M.cli) { const v = (M.cli[k] || {})[c] || 0; if (v > 0) have += v; else owe -= v; } return Math.round((owe - have) * 100) / 100; }
    case 'acc': return bal(p[1]);
    case 'acccur': return O[p[1]] ? (O[p[1]].cur[p[2]] || 0) : 0;
    case 'accfx': return Math.round(-(bal('714') + bal('945')) * 100) / 100;
    case 'accsum': { let t = 0; for (const k in O) t += O[k].close; return Math.round(t * 100) / 100; }
    case 'turn': { const m = O; let t = 0; for (const k in m) t += m[k][p[1]]; return Math.round(t * 100) / 100; }
  }
  return null;
}
