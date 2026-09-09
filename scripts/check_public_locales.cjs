const fs = require('fs');
const path = require('path');
const root = process.cwd();
const scanRoots = ['app','components','lib'];
const ignore = new Set([
  path.normalize('lib/i18n/property-translations.ts'), // legacy DB UK compatibility only
  path.normalize('lib/i18n/config.ts'), // intentionally migrates old uk/ua values to en
  path.normalize('components/LanguageSwitcher.tsx'), // intentionally migrates old uk/ua values to en
]);
const allowedExt = new Set(['.ts','.tsx','.js','.jsx','.json','.md']);
const bad = [];
const uaWords = /Україн|Украин|Ukrainian|\bua\b|["'`]uk["'`]/i;
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, {withFileTypes:true})) {
    if (ent.name === 'node_modules' || ent.name === '.next') continue;
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(abs);
    else if (allowedExt.has(path.extname(ent.name))) {
      const rel = path.normalize(path.relative(root, abs));
      if (ignore.has(rel)) continue;
      const text = fs.readFileSync(abs, 'utf8');
      if (uaWords.test(text)) bad.push(rel);
    }
  }
}
for (const r of scanRoots) walk(path.join(root,r));
console.log('Required public locales: DE / RU / EN');
console.log('Legacy /uk and /ua URLs: redirect to /en');
if (bad.length) {
  console.error('Unexpected Ukrainian-locale references found:');
  for (const f of bad) console.error(' -', f);
  process.exit(2);
}
console.log('[OK] No Ukrainian public-locale references found.');
