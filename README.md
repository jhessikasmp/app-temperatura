# App Temperatura

Monorepo do aplicativo de alertas de congelamento de vidros.

## Estrutura

- `apps/frontend`: Expo/React Native Web. Deploy na Vercel.
- `apps/backend`: Express + MongoDB. Deploy no Render.

## Deploy

Na Vercel, importe o repositório e defina `apps/frontend` como Root Directory. O `vercel.json` já configura `npm run build` e a pasta `dist`.

No Render, crie um Web Service apontando para o mesmo repositório. Use `apps/backend` como Root Directory. O arquivo `render.yaml` também pode ser usado via Blueprint.

Configure `MONGODB_URI` como variável secreta no Render. Nunca coloque a URI real no frontend ou no GitHub.

Na Vercel, configure a variável `EXPO_PUBLIC_API_URL` com:

```text
https://app-temperatura.onrender.com
```

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

## Gerar APK Android

O frontend já está configurado para gerar um APK instalável pelo Expo Application Services (EAS):

```powershell
cd apps/frontend
npx eas-cli login
npm run build:apk
```

O perfil `preview` gera um `.apk` para instalar diretamente no celular. Após o build, o EAS exibirá um link para baixar o arquivo. O perfil `production` gera um `.aab` para publicação na Google Play:

```powershell
npm run build:android
```

O endereço da API do Render já está incluído nos perfis do arquivo [`apps/frontend/eas.json`](apps/frontend/eas.json).

Copie os arquivos `.env.example` para `.env` somente localmente. No GitHub, Vercel e Render, configure as variáveis de ambiente diretamente na plataforma.
# app-temperatura
