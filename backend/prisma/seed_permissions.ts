import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const modules = [
  'customers', // Clientes
  'products', // Productos
  'inventory', // Inventario
  'sales_orders', // Pedidos (Ventas)
  'invoices', // Facturación
  'cash', // Caja
  'reports', // Reportes
  'purchases', // Compras
  'suppliers', // Proveedores
  'accounts_receivable', // Cuentas por Cobrar
  'users', // Usuarios
  'roles', // Roles
  'settings' // Configuración / Bitácora
];

const actions = ['view', 'create', 'edit', 'delete'];

async function main() {
  console.log('Seed de Permisos y Roles...');

  // 1. Asegurarnos de que existen todos los permisos
  const permissionsData: { code: string; description: string }[] = [];

  for (const mod of modules) {
    for (const act of actions) {
      permissionsData.push({
        code: `${mod}:${act}`,
        description: `Permiso para ${act} en el módulo de ${mod}`
      });
    }
  }

  // Permisos especiales opcionales
  permissionsData.push({ code: 'invoices:approve', description: 'Aprobar/Anular facturas' });
  permissionsData.push({ code: 'reports:export', description: 'Exportar reportes' });

  console.log(`Verificando/Creando ${permissionsData.length} permisos...`);

  const allDbPermissions = [];
  for (const perm of permissionsData) {
    const p = await prisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm
    });
    allDbPermissions.push(p);
  }

  // 2. Asegurar el rol ADMIN y asignarle TODOS los permisos
  console.log('Configurando rol ADMIN...');
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'Administrador del sistema con acceso total'
    }
  });

  // Limpiar permisos actuales de ADMIN y reasignar todos
  await prisma.rolePermission.deleteMany({
    where: { roleId: adminRole.id }
  });

  const adminRolePermissions = allDbPermissions.map(p => ({
    roleId: adminRole.id,
    permissionId: p.id
  }));

  await prisma.rolePermission.createMany({
    data: adminRolePermissions
  });

  // 3. Crear rol Vendedor y asignar permisos limitados
  console.log('Configurando rol Vendedor...');
  const sellerRole = await prisma.role.upsert({
    where: { name: 'Vendedor' },
    update: {},
    create: {
      name: 'Vendedor',
      description: 'Rol para realizar ventas y facturación'
    }
  });

  // Permisos para Vendedor (según prompt):
  // Solo podrá: Iniciar sesión, Crear facturas, Ver y gestionar sus pedidos, Consultar inventario (lectura), Consultar clientes, Ver historial ventas
  const sellerPermissions = [
    'invoices:view', 'invoices:create',
    'sales_orders:view', 'sales_orders:create', 'sales_orders:edit',
    'inventory:view',
    'products:view',
    'customers:view',
    'reports:view' // Para ver historial
  ];

  const sellerDbPerms = allDbPermissions.filter(p => sellerPermissions.includes(p.code));

  await prisma.rolePermission.deleteMany({
    where: { roleId: sellerRole.id }
  });

  await prisma.rolePermission.createMany({
    data: sellerDbPerms.map(p => ({
      roleId: sellerRole.id,
      permissionId: p.id
    }))
  });

  console.log('¡Roles y permisos sincronizados correctamente!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
