# SKYTRIP — MANUAL DEL PROGRAMADOR
**Proyecto académico del tercer corte**  
**Equipo:** Andrés Tavorda, Eliver Tiapa y Kleiner Madrid  
**Repositorio:** https://github.com/david05klai/proyecto-skytrip  
**Web:** https://david05klai.github.io/proyecto-skytrip/index.html

## 1. Arquitectura
Aplicación web estática con HTML5 semántico, CSS3 y módulos JavaScript ES. No hay backend, base de datos de servidor, ni compilación. GitHub Pages sirve los archivos de la rama principal y todas las solicitudes a APIs se hacen desde el navegador. Los datos de favoritos e itinerarios se guardan en \`localStorage\`.

Flujo general: HTML + CSS → eventos JavaScript → REST Countries / Open-Meteo → renderizado DOM. En paralelo, los eventos de favoritos y planificador usan \`storage.js\` → \`localStorage\`.

## 2. Organización del código
- \`index.html\`: portada, destacados, galería y buscador internacional.
- \`explorar.html\`: destinos de muestra y explorador dinámico de países.
- \`destino-*.html\`: seis páginas de detalle con widget meteorológico.
- \`favoritos.html\`: lista de favoritos persistentes.
- \`itinerario.html\`: formulario y administración de viajes.
- \`perfil.html\`, \`acerca.html\`: páginas informativas/de muestra.
- \`styles.css\`: diseño visual, maquetación responsive y estados.
- \`assets/js/paises.js\`: API REST Countries, normalización, tarjetas, buscador, filtros y paginación.
- \`assets/js/destino-clima.js\`: geocodificación y predicción de Open-Meteo.
- \`assets/js/storage.js\`: persistencia y operaciones de datos.
- \`assets/js/favoritos.js\`: interacción y sincronización de favoritos.
- \`assets/js/itinerario.js\`: validación, actividades por día y CRUD.
- \`assets/\`: fotografías, logo, audio y fuentes locales.

## 3. Conexión REST Countries
Archivo \`assets/js/paises.js\`.

Endpoint principal:

\`\`\`text
https://restcountries.com/v3.1/all?fields=name,capital,region,subregion,flags,population,languages,cca2,cca3,translations
\`\`\`

La función exportada \`fetchCountries()\` solicita JSON con \`fetch\`, comprueba respuesta y formato, normaliza cada país con \`normalizeCountry(raw)\`, ordena por nombre y conserva un caché en memoria para evitar solicitudes repetidas. Se dispone de fuentes alternativas públicas si falla el endpoint principal. Las funciones \`initExplorarCountries()\` y \`initHomeCountries()\` conectan los controles HTML con la lista de países.

**Bloques importantes:**
- \`normalizeText(text)\`: elimina tildes y convierte a minúscula para buscar sin depender de la ortografía exacta.
- \`createCountryCard(country)\`: genera elementos DOM mediante \`document.createElement\` y asigna los datos recibidos.
- \`applyFilters()\`: combina nombre/capital y región; reinicia el límite de resultados.
- \`renderList()\`: pinta un lote inicial de tarjetas y permite cargar más.

## 4. Conexión Open-Meteo
Archivo \`assets/js/destino-clima.js\`.

Pronóstico:
\`\`\`text
https://api.open-meteo.com/v1/forecast
\`\`\`
Parámetros: \`latitude\`, \`longitude\`, \`current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m\`, \`daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max\`, \`forecast_days=5\`, \`timezone=auto\`.

Búsqueda de ciudades:
\`\`\`text
https://geocoding-api.open-meteo.com/v1/search
\`\`\`
Parámetros: \`name\`, \`count=5\`, \`language=es\`, \`format=json\`.

**Bloques importantes:**
- \`fetchJson(url)\`: solicita JSON y limita la espera con \`AbortController\`; interpreta HTTP y errores del proveedor.
- \`findLocation(query)\`: transforma una ciudad en latitud, longitud y etiqueta.
- \`loadWeather(widget, location)\`: solicita condiciones y pronóstico de acuerdo con las coordenadas.
- \`renderWeather(widget, location, weather)\`: crea tarjetas de clima, métricas y lista diaria.
- \`initializeWeather(widget)\`: conecta botones, búsqueda y estado de carga al elemento con \`data-weather-widget\`.

Las ubicaciones base de las fichas están guardadas como atributos \`data-latitude\`, \`data-longitude\` y \`data-location-label\` en el HTML de cada destino.

## 5. Persistencia del navegador
Archivo \`assets/js/storage.js\`.

Claves exactas:
\`\`\`js
const FAVORITES_KEY = 'skytrip:favorites:v1';
const TRIPS_KEY = 'skytrip:trips:v1';
\`\`\`

Se utiliza \`JSON.parse(localStorage.getItem(key))\` para leer, validando que el valor sea un arreglo, y \`localStorage.setItem(key, JSON.stringify(value))\` para guardar. Los errores de almacenamiento están controlados con \`try/catch\`.

Funciones exportadas:
- \`getFavorites()\`: devuelve IDs válidos de los seis destinos.
- \`setFavorite(id, enabled)\`: usa un \`Set\` para evitar duplicados.
- \`getTrips()\`: lee viajes con identificador.
- \`saveTrip(trip)\`: inserta o reemplaza por ID.
- \`deleteTrip(id)\`: excluye el viaje borrado.

## 6. Favoritos
En \`assets/js/favoritos.js\`, el selector \`[data-favorite]\` identifica botones de guardar/quitar. Las casillas en \`favoritos.html\` se identifican por \`value\`. \`render()\` recupera los IDs, cambia texto y atributo \`aria-pressed\`, oculta tarjetas no elegidas y actualiza el indicador del menú. Se escucha el evento \`storage\` para reflejar modificaciones hechas en otra pestaña.

## 7. Itinerarios
En \`assets/js/itinerario.js\`, el formulario \`#trip-form\` ofrece nombre, fechas, destino, viajeros, presupuesto, moneda, comentarios y actividades diarias. Los días se calculan por diferencia de fechas UTC para evitar errores de cambio horario.

- \`renderDays()\`: crea los campos de actividades para cada día, hasta 60.
- \`renderTrips()\`: dibuja viajes y botones Ver actividades, Editar y Eliminar.
- Evento \`submit\`: usa \`reportValidity()\` y valida fechas, viajeros y presupuesto; persiste con \`saveTrip\`.
- Botón **Editar**: rellena los campos y conserva el ID para actualizar.
- Botón **Eliminar**: pide confirmación y llama \`deleteTrip\`.

No hay sincronización en la nube; cada origen del navegador tiene su propio almacenamiento.

## 8. Dependencias y despliegue
No se requieren paquetes npm para ejecutar la app. Se recomienda abrirla a través de un servidor HTTP local porque utiliza módulos ES:
\`\`\`bash
python -m http.server 8000
\`\`\`
Después abrir \`http://localhost:8000/index.html\`. En producción, GitHub Pages publica \`main\` desde la raíz; los enlaces y rutas de archivos son relativos y compatibles con \`/proyecto-skytrip/\`.

## 9. Pruebas sugeridas antes de entrega
1. Abrir \`explorar.html\` y comprobar que aparece una lista de países.
2. Buscar Colombia y filtrar por América.
3. Visitar \`destino-cartagena.html\` y revisar actual/5 días.
4. Guardar Cartagena como favorito, actualizar y verificar persistencia; eliminarlo.
5. Crear un viaje con fechas válidas y actividades, guardar, editar y eliminar.
6. Probar el menú y la maquetación en móvil.
7. Simular falta de Internet para observar mensajes de error en APIs.
8. Revisar consola del navegador para descartar excepciones.

## 10. Limitaciones deliberadas del proyecto
No integra reservas reales, compra de pasajes, pagos, cuentas, backend ni bases de datos privadas. La pantalla de perfil y el formulario de contacto son demostraciones HTML; no prometen autenticación o envío a un servidor. Los países internacionales mostrados desde REST Countries no se guardan como favoritos: el sistema de favoritos está definido para los seis destinos destacados. El contenido de las APIs cambia con el tiempo.

## 11. Referencias
- REST Countries: https://restcountries.com/
- Open-Meteo Forecast API: https://open-meteo.com/en/docs
- Open-Meteo Geocoding: https://open-meteo.com/en/docs/geocoding-api
- Código de la aplicación: https://github.com/david05klai/proyecto-skytrip
