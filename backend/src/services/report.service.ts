import prisma from '../utils/prisma';

export const getInventoryReport = async () => {
  const products = await prisma.product.findMany({
    include: { category: true, brand: true },
    orderBy: { name: 'asc' }
  });
  return products.map(p => ({
    sku: p.sku,
    name: p.name,
    category: p.category?.name || '-',
    brand: p.brand?.name || '-',
    cost: p.costPrice,
    price: p.salePrice,
    stock: p.currentStock,
    active: p.isActive ? 'Sí' : 'No'
  }));
};

export const getCustomersReport = async () => {
  const customers = await prisma.customer.findMany({
    orderBy: { firstName: 'asc' }
  });
  return customers.map(c => ({
    document: c.documentNumber,
    name: `${c.firstName} ${c.lastName}`.trim(),
    email: c.email || '-',
    phone: c.phone || '-',
    active: c.isActive ? 'Sí' : 'No'
  }));
};

export const getSalesReport = async (startDate?: Date, endDate?: Date) => {
  const whereClause: any = { status: { in: ['ACTIVA', 'PAGADA'] } };
  if (startDate && endDate) {
    whereClause.issueDate = { gte: startDate, lte: endDate };
  }
  const invoices = await prisma.invoice.findMany({
    where: whereClause,
    include: { customer: true, user: true },
    orderBy: { issueDate: 'desc' }
  });
  return invoices.map(i => ({
    invoiceNumber: i.invoiceNumber,
    date: i.issueDate.toLocaleDateString(),
    customer: `${i.customer.firstName} ${i.customer.lastName}`.trim(),
    paymentMethod: i.paymentMethod,
    total: i.totalAmount,
    status: i.status
  }));
};

export const getPurchasesReport = async (startDate?: Date, endDate?: Date) => {
  const whereClause: any = {};
  if (startDate && endDate) {
    whereClause.createdAt = { gte: startDate, lte: endDate };
  }
  const purchases = await prisma.purchaseOrder.findMany({
    where: whereClause,
    include: { supplier: true },
    orderBy: { createdAt: 'desc' }
  });
  return purchases.map(p => ({
    id: p.id,
    date: p.createdAt.toLocaleDateString(),
    supplier: p.supplier.name,
    invoiceNumber: p.invoiceNumber || '-',
    total: p.totalAmount,
    status: p.status
  }));
};

export const getCashReport = async (startDate?: Date, endDate?: Date) => {
  const whereClause: any = {};
  if (startDate && endDate) {
    whereClause.openedAt = { gte: startDate, lte: endDate };
  }
  const sessions = await prisma.cashSession.findMany({
    where: whereClause,
    include: { cashRegister: true, user: true },
    orderBy: { openedAt: 'desc' }
  });
  return sessions.map(s => ({
    register: s.cashRegister.name,
    user: `${s.user.firstName} ${s.user.lastName}`,
    openedAt: s.openedAt.toLocaleString(),
    closedAt: s.closedAt ? s.closedAt.toLocaleString() : 'Abierta',
    openingBalance: s.openingBalance,
    closingBalance: s.closingBalance || 0,
    status: s.status
  }));
};

export const getInvoicesReport = async (startDate?: Date, endDate?: Date) => {
  return getSalesReport(startDate, endDate); // Comparte estructura
};

export const getOrdersReport = async (startDate?: Date, endDate?: Date) => {
  const whereClause: any = {};
  if (startDate && endDate) {
    whereClause.createdAt = { gte: startDate, lte: endDate };
  }
  const orders = await prisma.salesOrder.findMany({
    where: whereClause,
    include: { customer: true },
    orderBy: { createdAt: 'desc' }
  });
  return orders.map(o => ({
    orderId: o.id,
    date: o.createdAt.toLocaleDateString(),
    customer: `${o.customer.firstName} ${o.customer.lastName}`.trim(),
    total: o.totalAmount,
    status: o.status
  }));
};

export const getMovementsReport = async (startDate?: Date, endDate?: Date) => {
  const whereClause: any = {};
  if (startDate && endDate) {
    whereClause.createdAt = { gte: startDate, lte: endDate };
  }
  const movements = await prisma.inventoryMovement.findMany({
    where: whereClause,
    include: { product: true, warehouse: true, user: true },
    orderBy: { createdAt: 'desc' }
  });
  return movements.map(m => ({
    date: m.createdAt.toLocaleString(),
    product: m.product.name,
    type: m.movementType,
    quantity: m.quantity,
    warehouse: m.warehouse.name,
    user: `${m.user.firstName} ${m.user.lastName}`,
    reason: m.reason || '-'
  }));
};

export const getSuppliersReport = async () => {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: 'asc' }
  });
  return suppliers.map(s => ({
    code: s.code,
    name: s.name,
    contact: s.contactName || '-',
    phone: s.phone || '-',
    email: s.email || '-',
    active: s.isActive ? 'Sí' : 'No'
  }));
};

export const getOutOfStockReport = async () => {
  const products = await prisma.product.findMany({
    where: { currentStock: { lte: 0 }, isActive: true },
    include: { category: true, brand: true },
    orderBy: { name: 'asc' }
  });
  return products.map(p => ({
    sku: p.sku,
    name: p.name,
    category: p.category?.name || '-',
    brand: p.brand?.name || '-',
    stock: p.currentStock,
    minStock: p.minStock
  }));
};

export const getLowStockReport = async () => {
  const products = await prisma.product.findMany({
    where: { currentStock: { gt: 0 }, isActive: true },
    include: { category: true, brand: true },
    orderBy: { currentStock: 'asc' }
  });
  const lowStock = products.filter(p => p.currentStock <= p.minStock);
  return lowStock.map(p => ({
    sku: p.sku,
    name: p.name,
    category: p.category?.name || '-',
    brand: p.brand?.name || '-',
    stock: p.currentStock,
    minStock: p.minStock
  }));
};

export const getBestSellersReport = async (startDate?: Date, endDate?: Date) => {
  const whereClause: any = { invoice: { status: { in: ['ACTIVA', 'PAGADA'] } } };
  if (startDate && endDate) {
    whereClause.invoice.issueDate = { gte: startDate, lte: endDate };
  }
  const details = await prisma.invoiceDetail.findMany({
    where: whereClause,
    include: { product: true }
  });

  const totals: Record<number, { name: string, sku: string, qty: number, total: number }> = {};
  details.forEach(d => {
    if (!totals[d.productId]) {
      totals[d.productId] = { name: d.product.name, sku: d.product.sku, qty: 0, total: 0 };
    }
    totals[d.productId].qty += d.quantity;
    totals[d.productId].total += Number(d.subtotal);
  });

  return Object.values(totals)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 50)
    .map(p => ({
      sku: p.sku,
      name: p.name,
      quantitySold: p.qty,
      totalRevenue: p.total
    }));
};

export const getDebtorsReport = async () => {
  const debtors = await prisma.accountsReceivable.findMany({
    where: { balance: { gt: 0 } },
    include: { customer: true, invoice: true },
    orderBy: { balance: 'desc' }
  });
  return debtors.map(d => ({
    customer: `${d.customer.firstName} ${d.customer.lastName}`.trim(),
    invoiceNumber: d.invoice.invoiceNumber,
    totalDebt: d.totalDebt,
    balance: d.balance,
    dueDate: d.dueDate ? d.dueDate.toLocaleDateString() : '-',
    status: d.status
  }));
};
