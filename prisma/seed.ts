import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.event.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.order.deleteMany();
  await prisma.rateSetting.deleteMany();
  await prisma.rate.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.unit.deleteMany();

  const [alex, taylor] = await Promise.all([
    prisma.driver.create({ data: { name: "Alex Johnson", homeBase: "Chicago", active: true } }),
    prisma.driver.create({ data: { name: "Taylor Smith", homeBase: "Cincinnati", active: true } }),
  ]);

  const [tractor12, reefer9] = await Promise.all([
    prisma.unit.create({ data: { code: "TRK-012", type: "Tractor", homeBase: "Chicago", active: true } }),
    prisma.unit.create({ data: { code: "TRL-009", type: "Reefer", homeBase: "Indianapolis", active: true } }),
  ]);

  const [linehaulRate, dedicatedRate] = await Promise.all([
    prisma.rate.create({
      data: {
        type: "Linehaul",
        zone: "East",
        fixedCPM: 0.45,
        wageCPM: 0.32,
        addOnsCPM: 0.06,
        rollingCPM: 0.08,
      },
    }),
    prisma.rate.create({
      data: {
        type: "Dedicated",
        zone: "Midwest",
        fixedCPM: 0.4,
        wageCPM: 0.28,
        addOnsCPM: 0.05,
        rollingCPM: 0.07,
      },
    }),
  ]);

  await prisma.rateSetting.createMany({
    data: [
      {
        rateKey: "fuel_surcharge",
        category: "Fuel",
        value: 0.45,
        unit: "USD/gal",
        note: "Updated weekly",
      },
      {
        rateKey: "safety_bonus",
        category: "Compensation",
        value: 0.12,
        unit: "USD/mile",
        note: "Paid monthly",
      },
    ],
  });

  const order = await prisma.order.create({
    data: {
      customer: "Acme Industrial",
      origin: "Chicago, IL",
      destination: "Atlanta, GA",
      puWindowStart: new Date(),
      puWindowEnd: new Date(Date.now() + 2 * 60 * 60 * 1000),
      delWindowStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
      delWindowEnd: new Date(Date.now() + 26 * 60 * 60 * 1000),
      requiredTruck: "53' Reefer",
      notes: "Keep temp at 34F",
    },
  });

  const linehaulTotal =
    Number(linehaulRate.fixedCPM) +
    Number(linehaulRate.wageCPM) +
    Number(linehaulRate.addOnsCPM) +
    Number(linehaulRate.rollingCPM);
  const linehaulCost = (620 * linehaulTotal) / 100;

  await prisma.trip.create({
    data: {
      orderId: order.id,
      driver: alex.name,
      unit: tractor12.code,
      driverId: alex.id,
      unitId: tractor12.id,
      rateId: linehaulRate.id,
      type: "Linehaul",
      zone: "East",
      status: "Scheduled",
      miles: 620,
      revenue: 2400,
      fixedCPM: linehaulRate.fixedCPM,
      wageCPM: linehaulRate.wageCPM,
      addOnsCPM: linehaulRate.addOnsCPM,
      rollingCPM: linehaulRate.rollingCPM,
      totalCPM: linehaulTotal,
      totalCost: linehaulCost,
      profit: 2400 - linehaulCost,
      marginPct: ((2400 - linehaulCost) / 2400) * 100,
    },
  });

  const dedicatedTotal =
    Number(dedicatedRate.fixedCPM) +
    Number(dedicatedRate.wageCPM) +
    Number(dedicatedRate.addOnsCPM) +
    Number(dedicatedRate.rollingCPM);
  const dedicatedCost = (410 * dedicatedTotal) / 100;

  await prisma.trip.create({
    data: {
      driver: taylor.name,
      unit: reefer9.code,
      driverId: taylor.id,
      unitId: reefer9.id,
      rateId: dedicatedRate.id,
      type: "Dedicated",
      zone: "Midwest",
      status: "Created",
      miles: 410,
      revenue: 1450,
      fixedCPM: dedicatedRate.fixedCPM,
      wageCPM: dedicatedRate.wageCPM,
      addOnsCPM: dedicatedRate.addOnsCPM,
      rollingCPM: dedicatedRate.rollingCPM,
      totalCPM: dedicatedTotal,
      totalCost: dedicatedCost,
      profit: 1450 - dedicatedCost,
      marginPct: ((1450 - dedicatedCost) / 1450) * 100,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async error => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
