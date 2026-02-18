import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const SIGNATURE_FR = `\n\n---\nZak — Ryzq Digital\nSites web & applications sur mesure\nhttps://ryzq.dev`;

const SIGNATURE_EN = `\n\n---\nZak — Ryzq Digital\nCustom websites & applications\nhttps://ryzq.dev`;

const TEMPLATES = [
    { name: 'FR — Présence en ligne', subject: 'Améliorer la visibilité de {company_name}', body: `<p>Bonjour,</p><p>Je me permets de vous contacter car j'ai remarqué que <strong>{company_name}</strong> à {city} pourrait bénéficier d'une meilleure présence en ligne.</p><p>Nous aidons des entreprises comme la vôtre à attirer plus de clients grâce à un site web moderne et un bon référencement local.</p><p>Seriez-vous disponible cette semaine pour en discuter brièvement ?</p><p>Bonne journée,${SIGNATURE_FR}</p>`, language: 'fr', type: 'email' },
    { name: 'FR — Audit gratuit', subject: 'Un audit gratuit pour {company_name}', body: `<p>Bonjour,</p><p>J'ai visité votre fiche Google et j'ai quelques idées pour améliorer la visibilité de <strong>{company_name}</strong> dans {city}.</p><p>Nous proposons un audit digital gratuit et sans engagement. Cela ne prendra que quelques minutes et pourrait vous aider à mieux comprendre votre positionnement en ligne.</p><p>Intéressé ?</p><p>Cordialement,${SIGNATURE_FR}</p>`, language: 'fr', type: 'email' },
    { name: 'FR — Site web manquant', subject: 'Votre présence digitale, {company_name}', body: `<p>Bonjour,</p><p>J'ai remarqué que <strong>{company_name}</strong> n'a pas encore de site web dédié. En 2025, plus de 80% des clients recherchent en ligne avant de se déplacer.</p><p>Nous créons des sites web clairs, rapides et optimisés pour le mobile, spécialement conçus pour les professionnels de votre secteur.</p><p>Je serais ravi de vous montrer quelques exemples. Qu'en pensez-vous ?</p><p>À bientôt,${SIGNATURE_FR}</p>`, language: 'fr', type: 'email' },
    { name: 'FR — Avis clients', subject: 'Tirer parti de vos avis positifs', body: `<p>Bonjour,</p><p>J'ai vu que <strong>{company_name}</strong> a de très bons retours clients sur Google. Félicitations !</p><p>Savez-vous qu'un site web bien conçu peut convertir ces avis en encore plus de clients ? Nous pouvons intégrer vos témoignages, vos coordonnées et un système de réservation directement sur votre page.</p><p>Envie d'en savoir plus ?</p><p>Bien à vous,${SIGNATURE_FR}</p>`, language: 'fr', type: 'email' },
    { name: 'FR — Concurrence locale', subject: 'Se démarquer dans {city}', body: `<p>Bonjour,</p><p>En analysant les entreprises de votre secteur à {city}, j'ai remarqué que plusieurs de vos concurrents ont renforcé leur présence en ligne récemment.</p><p>Nous travaillons avec des entreprises comme <strong>{company_name}</strong> pour les aider à garder une longueur d'avance grâce à un site professionnel et un référencement efficace.</p><p>Est-ce un sujet qui vous intéresse ?</p><p>Cordialement,${SIGNATURE_FR}</p>`, language: 'fr', type: 'email' },
    { name: 'FR — Référencement Google', subject: 'Apparaître en premier sur Google pour {niche}', body: `<p>Bonjour,</p><p>Quand un client cherche "{niche}" à {city} sur Google, est-ce que <strong>{company_name}</strong> apparaît en haut des résultats ?</p><p>Si ce n'est pas encore le cas, nous pouvons vous aider. Notre approche combine un site web optimisé avec un profil Google Business bien configuré.</p><p>Je peux vous envoyer un exemple de ce que nous avons fait pour une entreprise similaire à la vôtre. Cela vous intéresse ?</p><p>Bonne fin de journée,${SIGNATURE_FR}</p>`, language: 'fr', type: 'email' },
    { name: 'FR — Répondeur automatique', subject: 'Ne manquer aucun client en ligne', body: `<p>Bonjour,</p><p>Saviez-vous que beaucoup de clients potentiels contactent des entreprises en dehors des heures d'ouverture ?</p><p>Avec un site web bien conçu, <strong>{company_name}</strong> pourrait recevoir des demandes de devis, des réservations ou des messages même la nuit.</p><p>C'est rapide à mettre en place et cela peut faire une vraie différence. Un échange rapide vous conviendrait ?</p><p>À bientôt,${SIGNATURE_FR}</p>`, language: 'fr', type: 'email' },
    { name: 'FR — Mobile-first', subject: 'Votre site est-il adapté au mobile ?', body: `<p>Bonjour,</p><p>Plus de 70% des recherches locales se font désormais sur mobile. Si le site de <strong>{company_name}</strong> ne s'affiche pas bien sur smartphone, vous perdez potentiellement des clients.</p><p>Nous proposons des sites web rapides, modernes et parfaitement adaptés au mobile, avec un formulaire de contact intégré.</p><p>Un rapide appel cette semaine pour en discuter ?</p><p>Bien cordialement,${SIGNATURE_FR}</p>`, language: 'fr', type: 'email' },
    { name: 'FR — Témoignage client', subject: 'Comment nous avons aidé un professionnel comme vous', body: `<p>Bonjour,</p><p>Nous avons récemment aidé un professionnel de votre secteur à {city} à doubler le nombre de demandes en ligne en seulement 3 mois, simplement en créant un site clair et bien référencé.</p><p>Je me suis dit que cela pourrait intéresser <strong>{company_name}</strong>. Voulez-vous que je vous montre le résultat ?</p><p>À bientôt,${SIGNATURE_FR}</p>`, language: 'fr', type: 'email' },
    { name: 'FR — Offre limitée', subject: 'Une idée pour {company_name}', body: `<p>Bonjour,</p><p>Je vous contacte rapidement pour vous informer que nous proposons ce mois-ci un tarif préférentiel pour la création de sites web pour les professionnels de {city}.</p><p>Si <strong>{company_name}</strong> envisage de renforcer sa présence en ligne, c'est le bon moment. Le site inclut le design, l'hébergement et l'optimisation Google.</p><p>Envie d'en savoir plus ? N'hésitez pas à me répondre.</p><p>Bien à vous,${SIGNATURE_FR}</p>`, language: 'fr', type: 'email' },

    { name: 'EN — Online Presence', subject: 'Improving the visibility of {company_name}', body: `<p>Hi there,</p><p>I came across <strong>{company_name}</strong> in {city} and noticed there might be an opportunity to strengthen your online presence.</p><p>We help businesses like yours attract more customers with a modern website and effective local SEO.</p><p>Would you be open to a quick chat this week?</p><p>Best regards,${SIGNATURE_EN}</p>`, language: 'en', type: 'email' },
    { name: 'EN — Free Audit', subject: 'A free digital audit for {company_name}', body: `<p>Hi,</p><p>I checked out your Google listing and I have a few ideas that could help boost <strong>{company_name}</strong>'s visibility in {city}.</p><p>We offer a free, no-strings-attached digital audit. It only takes a few minutes and could give you useful insights about your online positioning.</p><p>Interested?</p><p>Cheers,${SIGNATURE_EN}</p>`, language: 'en', type: 'email' },
    { name: 'EN — No Website', subject: 'Your digital presence, {company_name}', body: `<p>Hi,</p><p>I noticed that <strong>{company_name}</strong> doesn't seem to have a dedicated website yet. In 2025, over 80% of customers search online before visiting a business.</p><p>We build clean, fast, mobile-friendly websites designed specifically for professionals in your industry.</p><p>I'd love to show you some examples. What do you think?</p><p>All the best,${SIGNATURE_EN}</p>`, language: 'en', type: 'email' },
    { name: 'EN — Positive Reviews', subject: 'Turning your great reviews into more customers', body: `<p>Hi,</p><p>I saw that <strong>{company_name}</strong> has some fantastic customer reviews on Google. Congrats!</p><p>Did you know a well-designed website can turn those reviews into even more business? We can integrate testimonials, contact info, and a booking system right on your page.</p><p>Want to learn more?</p><p>Best,${SIGNATURE_EN}</p>`, language: 'en', type: 'email' },
    { name: 'EN — Local Competition', subject: 'Standing out in {city}', body: `<p>Hi,</p><p>While researching businesses in your industry in {city}, I noticed several of your competitors have recently upgraded their online presence.</p><p>We work with businesses like <strong>{company_name}</strong> to help them stay ahead with a professional website and smart local SEO.</p><p>Is this something you'd be interested in?</p><p>Kind regards,${SIGNATURE_EN}</p>`, language: 'en', type: 'email' },
    { name: 'EN — Google Ranking', subject: 'Ranking first on Google for {niche}', body: `<p>Hi,</p><p>When a customer searches for "{niche}" in {city} on Google, does <strong>{company_name}</strong> appear at the top?</p><p>If not yet, we can help. Our approach combines an optimized website with a well-configured Google Business profile.</p><p>I can share an example of what we've done for a similar business. Interested?</p><p>Have a great day,${SIGNATURE_EN}</p>`, language: 'en', type: 'email' },
    { name: 'EN — After Hours Leads', subject: 'Never miss an online customer', body: `<p>Hi,</p><p>Did you know that many potential customers reach out to businesses outside of working hours?</p><p>With a well-built website, <strong>{company_name}</strong> could receive quote requests, bookings, or messages even overnight.</p><p>It's quick to set up and can make a real difference. Would a short call work for you?</p><p>Talk soon,${SIGNATURE_EN}</p>`, language: 'en', type: 'email' },
    { name: 'EN — Mobile-First', subject: 'Is your site mobile-friendly?', body: `<p>Hi,</p><p>Over 70% of local searches now happen on mobile. If <strong>{company_name}</strong>'s site doesn't display well on smartphones, you could be losing customers.</p><p>We create fast, modern, fully mobile-optimized websites with built-in contact forms and booking features.</p><p>Open to a quick call this week?</p><p>Best regards,${SIGNATURE_EN}</p>`, language: 'en', type: 'email' },
    { name: 'EN — Case Study', subject: 'How we helped a professional like you', body: `<p>Hi,</p><p>We recently helped a professional in your industry in {city} double their online inquiries in just 3 months — simply by creating a clear, well-optimized website.</p><p>I thought this might interest <strong>{company_name}</strong>. Want me to share the results?</p><p>Talk soon,${SIGNATURE_EN}</p>`, language: 'en', type: 'email' },
    { name: 'EN — Limited Offer', subject: 'An idea for {company_name}', body: `<p>Hi,</p><p>Just a quick note to let you know we're offering a special rate this month for website creation for professionals in {city}.</p><p>If <strong>{company_name}</strong> is considering boosting its online presence, now is a great time. The package includes design, hosting, and Google optimization.</p><p>Want to know more? Feel free to reply.</p><p>All the best,${SIGNATURE_EN}</p>`, language: 'en', type: 'email' },
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
                    data: { subject: t.subject, body: t.body, language: t.language, variables: vars },
                });
                updated++;
            } else {
                await prisma.emailTemplate.create({
                    data: { name: t.name, subject: t.subject, body: t.body, type: t.type, language: t.language, variables: vars },
                });
                created++;
            }
        }

        return NextResponse.json({ success: true, created, updated, total: TEMPLATES.length });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to seed' }, { status: 500 });
    }
}
