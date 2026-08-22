import fs from 'fs';
import path from 'path';

const routesDir = path.join(__dirname, 'src/routes');

fs.readdirSync(routesDir).forEach(file => {
  if (!file.endsWith('.ts')) return;
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  let changed = false;
  if (content.includes(', requirePermission,')) {
    content = content.replace(/,\s*requirePermission,/g, ',');
    changed = true;
  }
  if (content.includes(',  requirePermission,')) {
    content = content.replace(/,\s*requirePermission,/g, ',');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Cleaned up ${file}`);
  }
});
