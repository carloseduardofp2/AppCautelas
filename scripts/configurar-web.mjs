import { readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
const diretorio=resolve(process.argv[2] || 'dist');
const arquivo=resolve(diretorio,'index.html');
for(const nome of ['manifest.webmanifest','app-icon-v2-192.png','app-icon-v2-512.png','apple-touch-icon-v2.png','app-icon-v2-maskable.png']) await access(resolve(diretorio,nome));
let html=await readFile(arquivo,'utf8');
html=html.replace(/<link\b[^>]*rel=["'](?:manifest|apple-touch-icon)["'][^>]*>/gi,'').replace(/<meta\b[^>]*name=["']theme-color["'][^>]*>/gi,'');
html=html.replace('</head>',`<link rel="manifest" href="/manifest.webmanifest?v=2" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-v2.png" />
<meta name="theme-color" content="#0F172A" />
</head>`);
await writeFile(arquivo,html);
console.log('Manifesto e ícones web configurados.');
