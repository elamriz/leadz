import { auditWebsite } from '../lib/email-extractor';

async function test() {
    console.log('Testing accessible site (example.com)...');
    const accessible = await auditWebsite('example.com');
    console.log('Accessible:', accessible.isAccessible);
    if (!accessible.isAccessible) console.log('Error:', accessible.errors[0]);
    console.log('DesignScore:', accessible.designScore);

    console.log('\nTesting inaccessible site (thisdomaindoesnotexist12345.com)...');
    const inaccessible = await auditWebsite('thisdomaindoesnotexist12345.com');
    console.log('Inaccessible:', inaccessible.isAccessible, 'Error:', inaccessible.errors[0]);
    console.log('DesignScore:', inaccessible.designScore);
}

test();
