import { PrismaClient, LeadStatus } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('Starting lead status sync...');

    const leads = await prisma.lead.findMany({
        where: {
            status: { in: ['NEW', 'READY', 'QUEUED', 'SENT', 'BOUNCED'] },
            campaignSends: { some: {} },
        },
        include: {
            campaignSends: {
                orderBy: { createdAt: 'desc' }, // Get most recent send
                take: 1,
            },
        },
    });

    console.log(`Found ${leads.length} leads with campaign sends to check.`);

    let updatedCount = 0;

    for (const lead of leads) {
        if (!lead.campaignSends || lead.campaignSends.length === 0) continue;

        const latestSend = lead.campaignSends[0];
        let newStatus: LeadStatus | null = null;

        if (latestSend.status === 'REPLIED') {
            newStatus = 'REPLIED';
        } else if (latestSend.status === 'SENT' || latestSend.status === 'OPENED' || latestSend.status === 'CLICKED') {
            newStatus = 'SENT';
        } else if (latestSend.status === 'BOUNCED') {
            newStatus = 'BOUNCED';
        }

        if (newStatus && newStatus !== lead.status) {
            await prisma.lead.update({
                where: { id: lead.id },
                data: { status: newStatus },
            });
            console.log(`Updated lead ${lead.displayName} from ${lead.status} to ${newStatus}`);
            updatedCount++;
        }
    }

    console.log(`Finished sync. Updated ${updatedCount} leads.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
