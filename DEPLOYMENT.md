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

---

## 9. Docker + Traefik: 404 / aplikácia nebeží

Ak pri Docker deployi dostávaš **404** na `https://post.dvadsatjeden.org`:

### A) Overenie, či aplikácia vôbec odpovedá

Na serveri (v `/opt/posthorn` alebo kde beží Docker):

```bash
# Kontajner beží a je healthy?
docker ps

# Logy aplikácie (chyby pri štarte, DB, env)
docker logs posthorn_prod --tail 100

# Odpovedá app vo vnútri kontajnera? (mal by vrátiť "OK")
docker exec posthorn_prod wget -qO- http://localhost:3000/health
```

Ak `docker exec ... /health` vráti `OK`, aplikácia beží a 404 ide od **Traefiku** (smerovanie). Ak `/health` zlyhá alebo kontajner padá, rieš chyby v logoch (DATABASE_URL, BETTER_AUTH_SECRET, práva na `data/`).

### B) Traefik musí byť na rovnakej sieti ako Posthorn

Kontajner `posthorn_prod` je v sieti `passbolt_default`. **Traefik musí byť tiež v sieti `passbolt_default`**, inak neuvidí backend a vráti 404 (alebo 502).

```bash
# V akých sieťach je posthorn
docker inspect posthorn_prod --format '{{json .NetworkSettings.Networks}}'

# Názov Traefik kontajnera zistiš podľa svojho setupu, potom:
docker inspect <traefik_container> --format '{{json .NetworkSettings.Networks}}'
```

Ak Traefik beží v inej sieti (napr. `traefik_default`, `web`), v `docker-compose.yml` zmeň:

```yaml
networks:
  - passbolt_default   # ← zmeň na názov siete, kde beží Traefik
```

a v sekcii `networks:` pridaj túto sieť ako `external: true` (ak už existuje).

### C) Názvy Traefik entrypointov

V `docker-compose.yml` sú nastavené entrypointy **web** (HTTP) a **websecure** (HTTPS). Ak tvoj Traefik používa iné názvy (napr. `http` a `https`), treba zmeniť labely:

- `traefik.http.routers.posthorn-https.entrypoints=websecure` → zmeň na svoj HTTPS entrypoint
- `traefik.http.routers.posthorn-http.entrypoints=web` → zmeň na svoj HTTP entrypoint

Názvy entrypointov sú v Traefik konfigurácii (napr. `--entrypoints.web.address=:80` a `--entrypoints.websecure.address=:443`).

### D) Registrácia vracia 500

Ak `POST /api/auth/sign-up/email` vráti **500**, často chýba tabuľka **app_settings** v produkčnej DB (používa sa pre „Allow public registration“). Registrácia je upravená tak, aby nepadala ani bez tejto tabuľky, ale aby admin mohol prepínať registráciu v UI, treba tabuľku doplniť.

Na serveri (tam, kde je DB, napr. v volume Posthorn):

```bash
cd /opt/posthorn
# Ak máš prístup k DB súboru (napr. v Docker volume), spusti migráciu alebo:
docker exec posthorn_prod node -e "
const Database = require('better-sqlite3');
const path = require('path');
const dbPath = process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/^file:\/\//,'').replace(/^file:/,'') : '/app/data/social-manager.db';
const db = new Database(dbPath.startsWith('/') ? dbPath : path.join('/app', dbPath));
db.exec(\"CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)\");
console.log('ok');
"
```

Jednoduchšie: ak na serveri máš `npm run db:push` (a DATABASE_URL smeruje na rovnakú DB ako kontajner), spusti tam raz `npm run db:push` a potom znova deploy.

### E) 504 na iných službách (napr. satflux.io)

**504 Gateway Timeout** znamená, že reverse proxy (Traefik) nedostal včas odpoveď od backendu. Možné príčiny:

- backend (SatFlux alebo iná služba) nebeží alebo padol,
- backend je príliš pomalý alebo timeout v Traefik je príliš krátky,
- sieť medzi Traefikom a backendom (napr. iný server / kontajner) je roztrhnutá alebo firewall blokuje.

Riešenie: skontrolovať logy a stav kontajnera/služby pre danú doménu, overiť, že sieť a timeouty sú v poriadku.

---

## 10. SSL (HTTPS) za Traefikom

Posthorn má v labele `traefik.http.routers.posthorn-https.tls.certresolver=letsencrypt`. Aby Traefik vystavil certifikát, musí mať **certresolver `letsencrypt`** nakonfigurovaný v **statickej konfigurácii Traefiku** (nie v labele služby).

### Čo skontrolovať v Traefik (passbolt-traefik alebo tvoj Traefik compose)

1. **ACME (Let's Encrypt)** – v konfigurácii Traefiku musí byť niečo v tomto zmysle (príklad pre súbor alebo command):

   **Súbor (napr. `traefik.yml` alebo `static.yml`):**
   ```yaml
   certificatesResolvers:
     letsencrypt:
       acme:
         email: tvoj@email.com
         storage: /letsencrypt/acme.json
         httpChallenge:
           entryPoint: web
   ```

   **Alebo pri spustení (docker run / compose command):**
   ```text
   --certificatesresolvers.letsencrypt.acme.email=tvoj@email.com
   --certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json
   --certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web
   ```

2. **Úložisko certifikátov** – adresár `/letsencrypt` (alebo iný) musí byť v Traefik kontajneri namountovaný ako volume, aby `acme.json` prežil reštarty.

3. **Port 80** – pre HTTP-01 challenge musí byť na serveri otvorený port **80** a Traefik musí mať entrypoint `web` na :80. (SatFlux a iné služby to už používajú.)

4. **DNS** – `post.dvadsatjeden.org` musí smerovať (A záznam) na IP servera, kde beží Traefik.

### Rýchla kontrola

- Traefik logy: `docker logs passbolt-traefik-1 2>&1 | grep -i acme` (prípadne iný názov Traefik kontajnera)
- Ak máš prístup do Traefik dashboardu, v sekcii HTTPS / Certificates skontroluj, či sa objavil certifikát pre `post.dvadsatjeden.org`.

Ak je `letsencrypt` resolver v Traefiku nastavený rovnako ako pre satflux.io, Posthorn by mal dostať certifikát automaticky po prvom HTTPS požiadavke. Ak nie, v logoch Traefiku hľadaj chyby od ACME (napr. „unable to get certificate“).
