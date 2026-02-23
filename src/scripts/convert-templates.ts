import 'dotenv/config';
import prisma from '../lib/prisma';

async function main() {
    console.log('Fetching email templates...');
    const templates = await prisma.emailTemplate.findMany({
        where: { type: 'email' },
    });

    console.log(`Found ${templates.length} email templates. Converting from HTML to plain text...`);

    let updatedCount = 0;

    for (const tpl of templates) {
        if (!tpl.body || !tpl.body.includes('<')) {
            // Already seems like plain text or empty
            continue;
        }

        let cleanText = tpl.body;

        // 1. Replace <br> and block level breaks with line breaks
        cleanText = cleanText.replace(/<br\s*\/?>/gi, '\n');
        cleanText = cleanText.replace(/<\/(p|div|h[1-6]|li)>/gi, '\n\n');
        cleanText = cleanText.replace(/<li[^>]*>/gi, '- ');

        // 2. Remove all remaining HTML tags
        cleanText = cleanText.replace(/<[^>]+>/g, '');

        // 3. Decode common HTML entities
        cleanText = cleanText
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");

        // 4. Normalize multiple newlines to max 2
        cleanText = cleanText.replace(/\n{3,}/g, '\n\n');

        // 5. Trim leading/trailing whitespace
        cleanText = cleanText.trim();

        // Update in database
        await prisma.emailTemplate.update({
            where: { id: tpl.id },
            data: { body: cleanText },
        });

        console.log(`Updated template: "${tpl.name}"`);
        updatedCount++;
    }

    console.log(`Done! Successfully converted ${updatedCount} templates to plain text.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
