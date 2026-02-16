# Nasadenie Social Manager (Hostinger / VPS)

Aplikácia je SvelteKit s **adapter-node**: build vytvorí Node.js server v priečinku `build/`. Na hostingu spúšťaš tento server (pripadne za reverse proxy).

## 1. Požiadavky na server

- **Node.js 18+** (odporúčaná LTS)
- Na Hostinger: **VPS** alebo **Node.js Web App** (ak je v tvojom pláne)

## 2. Build lokálne alebo na serveri

```bash
# Inštalácia závislostí
npm ci

# Build (výstup do build/)
npm run build
```

## 3. Premenné prostredia (production)

Vytvor na serveri súbor `.env` (alebo nastav premenné v paneli Hostinger) s **reálnymi** hodnotami:

| Premenná | Povinné | Popis |
|----------|---------|--------|
| `DATABASE_URL` | Áno | SQLite: `file:./data/social-manager.db` (cesta relatívna k `process.cwd()`) |
| `BETTER_AUTH_SECRET` | Áno | Tajný kľúč; vygeneruj: `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Áno | Verejná URL aplikácie, napr. `https://tvoja-domena.sk` |
| `PORT` | Nie | Port, na ktorom beží Node (default 3000). Na Hostinger Node.js app sa často nastavuje automaticky. |

Príklad `.env` na serveri:

```env
DATABASE_URL=file:./data/social-manager.db
BETTER_AUTH_SECRET=tvoj_vygenerovany_secret_base64
BETTER_AUTH_URL=https://tvoja-domena.sk
# PORT=3000
```

Dôležité: **BETTER_AUTH_URL** musí byť presne tá URL, pod ktorou používatelia aplikáciu otvárajú (vrátane https). Inak nebude fungovať prihlásenie.

## 4. Priečinky na serveri

- **data/** – tu bude SQLite databáza a uploady (médiá). Priečinok musí existovať a server musí mať práva zápisu.
- **data/media/** – ukladajú sa sem nahraté obrázky.

Pred prvým spustením:

```bash
mkdir -p data data/media
```

## 5. Spustenie aplikácie

**Spustenie priamo (na test):**

```bash
npm run start
# alebo: node build/index.js
```

Server beží na porte z `PORT` alebo 3000. Otvor v prehliadači `http://tvoja-ip:3000` alebo `https://tvoja-domena.sk` (ak máš pred serverom reverse proxy).

**Produkcia (odporúčané): PM2**

Na VPS (napr. Hostinger VPS) môžeš použiť PM2, aby aplikácia bežala stále a po reštarte servera sa znova spustila:

```bash
npm install -g pm2
# Spustenie (z koreňa projektu, kde je build/ a .env)
pm2 start build/index.js --name social-manager
pm2 save
pm2 startup   # inštrukcie pre auto-start po boote
```

## 6. Hostinger konkrétne

- **Node.js Web App (ak je k dispozícii):** V paneli vytvor Node.js aplikáciu, nastav root na priečinok projektu, **Start command**: `node build/index.js` (alebo `npm run start`). Premenné nastav v sekcii „Environment variables” (BETTER_AUTH_SECRET, BETTER_AUTH_URL, DATABASE_URL). Uisti sa, že build sa spúšťa (napr. build step: `npm ci && npm run build`).
- **VPS:** Nahraj projekt (git clone alebo upload), `npm ci && npm run build`, vytvor `data/` a `data/media/`, nastav `.env`, spusti cez PM2 ako vyššie. Pred Node server môžeš dať **nginx** ako reverse proxy (SSL, proxy na `http://127.0.0.1:3000`).

## 7. Reverse proxy (nginx) – príklad

Ak beží Node na porte 3000 a pred ním máš nginx:

```nginx
server {
    listen 80;
    server_name tvoja-domena.sk;
    # presmerovanie na HTTPS (ak máš cert)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Po nasadení nastav **BETTER_AUTH_URL** na `https://tvoja-domena.sk` (alebo `http://...` ak ešte nemáš SSL).

## 8. Kontrolný zoznam

- [ ] Node.js 18+ na serveri
- [ ] `npm ci && npm run build`
- [ ] `.env` s `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`
- [ ] Priečinky `data/` a `data/media/` existujú a majú zápis
- [ ] Spustenie: `npm run start` alebo PM2
- [ ] Ak je reverse proxy/SSL: `BETTER_AUTH_URL` zodpovedá verejnej URL

Potom by aplikácia mala bežať a prihlásenie (Better Auth) fungovať pod tvojou doménou.
