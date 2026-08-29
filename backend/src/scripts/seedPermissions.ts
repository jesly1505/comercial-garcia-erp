import prisma from '../utils/prisma';
import bcrypt from 'bcrypt';

const MODULES = [
  { id: 'users', name: 'Usuarios' },
  { id: 'roles', name: 'Roles y Permisos' },
  { id: 'customers', name: 'Clientes' },
  { id: 'suppliers', name: 'Proveedores' },
  { id: 'inventory', name: 'Inventario' },
  { id: 'sales', name: 'Ventas y Pedidos' },
  { id: 'purchases', name: 'Compras' },
  { id: 'cash', name: 'Caja' },
  { id: 'accounts_receivable', name: 'Cuentas x Cobrar' },
  { id: 'reports', name: 'Reportes' },
  { id: 'settings', name: 'Configuración' },
  { id: 'audit', name: 'Bitácora' }
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

async function main() {
  console.log('Iniciando seed para base de datos...');
  
  // 1. Permisos del sistema
  for (const mod of MODULES) {
    for (const act of ACTIONS) {
      const code = `${mod.id}:${act.action}`;
      const description = `${act.name} ${mod.name.toLowerCase()}`;
      
      await prisma.permission.upsert({
        where: { code },
        update: { description },
        create: { code, description }
      });
    }
  }

  // 2. Roles del sistema
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'Acceso total y administración del sistema'
    }
  });

  const vendedorRole = await prisma.role.upsert({
    where: { name: 'Vendedor' },
    update: {},
    create: {
      name: 'Vendedor',
      description: 'Gestión de ventas, clientes, cotizaciones y caja'
    }
  });

  await prisma.role.upsert({
    where: { name: 'Cajero' },
    update: {},
    create: {
      name: 'Cajero',
      description: 'Gestión de caja y cobros'
    }
  });

  await prisma.role.upsert({
    where: { name: 'Bodeguero' },
    update: {},
    create: {
      name: 'Bodeguero',
      description: 'Gestión de inventario y compras'
    }
  });

  // 3. Asignar permisos a rol Vendedor
  const vendedorPermissions = [
    'customers:view', 'customers:create', 'customers:edit',
    'inventory:view',
    'sales:view', 'sales:create', 'sales:print',
    'cash:view', 'cash:create', 'cash:edit',
    'accounts_receivable:view', 'accounts_receivable:create', 'accounts_receivable:edit'
  ];

  const permissionRecords = await prisma.permission.findMany({
    where: { code: { in: vendedorPermissions } }
  });

  await prisma.rolePermission.deleteMany({
    where: { roleId: vendedorRole.id }
  });

  await prisma.rolePermission.createMany({
    data: permissionRecords.map(p => ({
      roleId: vendedorRole.id,
      permissionId: p.id
    }))
  });

  // 4. Usuario Administrador por defecto
  const passwordHash = await bcrypt.hash('123456', 10);
  await prisma.user.upsert({
    where: { email: 'admin@erp.com' },
    update: {
      passwordHash,
      username: 'admin',
      roleId: adminRole.id,
      isActive: true
    },
    create: {
      firstName: 'Administrador',
      lastName: 'Sistema',
      username: 'admin',
      email: 'admin@erp.com',
      passwordHash,
      roleId: adminRole.id,
      isActive: true
    }
  });

  // 5. Bodega por defecto
  const defaultWarehouse = await prisma.warehouse.findFirst();
  if (!defaultWarehouse) {
    await prisma.warehouse.create({
      data: { name: 'Bodega Principal' }
    });
  }

  // 6. Caja registradora por defecto
  const defaultCash = await prisma.cashRegister.findFirst();
  if (!defaultCash) {
    await prisma.cashRegister.create({
      data: { name: 'Caja Principal', isActive: true }
    });
  }

  // 7. Configuración de empresa
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
}

main()
  .catch((e) => {
    console.error('Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
