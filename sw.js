/* あとどけい Service Worker
   デプロイのたびに VERSION を上げること（上げないと古い画面が残る） */
const VERSION = "atodokei-v1";
const SHELL = [
  "./", "./index.html", "./manifest.json",
  "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    // 1つ失敗しても全体を巻き込まないよう個別に取得
    await Promise.all(SHELL.map(u => c.add(u).catch(() => {})));
    await c.add("./chime.mp3").catch(() => {});   // 音源は任意
    self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  // Google Fonts など外部リソース：キャッシュ優先＋裏で更新
  if (new URL(req.url).origin !== location.origin) {
    e.respondWith((async () => {
      const c = await caches.open(VERSION + "-ext");
      const hit = await c.match(req);
      const net = fetch(req).then(res => { c.put(req, res.clone()).catch(() => {}); return res; })
                            .catch(() => hit);
      return hit || net;
    })());
    return;
  }

  // 自前のファイル：キャッシュ優先、無ければ取得してキャッシュ
  e.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    try {
      const res = await fetch(req);
      const c = await caches.open(VERSION);
      c.put(req, res.clone()).catch(() => {});
      return res;
    } catch (_) {
      return caches.match("./index.html");
    }
  })());
});
