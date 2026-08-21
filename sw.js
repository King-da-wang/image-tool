const CACHE_NAME = 'image-tool-v5';
const urlsToCache = [
  './',
  './index.html',
  './sw.js'
];

// 安装阶段：缓存核心文件
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting()) // 强制新 SW 立即激活
  );
});

// 激活阶段：清理旧版本缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // 立即接管页面
  );
});

// 拦截请求阶段：缓存优先，网络兜底
self.addEventListener('fetch', event => {
  // 仅拦截同源 GET 请求
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      // 如果缓存中有，直接返回（实现离线可用，无视网络阻断）
      if (response) {
        return response;
      }
      // 缓存中没有，发起网络请求
      return fetch(event.request).then(networkResponse => {
        // 如果请求失败或不是基本响应，直接返回网络结果
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        // 将成功的网络响应克隆并写入缓存
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});
