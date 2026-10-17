import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:3000";
const SCENARIO = __ENV.SCENARIO || "all";

export const options = {
  thresholds: {
    http_req_duration: ["p(95)<800"], // 95% of requests must complete below 800ms
    http_req_failed: ["rate<0.01"],    // Error rate must be less than 1%
  },
  scenarios: {
    // 5 VU duman (smoke) testi — yerel testler için
    smoke: {
      executor: "constant-vus",
      vus: 5,
      duration: "20s",
      exec: "publicRoutes",
      startTime: "0s",
      tags: { test_type: "smoke" },
    },
    // 100 VU Senaryosu: 100 eşzamanlı sanal kullanıcı
    vusers_100: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 50 },
        { duration: "1m", target: 100 },
        { duration: "1m", target: 100 },
        { duration: "30s", target: 0 },
      ],
      exec: "publicRoutes",
      startTime: SCENARIO === "smoke" ? "30s" : "0s",
      tags: { test_type: "load_100" },
    },
    // 1000 VU Senaryosu: 1000 eşzamanlı sanal kullanıcı
    vusers_1000: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 250 },
        { duration: "1m", target: 500 },
        { duration: "2m", target: 1000 },
        { duration: "1m", target: 1000 },
        { duration: "1m", target: 0 },
      ],
      exec: "publicRoutes",
      startTime: SCENARIO === "1000" ? "0s" : "3m",
      tags: { test_type: "load_1000" },
    },
  },
};

// Yalnızca belirli bir senaryo çalıştırılmak istendiğinde k6 filtrelemesi
if (SCENARIO === "smoke") {
  delete options.scenarios.vusers_100;
  delete options.scenarios.vusers_1000;
} else if (SCENARIO === "100") {
  delete options.scenarios.smoke;
  delete options.scenarios.vusers_1000;
  options.scenarios.vusers_100.startTime = "0s";
} else if (SCENARIO === "1000") {
  delete options.scenarios.smoke;
  delete options.scenarios.vusers_100;
  options.scenarios.vusers_1000.startTime = "0s";
}

export function publicRoutes() {
  // 1. Giriş Sayfası (/login)
  const resLogin = http.get(`${BASE_URL}/login`);
  check(resLogin, {
    "login status 200": (r) => r.status === 200,
  });

  sleep(0.5);

  // 2. Kayıt Sayfası (/register)
  const resRegister = http.get(`${BASE_URL}/register`);
  check(resRegister, {
    "register status 200": (r) => r.status === 200,
  });

  sleep(0.5);

  // 3. Kök Yönlendirme (/)
  const resRoot = http.get(`${BASE_URL}/`, { redirects: 0 });
  check(resRoot, {
    "root status 200 or 302/307": (r) => [200, 301, 302, 307, 308].includes(r.status),
  });

  sleep(1);
}
