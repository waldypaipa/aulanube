# AulaTube

Plataforma de videos educativos estilo YouTube: sube videos, califícalos con estrellas (1–5), comenta, comparte y busca por categoría.

## Ejecutar

```bash
npm install
npm start        # http://localhost:3000
```

Variables opcionales: `PORT` (3000) y `MAX_MB` (500, tamaño máximo por video).

## Funciones
- Subida de videos con barra de progreso, categoría y licencia
- Calificación con estrellas (una por navegador, se puede cambiar)
- Comentarios, contador de vistas, búsqueda y orden por mejor calificados / más vistos
- Compartir (menú nativo del móvil o enlace copiado)
- Botón **Reportar** para avisos de derechos de autor (se guardan en `data/db.json`)
- Modo claro/oscuro y diseño adaptable a móvil

## Derechos de autor
Cada video declara su licencia (obra propia, Creative Commons, dominio público o permiso del autor). La plataforma no incluye filtros automáticos, pero **sí un sistema de reportes** para atender reclamaciones. Ninguna plataforma puede eximir por sí misma el contenido de terceros: revisa la normativa de tu país sobre excepciones educativas y retiro de contenido.

## Despliegue
Necesita un servidor Node con disco persistente (Render, Railway, Fly.io o un VPS). GitHub Pages no sirve porque requiere backend. Para producción considera añadir autenticación y almacenamiento en la nube (S3/Cloudinary).

## Licencia
MIT
