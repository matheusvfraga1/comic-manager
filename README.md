# Comic Manager

App para organizar a produção de quadrinhos: projetos, personagens, cenários, roteiro, lore, páginas por estágio (storyboard → lápis → arte-final → cinzas → cor → letreiramento), artes conceituais e referências.

- **Front-end:** React + Vite (HashRouter, funciona em qualquer hospedagem estática)
- **Back-end:** Supabase (Auth, Postgres com RLS, Storage no bucket privado `comic`)
- **Deploy:** GitHub Pages via `.github/workflows/deploy.yml` a cada push na `main`

## Rodar localmente

```bash
npm install
npm run dev
```

A URL e a chave **anon** do Supabase estão em `src/lib/supabase.js`. A chave anon é pública por natureza; quem protege os dados são as políticas RLS. Para usar outro projeto, crie um `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

## Banco de dados

O esquema está em `supabase/migrations/`. Cada usuário só enxerga os próprios projetos. Os arquivos ficam em `comic/<user_id>/<project_id>/...`.

| Tabela | Conteúdo |
| --- | --- |
| `projects` | título, autor, gêneros, classificação, sinopse, capa, link do Miro |
| `characters` / `locations` | fichas em seções livres (`sheet` em JSON) + texto livre (`notes`) |
| `documents` | roteiro, escaleto, lore, beat sheet, modelos, anotações (Markdown) |
| `assets` | páginas (com estágio e número), artes conceituais, referências, anexos |
| `comments` | comentários nas imagens |

## Recursos

- Menções com `@`: no editor de roteiro e anotações, `@` sugere personagens e cenários. Na leitura, a menção vira link para a ficha.
- Sumário lateral automático pelos títulos (`#`, `##`, `###`) do documento.
- Importação de `.docx` direto para um documento.
- Páginas: envio em lote (o número da página vem do nome do arquivo) e sobreposição de estágios para comparar.
- Itens podem ser arquivados em vez de apagados.

## Importação da HQ "A Maldição da Casa Silverman"

A importação inicial veio do Google Drive:

1. `node scripts/prepare-import.mjs "G:\Meu Drive\Quadrinhos\A Maldição da Casa Silverman"` copia fichas .docx, PDFs e imagens para `public/_import/`. A pasta não é versionada.
2. Os Google Docs e as Planilhas foram exportados para a tabela temporária `import_staging`.
3. Com `npm run dev`, a tela `#/importar` (só existe em desenvolvimento) cria o projeto completo.
