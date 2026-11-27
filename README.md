# Proyecto SkyTrip

Aplicación académica frontend en HTML5, CSS3 y JavaScript ES Modules con integración REST Countries y Open-Meteo, favoritos persistentes e itinerarios almacenados en localStorage.

## Autores
Andrés Tavorda, Eliver Tiapa y Kleiner Madrid.

## Propuesta
Centralizar información de destinos, transporte, alojamiento y actividades para comparar alternativas y organizar itinerarios según preferencias y presupuesto. Público: viajeros frecuentes, familias, parejas, estudiantes, grupos y viajeros con distintos presupuestos.

## Pantallas del documento
- Inicio: propuesta de valor, destinos destacados y acceso a planificación.
- Explorar destinos: catálogo y filtros por categoría con CSS.
- Detalle: información del destino, clima, lugares y recomendaciones en bloques desplegables HTML.
- Favoritos: selección temporal de destinos en la misma página con casillas y CSS.
- Mi itinerario: formulario de fechas, destino, presupuesto y preferencias, ejemplo de ruta y estado de viajes guardados.
- Perfil: datos y preferencias mediante un formulario de muestra.
- Acerca de: descripción, misión, visión, alcance y equipo.

Se mantienen galería de seis imágenes, video y audio HTML5, contacto, efectos hover y diseño responsive.

## Alcance de esta etapa
El sitio combina una base responsive en HTML5 y CSS con módulos JavaScript ES Modules para funcionalidades interactivas del lado del cliente:
- **Clima en vivo:** Consulta de condiciones actuales y pronóstico de 5 días con la API de Open-Meteo en las fichas de detalle.
- **Exploración de países y API REST Countries:** Conexión en vivo con REST Countries para consultar información internacional en tiempo real con banderas oficiales, capitales y continentes, integrando búsqueda por nombre y filtros funcionales por región en `explorar.html` e `index.html`.
- **Favoritos persistentes (`localStorage`):** Posibilidad de agregar o quitar destinos favoritos desde las tarjetas principales y páginas de detalle, persistiendo la selección en el navegador a través de `assets/js/storage.js` y reflejándose en `favoritos.html` y badges de navegación.
- **Planificación de itinerarios completa:**
  - Formulario de creación de viaje con validación estricta de fechas, límite de 60 días, número de viajeros y presupuesto estimado con formateo de moneda (`Intl.NumberFormat`).
  - Generación dinámica de actividades por día con fecha calculada.
  - Gestión completa de viajes (CRUD): guardar en `localStorage`, consultar historial en el panel lateral, editar viajes existentes (con opción de cancelar edición) y eliminar viajes con confirmación.
  - Diseño responsive optimizado sin necesidad de frameworks ni dependencias externas.

## Módulos JavaScript
- `assets/js/storage.js`: Capa de persistencia en `localStorage` para favoritos y viajes guardados con validación de esquema.
- `assets/js/favoritos.js`: Control interactivo de botones de favoritos, badges en menú y sincronización reactiva de estado (`storage` event).
- `assets/js/itinerario.js`: Lógica del planificador de viajes, cálculo de días, validación, edición y persistencia.
- `assets/js/destino-clima.js`: Integración de pronóstico meteorológico con Open-Meteo.
- `assets/js/paises.js`: Conexión con REST Countries, visualización dinámica con banderas, capitales y regiones, buscador y filtros.

## Abrir y publicar
Abrir index.html en un navegador moderno. No requiere instalación ni compilación. GitHub Pages publica la rama main desde la raíz.

Web: https://david05klai.github.io/proyecto-skytrip/
Repositorio: https://github.com/david05klai/proyecto-skytrip

## Recursos
Logo original extraído sin modificaciones de la página 2 del PDF del proyecto. Fotografías de Unsplash, identificadas en assets/SOURCES.md. Video de muestra: Big Buck Bunny, Blender Foundation, CC BY 3.0. Audio: composición instrumental original. Video de sustentación enlazado desde el PDF.

## Diseño y movimiento
Cabecera con emblema transparente, menú móvil nativo con details/summary, tipografías locales y composición responsive. Incluye entradas escalonadas, movimiento suave de la imagen principal, hover en botones y tarjetas y revelado al desplazarse cuando el navegador admite animation-timeline. Todas las animaciones son CSS y respetan prefers-reduced-motion. La aplicación incorpora módulos JavaScript para las funciones dinámicas.
