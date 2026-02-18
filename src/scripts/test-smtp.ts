import { getSmtpConfig } from '@/lib/mailer';
import nodemailer from 'nodemailer';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Manually load .env since tsx doesn't do it automatically
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('📄 Loaded .env file');
} else {
    console.log('⚠️  .env file not found at:', envPath);
}

async function testConnection() {
    console.log('🔍 Testing SMTP Connection...');

    // 0. Check Raw DB Settings
    console.log('\n0. Checking Database Overrides...');
    try {
        const dbSettings = await prisma.setting.findMany({
            where: { key: { startsWith: 'smtp_' } },
        });
        if (dbSettings.length > 0) {
            console.log('⚠️  Database settings found (these take priority):');
            dbSettings.forEach(s => console.log(`   - ${s.key}: ${s.value ? '(set)' : '(empty)'}`));
        } else {
            console.log('✅ No conflicting database settings found.');
        }
    } catch (e) {
        console.log('⚠️  Could not check database settings (skipping DB check):');
        console.log('   Error:', e instanceof Error ? e.message : String(e));
        console.log('   (Proceeding to test config from .env)');
    }

    // 1. Check Configuration Source
    console.log('\n1. Loading Configuration...');
    try {
        const config = await getSmtpConfig();
        console.log('   Host:', config.host);
        console.log('   Port:', config.port);
        console.log('   User:', config.user ? '(set)' : '(missing)');
        console.log('   Pass:', config.pass ? '(set)' : '(missing)');
        console.log('   From:', config.from);

        // Check against Process Env to see if DB is overriding
        if (config.user !== process.env.SMTP_USER) {
            console.log('\n⚠️  WARNING: Loaded user does NOT match .env');
            console.log('   .env User:', process.env.SMTP_USER);
            console.log('   Loaded User:', config.user);
            console.log('   -> Database settings are likely overriding your .env file.');
        } else {
            console.log('\n✅ Configuration matches .env (or both are same)');
        }

        // 2. Test Connection
        console.log('\n2. Verifying Authentication...');
        const transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.port === 465, // true for 465, false for other ports
            auth: {
                user: config.user,
                pass: config.pass,
            },
        });

        await transporter.verify();
        console.log('\n✅ SUCCESS: SMTP Connection Established!');
        console.log('   Authentication worked. You are ready to send emails.');

    } catch (error) {
        console.error('\n❌ FAILURE: SMTP Connection Failed');
        if (error instanceof Error) {
            console.error('   Error:', error.message);
            if (error.message.includes('Mismatched Tenant')) {
                console.error('   Hint: Check if your Brevo API key matches the sender domain.');
            }
            if (error.message.includes('Authentication failed')) {
                console.error('   Hint: Double check your SMTP Key (not login password).');
            }
        }
    }
}

testConnection();
