import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    let caps = await prisma.apiUsageCap.findFirst({ where: { isActive: true } });
    if (!caps) {
        caps = await prisma.apiUsageCap.create({ data: {} });
    }

    const updated = await prisma.apiUsageCap.update({
        where: { id: caps.id },
        data: {
            perRunSearchLimit: 500,    // Allow up to 500 API calls per run
            perRunDetailLimit: 1000,   // Detail calls
            perRunMaxPlaces: 1000,     // Max places per run
            maxPaginationDepth: 4,     // Up to 4 pages per cell (Google limits to 3 usually, meaning 60 results)
            dailySearchLimit: 2000,    // daily limit 2,000
            dailyDetailLimit: 5000,    // daily limit 5,000
            monthlySearchLimit: 50000, // Monthly limit 50,000
            monthlyDetailLimit: 50000, // Monthly limit 50,000
        }
    });

    console.log('Successfully increased API usage caps:', updated);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
