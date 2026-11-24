// Еталонні дані для тестової версії і очікувані результати.
// Суми круглі, щоб усе можна було порахувати в голові. Курс USD = 40 (з обміну).
//
//  Каса А: +1000$ від інвестора, −100$ обмін → +4000₴, −1000₴ у Касу Б, −200₴ ремонт,
//          −400₴ ОЗ «Болгарка», −300₴ дали Клієнту, −10$ ремонт       => 2100₴ і 890$
//  Каса Б: +1000₴ з Каси А, −100₴ зарплата, +50₴ дохід, +100₴ від Клієнта => 1050₴
//  Інвестор: ми винні 1000$ (= 40 000₴).  Клієнт: винен нам 300−100 = 200₴.
//  У касах: 3150₴ + 890$×40 = 38 750₴.  Баланс: 38 750 + 200 − 40 000 = −1050₴.
//  P&L: дохід 50 − витрати (200+100+10$×40=700) − ОЗ 400 = −1050₴.  Курсова різниця 0.
//  Одна видалена операція на 999₴ — не має рахуватися ніде.
//
//  Рахунки (подвійний запис, усе в гривні за курсом 40). Інвестор має тип «Інвестор» → рахунок 60,
//  Клієнт — тип «Інший» → 377. Ремонт і Зарплата → 91, ОЗ → 949, Інший дохід → 719.
//    301 Каса ₴  = 3150 (Дт 4000+1000+50+100, Кт 1000+200+100+400+300)
//    302 Каса $  = 35 600 (Дт 40 000, Кт 4000+400) = 890 $ × 40
//    377 Клієнт  = 200 (Дт 300, Кт 100)
//    60 Інвестор = −40 000 (кредитове сальдо: ми винні)
//    91 = 700 (200+100+10$×40), 949 = 400, 719 = −50 (кредитове)
//    Сума сальдо = 0, Оборот Дт = Оборот Кт = 46 550.

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
    op(1,  { type: 'clientIn',  client: 'c-inv', to: 'b-a', cur: 'USD', amount: 1000, comment: 'Еталон: інвестор дав 1000 $' }),
    op(2,  { type: 'exchange',  from: 'b-a', to: 'b-a', cur: 'USD', amount: 100, cur2: 'UAH', amount2: 4000, rate: 40, comment: 'Еталон: обмін 100 $ по 40' }),
    op(3,  { type: 'transfer',  from: 'b-a', to: 'b-b', amount: 1000, comment: 'Еталон: переказ' }),
    op(4,  { type: 'expense',   payVia: 'box', from: 'b-a', amount: 200, category: 'Ремонт', comment: 'Еталон' }),
    op(5,  { type: 'expense',   payVia: 'box', from: 'b-b', amount: 100, category: 'Зарплата', comment: 'Еталон' }),
    op(5,  { type: 'expense',   payVia: 'box', from: 'b-a', amount: 400, category: 'Основні засоби', isAsset: true, assetName: 'Болгарка', comment: 'Еталон: ОЗ' }),
    op(6,  { type: 'income',    payVia: 'box', to: 'b-b', amount: 50, category: 'Інший дохід', comment: 'Еталон' }),
    op(7,  { type: 'clientOut', client: 'c-cl', from: 'b-a', amount: 300, comment: 'Еталон: дали клієнту' }),
    op(8,  { type: 'clientIn',  client: 'c-cl', to: 'b-b', amount: 100, comment: 'Еталон: клієнт повернув' }),
    op(9,  { type: 'expense',   payVia: 'box', from: 'b-a', cur: 'USD', amount: 10, category: 'Ремонт', comment: 'Еталон: витрата в доларах' }),
    op(10, { type: 'expense',   payVia: 'box', from: 'b-a', amount: 999, category: 'Ремонт', deleted: true, comment: 'Еталон: ВИДАЛЕНА, не має рахуватись' }),
  ];
  const days = {};
  for (const x of list) (days[x.day] = days[x.day] || {})[x.id] = x.op;
  return {
    config: {
      boxes: [{ id: 'b-a', name: 'Каса А', archived: false }, { id: 'b-b', name: 'Каса Б', archived: false }],
      categories: ['Ремонт', 'Зарплата', 'Інше'], incomeCategories: ['Інший дохід'],
      currencies: ['UAH', 'USD'], rates: {}, legacyNames: { etalon: 'Еталон' }, etalonMonth: month,
      acct: { clients: { 'c-inv': 'investor' }, exp: {}, inc: {} }
    },
    clients: { 'c-inv': { name: 'Інвестор', archived: false }, 'c-cl': { name: 'Клієнт', archived: false } },
    days
  };
}

