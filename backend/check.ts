import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  console.log('Products:', await prisma.product.count());
  console.log('Customers:', await prisma.customer.count());
  console.log('Users:', await prisma.user.count());
}
main().finally(() => prisma.$disconnect());
