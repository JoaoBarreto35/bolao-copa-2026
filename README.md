# Bolão Copa 2026 🇧🇷

App React + TypeScript + PWA simples para bolão familiar dos jogos do Brasil na Copa do Mundo 2026.

## Rodar local

```bash
npm install
cp .env.example .env
npm start
```

## Supabase

1. Crie um projeto no Supabase.
2. Vá em SQL Editor.
3. Rode o arquivo `supabase/schema.sql`.
4. Em Authentication > Users, crie seu usuário admin manualmente.
5. Preencha `.env` com `REACT_APP_SUPABASE_URL` e `REACT_APP_SUPABASE_ANON_KEY`.

Sem login: qualquer pessoa vê os palpites e o bolão.  
Com login: você consegue adicionar, editar pagamento e excluir palpites.

## API de jogos/placar

O app tem fallback local dos jogos do Brasil na fase de grupos. Se preencher `REACT_APP_FOOTBALL_API_KEY`, ele tenta atualizar placar e status pela TheSportsDB gratuita.

A chave no front-end fica visível. Para uso familiar é aceitável; para produção pública, use uma Edge Function no Supabase como proxy.

## Deploy

Funciona em Netlify/Vercel. Configure as mesmas variáveis de ambiente no painel da hospedagem.


## API de escudos e placar ao vivo

O app já está preparado para usar a API-FOOTBALL / API-Sports. Ela busca os jogos do Brasil na Copa do Mundo 2026, placar, status ao vivo e logos das seleções quando a chave estiver preenchida.

1. Crie uma conta em API-Sports / API-FOOTBALL.
2. Copie sua chave de API.
3. No arquivo `.env`, preencha:

```env
REACT_APP_THESPORTSDB_API_KEY=123
REACT_APP_THESPORTSDB_WORLD_CUP_LEAGUE_ID=4429
REACT_APP_WORLD_CUP_SEASON=2026
```

Depois reinicie o servidor com `npm run dev`.

Observação: como a chave fica no front-end, ela fica visível no navegador. Para esse bolão familiar tudo bem, mas se o site viralizar, o ideal é criar uma Edge Function no Supabase para esconder a chave.


## API gratuita de jogos

A integração usa a TheSportsDB v1, que tem chave pública gratuita `123`. O app busca a temporada da Copa do Mundo e também consulta os dias dos jogos do Brasil. Quando a API retornar badges/logos e placar, o app mostra automaticamente. Se a API falhar, ele mantém os jogos fallback do Brasil para o bolão não parar.

Observação: por ser gratuita, essa API pode ter atraso no placar ao vivo e limites de requisição. Para bolão familiar, é a opção mais simples e sem custo.
