# Dodo Labs ERP

Modern, modüler ve çok kiracılı (multi-tenant) kurumsal kaynak planlama (ERP) platformu.

## Hızlı Başlangıç

```bash
# Bağımlılıkları yükleyin
npm install

# Ortam değişkenlerini hazırlayın
cp .env.example .env

# Veritabanı şemasını uygulayın
npx prisma generate
npx prisma db push

# Geliştirme sunucusunu başlatın
npm run dev
```

[http://localhost:3000](http://localhost:3000) adresinden erişebilirsiniz.

---

## Dağıtık Hız Sınırlama (Shared Rate Limiting) & Redis

Sistemde oturum açma, kayıt olma ve hassas API uç noktalarında kaba kuvvet (brute-force) ve spam saldırılarına karşı hız sınırlama mekanizması bulunur:

- `REDIS_URL` tanımlandığında: Dağıtık ortamda (`ioredis` üzerinden atomik `INCR + EXPIRE` Lua scripti ile) tüm sunucu/container örnekleri arasında paylaşımlı olarak çalışır.
- `REDIS_URL` tanımlı olmadığında veya Redis geçici olarak çöktüğünde: Sistem kesintiye uğramaz; bir uyarı satırı loglayarak (`[RateLimit] ...`) otomatik olarak bellek-içi (in-memory sliding window) korumaya döner (fail-open).

### Ortam Değişkeni

```bash
REDIS_URL="redis://localhost:6379"
# Parolalı örnek:
# REDIS_URL="redis://:supersecret@redis-service:6379/0"
```

---

## Docker & Coolify Kurulumu

### Docker Compose ile Çalıştırma

Projeyi Postgres ve Redis ile birlikte ayağa kaldırmak için:

```bash
docker compose up -d
```

### Coolify Notları

1. **Redis Servisi Ekleme:**
   - Coolify kontrol panelinde projenize **Service -> Redis** ekleyin (veya Docker Compose şablonunu kullanın).
   - Redis portunu dahili ağda (internal network) 6379 olarak bırakın.
2. **Uygulama Ortam Değişkenleri:**
   - Uygulama ayarlarında `REDIS_URL` değişkenine Coolify dahili servis adresini verin:
     `REDIS_URL=redis://<redis-service-name>:6379` (ör. `redis://redis:6379`).
3. **Sağlık Kontrolü & Süreklilik:**
   - Redis kapalı olsa dahi uygulama bellek-içi koruma ile çalışmaya devam eder (fail-open).

---

## Testler

Birim ve hız sınırlayıcı testlerini çalıştırmak için:

```bash
npm test
```
