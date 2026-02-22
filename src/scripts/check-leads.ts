import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: {
            status: 'READY'
        },
        include: {
            campaignSends: true
        }
    });

    console.log(`Found ${leads.length} leads in READY status.`);

    let withSends = 0;
    for (const lead of leads) {
        if (lead.campaignSends && lead.campaignSends.length > 0) {
            withSends++;
            console.log(`Lead ${lead.id} (${lead.displayName}) is READY but has ${lead.campaignSends.length} sends. Latest: ${lead.campaignSends[lead.campaignSends.length - 1].status}`);
        }
    }

    console.log(`Total READY leads with sends: ${withSends}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
