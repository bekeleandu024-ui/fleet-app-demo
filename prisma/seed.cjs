/* eslint-disable @typescript-eslint/no-var-requires */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.driver.upsert({
    where: { id: "driver-ron-piche" },
    update: {},
    create: {
      id: "driver-ron-piche",
      name: "Ron Piche",
      homeBase: "Guelph",
      active: true,
      phone: "555-0100",
      email: "ron.piche@example.com",
      licenseNumber: "PICHERON123",
      licenseJurisdiction: "ON",
      licenseClass: "AZ",
      licenseEndorsements: ["Air brake", "Tanker"],
      licenseExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      medicalExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 200),
      drugTestDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
      mvrDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60)
    }
  });

  await prisma.driver.upsert({
    where: { id: "driver-jeff-churchill" },
    update: {},
    create: {
      id: "driver-jeff-churchill",
      name: "Jeff Churchill",
      homeBase: "Guelph",
      active: true,
      phone: "555-0101",
      email: "jeff.churchill@example.com",
      licenseNumber: "CHURCHJEF456",
      licenseJurisdiction: "ON",
      licenseClass: "AZ",
      licenseEndorsements: ["Air brake"],
      licenseExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 250),
      medicalExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 150),
      drugTestDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45),
      mvrDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90)
    }
  });

  await prisma.unit.upsert({
    where: { code: "REE-104" },
    update: {},
    create: {
      code: "REE-104",
      type: "Reefer",
      homeBase: "Guelph",
      active: true
    }
  });

  await prisma.unit.upsert({
    where: { code: "COM-012" },
    update: {},
    create: {
      code: "COM-012",
      type: "Dry van",
      homeBase: "Cambridge",
      active: true
    }
  });

  await prisma.unit.upsert({
    where: { code: "FLT-221" },
    update: {},
    create: {
      code: "FLT-221",
      type: "Flatbed",
      homeBase: "Hamilton",
      active: true
    }
  });

  await Promise.all([
    prisma.rate.upsert({
      where: { id: "rate-reefer-gta" },
      update: {
        type: "Reefer",
        zone: "GTA",
        fixedCPM: 1.32,
        wageCPM: 0.65,
        addOnsCPM: 0.18,
        rollingCPM: 0.42
      },
      create: {
        id: "rate-reefer-gta",
        type: "Reefer",
        zone: "GTA",
        fixedCPM: 1.32,
        wageCPM: 0.65,
        addOnsCPM: 0.18,
        rollingCPM: 0.42
      }
    }),
    prisma.rate.upsert({
      where: { id: "rate-dry-van-401" },
      update: {
        type: "Dry van",
        zone: "401 Corridor",
        fixedCPM: 1.1,
        wageCPM: 0.58,
        addOnsCPM: 0.12,
        rollingCPM: 0.35
      },
      create: {
        id: "rate-dry-van-401",
        type: "Dry van",
        zone: "401 Corridor",
        fixedCPM: 1.1,
        wageCPM: 0.58,
        addOnsCPM: 0.12,
        rollingCPM: 0.35
      }
    }),
    prisma.rate.upsert({
      where: { id: "rate-flatbed-crossborder" },
      update: {
        type: "Flatbed",
        zone: "Cross-border",
        fixedCPM: 1.45,
        wageCPM: 0.7,
        addOnsCPM: 0.22,
        rollingCPM: 0.5
      },
      create: {
        id: "rate-flatbed-crossborder",
        type: "Flatbed",
        zone: "Cross-border",
        fixedCPM: 1.45,
        wageCPM: 0.7,
        addOnsCPM: 0.22,
        rollingCPM: 0.5
      }
    })
  ]);

  await prisma.order.upsert({
    where: { id: "order-demo" },
    update: {
      customer: "Maple Leaf Foods",
      origin: "Guelph, ON",
      destination: "Montreal, QC",
      puWindowStart: new Date(Date.now() + 1000 * 60 * 60 * 24),
      puWindowEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
      delWindowStart: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
      delWindowEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4),
      requiredTruck: "Reefer",
      notes: "Keep product below 4°C."
    },
    create: {
      id: "order-demo",
      customer: "Maple Leaf Foods",
      origin: "Guelph, ON",
      destination: "Montreal, QC",
      puWindowStart: new Date(Date.now() + 1000 * 60 * 60 * 24),
      puWindowEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
      delWindowStart: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
      delWindowEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4),
      requiredTruck: "Reefer",
      notes: "Keep product below 4°C."
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
