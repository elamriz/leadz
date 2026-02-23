import 'dotenv/config';
import prisma from '../lib/prisma';

async function main() {
    console.log('Clearing existing email templates...');
    await prisma.emailTemplate.deleteMany({
        where: { type: 'email' }
    });

    const templates = [
        // Segment A: No website
        {
            name: 'A1 - No Website',
            type: 'email',
            language: 'fr',
            tags: ['no-website'],
            subject: 'Petite question',
            body: `Bonjour,

Je cherchais {company_name} en ligne et je n’ai pas trouvé de site.
C’est volontaire ou vous n’avez simplement pas encore pris le temps ?

Je crée des sites simples pour les entreprises locales.

Zakariyae El.
Ryzq.dev
+32 470 88 60 24`,
        },
        // Segment B: Website outdated
        {
            name: 'B1 - Outdated Website',
            type: 'email',
            language: 'fr',
            tags: ['outdated-website'],
            subject: 'Votre site',
            body: `Bonjour,

Je suis tombé sur le site de {company_name}.
Il semble un peu ancien, je me demandais s’il est toujours maintenu ?

Je travaille sur des refontes pour des entreprises et indépendants locaux.

Zakariyae El.
Ryzq.dev
+32 470 88 60 24`,
        },
        // Segment C: Strong Reputation
        {
            name: 'C1 - Reputation',
            type: 'email',
            language: 'fr',
            tags: ['reputation'],
            subject: 'Vos avis',
            body: `Bonjour,

J’ai vu que {company_name} est très bien noté à {city}.
Cherchez-vous à améliorer votre site pour mieux mettre ces avis en avant ?

Zakariyae El.
Ryzq.dev
+32 470 88 60 24`,
        },
        // Segment D: General (sans {niche})
        {
            name: 'D1 - General Improvement',
            type: 'email',
            language: 'fr',
            tags: ['general'],
            subject: '{city}',
            body: `Bonjour,

Je travaille avec des entreprises à {city}.
J’aide à structurer leur présence en ligne pour générer plus de demandes.

Est-ce quelque chose que vous cherchez à améliorer en ce moment ?

Zakariyae El.
Ryzq.dev
+32 470 88 60 24`,
        },
        // Segment E: Inaccessible
        {
            name: 'E1 - Inaccessible Website',
            type: 'email',
            language: 'fr',
            tags: ['inaccessible'],
            subject: 'Votre site',
            body: `Bonjour,

En essayant d’accéder à votre site aujourd’hui, il semblait inaccessible.
C’est peut-être temporaire.

Si besoin, je peux vous aider à le remettre en ligne ou à le sécuriser.

Zakariyae El.
Ryzq.dev
+32 470 88 60 24`,
        }
    ];

    console.log('Seeding 5 optimized user-provided templates with tags...');
    for (const tpl of templates) {
        await prisma.emailTemplate.create({
            data: {
                ...tpl,
                isActive: true,
            }
        });
        console.log(`Created: ${tpl.name} [Tags: ${tpl.tags.join(', ')}]`);
    }

    console.log('Done!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
