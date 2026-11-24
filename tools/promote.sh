#!/usr/bin/env bash
# Перенести перевірену тестову версію в робочу.
# Копіюються тільки програма (index.html, sw.js); налаштування бази, іконки й маніфест у кожної версії свої.
set -euo pipefail
cd "$(dirname "$0")/.."
node tools/check.mjs test/index.html >/dev/null || { echo "❌ Тестова версія не пройшла перевірку еталоном — не переношу"; exit 1; }
cp test/index.html index.html
cp test/sw.js sw.js
node tools/check.mjs index.html | tail -1
echo "Готово: робоча версія = тестова. Залишилось git commit і push."
