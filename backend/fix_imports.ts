import fs from 'fs';
import path from 'path';

const routesDir = path.join(__dirname, 'src/routes');

fs.readdirSync(routesDir).forEach(file => {
  if (!file.endsWith('.ts')) return;
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('requirePermission') && !content.includes('../middlewares/role.middleware')) {
    content = content.replace(
      /import { Router } from 'express';/,
      "import { Router } from 'express';\nimport { requirePermission } from '../middlewares/role.middleware';"
    );
    fs.writeFileSync(filePath, content);
    console.log(`Fixed import in ${file}`);
  }
});
