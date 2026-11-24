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
      currencies: ['UAH', 'USD'], rates: {}, legacyNames: { etalon: 'Еталон' }, etalonMonth: month
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
  { group: 'Інше',    label: 'Курс долара',               key: 'rate:USD',    value: 40,     cur: 'UAH' },
  { group: 'Інше',    label: 'Кількість операцій (без видалених)', key: 'ops', value: 10,    cur: '' },
];

// Фактичне значення показника з розрахунків застосунку (model()).
export function actualValue(M, ctx, key) {
  const p = key.split(':');
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
  }
  return null;
}
