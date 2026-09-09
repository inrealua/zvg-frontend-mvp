const fs = require('fs');
const path = require('path');

const root = process.cwd();
const roots = ['app', 'components', path.join('lib', 'i18n')];
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const findings = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (extensions.has(path.extname(entry.name))) inspect(full);
  }
}

function add(file, line, message) {
  findings.push(`${path.relative(root, file)}:${line}: ${message}`);
}

function inspect(file) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, idx) => {
    const n = idx + 1;
    if (/Українська|Ukrainian|українська/i.test(line)) add(file, n, 'Ukrainian public locale text found');
    if (/\b(locale|language|languages|locales|supportedLocales)\b[^\n]*["']uk(?:-UA)?["']/i.test(line)) add(file, n, 'public UK/uk locale token found');
    if (/["']uk["']\s*[:,]/i.test(line) && !file.endsWith('property-translations.ts')) add(file, n, 'UK/uk locale key found');
  });
}

for (const r of roots) walk(path.join(root, r));

const switcher = path.join(root, 'components', 'LanguageSwitcher.tsx');
if (!fs.existsSync(switcher)) findings.push('components/LanguageSwitcher.tsx: missing');
else {
  const s = fs.readFileSync(switcher, 'utf8');
  for (const expected of ['code: "de", label: "Deutsch"', 'code: "ru", label: "Русский"', 'code: "en", label: "English"']) {
    if (!s.includes(expected)) findings.push(`components/LanguageSwitcher.tsx: expected option missing: ${expected}`);
  }
  if (!s.includes('data-language-switcher="de-ru-en"')) findings.push('components/LanguageSwitcher.tsx: v3.0.4 marker missing');
}

const config = path.join(root, 'lib', 'i18n', 'config.ts');
if (fs.existsSync(config)) {
  const c = fs.readFileSync(config, 'utf8').replace(/\s+/g, ' ');
  if (!c.includes('["de", "ru", "en"]')) findings.push('lib/i18n/config.ts: locales are not exactly de/ru/en');
}

if (findings.length) {
  console.error('I18N LOCALE DOCTOR: FAILED');
  findings.forEach((x) => console.error(' - ' + x));
  process.exit(2);
}

console.log('I18N LOCALE DOCTOR: OK');
console.log('Public languages: DE / RU / EN');
console.log('Language menu: Deutsch / Русский / English');
