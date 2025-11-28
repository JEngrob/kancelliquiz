# Quiz Game

Et online multiplayer quiz-spil, hvor én vært styrer spillet fra en fællesskærm, mens spillere deltager via deres mobiltelefoner.

## Funktioner

- 🎮 Vært opretter spil og får en spil-kode
- 📱 Spillere joiner med kode og navn
- ❓ Værten skriver spørgsmål med 4 svarmuligheder
- 🎯 Spillere vælger svar (A, B, C eller D)
- 📊 Score tracking og leaderboard
- 🏆 Spiller(e) med højeste score vinder
- 🔒 Omfattende sikkerhedsforanstaltninger
- 🛡️ Rate limiting og DoS beskyttelse

## Teknologi

- **Frontend**: Next.js 14 med TypeScript og Tailwind CSS
- **Backend**: Node.js Express server med Socket.io
- **Real-time**: Socket.io for live kommunikation mellem vært og spillere

## Sikkerhed

Applikationen inkluderer omfattende sikkerhedsforanstaltninger:

- ✅ **Input validering**: Alle inputs valideres og sanitizes
- ✅ **XSS beskyttelse**: Player names sanitizes for at forhindre XSS angreb
- ✅ **Rate limiting**: 100 requests per minut per socket
- ✅ **DoS beskyttelse**: 
  - Max 50 spillere per rum
  - Max 5 rum per socket
- ✅ **CORS**: Restriktiv CORS konfiguration
- ✅ **Security headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection

## Installation

1. Installer dependencies:
```bash
npm install
```

2. Opret `.env.local` fil:
```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_URL=http://localhost:3000
PORT=3001
```

3. Start serveren (i en terminal):
```bash
npm run server
```

4. Start Next.js appen (i en anden terminal):
```bash
npm run dev
```

5. Åbn browseren på `http://localhost:3000`

## Brug

1. **Vært**: Gå til `/host/create` for at oprette et nyt spil
2. **Spillere**: Gå til `/player` og indtast spil-koden og dit navn
3. **Spil**: 
   - Værten starter spillet når spillere er klar
   - Værten skriver et spørgsmål og 4 svarmuligheder
   - Værten vælger det rigtige svar og sender spørgsmålet
   - Spillere vælger deres svar
   - Værten afslører svaret når alle har svaret
   - Point gives til dem der svarede rigtigt
   - Gentag indtil alle runder er færdige!

## Deployment

Applikationen kan deployes til Azure App Service (Free Tier) med automatisk deployment via GitHub Actions.

### Hurtig Start (Automatisk Setup)

**Kør dette script for automatisk setup:**

```powershell
.\scripts\setup-complete.ps1
```

Scriptet opretter automatisk:
- Azure ressourcer (Resource Group, App Service Plan, Web App)
- Environment variables
- Startup command
- Downloader publish profile
- (Valgfrit) Sætter GitHub secrets automatisk

Se [QUICK-START-AZURE.md](QUICK-START-AZURE.md) for komplet guide.

### Manuel Setup

Hvis du foretrækker manuel setup:
1. Følg den detaljerede guide i [AZURE-DEPLOYMENT.md](AZURE-DEPLOYMENT.md)
2. Eller kør Azure setup script: `.\scripts\azure-setup.ps1 -AppName "kancelliquiz-<dit-navn>"`

### Deployment Filer

- `.github/workflows/azure-deploy.yml` - GitHub Actions workflow for automatisk deployment
- `.oryx-build.sh` - Azure Oryx build script
- `AZURE-DEPLOYMENT.md` - Komplet deployment guide med step-by-step instruktioner

### Environment Variables (Production)

```
NODE_ENV=production
NEXT_PUBLIC_URL=https://<din-app>.azurewebsites.net
NEXT_PUBLIC_SOCKET_URL=https://<din-app>.azurewebsites.net
PORT=8080
```

### Free Tier Begrænsninger

- 60 minutter CPU per dag
- 1 GB RAM
- 1 GB storage
- Kan gå i sovemode efter inaktivitet (10-30 sek cold start)

Se [AZURE-DEPLOYMENT.md](AZURE-DEPLOYMENT.md) for komplette instruktioner og troubleshooting.

## Projektstruktur

```
/
├── server/           # Socket.io backend server
│   ├── index.ts      # Socket events og server setup
│   ├── types.ts      # TypeScript interfaces
│   ├── roomManager.ts # Rum håndtering
│   ├── gameLogic.ts  # Quiz spil logik
│   └── security.ts   # Sikkerhed og rate limiting
├── app/              # Next.js app router pages
│   ├── page.tsx      # Forside
│   ├── host/         # Vært sider
│   └── player/       # Spiller side
├── components/       # React komponenter
├── hooks/            # Custom React hooks
└── package.json
```

## Udvikling

- `npm run dev` - Start Next.js development server
- `npm run server` - Start Socket.io server
- `npm run build` - Build til production
- `npm run start` - Start production server
