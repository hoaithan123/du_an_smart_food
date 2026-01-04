// scripts/updatePaymentStatus.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Updating orders: set payment_status = PAID for non-CASH methods...');
  const result = await prisma.order.updateMany({
    where: {
      paymentMethod: { in: ['CARD', 'BANK_TRANSFER'] },
      NOT: { paymentStatus: 'PAID' }
    },
    data: {
      paymentStatus: 'PAID'
    }
  });
  console.log(`Rows updated: ${result.count}`);

  try {
    const summary = await prisma.order.groupBy({
      by: ['paymentMethod', 'paymentStatus'],
      _count: { _all: true },
    });
    console.log('Summary after update:');
    console.table(summary.map(s => ({
      paymentMethod: s.paymentMethod,
      paymentStatus: s.paymentStatus,
      count: s._count._all,
    })));
  } catch (e) {
    console.warn('Could not compute summary via groupBy:', e?.message || e);
  }
}

main()
  .catch((e) => {
    console.error('Update failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
