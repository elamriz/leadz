import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// DELETE all templates (wipe DB)
export async function DELETE() {
    try {
        const result = await prisma.emailTemplate.deleteMany({});
        return NextResponse.json({ success: true, deleted: result.count });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete' },
            { status: 500 }
        );
    }
}

const SIG = `<br><br>Zak | <a href="https://www.ryzq.dev">www.ryzq.dev</a> | +32 470 88 60 24`;

function txt(s: string): string {
    return s.trim().split('\n').map(l => l.trim()).join('<br>');
}

const TEMPLATES = [

    // ════════════════════════════════════════════════════════════════
    // TYPE 1 — GÉNÉRAL (5 versions)
    // ════════════════════════════════════════════════════════════════

    {
        name: 'FR — Général v1', subject: 'Question rapide — {company_name}', tags: ['general'], language: 'fr', type: 'email',
        body: txt(`Bonjour,
Je suis Zak, développeur web indépendant basé en Belgique.
En passant sur votre fiche Google, j'ai eu envie de vous écrire directement. Je travaille avec des professionnels à {city} sur leur présence en ligne, et je me demandais si c'est quelque chose qui vous intéresse en ce moment.
Vous avez quelques minutes cette semaine pour qu'on en parle ?`) + SIG
    },

    {
        name: 'FR — Général v2', subject: '{company_name} — une idée', tags: ['general'], language: 'fr', type: 'email',
        body: txt(`Bonjour,
Je m'appelle Zak, je crée des sites web pour des indépendants et petites entreprises à {city}.
J'ai regardé votre présence en ligne et j'ai quelques idées qui pourraient vous être utiles. Rien de compliqué — juste quelques points concrets.
Est-ce que vous seriez disponible pour un échange rapide ?`) + SIG
    },

    {
        name: 'FR — Général v3', subject: 'Votre visibilité à {city}', tags: ['general'], language: 'fr', type: 'email',
        body: txt(`Bonjour,
Je travaille avec des professionnels du secteur à {city} pour améliorer leur visibilité sur internet.
En regardant {company_name}, j'ai noté quelques pistes intéressantes. Je peux vous les partager si vous le souhaitez — sans engagement de votre côté.
Cela vous conviendrait ?`) + SIG
    },

    {
        name: 'FR — Général v4', subject: 'Petite question pour {company_name}', tags: ['general'], language: 'fr', type: 'email',
        body: txt(`Bonjour,
Je suis Zak, je développe des sites web pour des pros à {city}.
Je cherche à collaborer avec quelques entreprises sérieuses cette année. Est-ce que {company_name} envisage de travailler sur sa présence en ligne prochainement ?
Merci pour votre retour.`) + SIG
    },

    {
        name: 'FR — Général v5', subject: '{company_name} — présence web', tags: ['general'], language: 'fr', type: 'email',
        body: txt(`Bonjour,
J'ai trouvé {company_name} en cherchant des professionnels à {city}.
Je crée des sites web simples et efficaces pour des indépendants — pensés pour être trouvés sur Google et convertir les visiteurs en contacts.
Est-ce que c'est un sujet sur lequel vous réfléchissez en ce moment ?`) + SIG
    },

    // ════════════════════════════════════════════════════════════════
    // TYPE 2 — PAS DE SITE WEB (5 versions)
    // ════════════════════════════════════════════════════════════════

    {
        name: 'FR — Pas de site v1', subject: 'Impossible de vous trouver en ligne', tags: ['no-website'], language: 'fr', type: 'email',
        body: txt(`Bonjour,
En cherchant {company_name} sur internet, je n'ai pas trouvé de site web.
Je ne sais pas si c'est voulu, mais beaucoup de clients potentiels cherchent d'abord en ligne avant d'appeler. Sans site, vous passez peut-être à côté de certains d'entre eux.
Je peux vous montrer ce que j'ai fait pour d'autres pros à {city} si vous êtes curieux.`) + SIG
    },

    {
        name: 'FR — Pas de site v2', subject: '{company_name} — je ne vous trouve pas en ligne', tags: ['no-website'], language: 'fr', type: 'email',
        body: txt(`Bonjour,
Je cherchais des infos sur {company_name} mais je n'ai pas trouvé de site web.
Est-ce que vous en avez un que j'aurais manqué ? Sinon, je travaille avec des professionnels à {city} pour créer des pages simples et bien référencées sur Google.
Vous voulez qu'on en discute ?`) + SIG
    },

    {
        name: 'FR — Pas de site v3', subject: 'Votre fiche Google est bien — et après ?', tags: ['no-website'], language: 'fr', type: 'email',
        body: txt(`Bonjour,
Votre fiche Google est là, mais je n'ai pas trouvé de site web pour {company_name}.
La fiche attire l'attention, mais un site permet de convaincre les gens de vous contacter plutôt qu'un concurrent. C'est souvent là que ça se joue.
Je peux vous envoyer quelques exemples de ce que je fais pour des pros à {city}, si vous voulez voir à quoi ça ressemble.`) + SIG
    },

    {
        name: 'FR — Pas de site v4', subject: 'Une page web pour {company_name}', tags: ['no-website'], language: 'fr', type: 'email',
        body: txt(`Bonjour,
Je suis Zak, développeur web à {city}.
J'ai vu que {company_name} n'a pas encore de site. Je crée des pages claires et bien positionnées sur Google pour des professionnels de votre secteur — sans jargon technique, sans délai interminable.
Est-ce que c'est quelque chose qui vous intéresserait ?`) + SIG
    },

    {
        name: 'FR — Pas de site v5', subject: '{company_name} — question directe', tags: ['no-website'], language: 'fr', type: 'email',
        body: txt(`Bonjour,
Je n'ai pas trouvé de site web pour {company_name}.
Je travaille avec des indépendants à {city} pour qu'ils soient visibles en ligne sans que ça leur prenne du temps ou de l'énergie. Je m'occupe de tout.
Vous seriez ouvert à en savoir un peu plus ?`) + SIG
    },

    // ════════════════════════════════════════════════════════════════
    // TYPE 3 — SITE INACCESSIBLE (5 versions)
    // ════════════════════════════════════════════════════════════════

    {
        name: 'FR — Site inaccessible v1', subject: 'Votre site ne répond pas', tags: ['inaccessible'], language: 'fr', type: 'email',
        body: txt(`Bonjour,
J'ai essayé d'accéder au site de {company_name} tout à l'heure, mais il semble inaccessible.
Je vous le signale car des clients qui cherchent vos coordonnées ou vos services peuvent tomber sur cette erreur et aller voir ailleurs.
Vous êtes au courant ? Je peux jeter un oeil si vous voulez.`) + SIG
    },

    {
        name: 'FR — Site inaccessible v2', subject: 'Petit problème avec {website}', tags: ['inaccessible'], language: 'fr', type: 'email',
        body: txt(`Bonjour,
En cherchant {company_name}, j'ai essayé d'ouvrir votre site ({website}) mais il affiche une erreur.
Ce genre de problème peut passer inaperçu un moment. Je voulais juste vous prévenir.
Si vous cherchez à le remettre en ligne ou à le refaire, je travaille sur ce type de projets à {city}.`) + SIG
    },

    {
        name: 'FR — Site inaccessible v3', subject: '{company_name} — votre site semble hors ligne', tags: ['inaccessible'], language: 'fr', type: 'email',
        body: txt(`Bonjour,
Je voulais visiter le site de {company_name} mais il semble actuellement hors ligne.
C'est souvent un problème d'hébergement ou de nom de domaine expiré — ça se règle rapidement. Si vous avez besoin d'aide ou si vous souhaitez en profiter pour refaire quelque chose de plus moderne, je suis disponible.
Vous voulez qu'on en parle ?`) + SIG
    },

    {
        name: 'FR — Site inaccessible v4', subject: 'Votre site web — {company_name}', tags: ['inaccessible'], language: 'fr', type: 'email',
        body: txt(`Bonjour,
J'ai tenté d'accéder à votre site web mais il ne charge pas.
Je ne sais pas si vous êtes au courant, mais c'est dommage car votre fiche Google est bien renseignée. Le site devrait suivre.
Je travaille avec des professionnels à {city} sur ce type de remise en ligne. Cela vous intéresse ?`) + SIG
    },

    {
        name: 'FR — Site inaccessible v5', subject: 'Erreur sur votre site — {company_name}', tags: ['inaccessible'], language: 'fr', type: 'email',
        body: txt(`Bonjour,
En cherchant {company_name} en ligne, j'ai cliqué sur votre site mais j'ai eu une erreur de connexion.
Je vous écris juste pour vous le signaler. Si vous souhaitez le remettre en ligne ou le remplacer par quelque chose de plus simple et fiable, c'est exactement ce que je fais pour des pros à {city}.
Bonne journée.`) + SIG
    },

    // ════════════════════════════════════════════════════════════════
    // TYPE 4 — BONS AVIS GOOGLE (5 versions)
    // ════════════════════════════════════════════════════════════════

    {
        name: 'FR — Bons avis v1', subject: 'Vos avis Google — {company_name}', tags: ['reputation'], language: 'fr', type: 'email',
        body: txt(`Bonjour,
J'ai vu que {company_name} a {review_count} avis avec une note de {rating} sur Google. C'est une belle réputation.
Je me demandais si votre site web reflète aussi bien la qualité de vos services. Souvent, il y a un écart entre ce que les clients disent et ce qu'on trouve en ligne.
Vous seriez curieux de voir ce qu'on pourrait améliorer ?`) + SIG
    },

    {
        name: 'FR — Bons avis v2', subject: '{rating} étoiles — {company_name}', tags: ['reputation'], language: 'fr', type: 'email',
        body: txt(`Bonjour,
{company_name} a {rating} sur Google avec {review_count} avis. C'est rare d'avoir une aussi bonne note.
Un site web bien fait pourrait mettre cette réputation en avant et faciliter le contact pour de nouveaux clients. En ce moment, ils voient vos avis mais doivent chercher comment vous joindre.
Cela vous parlerait d'en discuter ?`) + SIG
    },

    {
        name: 'FR — Bons avis v3', subject: 'Votre réputation en ligne — {company_name}', tags: ['reputation'], language: 'fr', type: 'email',
        body: txt(`Bonjour,
J'ai trouvé {company_name} sur Google — {rating} étoiles, {review_count} avis. Vos clients parlent bien de vous.
Je travaille avec des professionnels à {city} pour que leur site web soit à la hauteur de leur réputation. C'est souvent le maillon manquant.
Vous avez quelques minutes pour qu'on en parle ?`) + SIG
    },

    {
        name: 'FR — Bons avis v4', subject: '{company_name} — {rating} étoiles, et votre site ?', tags: ['reputation'], language: 'fr', type: 'email',
        body: txt(`Bonjour,
{company_name} a {rating} sur Google avec {review_count} avis. C'est vraiment bien.
Mais quand un client clique sur votre site depuis la fiche Google, qu'est-ce qu'il trouve ? C'est souvent là que des contacts se perdent.
Je peux vous montrer ce que je ferais concrètement si ça vous intéresse.`) + SIG
    },

    {
        name: 'FR — Bons avis v5', subject: 'Une question sur {company_name}', tags: ['reputation'], language: 'fr', type: 'email',
        body: txt(`Bonjour,
J'ai vu vos avis Google — {rating} étoiles, {review_count} retours. Vos clients vous font confiance.
Je me pose une question : est-ce que votre site web capte aussi bien cette confiance ? Souvent, les professionnels qui ont de bons avis ne s'en servent pas assez en ligne.
Vous voulez qu'on en parle rapidement ?`) + SIG
    },

    // ════════════════════════════════════════════════════════════════
    // TYPE 5 — NICHE SPÉCIFIQUE (5 versions)
    // ════════════════════════════════════════════════════════════════

    {
        name: 'FR — Niche spécifique v1', subject: '{company_name} — site web pour {niche}', tags: ['general'], language: 'fr', type: 'email',
        body: txt(`Bonjour,
Je travaille avec des professionnels du secteur {niche} à {city} sur leur présence en ligne.
J'ai regardé {company_name} et j'ai quelques idées adaptées à votre activité. Rien de générique — je connais les attentes des clients dans ce secteur.
Vous seriez disponible pour qu'on en discute ?`) + SIG
    },

    {
        name: 'FR — Niche spécifique v2', subject: 'Votre secteur à {city} — {company_name}', tags: ['general'], language: 'fr', type: 'email',
        body: txt(`Bonjour,
Je suis Zak, développeur web. Je travaille régulièrement avec des pros du secteur {niche} autour de {city}.
Je connais bien les spécificités de votre activité et ce que les clients cherchent en ligne. J'ai quelques idées concrètes pour {company_name}.
Cela vous intéresse d'en savoir plus ?`) + SIG
    },

    {
        name: 'FR — Niche spécifique v3', subject: '{niche} à {city} — {company_name}', tags: ['general'], language: 'fr', type: 'email',
        body: txt(`Bonjour,
En cherchant des professionnels dans le secteur {niche} à {city}, je suis tombé sur {company_name}.
Je crée des sites web pensés pour ce type d'activité — clairs, bien positionnés sur Google, et faciles à maintenir. Je peux vous montrer des exemples proches de votre secteur.
Vous voulez y jeter un oeil ?`) + SIG
    },

    {
        name: 'FR — Niche spécifique v4', subject: 'Une idée pour {company_name}', tags: ['general'], language: 'fr', type: 'email',
        body: txt(`Bonjour,
Je développe des sites web pour des professionnels du secteur {niche} à {city}.
Ce qui me différencie : je ne fais pas des sites génériques. Je pars de votre activité, de vos clients, et de ce qu'ils cherchent vraiment en ligne.
Est-ce que {company_name} serait ouvert à un échange rapide ?`) + SIG
    },

    {
        name: 'FR — Niche spécifique v5', subject: '{company_name} — question sur votre secteur', tags: ['general'], language: 'fr', type: 'email',
        body: txt(`Bonjour,
Je travaille avec des pros du {niche} autour de {city} et je me suis arrêté sur votre fiche Google.
J'ai une ou deux idées qui pourraient vous aider à être mieux trouvé en ligne dans votre secteur. Je peux vous les expliquer en deux minutes si vous êtes disponible.
Bonne journée.`) + SIG
    },

    // ════════════════════════════════════════════════════════════════
    // ENGLISH TEMPLATES (7 versions)
    // ════════════════════════════════════════════════════════════════

    {
        name: 'EN — General v1', subject: 'Quick question — {company_name}', tags: ['general'], language: 'en', type: 'email',
        body: txt(`Hi,
I'm Zak, an independent web developer based in Belgium.
I came across {company_name} while looking at businesses in {city} and wanted to reach out. I work with local professionals on their online presence — nothing complicated, just practical improvements.
Would you have a few minutes to chat this week?`) + SIG
    },

    {
        name: 'EN — General v2', subject: '{company_name} — an idea', tags: ['general'], language: 'en', type: 'email',
        body: txt(`Hi,
My name is Zak, I build websites for small businesses and independent professionals in {city}.
I had a look at your online presence and I have a few concrete ideas that could be useful. No pitch — just a straightforward conversation.
Would you be open to a quick call?`) + SIG
    },

    {
        name: 'EN — No Website v1', subject: "Couldn't find you online — {company_name}", tags: ['no-website'], language: 'en', type: 'email',
        body: txt(`Hi,
I was looking for information about {company_name} but couldn't find a website.
Not sure if that's intentional, but a lot of potential customers search online before reaching out. Without a site, you might be missing some of them.
I'd be happy to show you what I've built for other professionals in {city} if you're curious.`) + SIG
    },

    {
        name: 'EN — No Website v2', subject: '{company_name} — your online presence', tags: ['no-website'], language: 'en', type: 'email',
        body: txt(`Hi,
I searched for {company_name} online but didn't find a website.
I work with professionals in {city} to create simple, well-ranked pages on Google — no technical jargon, no long delays.
Is this something you'd be interested in?`) + SIG
    },

    {
        name: 'EN — Website Down v1', subject: 'Your website seems to be down — {company_name}', tags: ['inaccessible'], language: 'en', type: 'email',
        body: txt(`Hi,
I tried visiting {company_name}'s website but it seems to be inaccessible right now.
Just wanted to give you a heads up — potential customers clicking on your link from Google will hit an error and likely move on.
Let me know if you need help getting it back online or if you'd like to use this as an opportunity to refresh it.`) + SIG
    },

    {
        name: 'EN — Good Reviews v1', subject: 'Your Google reviews — {company_name}', tags: ['reputation'], language: 'en', type: 'email',
        body: txt(`Hi,
I noticed {company_name} has {review_count} reviews with a {rating} rating on Google. That's a strong reputation.
I was wondering if your website reflects that same level of quality. Often there's a gap between what customers say and what people find online.
Would you be curious to see what could be improved?`) + SIG
    },

    {
        name: 'EN — Niche Specific v1', subject: '{company_name} — website for {niche}', tags: ['general'], language: 'en', type: 'email',
        body: txt(`Hi,
I work with professionals in the {niche} sector around {city} on their online presence.
I had a look at {company_name} and I have a few ideas tailored to your type of business — not generic, but based on what clients in your field actually look for online.
Would you be available for a quick conversation?`) + SIG
    },

    // ════════════════════════════════════════════════════════════════
    // TYPE 6 — SITE OUTDATÉ / À MODERNISER (5 versions FR)
    // ════════════════════════════════════════════════════════════════

    {
        name: 'FR — Site Outdaté v1', subject: 'Votre site — {company_name}', tags: ['outdated-website'], language: 'fr', type: 'email',
        body: txt(`Bonjour,
Je suis Zak, développeur web indépendant basé en Belgique.
Je suis tombé sur le site de {company_name} et j'ai eu envie de vous écrire. Le site fonctionne, mais il y a quelques points qui pourraient être améliorés assez facilement — notamment au niveau du design et de la vitesse de chargement.
Ce sont des choses qui ont un impact direct sur le nombre de clients qui vous contactent via internet.
Vous seriez disponible pour qu'on en parle rapidement ?`) + SIG
    },

    {
        name: 'FR — Site Outdaté v2', subject: 'Une idée pour {company_name}', tags: ['outdated-website'], language: 'fr', type: 'email',
        body: txt(`Bonjour,
Je m'appelle Zak, je crée et modernise des sites web pour des professionnels à {city}.
En regardant votre site, j'ai noté quelques éléments qui datent un peu — rien de dramatique, mais qui peuvent freiner des clients potentiels avant même qu'ils vous appellent.
Je peux vous montrer concrètement ce que ça donnerait avec une version modernisée. Ça vous intéresse ?`) + SIG
    },

    {
        name: 'FR — Site Outdaté v3', subject: '{company_name} — mise à jour de votre site', tags: ['outdated-website'], language: 'fr', type: 'email',
        body: txt(`Bonjour,
Je travaille avec des entreprises à {city} pour moderniser leur présence en ligne.
Votre site de {company_name} a du potentiel, mais il mériterait une mise à jour — design plus actuel, meilleure lisibilité sur mobile, chargement plus rapide. Ce sont des points qui font souvent la différence quand un client hésite entre vous et un concurrent.
Est-ce que vous avez quelques minutes cette semaine pour qu'on en discute ?`) + SIG
    },

    {
        name: 'FR — Site Outdaté v4', subject: 'Question sur votre site web', tags: ['outdated-website'], language: 'fr', type: 'email',
        body: txt(`Bonjour,
Je suis Zak, développeur web freelance. Je contacte des professionnels à {city} dont le site pourrait bénéficier d'une modernisation.
En regardant {company_name}, j'ai vu qu'il y a de la marge pour améliorer l'expérience visiteur — notamment sur mobile et au niveau de la vitesse. Ces deux points influencent directement votre position sur Google et le taux de contact.
Vous seriez ouvert à un échange rapide sur le sujet ?`) + SIG
    },

    {
        name: 'FR — Site Outdaté v5', subject: 'Votre site web — quelques pistes', tags: ['outdated-website'], language: 'fr', type: 'email',
        body: txt(`Bonjour,
Je m'appelle Zak et je développe des sites web pour des indépendants et PME en Belgique.
J'ai regardé le site de {company_name} — il y a quelques ajustements qui pourraient vraiment changer la donne : un design plus moderne, une meilleure adaptation mobile, et une vitesse de chargement améliorée. Ce sont des choses que je peux faire rapidement et à un tarif raisonnable.
Ça vous dirait qu'on en parle ?`) + SIG
    },
];


export async function POST() {
    try {
        let created = 0;
        let updated = 0;

        for (const t of TEMPLATES) {
            const vars: string[] = [];
            const regex = /\{(\w+)\}/g;
            let match;
            const combined = t.subject + ' ' + t.body;
            while ((match = regex.exec(combined)) !== null) {
                if (!vars.includes(match[1])) vars.push(match[1]);
            }

            const existing = await prisma.emailTemplate.findFirst({ where: { name: t.name } });
            if (existing) {
                await prisma.emailTemplate.update({
                    where: { id: existing.id },
                    data: {
                        subject: t.subject,
                        body: t.body,
                        language: t.language,
                        variables: vars,
                        tags: t.tags || [],
                    },
                });
                updated++;
            } else {
                await prisma.emailTemplate.create({
                    data: {
                        name: t.name,
                        subject: t.subject,
                        body: t.body,
                        type: t.type,
                        language: t.language,
                        variables: vars,
                        tags: t.tags || [],
                    },
                });
                created++;
            }
        }

        return NextResponse.json({ success: true, created, updated, total: TEMPLATES.length });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to seed' },
            { status: 500 }
        );
    }
}
