import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Idempotent upserts
  await prisma.driver.upsert({
    where: { name: 'Alice M' },
    update: {},
    create: { name: 'Alice M', license: 'AZ', homeBase: 'Guelph' }
  });
  await prisma.driver.upsert({
    where: { name: 'Ben T' },
    update: {},
    create: { name: 'Ben T', license: 'DZ', homeBase: 'Kitchener' }
  });

  await prisma.unit.upsert({
    where: { code: 'COM-012' },
    update: {},
    create: { code: 'COM-012', type: 'Tractor', homeBase: 'Guelph' }
  });
  await prisma.unit.upsert({
    where: { code: 'TRK-221' },
    update: {},
    create: { code: 'TRK-221', type: 'Straight', homeBase: 'Cambridge' }
  });

  await prisma.rate.createMany({
    data: [
      { type: 'Company',  zone: 'Ontario', fixedCPM: 1.1000, wageCPM: 0.3000, addOnsCPM: 0.0500, rollingCPM: 0.1000 },
      { type: 'OwnerOp',  zone: 'Ontario', fixedCPM: 0.9000, wageCPM: 0.0000, addOnsCPM: 0.0500, rollingCPM: 0.1200 },
    ],
    skipDuplicates: true
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
