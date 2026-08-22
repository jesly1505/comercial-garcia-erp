import fs from 'fs';
import path from 'path';

const routesDir = path.join(__dirname, 'src/routes');

const routeMap: Record<string, string> = {
  'customer.routes.ts': 'customers',
  'product.routes.ts': 'products',
  'inventory.routes.ts': 'inventory',
  'sales-order.routes.ts': 'sales_orders',
  'invoice.routes.ts': 'invoices',
  'cash.routes.ts': 'cash',
  'purchase.routes.ts': 'purchases',
  'supplier.routes.ts': 'suppliers',
  'accounts-receivable.routes.ts': 'accounts_receivable',
  'report.routes.ts': 'reports',
};

for (const [file, mod] of Object.entries(routeMap)) {
  const filePath = path.join(routesDir, file);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');
  
  // Reemplazar import de authorizeRole por requirePermission
  content = content.replace(/authorizeRole|requireAdmin/g, 'requirePermission');
  
  // Ahora, vamos a modificar cada router.get, post, put, delete, patch para inyectar requirePermission
  // Ejemplo: router.get('/', getCustomers); -> router.get('/', requirePermission('customers:view'), getCustomers);
  
  content = content.replace(/router\.get\('([^']+)',\s*(?!requirePermission)([^)]+)\);/g, `router.get('$1', requirePermission('${mod}:view'), $2);`);
  content = content.replace(/router\.post\('([^']+)',\s*(?!requirePermission)([^)]+)\);/g, `router.post('$1', requirePermission('${mod}:create'), $2);`);
  content = content.replace(/router\.put\('([^']+)',\s*(?!requirePermission)([^)]+)\);/g, `router.put('$1', requirePermission('${mod}:edit'), $2);`);
  content = content.replace(/router\.delete\('([^']+)',\s*(?!requirePermission)([^)]+)\);/g, `router.delete('$1', requirePermission('${mod}:delete'), $2);`);
  content = content.replace(/router\.patch\('([^']+)',\s*(?!requirePermission)([^)]+)\);/g, `router.patch('$1', requirePermission('${mod}:edit'), $2);`);

  // Limpiar cualquier requirePermission encadenado (ej: requirePermission, requirePermission('...:view'))
  content = content.replace(/requirePermission,\s*requirePermission\(/g, 'requirePermission(');

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
}
