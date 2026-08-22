import 'dotenv/config';
import prisma from '../src/utils/prisma';
import bcrypt from 'bcrypt';

async function main() {
  console.log('🌱 Iniciando seeding de la base de datos...');

  // 1. Crear Roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'Administrador del Sistema'
    }
  });

  const vendedorRole = await prisma.role.upsert({
    where: { name: 'VENDEDOR' },
    update: {},
    create: {
      name: 'VENDEDOR',
      description: 'Usuario de Ventas y App Móvil'
    }
  });

  // 2. Crear Usuario Admin
  const adminPassword = await bcrypt.hash('123456', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@erp.com' },
    update: {},
    create: {
      firstName: 'Admin',
      lastName: 'ERP',
      email: 'admin@erp.com',
      passwordHash: adminPassword,
      roleId: adminRole.id,
      isActive: true
    }
  });

  // 3. Crear Categoría por defecto
  const generalCategory = await prisma.category.upsert({
    where: { name: 'General' },
    update: {},
    create: {
      name: 'General'
    }
  });

  console.log('✅ Seeding completado!');
  console.log(`👤 Usuario Admin: ${adminUser.email}`);
  console.log(`🔑 Contraseña: 123456`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
