import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:3000";
const AUTH_COOKIE = __ENV.AUTH_COOKIE || "";
const SCENARIO = __ENV.SCENARIO || "all";

export const options = {
  thresholds: {
    http_req_duration: ["p(95)<800"], // 95% of requests must complete below 800ms
    http_req_failed: ["rate<0.01"],    // Error rate must be less than 1%
  },
  scenarios: {
    smoke: {
      executor: "constant-vus",
      vus: 5,
      duration: "20s",
      exec: "authReadFlow",
      startTime: "0s",
      tags: { test_type: "smoke" },
    },
    vusers_100: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 50 },
        { duration: "1m", target: 100 },
        { duration: "1m", target: 100 },
        { duration: "30s", target: 0 },
      ],
      exec: "authReadFlow",
      startTime: SCENARIO === "smoke" ? "30s" : "0s",
      tags: { test_type: "load_100" },
    },
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
      exec: "authReadFlow",
      startTime: SCENARIO === "1000" ? "0s" : "3m",
      tags: { test_type: "load_1000" },
    },
  },
};

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

export function authReadFlow() {
  const headers = {
    "Accept": "application/json, text/html, */*",
  };

  if (AUTH_COOKIE) {
    headers["Cookie"] = AUTH_COOKIE.startsWith("next-auth.session-token=")
      ? AUTH_COOKIE
      : `next-auth.session-token=${AUTH_COOKIE}`;
  }

  // 1. Gösterge Paneli Sayfası (/dashboard)
  const resDash = http.get(`${BASE_URL}/dashboard`, { headers });
  check(resDash, {
    "dashboard reachable": (r) => [200, 302, 307].includes(r.status),
  });

  sleep(0.5);

  // 2. Satış Ürünleri Listesi API Uç Noktası
  const resProducts = http.get(`${BASE_URL}/api/modules/sales/products`, { headers });
  check(resProducts, {
    "products api responsive": (r) => [200, 401, 403].includes(r.status),
  });

  sleep(0.5);

  // 3. CRM Müşteriler API Uç Noktası
  const resCustomers = http.get(`${BASE_URL}/api/modules/crm/customers`, { headers });
  check(resCustomers, {
    "customers api responsive": (r) => [200, 401, 403].includes(r.status),
  });

  sleep(1);
}
