import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import path from 'path';

const prisma = new PrismaClient();

async function importInventory() {
  try {
    const filePath = path.join(__dirname, '../inventario Completo Productos_Completado.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const worksheet = workbook.worksheets[0];
    
    // Find or create default warehouse
    let warehouse = await prisma.warehouse.findFirst({ where: { name: 'Bodega Principal' }});
    if (!warehouse) {
      warehouse = await prisma.warehouse.create({ data: { name: 'Bodega Principal' }});
    }

    // Default user for movements (if any user exists, grab the first one, else create a system user)
    let user = await prisma.user.findFirst({ where: { email: 'admin@admin.com' } });
    if (!user) {
      // Find role or create
      let role = await prisma.role.findFirst({ where: { name: 'ADMIN' } });
      if (!role) {
         role = await prisma.role.create({ data: { name: 'ADMIN', description: 'Administrador' } });
      }
      user = await prisma.user.create({
        data: {
          firstName: 'Admin',
          lastName: 'System',
          email: 'admin@admin.com',
          passwordHash: 'dummy',
          roleId: role.id
        }
      });
    }

    // Clear existing data to leave ONLY the new inventory
    await prisma.inventoryMovement.deleteMany();
    await prisma.invoiceDetail.deleteMany();
    await prisma.purchaseOrderDetail.deleteMany();
    await prisma.salesOrderDetail.deleteMany();
await prisma.inventory.deleteMany();
    await prisma.product.deleteMany();

    let rowsProcessed = 0;

    // ExcelJS rows are 1-indexed.
    for (let i = 8; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      const values = row.values as any[];
      
      // Stop if empty row (no product name or code)
      if (!values[1] && !values[2]) continue;

      const code = values[1]?.toString().trim() || `PROD-${i}`;
      if (code === 'Código' || code === 'CÓDIGO') continue; // Skip header row if it happens to be here
      
      const name = values[2]?.toString().trim();
      if (!name) continue; // skip if no product name

      const categoryName = values[3]?.toString().trim() || 'Sin Categoría';
      const brandName = values[4]?.toString().trim();
      
      // Stock Actual value might be a formula object or a raw number
      const getVal = (v: any, def: number = 0): number => {
        if (!v) return def;
        let num = typeof v === 'object' && v.result !== undefined ? Number(v.result) : Number(v);
        return isNaN(num) ? def : num;
      };

      const stockActual = getVal(values[5], 0);
      const stockMinimo = getVal(values[6], 5);
      const costo = getVal(values[7], 0);
      const precio = getVal(values[8], 0);

      // Find or create category
      let category = await prisma.category.findUnique({ where: { name: categoryName } });
      if (!category) {
        category = await prisma.category.create({ data: { name: categoryName } });
      }

      // Find or create brand
      let brandId = null;
      if (brandName) {
        let brand = await prisma.brand.findUnique({ where: { name: brandName } });
        if (!brand) {
          brand = await prisma.brand.create({ data: { name: brandName } });
        }
        brandId = brand.id;
      }

      // Create or update product
      const product = await prisma.product.upsert({
        where: { sku: code },
        update: {
          name,
          categoryId: category.id,
          brandId,
          costPrice: costo,
          salePrice: precio,
          currentStock: stockActual,
          minStock: stockMinimo,
        },
        create: {
          sku: code,
          name,
          categoryId: category.id,
          brandId,
          costPrice: costo,
          salePrice: precio,
          currentStock: stockActual,
          minStock: stockMinimo,
        }
      });

      // Update inventory in warehouse
      await prisma.inventory.upsert({
        where: {
          productId_warehouseId: {
            productId: product.id,
            warehouseId: warehouse.id
          }
        },
        update: {
          quantity: stockActual
        },
        create: {
          productId: product.id,
          warehouseId: warehouse.id,
          quantity: stockActual
        }
      });

      // Optional: Log an initial inventory movement if the product was just created 
      // (This is a simplified approach)
      
      rowsProcessed++;
    }

    console.log(`Successfully imported ${rowsProcessed} products into the database.`);

  } catch (error) {
    console.error('Error importing inventory:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importInventory();
