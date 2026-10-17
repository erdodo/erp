# ERP Yük ve Performans Testleri (k6)

Bu dizin, sistemin yoğun trafik ve eşzamanlı kullanıcı altındaki davranışını ölçmek için hazırlanmış [k6](https://k6.io/) yük testi senaryolarını içerir.

> ⚠️ **ÖNEMLİ GÜVENLİK UYARISI:** Yük testlerini **ASLA canlı (production) etki alanlarına karşı ÇALIŞTIRMAYIN**. Yalnızca yerel geliştirme veya izole staging/test ortamlarında çalıştırın.

---

## Eşik Değerleri (Thresholds)

Tüm senaryolarda aşağıdaki SLA hedefleri zorunlu tutulmuştur:
- **p95 Gecikme:** İsteklerin %95'i **800 ms** altında tamamlanmalıdır (`http_req_duration: p(95)<800`).
- **Hata Oranı:** Başarısız istek oranı **%1'in altında** olmalıdır (`http_req_failed: rate<0.01`).

---

## Senaryolar

1. **Duman Testi (Smoke):** 5 sanal kullanıcı (VU), 20 saniye. Yerel doğrulama için hızlı duman testi.
2. **100 VU Senaryosu (`vusers_100`):** 100 eşzamanlı sanal kullanıcıya kademeli çıkış (ramp-up), 1 dakika sabit yük ve kademeli iniş.
3. **1000 VU Senaryosu (`vusers_1000`):** 1000 eşzamanlı sanal kullanıcıya kademeli çıkış, 2 dakika zirve yük ve kademeli iniş.

---

## Nasıl Çalıştırılır?

### 1. Ön Koşullar

k6 aracının kurulu olduğundan emin olun:

```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

Uygulamanın çalıştığından emin olun (ör. `http://localhost:3000`).

---

### 2. Halka Açık Akışlar (Public Read Flows)

#### Hızlı Duman Testi (Smoke - 5 VU, 20s):
```bash
k6 run -e BASE_URL=http://localhost:3000 -e SCENARIO=smoke load/public-read.js
```

#### 100 VU Yük Testi:
```bash
k6 run -e BASE_URL=http://localhost:3000 -e SCENARIO=100 load/public-read.js
```

#### 1000 VU Yük Testi:
```bash
k6 run -e BASE_URL=http://localhost:3000 -e SCENARIO=1000 load/public-read.js
```

---

### 3. Kimlik Doğrulamalı Okuma Akışları (Authenticated Read Flows)

Tarayıcıdan veya NextAuth oturumundan alınan `next-auth.session-token` çerezini vererek çalıştırın:

```bash
# Smoke testi:
k6 run -e BASE_URL=http://localhost:3000 -e SCENARIO=smoke -e AUTH_COOKIE="<session-token-value>" load/auth-read.js

# 100 VU:
k6 run -e BASE_URL=http://localhost:3000 -e SCENARIO=100 -e AUTH_COOKIE="<session-token-value>" load/auth-read.js

# 1000 VU:
k6 run -e BASE_URL=http://localhost:3000 -e SCENARIO=1000 -e AUTH_COOKIE="<session-token-value>" load/auth-read.js
```
