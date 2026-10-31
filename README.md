# App Temperatura

Monorepo do aplicativo de alertas de congelamento de vidros.

## Estrutura

- `apps/frontend`: Expo/React Native Web. Deploy na Vercel.
- `apps/backend`: Express + MongoDB. Deploy no Render.

## Deploy

Na Vercel, importe o repositório e defina `apps/frontend` como Root Directory. O `vercel.json` já configura `npm run build` e a pasta `dist`.

No Render, crie um Web Service apontando para o mesmo repositório. Use `apps/backend` como Root Directory. O arquivo `render.yaml` também pode ser usado via Blueprint.

Configure `MONGODB_URI` como variável secreta no Render. Nunca coloque a URI real no frontend ou no GitHub.

## Execução local

```powershell
npm install
npm run web
```

Em outro terminal, inicie a API:

```powershell
npm run server
```

Para os testes do backend:

```powershell
npm run test:alerts
```

Copie os arquivos `.env.example` para `.env` somente localmente. No GitHub, Vercel e Render, configure as variáveis de ambiente diretamente na plataforma.
# app-temperatura
