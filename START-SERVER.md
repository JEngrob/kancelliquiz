# Start Server

## Hurtig start (Anbefalet)

Start den kombinerede server (frontend + backend på samme port):
```bash
npm start
```

Åbn browseren på `http://localhost:3000`

## Alternativ: Separate servere

Hvis du foretrækker at køre servere separat:

1. **Start Socket.IO Backend Server** (port 3001):
```bash
npm run server
```
Terminal navn: **Socket.IO Backend (3001)**

2. **Start Next.js Frontend Server** (port 3000) - i en ny terminal:
```bash
npm run dev
```
Terminal navn: **Next.js Frontend (3000)**

3. Åbn browseren på `http://localhost:3000`

**Bemærk:** Begge servere skal køre samtidigt for at spillet fungerer, hvis du bruger separate servere.