export const EXPECTED = [
  { group: 'Каси',    label: 'Каса А, гривня',            key: 'box:b-a:UAH', value: 2100,   cur: 'UAH' },
  { group: 'Каси',    label: 'Каса А, долари',            key: 'box:b-a:USD', value: 890,    cur: 'USD' },
  { group: 'Каси',    label: 'Каса Б, гривня',            key: 'box:b-b:UAH', value: 1050,   cur: 'UAH' },
  { group: 'Каси',    label: 'Каса Б, долари',            key: 'box:b-b:USD', value: 0,      cur: 'USD' },
  { group: 'Каси',    label: 'У касах (усе в гривні)',    key: 'cash',        value: 38750,  cur: 'UAH' },
  { group: 'Клієнти', label: 'Інвестор, долари',          key: 'cli:c-inv:USD', value: -1000, cur: 'USD' },
  { group: 'Клієнти', label: 'Клієнт, гривня',            key: 'cli:c-cl:UAH',  value: 200,   cur: 'UAH' },
  { group: 'Клієнти', label: 'Мені винні',                key: 'owed',        value: 200,    cur: 'UAH' },
  { group: 'Клієнти', label: 'Я винен',                   key: 'owe',         value: 40000,  cur: 'UAH' },
  { group: 'Гроші',   label: 'Баланс',                    key: 'balance',     value: -1050,  cur: 'UAH' },
  { group: 'Гроші',   label: 'P&L з початку',             key: 'plAll',       value: -1050,  cur: 'UAH' },
  { group: 'Гроші',   label: 'P&L за місяць',             key: 'plMonth',     value: -1050,  cur: 'UAH' },
  { group: 'Гроші',   label: 'Курсова різниця',           key: 'fx',          value: 0,      cur: 'UAH' },
  { group: 'Звіт',    label: 'Доходи за місяць',          key: 'month:inc',   value: 50,     cur: 'UAH' },
  { group: 'Звіт',    label: 'Витрати за місяць (без ОЗ)', key: 'month:exp',  value: 700,    cur: 'UAH' },
  { group: 'Звіт',    label: 'Основні засоби за місяць',  key: 'month:oz',    value: 400,    cur: 'UAH' },
  { group: 'Рахунки', label: '301 Каса в гривні',          key: 'acc:301',     value: 3150,   cur: 'UAH' },
  { group: 'Рахунки', label: '302 Каса в валюті (у гривні)', key: 'acc:302',   value: 35600,  cur: 'UAH' },
  { group: 'Рахунки', label: '302 Каса в валюті, долари',  key: 'acccur:302:USD', value: 890, cur: 'USD' },
  { group: 'Рахунки', label: '377 Інші дебітори (Клієнт)',  key: 'acc:377',    value: 200,    cur: 'UAH' },
  { group: 'Рахунки', label: '60 Позики (Інвестор), кредит', key: 'acc:60',    value: -40000, cur: 'UAH' },
  { group: 'Рахунки', label: '91 Загальновиробничі витрати', key: 'acc:91',    value: 700,    cur: 'UAH' },
  { group: 'Рахунки', label: '949 Інші витрати (ОЗ)',      key: 'acc:949',     value: 400,    cur: 'UAH' },
  { group: 'Рахунки', label: '719 Інші доходи, кредит',    key: 'acc:719',     value: -50,    cur: 'UAH' },
  { group: 'Рахунки', label: '714 − 945 Курсова різниця',  key: 'accfx',       value: 0,      cur: 'UAH' },
  { group: 'Рахунки', label: 'Оборот Дт за місяць',        key: 'turn:dt',     value: 46550,  cur: 'UAH' },
  { group: 'Рахунки', label: 'Оборот Кт за місяць',        key: 'turn:kt',     value: 46550,  cur: 'UAH' },
  { group: 'Рахунки', label: 'Сума всіх сальдо (має бути 0)', key: 'accsum',   value: 0,      cur: 'UAH' },
  { group: 'Інше',    label: 'Курс долара',               key: 'rate:USD',    value: 40,     cur: 'UAH' },
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
    case 'acc': return bal(p[1]);
    case 'acccur': return O[p[1]] ? (O[p[1]].cur[p[2]] || 0) : 0;
    case 'accfx': return Math.round(-(bal('714') + bal('945')) * 100) / 100;
    case 'accsum': { let t = 0; for (const k in O) t += O[k].close; return Math.round(t * 100) / 100; }
    case 'turn': { const m = ctx.osv(M.posts, ctx.month + '-01', ctx.month + '-31', '', ''); let t = 0; for (const k in m) t += m[k][p[1]]; return Math.round(t * 100) / 100; }
  }
  return null;
}
