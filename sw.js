/* Service worker de YOKAI Onda.
   Guarda en caché lo que casi nunca cambia (fuente, iconos, personajes)
   para que la web cargue casi al instante en visitas repetidas.
   El HTML principal y el CSV del menú (si usas Google Sheets) siempre
   se piden en directo, para que la carta y los precios nunca se queden
   desactualizados.

   Si algún día cambias alguno de estos archivos estáticos (por ejemplo
   subes un icono nuevo con el mismo nombre), sube el número de versión
   de CACHE_NAME de abajo para que los navegadores de tus clientes
   descarguen la versión nueva. */

const CACHE_NAME = "yokai-shell-v1";
const SHELL_ASSETS = [
  "manifest.json",
  "fonts/yakisoba-pan.ttf",
  "img/icon-192.png",
  "img/icon-512.png",
  "img/char-walk.png",
  "img/char-chopstick.png",
  "img/char-ramen.png",
  "img/char-nigiri.png",
  "img/icon-gyoza-order.png",
  "img/icon-maki-order.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .catch(() => {}) // si algo falla al precachear, no rompe la instalación
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // El documento principal (index.html) y cualquier hoja de cálculo externa:
  // siempre en directo, nunca desde caché, para que carta/precios estén al día.
  if(event.request.mode === "navigate" || url.hostname.includes("google")){
    return; // deja pasar la petición normal, sin intervenir
  }

  // Solo intervenimos en peticiones a nuestro propio origen
  if(url.origin !== location.origin) return;

  // Fotos de platos: sirve de caché si existe, y de paso la actualiza en
  // segundo plano (stale-while-revalidate) por si subes fotos nuevas.
  if(url.pathname.includes("/img/") && /\.(jpg|jpeg)$/.test(url.pathname)){
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          const fetchPromise = fetch(event.request).then(res => {
            cache.put(event.request, res.clone());
            return res;
          }).catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Resto de archivos estáticos precacheados: caché primero, red como respaldo.
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
