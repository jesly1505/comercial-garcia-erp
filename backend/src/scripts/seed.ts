import 'dotenv/config';
import bcrypt from 'bcrypt';
import prisma from '../utils/prisma';

const MODULES = [
  { id: 'users', name: 'Usuarios' },
  { id: 'roles', name: 'Roles y Permisos' },
  { id: 'customers', name: 'Clientes' },
  { id: 'suppliers', name: 'Proveedores' },
  { id: 'inventory', name: 'Inventario' },
  { id: 'sales', name: 'Ventas y Pedidos' },
  { id: 'sales_orders', name: 'Pedidos' },
  { id: 'invoices', name: 'Facturación' },
  { id: 'purchases', name: 'Compras' },
  { id: 'cash', name: 'Caja' },
  { id: 'accounts_receivable', name: 'Cuentas x Cobrar' },
  { id: 'quotations', name: 'Cotizaciones' },
  { id: 'reports', name: 'Reportes' },
  { id: 'settings', name: 'Configuración' },
  { id: 'audit', name: 'Bitácora' },
  { id: 'products', name: 'Productos' },
  { id: 'warehouses', name: 'Bodegas' },
  { id: 'categories', name: 'Categorías' },
  { id: 'brands', name: 'Marcas' },
  { id: 'specials', name: 'Pedidos Especiales' }
];

const ACTIONS = [
  { action: 'view', name: 'Ver' },
  { action: 'create', name: 'Crear' },
  { action: 'edit', name: 'Editar' },
  { action: 'delete', name: 'Eliminar' },
  { action: 'approve', name: 'Aprobar' },
  { action: 'export', name: 'Exportar' },
  { action: 'import', name: 'Importar' },
  { action: 'print', name: 'Imprimir' }
];

const PWD = 'Prueba123!';

const VENDEDOR_PERMISSIONS = [
  'accounts_receivable:view', 'accounts_receivable:create', 'accounts_receivable:edit',
  'cash:view', 'cash:create', 'cash:edit',
  'customers:view', 'customers:create', 'customers:edit',
  'inventory:view',
  'invoices:view', 'invoices:create', 'invoices:print',
  'products:view',
  'quotations:view', 'quotations:create', 'quotations:edit', 'quotations:print',
  'reports:view',
  'sales:view', 'sales:create', 'sales:print',
  'sales_orders:view', 'sales_orders:create', 'sales_orders:edit'
];

const CAJERO_PERMISSIONS = [
  'accounts_receivable:view', 'accounts_receivable:create', 'accounts_receivable:edit',
  'cash:view', 'cash:create', 'cash:edit',
  'customers:view',
  'invoices:view', 'invoices:create', 'invoices:print',
  'reports:view',
  'sales_orders:view'
];

const BODEGUERO_PERMISSIONS = [
  'inventory:view', 'inventory:create', 'inventory:edit', 'inventory:delete',
  'products:view', 'products:create', 'products:edit',
  'purchases:view', 'purchases:create', 'purchases:edit',
  'suppliers:view', 'suppliers:create', 'suppliers:edit',
  'warehouses:view', 'warehouses:create', 'warehouses:edit',
  'categories:view', 'categories:create', 'categories:edit',
  'brands:view', 'brands:create', 'brands:edit',
  'reports:view'
];

async function ensurePermissions() {
  const count = await prisma.permission.count();
  if (count > 0) return;

  for (const mod of MODULES) {
    for (const act of ACTIONS) {
      const code = `${mod.id}:${act.action}`;
      await prisma.permission.create({
        data: { code, description: `${act.name} ${mod.name.toLowerCase()}` }
      });
    }
  }
}

async function upsertRole(name: string, description: string, permissionCodes: string[]) {
  const role = await prisma.role.upsert({
    where: { name },
    update: { description },
    create: { name, description }
  });

  const permissions = permissionCodes.length > 0
    ? await prisma.permission.findMany({ where: { code: { in: permissionCodes } } })
    : [];

  await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

  if (permissions.length > 0) {
    await prisma.rolePermission.createMany({
      data: permissions.map(p => ({ roleId: role.id, permissionId: p.id }))
    });
  }

  return role;
}

async function upsertUser(email: string, username: string, firstName: string, lastName: string, roleId: number) {
  const passwordHash = await bcrypt.hash(PWD, 10);
  return prisma.user.upsert({
    where: { email },
    update: { passwordHash, roleId, isActive: true, firstName, lastName, username },
    create: {
      firstName, lastName, username, email, passwordHash, roleId, isActive: true
    }
  });
}

async function main() {
  console.log('Iniciando seed de la base de datos...');

  await ensurePermissions();
  const allPermissions = await prisma.permission.findMany();

  const adminRole = await upsertRole('ADMIN', 'Acceso total y administración del sistema', allPermissions.map(p => p.code));
  const vendedorRole = await upsertRole('Vendedor', 'Gestión de ventas, clientes, cotizaciones y caja', VENDEDOR_PERMISSIONS);
  const cajeroRole = await upsertRole('Cajero', 'Gestión de caja y cobros', CAJERO_PERMISSIONS);
  const bodegueroRole = await upsertRole('Bodeguero', 'Gestión de inventario y compras', BODEGUERO_PERMISSIONS);

  await upsertUser('admin@comercialgarcia.com', 'admin', 'Administrador', 'Sistema', adminRole.id);
  await upsertUser('vendedor@comercialgarcia.com', 'vendedor', 'Vendedor', 'Prueba', vendedorRole.id);
  await upsertUser('cajero@comercialgarcia.com', 'cajero', 'Cajero', 'Prueba', cajeroRole.id);
  await upsertUser('bodeguero@comercialgarcia.com', 'bodeguero', 'Bodeguero', 'Prueba', bodegueroRole.id);

  const warehouse = await prisma.warehouse.findFirst();
  if (!warehouse) {
    await prisma.warehouse.create({ data: { name: 'Bodega Principal' } });
  }

  const cashRegister = await prisma.cashRegister.findFirst();
  if (!cashRegister) {
    await prisma.cashRegister.create({ data: { name: 'Caja Principal', isActive: true } });
  }

  const category = await prisma.category.findFirst();
  if (!category) {
    await prisma.category.create({ data: { name: 'General' } });
  }

  const settings = await prisma.companySettings.findFirst();
  if (!settings) {
    await prisma.companySettings.create({
      data: {
        id: 1,
        companyName: 'Comercial García Reyes S.A.',
        currency: 'C$',
        timezone: 'America/Managua',
        dateFormat: 'DD/MM/YYYY',
        theme: 'light'
      }
    });
  }

  console.log('Seed completado exitosamente.');
  console.log(`Usuarios (clave unica ${PWD}):`);
  console.log('  - admin@comercialgarcia.com (ADMIN)');
  console.log('  - vendedor@comercialgarcia.com (Vendedor)');
  console.log('  - cajero@comercialgarcia.com (Cajero)');
  console.log('  - bodeguero@comercialgarcia.com (Bodeguero)');
}

main()
  .catch((e) => {
    console.error('Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });