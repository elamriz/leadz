// Script to update old plain-text signatures to new HTML signature in all templates
const BASE_URL = 'http://localhost:3000';

const NEW_SIG = `<br/><br/><hr style="border:none;border-top:1px solid #ddd;margin:16px 0"/><p style="font-size:13px;color:#555;margin:0"><strong>Zak</strong> | <a href="https://ryzq.dev" style="color:#6366f1;text-decoration:none">www.ryzq.dev</a> | +32 470 88 60 24</p>`;

async function main() {
    const res = await fetch(`${BASE_URL}/api/templates`);
    const data = await res.json();
    const templates = data.templates || [];
    console.log(`Found ${templates.length} templates`);

    let updated = 0, skipped = 0;

    for (const t of templates) {
        const body = t.body || '';
        const startIdx = body.indexOf('---');
        const endMarker = 'https://ryzq.dev';
        const endIdx = body.indexOf(endMarker);

        if (startIdx < 0 || endIdx < 0) {
            skipped++;
            continue;
        }

        const endPos = endIdx + endMarker.length;
        const before = body.substring(0, startIdx);
        const after = endPos < body.length ? body.substring(endPos) : '';
        const newBody = before + NEW_SIG + after;

        const patchRes = await fetch(`${BASE_URL}/api/templates/${t.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ body: newBody }),
        });

        if (patchRes.ok) {
            console.log(`✅ Updated: ${t.name}`);
            updated++;
        } else {
            const err = await patchRes.text();
            console.log(`❌ Failed: ${t.name} — ${err}`);
        }
    }

    console.log(`\nDone: ${updated} updated, ${skipped} skipped (no old signature)`);
}

main().catch(console.error);
