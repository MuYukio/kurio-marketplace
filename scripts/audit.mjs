import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
const output = path.resolve('lighthouse/reports');
await fs.mkdir(output, { recursive: true });
const base = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:4173';
const server = process.env.AUDIT_BASE_URL
  ? null
  : spawn(
      process.execPath,
      ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4173'],
      { stdio: 'ignore' },
    );
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let chrome;
try {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {
      /* Server boot. */
    }
    if (i === 59) throw new Error('Preview não iniciou. Execute build:demo primeiro.');
    await wait(250);
  }
  chrome = await launch({
    chromePath: process.env.CHROME_PATH,
    chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage'],
  });
  const rows = [];
  const count = Number(process.env.AUDIT_RUNS || 3);
  for (const profile of ['mobile', 'desktop'])
    for (const [name, route] of [
      ['home', '/'],
      ['detail', '/mercado/nft-1'],
    ])
      for (let run = 1; run <= count; run++) {
        console.log(`Lighthouse ${profile} ${name} ${run}/${count}`);
        const settings =
          profile === 'desktop'
            ? {
                formFactor: 'desktop',
                screenEmulation: {
                  mobile: false,
                  width: 1440,
                  height: 1000,
                  deviceScaleFactor: 1,
                  disabled: false,
                },
                throttling: {
                  rttMs: 40,
                  throughputKbps: 10240,
                  cpuSlowdownMultiplier: 1,
                  requestLatencyMs: 0,
                  downloadThroughputKbps: 0,
                  uploadThroughputKbps: 0,
                },
              }
            : {
                formFactor: 'mobile',
                screenEmulation: {
                  mobile: true,
                  width: 390,
                  height: 844,
                  deviceScaleFactor: 1,
                  disabled: false,
                },
              };
        const result = await lighthouse(
          base + route,
          {
            port: chrome.port,
            output: ['html', 'json'],
            logLevel: 'error',
            onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
          },
          { extends: 'lighthouse:default', settings },
        );
        if (!result) throw new Error('Lighthouse não retornou relatório');
        const prefix = `${profile}-${name}-${run}`;
        await fs.writeFile(path.join(output, `${prefix}.html`), result.report[0]);
        await fs.writeFile(path.join(output, `${prefix}.json`), result.report[1]);
        rows.push({
          profile,
          page: name,
          run,
          version: result.lhr.lighthouseVersion,
          scores: Object.fromEntries(
            Object.entries(result.lhr.categories).map(([k, v]) => [k, Math.round(v.score * 100)]),
          ),
          LCP: result.lhr.audits['largest-contentful-paint'].numericValue,
          CLS: result.lhr.audits['cumulative-layout-shift'].numericValue,
          TBT: result.lhr.audits['total-blocking-time'].numericValue,
          runtimeError: result.lhr.runtimeError || null,
        });
      }
  const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  const summary = [];
  for (const profile of ['mobile', 'desktop'])
    for (const page of ['home', 'detail']) {
      const r = rows.filter((x) => x.profile === profile && x.page === page);
      summary.push({
        profile,
        page,
        scores: Object.fromEntries(
          Object.keys(r[0].scores).map((k) => [k, median(r.map((x) => x.scores[k]))]),
        ),
        LCP: median(r.map((x) => x.LCP)),
        CLS: median(r.map((x) => x.CLS)),
        TBT: median(r.map((x) => x.TBT)),
      });
    }
  const environment = {
    date: new Date().toISOString(),
    node: process.version,
    platform: os.platform(),
    arch: os.arch(),
    cpu: os.cpus()[0]?.model,
    memory: os.totalmem(),
    base,
    version: JSON.parse(await fs.readFile('package.json', 'utf8')).version,
    runsPerPage: count,
    conditions:
      'Build demo completo; storage reset padrão do Lighthouse; MSW padrão; fontes/imagens locais; sem sessão autenticada.',
  };
  await fs.writeFile(
    path.join(output, 'summary.json'),
    JSON.stringify({ environment, rows, summary }, null, 2),
  );
  console.log(JSON.stringify(summary, null, 2));
} finally {
  if (chrome) await chrome.kill();
  if (server) server.kill();
}
