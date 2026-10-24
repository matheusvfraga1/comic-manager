// Prepara a importação da HQ "A Maldição da Casa Silverman" a partir do Google Drive local (G:).
// Gera public/_import/manifest.json + cópias dos arquivos; a tela /importar do app faz o resto.
// Uso: node scripts/prepare-import.mjs "G:\Meu Drive\Quadrinhos\A Maldição da Casa Silverman"
import fs from 'node:fs';
import path from 'node:path';
import mammoth from 'mammoth';

const root = process.argv[2];
if (!root) throw new Error('Informe a pasta da HQ');
const out = path.resolve('public/_import');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'files'), { recursive: true });

// [caminho relativo, tipo, extras]
// tipo: character | location | document | cover | concept | reference | attachment
const entries = [
  ['HQ/Capa Wattpad Ok.png', 'cover'],
  ['HQ/Capa Wattpad.png', 'concept', { title: 'Capa Wattpad (versão anterior)' }],
  ['Lore/FICHA DE PERSONAGEM - FRANK.docx', 'character', { name: 'Frank' }],
  ['Lore/FICHA DE CENÁRIO - MANSÃO SILVERMAN.docx', 'location', { name: 'Mansão Silverman' }],
  ['Lore/BRAINSTORMING.pdf', 'attachment', { title: 'Brainstorming' }],
  ['Lixeira/FICHA DE PERSONAGEM - CADU.docx', 'character', { name: 'Cadú', archived: true }],
  ['Lixeira/FICHA DE PERSONAGEM - Senor.docx', 'character', { name: 'Señor', archived: true }],
  ['Lixeira/FICHA DE CENÁRIO - SANTA PRATA.docx', 'location', { name: 'Santa Prata', archived: true }],
  ['Lixeira/FICHA DE CENÁRIO - SUBVERSO.docx', 'location', { name: 'Subverso', archived: true }],
  ['Lixeira/REFERÊNCIAS/FICHA DE CENÁRIO - KUROZU.docx', 'location', { name: 'Kurozu', archived: true }],
  ['Lixeira/PESQUISA DE MERCADO.docx', 'document', { kind: 'anotacao', title: 'Pesquisa de mercado', archived: true }],
  ['Lixeira/ANOTAÇÕES.docx', 'document', { kind: 'anotacao', title: 'Anotações', archived: true }],
  ['Lixeira/FICHA DE CENÁRIO - SANTA PRATA.pdf', 'attachment', { title: 'Ficha de cenário - Santa Prata (PDF)', archived: true }],
  ['Lixeira/FICHA DE PERSONAGEM - SAMUEL.pdf', 'attachment', { title: 'Ficha de personagem - Samuel (PDF)', archived: true }],
  ['Lixeira/OPRPG - Ficha de Personagem - Cadu .pdf', 'attachment', { title: 'Ficha OPRPG - Cadu', archived: true }],
  ['Lixeira/Brainstorm adaptação de HoM.pdf', 'attachment', { title: 'Brainstorm adaptação de HoM', archived: true }],
  ['Lixeira/Espiral do tempo - Frank - Google Planilhas.pdf', 'attachment', { title: 'Espiral do tempo - Frank (PDF)', archived: true }],
  ['Lixeira/Espiral do tempo - Frank - Google Planilhas - futuro.pdf', 'attachment', { title: 'Espiral do tempo - Frank, futuro (PDF)', archived: true }],
  ['Lixeira/Gemini_Generated_Image_y5f6npy5f6npy5f6.png', 'concept', { archived: true }],
  ['Lixeira/Gemini_Generated_Image_zh2w46zh2w46zh2w.png', 'concept', { archived: true }],
  ['Lixeira/Gemini_Generated_Image_5xy3595xy3595xy3.png', 'concept', { archived: true }],
  ['Lixeira/Gemini_Generated_Image_vbpr56vbpr56vbpr.png', 'concept', { archived: true }],
  ['Lixeira/Gemini_Generated_Image_21vk7v21vk7v21vk.png', 'concept', { archived: true }],
  ['Lixeira/REFERÊNCIAS/Mapa_de_Santo_Antônio_da_Patrulha.jpg', 'reference', { archived: true }],
  ['Lixeira/REFERÊNCIAS/Turismo SAP.kmz', 'attachment', { title: 'Turismo SAP (Google Earth)', archived: true }],
  ['Lixeira/REFERÊNCIAS/1. LIVROS/Bilhete escrito em 1755 - Margarida da Exaltação da Cruz.JPG', 'reference', { archived: true }],
  ['Lixeira/REFERÊNCIAS/1. LIVROS/MONUMENTALIZAÇÃO DE UM MITO - REPRESENTAÇÕES DE UMA HISTÓRIA NOS ESPAÇOS DO PARQUE DA GUARDA - SANTO ANTÔNIO DA PATRULHA - RS - Maicon Diego Rodrigues.pdf', 'attachment', { title: 'Monumentalização de um mito (Maicon Diego Rodrigues)', archived: true }],
  ...fs.readdirSync(path.join(root, 'Lixeira/REFERÊNCIAS/2. IMAGENS')).filter(f => /\.(png|jpe?g|webp)$/i.test(f)).map(f => [`Lixeira/REFERÊNCIAS/2. IMAGENS/${f}`, 'reference', { archived: true }]),
];

const slug = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.-]+/g, '_');
const mime = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.kmz': 'application/vnd.google-earth.kmz',
};

const manifest = [];
for (const [rel, type, extra = {}] of entries) {
  const src = path.join(root, rel);
  const buf = fs.readFileSync(src);
  if (!buf.length) { console.warn('vazio, ignorado:', rel); continue; }
  const file = slug(path.basename(rel));
  fs.writeFileSync(path.join(out, 'files', file), buf);
  const item = {
    type, file, source: rel, size: buf.length,
    mime: mime[path.extname(rel).toLowerCase()] ?? 'application/octet-stream',
    title: path.basename(rel, path.extname(rel)).replace(/_/g, ' '),
    ...extra,
  };
  if (rel.endsWith('.docx')) item.html = (await mammoth.convertToHtml({ buffer: buf })).value;
  manifest.push(item);
  console.log('ok', type.padEnd(10), rel);
}
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(`\n${manifest.length} itens em ${out}`);
