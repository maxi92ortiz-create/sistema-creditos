const ROOT = new URL(
  './',
  self.location.href
);

const PREFIX =
  'creditos-entrada-' +
  encodeURIComponent(ROOT.pathname) +
  '-';

const CACHE = PREFIX + 'v1';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icono-192.png',
  './icono-512.png'
];

const ALLOWED = new Set(
  SHELL.map(
    ruta => new URL(ruta, ROOT).href
  )
);

self.addEventListener(
  'install',
  evento => {
    evento.waitUntil(
      caches.open(CACHE).then(
        cache => cache.addAll(SHELL)
      )
    );
  }
);

self.addEventListener(
  'activate',
  evento => {
    evento.waitUntil(
      caches.keys()
        .then(claves =>
          Promise.all(
            claves
              .filter(clave =>
                clave.startsWith(PREFIX) &&
                clave !== CACHE
              )
              .map(
                clave => caches.delete(clave)
              )
          )
        )
        .then(
          () => self.clients.claim()
        )
    );
  }
);

self.addEventListener(
  'fetch',
  evento => {
    const solicitud = evento.request;

    if (
      solicitud.method !== 'GET' ||
      !ALLOWED.has(solicitud.url)
    ) {
      return;
    }

    // Solo se guarda la portada pública.
    // No se guardan clientes, pagos ni sesiones.
    evento.respondWith(
      fetch(solicitud)
        .then(respuesta => {
          if (
            respuesta.ok &&
            respuesta.type === 'basic'
          ) {
            const copia =
              respuesta.clone();

            evento.waitUntil(
              caches.open(CACHE).then(
                cache =>
                  cache.put(
                    solicitud,
                    copia
                  )
              )
            );
          }

          return respuesta;
        })
        .catch(async () => {
          const cache =
            await caches.open(CACHE);

          const guardada =
            await cache.match(solicitud);

          if (guardada) {
            return guardada;
          }

          if (
            solicitud.mode === 'navigate'
          ) {
            const inicio =
              await cache.match(
                new URL('./', ROOT).href
              );

            if (inicio) {
              return inicio;
            }
          }

          return Response.error();
        })
    );
  }
);
