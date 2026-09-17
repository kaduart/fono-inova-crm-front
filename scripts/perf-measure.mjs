#!/usr/bin/env node
/**
 * Mede tempo até conteúdo essencial visível, em cache frio e quente, contra
 * uma build já rodando (ex: `npx vite preview --port 4173`).
 *
 * NÃO tem token embutido — recebe via variável de ambiente:
 *   TEST_JWT=<token>  TEST_USER_ID=<id do Admin>  [TEST_USER_NAME=<nome>]
 * Gere um token de teste localmente (ver back/scripts, ou assine um JWT com o
 * mesmo JWT_SECRET do .env do backend) e nunca commite o valor em lugar nenhum.
 *
 * Uso:
 *   TEST_JWT=... TEST_USER_ID=... node scripts/perf-measure.mjs [baseUrl] [runs]
 *
 * baseUrl default: http://localhost:4173
 * runs default: 5 (por variante fria + variante quente, por aba)
 */
import puppeteer from 'puppeteer';

const TOKEN = process.env.TEST_JWT;
const USER_ID = process.env.TEST_USER_ID;
const USER_NAME = process.env.TEST_USER_NAME || 'Test Admin';
const BASE_URL = process.argv[2] || 'http://localhost:4173';
const RUNS = Number(process.argv[3] || 5);
const LABEL = process.env.PERF_LABEL || 'run';

if (!TOKEN || !USER_ID) {
    console.error('Defina TEST_JWT e TEST_USER_ID (variáveis de ambiente) antes de rodar.');
    console.error('Exemplo: TEST_JWT=xxx TEST_USER_ID=yyy node scripts/perf-measure.mjs');
    process.exit(1);
}

const TARGETS = [
    { tab: 'Dashboard', url: `${BASE_URL}/admin?tab=Dashboard`, marker: 'ÚLTIMA ATUALIZAÇÃO' },
    { tab: 'Financeiro', url: `${BASE_URL}/admin?tab=Financeiro`, marker: 'RESUMO DO DIA' },
    { tab: 'Calendário', url: `${BASE_URL}/admin?tab=Calendário`, marker: 'Visualizando' },
];

function seedAuth(page) {
    return page.evaluateOnNewDocument((token, userJson) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', userJson);
        localStorage.setItem('userRole', JSON.stringify('admin'));
        localStorage.setItem('lastActivity', String(Date.now()));
        localStorage.setItem('authValidatedAt', String(Date.now()));
    }, TOKEN, JSON.stringify({ _id: USER_ID, role: 'admin', fullName: USER_NAME }));
}

async function measureOnce(page, target) {
    const navStart = Date.now();
    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    let visibleAt = null;
    try {
        await page.waitForFunction(
            (marker) => document.body.innerText.includes(marker),
            { timeout: 10000 },
            target.marker
        );
        visibleAt = Date.now() - navStart;
    } catch { /* não apareceu em 10s */ }
    return visibleAt;
}

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const results = {};

for (const target of TARGETS) {
    results[target.tab] = { cold: [], warm: [] };

    // Cold: um contexto/página NOVA por execução — sem cache HTTP, sem SW, sem estado de JS.
    for (let i = 0; i < RUNS; i++) {
        const page = await browser.newPage();
        await seedAuth(page);
        const t = await measureOnce(page, target);
        results[target.tab].cold.push(t);
        await page.close();
    }

    // Warm: UMA página, primeiro load descartado (aquece SW/cache HTTP), depois
    // mede reloads subsequentes na MESMA página (F5 de verdade).
    {
        const page = await browser.newPage();
        await seedAuth(page);
        await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 3000)); // deixa aquecer de verdade
        for (let i = 0; i < RUNS; i++) {
            const navStart = Date.now();
            await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
            let visibleAt = null;
            try {
                await page.waitForFunction(
                    (marker) => document.body.innerText.includes(marker),
                    { timeout: 10000 },
                    target.marker
                );
                visibleAt = Date.now() - navStart;
            } catch { /* noop */ }
            results[target.tab].warm.push(visibleAt);
        }
        await page.close();
    }
}

await browser.close();

function summarize(arr) {
    const valid = arr.filter(v => v !== null);
    if (valid.length === 0) return 'sem dado (nenhum run visível em 10s)';
    const avg = Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
    return `[${arr.join(', ')}]ms média=${avg}ms`;
}

console.log(`\n=== ${LABEL} (${BASE_URL}, N=${RUNS}) ===`);
for (const [tab, r] of Object.entries(results)) {
    console.log(`${tab}:`);
    console.log(`  frio:  ${summarize(r.cold)}`);
    console.log(`  quente: ${summarize(r.warm)}`);
}
