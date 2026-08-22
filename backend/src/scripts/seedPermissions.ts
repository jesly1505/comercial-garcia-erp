import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
  console.log('Seeding strict matrix permissions...');
  
  const allPermissions = [];

  for (const mod of MODULES) {
    for (const act of ACTIONS) {
      const code = `${mod.id}:${act.action}`;
      const description = `${act.name} ${mod.name.toLowerCase()}`;
      allPermissions.push({ code, description });
      
      await prisma.permission.upsert({
        where: { code },
        update: { description },
        create: { code, description }
      });
    }
  }

  // Configurar Vendedor con permisos específicos dentro de la nueva matriz
  const vendedorRole = await prisma.role.findUnique({
    where: { name: 'Vendedor' }
  });

  if (vendedorRole) {
    const vendedorPermissions = [
      'customers:view', 'customers:create', 'customers:edit',
      'inventory:view',
      'sales:view', 'sales:create', 'sales:print',
      'cash:view', 'cash:create', 'cash:edit', // for manage
      'accounts_receivable:view', 'accounts_receivable:create', 'accounts_receivable:edit'
    ];

    console.log('Restaurando permisos para Vendedor...');
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
  }

  console.log('Process completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
