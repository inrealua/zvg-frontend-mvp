const fs = require('node:fs');
const path = require('node:path');
try {
  const dotenv = require('dotenv');
  for (const name of ['.env.local', '.env']) {
    const file = path.join(process.cwd(), name);
    if (fs.existsSync(file)) dotenv.config({ path: file, override: false });
  }
} catch (_) {}
