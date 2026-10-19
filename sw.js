const ROOT = new URL(
  './',
  self.location.href
);

const PREFIX =
  'creditos-entrada-' +
  encodeURIComponent(ROOT.pathname) +
  '-';

const CACHE = PREFIX + 'v2';

const ARCHIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icono-192.png',
  './icono-512.png'
];

const PERMITIDOS = new Set(
  ARCHIVOS.map(
    ruta => new URL(ruta, ROOT).href
  )
);

self.addEventListener(
  'install',
  evento => {
    evento.waitUntil(
      caches.open(CACHE).then(
        async cache => {
          await cache.addAll([
            './',
            './index.html',
            './manifest.webmanifest'
          ]);

          await Promise.allSettled([
            cache.add('./icono-192.png'),
            cache.add('./icono-512.png')
          ]);
        }
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
      !PERMITIDOS.has(solicitud.url)
    ) {
      return;
    }

    // Guarda únicamente la portada pública.
    // No guarda clientes, pagos ni contraseñas.
    evento.respondWith(
      fetch(solicitud)
        .then(respuesta => {
          if (
            respuesta.ok &&
            respuesta.type === 'basic'
          ) {
            const copia = respuesta.clone();

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
