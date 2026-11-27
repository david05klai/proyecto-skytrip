/**
 * Módulo de Exploración de Destinos y Países (REST Countries API)
 * Autor: Andrés Tavorda
 * SkyTrip - Exploración internacional en tiempo real
 */

const REST_COUNTRIES_API = 'https://restcountries.com/v3.1/all?fields=name,capital,region,subregion,flags,population,languages,cca2,cca3,translations';
const FALLBACK_API_JSDELIVR = 'https://cdn.jsdelivr.net/gh/mledoze/countries@master/countries.json';
const FALLBACK_API_GITHUB = 'https://raw.githubusercontent.com/mledoze/countries/master/countries.json';

const REGION_LABELS = {
  Americas: 'América',
  Europe: 'Europa',
  Asia: 'Asia',
  Africa: 'África',
  Oceania: 'Oceanía',
  Antarctic: 'Antártida'
};

let cachedCountries = null;
let isLoading = false;

function normalizeText(text) {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Normaliza la información de un país proveniente de REST Countries o de los mirrors de respaldo.
 */
function normalizeCountry(raw) {
  const commonName = raw.name?.common || (typeof raw.name === 'string' ? raw.name : 'País');
  const officialName = raw.name?.official || '';
  const spaName = raw.translations?.spa?.common || raw.name?.native?.spa?.common || commonName;
  const spaOfficial = raw.translations?.spa?.official || '';
  const code = (raw.cca2 || raw.cca3 || '').toUpperCase();
  
  // Bandera: preferir SVG o PNG de REST Countries / FlagCDN
  let flagUrl = raw.flags?.svg || raw.flags?.png;
  if (!flagUrl && code) {
    flagUrl = `https://flagcdn.com/w320/${code.toLowerCase()}.png`;
  }
  const flagEmoji = raw.flag || '';

  // Capitales
  let capital = 'No disponible';
  if (Array.isArray(raw.capital) && raw.capital.length > 0) {
    capital = raw.capital.filter(Boolean).join(', ');
  } else if (typeof raw.capital === 'string' && raw.capital.trim()) {
    capital = raw.capital;
  }

  // Región y subregión
  const rawRegion = raw.region || 'Sin clasificar';
  const regionLabel = REGION_LABELS[rawRegion] || rawRegion;
  const subregion = raw.subregion || '';

  // Idiomas
  let languages = '';
  if (raw.languages && typeof raw.languages === 'object') {
    languages = Object.values(raw.languages).slice(0, 3).join(', ');
  }

  // Población y Área
  let populationFormatted = '';
  if (typeof raw.population === 'number' && raw.population > 0) {
    populationFormatted = new Intl.NumberFormat('es-CO').format(raw.population);
  }

  let areaFormatted = '';
  if (typeof raw.area === 'number' && raw.area > 0) {
    areaFormatted = `${new Intl.NumberFormat('es-CO').format(raw.area)} km²`;
  }

  return {
    raw,
    code,
    name: commonName,
    officialName,
    spaName,
    spaOfficial,
    displayName: spaName || commonName,
    flagUrl,
    flagEmoji,
    capital,
    region: rawRegion,
    regionLabel,
    subregion,
    languages,
    population: raw.population || 0,
    populationFormatted,
    areaFormatted,
    searchCorpus: normalizeText([
      commonName,
      officialName,
      spaName,
      spaOfficial,
      capital,
      code,
      rawRegion,
      regionLabel,
      subregion
    ].join(' '))
  };
}

/**
 * Obtiene la lista completa de países conectando con REST Countries con resiliencia ante fallos.
 */
export async function fetchCountries() {
  if (cachedCountries && cachedCountries.length > 0) {
    return cachedCountries;
  }

  const endpoints = [
    REST_COUNTRIES_API,
    FALLBACK_API_JSDELIVR,
    FALLBACK_API_GITHUB
  ];

  let lastError = null;

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      // Validar si la respuesta es un array válido de países
      if (Array.isArray(data) && data.length > 0 && (data[0].name || data[0].cca2)) {
        cachedCountries = data.map(normalizeCountry).sort((a, b) => a.displayName.localeCompare(b.displayName, 'es'));
        return cachedCountries;
      }

      // Si REST Countries devolvió el aviso de deprecación v5 con data wrapper
      if (data && Array.isArray(data.data) && data.data.length > 0) {
        cachedCountries = data.data.map(normalizeCountry).sort((a, b) => a.displayName.localeCompare(b.displayName, 'es'));
        return cachedCountries;
      }

      throw new Error('Formato de datos no reconocido');
    } catch (err) {
      lastError = err;
      // Probar siguiente endpoint
    }
  }

  throw lastError || new Error('No se pudo establecer conexión con los servicios de REST Countries.');
}

/**
 * Crea el elemento DOM para una tarjeta de país.
 */
function createCountryCard(country) {
  const card = document.createElement('article');
  card.className = 'destination-card country-card';
  card.dataset.region = country.region;
  card.dataset.code = country.code;

  const imageWrap = document.createElement('div');
  imageWrap.className = 'card-image country-flag-wrap';

  if (country.flagUrl) {
    const img = document.createElement('img');
    img.src = country.flagUrl;
    img.alt = `Bandera de ${country.displayName}`;
    img.loading = 'lazy';
    img.width = 320;
    img.height = 180;
    img.onerror = () => {
      // Reemplazo si la imagen falla
      if (country.code) {
        img.onerror = null;
        img.src = `https://flagcdn.com/w320/${country.code.toLowerCase()}.png`;
      }
    };
    imageWrap.appendChild(img);
  } else {
    const emojiSpan = document.createElement('span');
    emojiSpan.className = 'country-flag-emoji';
    emojiSpan.textContent = country.flagEmoji || '🏳️';
    imageWrap.appendChild(emojiSpan);
  }

  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.textContent = country.regionLabel;
  imageWrap.appendChild(badge);

  const body = document.createElement('div');
  body.className = 'card-body';

  const location = document.createElement('p');
  location.className = 'location';
  location.textContent = country.subregion || country.regionLabel;

  const title = document.createElement('h3');
  title.textContent = country.displayName;
  if (country.name !== country.displayName) {
    const sub = document.createElement('small');
    sub.className = 'country-native-name';
    sub.textContent = ` (${country.name})`;
    title.appendChild(sub);
  }

  const infoList = document.createElement('dl');
  infoList.className = 'country-info-dl';

  const dtCap = document.createElement('dt');
  dtCap.textContent = 'Capital:';
  const ddCap = document.createElement('dd');
  ddCap.textContent = country.capital;

  const dtReg = document.createElement('dt');
  dtReg.textContent = 'Región:';
  const ddReg = document.createElement('dd');
  ddReg.textContent = `${country.regionLabel}${country.subregion ? ` · ${country.subregion}` : ''}`;

  infoList.append(dtCap, ddCap, dtReg, ddReg);

  if (country.populationFormatted) {
    const dtPop = document.createElement('dt');
    dtPop.textContent = 'Población:';
    const ddPop = document.createElement('dd');
    ddPop.textContent = `${country.populationFormatted} hab.`;
    infoList.append(dtPop, ddPop);
  } else if (country.areaFormatted) {
    const dtArea = document.createElement('dt');
    dtArea.textContent = 'Área:';
    const ddArea = document.createElement('dd');
    ddArea.textContent = country.areaFormatted;
    infoList.append(dtArea, ddArea);
  }

  if (country.languages) {
    const dtLang = document.createElement('dt');
    dtLang.textContent = 'Idiomas:';
    const ddLang = document.createElement('dd');
    ddLang.textContent = country.languages;
    infoList.append(dtLang, ddLang);
  }

  const wikiLink = document.createElement('a');
  wikiLink.className = 'text-link country-link';
  wikiLink.href = `https://es.wikipedia.org/wiki/${encodeURIComponent(country.spaName || country.name)}`;
  wikiLink.target = '_blank';
  wikiLink.rel = 'noopener noreferrer';
  wikiLink.innerHTML = 'Conoce más en Wikipedia <span class="arrow">↗</span>';

  const detail = document.createElement('a');
  detail.className = 'button small';
  detail.href = `pais-detalle.html?code=${encodeURIComponent(country.code)}`;
  detail.textContent = 'Ver ficha y clima ↗';
  body.append(location, title, infoList, detail, wikiLink);
  card.append(imageWrap, body);
  return card;
}

/**
 * Inicializa la sección de exploración de países en explorar.html
 */
export function initExplorarCountries() {
  const container = document.querySelector('#countries-section');
  if (!container) return;

  const grid = container.querySelector('#countries-grid');
  const searchInput = container.querySelector('#country-search');
  const clearBtn = container.querySelector('#country-search-clear');
  const statusEl = container.querySelector('#countries-status');
  const regionRadios = container.querySelectorAll('input[name="region-filter"]');
  const loadMoreBtn = container.querySelector('#countries-load-more');

  if (!grid || !searchInput || !statusEl) return;

  let allCountries = [];
  let filteredCountries = [];
  let visibleCount = 18;
  const BATCH_SIZE = 18;
  let currentRegion = 'all';
  let currentQuery = '';

  function setStatusMessage(msg, isError = false) {
    statusEl.textContent = msg;
    statusEl.classList.toggle('status-error', isError);
  }

  function renderList() {
    grid.replaceChildren();

    if (filteredCountries.length === 0) {
      const emptyBox = document.createElement('div');
      emptyBox.className = 'empty-countries-state';
      emptyBox.innerHTML = `
        <span class="empty-icon">🌍</span>
        <h3>No se encontraron países</h3>
        <p>No encontramos ningún resultado para "<strong>${escapeHtml(currentQuery)}</strong>"${currentRegion !== 'all' ? ` en la región de ${REGION_LABELS[currentRegion] || currentRegion}` : ''}.</p>
        <button type="button" class="button small secondary" id="reset-filter-btn">Restablecer filtros</button>
      `;
      grid.appendChild(emptyBox);
      const resetBtn = emptyBox.querySelector('#reset-filter-btn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          searchInput.value = '';
          currentQuery = '';
          if (clearBtn) clearBtn.hidden = true;
          const allRadio = container.querySelector('#region-all');
          if (allRadio) allRadio.checked = true;
          currentRegion = 'all';
          applyFilters();
        });
      }
      if (loadMoreBtn) loadMoreBtn.hidden = true;
      return;
    }

    const toShow = filteredCountries.slice(0, visibleCount);
    const fragment = document.createDocumentFragment();
    toShow.forEach(country => {
      fragment.appendChild(createCountryCard(country));
    });
    grid.appendChild(fragment);

    // Control del botón "Cargar más"
    if (loadMoreBtn) {
      if (visibleCount < filteredCountries.length) {
        const remaining = filteredCountries.length - visibleCount;
        loadMoreBtn.hidden = false;
        loadMoreBtn.textContent = `Mostrar más países (${remaining} restantes) ▾`;
      } else {
        loadMoreBtn.hidden = true;
      }
    }
  }

  function applyFilters() {
    const q = normalizeText(currentQuery);
    filteredCountries = allCountries.filter(country => {
      // Filtro de región
      if (currentRegion !== 'all' && country.region !== currentRegion) {
        return false;
      }
      // Filtro de búsqueda
      if (q && !country.searchCorpus.includes(q)) {
        return false;
      }
      return true;
    });

    visibleCount = BATCH_SIZE;

    // Actualizar mensaje de estado
    const count = filteredCountries.length;
    let label = `${count} ${count === 1 ? 'país encontrado' : 'países encontrados'}`;
    if (currentRegion !== 'all') {
      label += ` en ${REGION_LABELS[currentRegion] || currentRegion}`;
    }
    if (q) {
      label += ` para "${currentQuery}"`;
    }
    setStatusMessage(label);

    renderList();
  }

  // Eventos de búsqueda con debounce
  let debounceTimer = null;
  searchInput.addEventListener('input', () => {
    currentQuery = searchInput.value;
    if (clearBtn) clearBtn.hidden = !currentQuery;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      applyFilters();
    }, 200);
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      currentQuery = '';
      clearBtn.hidden = true;
      searchInput.focus();
      applyFilters();
    });
  }

  // Eventos de cambio de región
  regionRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        currentRegion = radio.value;
        applyFilters();
      }
    });
  });

  // Botón cargar más
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      visibleCount += BATCH_SIZE;
      renderList();
    });
  }

  // Carga inicial de datos
  setStatusMessage('Conectando con REST Countries y cargando información...');
  fetchCountries()
    .then(data => {
      allCountries = data;
      applyFilters();
    })
    .catch(err => {
      setStatusMessage('No se pudo cargar la información de REST Countries. Revisa tu conexión a internet.', true);
      const errorBox = document.createElement('div');
      errorBox.className = 'empty-countries-state';
      errorBox.innerHTML = `
        <span class="empty-icon">⚠️</span>
        <h3>Error de conexión con la API</h3>
        <p>No pudimos cargar los países desde los servidores de REST Countries.</p>
        <button type="button" class="button small" id="retry-fetch-btn">Reintentar conexión ↻</button>
      `;
      grid.replaceChildren(errorBox);
      const retryBtn = errorBox.querySelector('#retry-fetch-btn');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          initExplorarCountries();
        });
      }
    });
}

/**
 * Inicializa el buscador interactivo de países en index.html
 */
export function initHomeCountries() {
  const container = document.querySelector('#home-countries');
  if (!container) return;

  const grid = container.querySelector('#home-countries-grid');
  const searchInput = container.querySelector('#home-country-search');
  const statusEl = container.querySelector('#home-countries-status');
  const quickFilters = container.querySelectorAll('.home-region-btn');

  if (!grid || !searchInput) return;

  let allCountries = [];
  let selectedRegion = 'all';

  function renderFeatured(list) {
    grid.replaceChildren();
    const items = list.slice(0, 6);
    if (items.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'subtle';
      empty.textContent = 'No se encontraron países para esta búsqueda.';
      grid.appendChild(empty);
      return;
    }
    const fragment = document.createDocumentFragment();
    items.forEach(country => {
      fragment.appendChild(createCountryCard(country));
    });
    grid.appendChild(fragment);
  }

  function filterHome() {
    const q = normalizeText(searchInput.value);
    const filtered = allCountries.filter(c => {
      if (selectedRegion !== 'all' && c.region !== selectedRegion) return false;
      if (q && !c.searchCorpus.includes(q)) return false;
      return true;
    });

    if (statusEl) {
      statusEl.textContent = `Mostrando ${Math.min(filtered.length, 6)} de ${filtered.length} países disponibles.`;
    }

    renderFeatured(filtered);
  }

  let timer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(filterHome, 200);
  });

  quickFilters.forEach(btn => {
    btn.addEventListener('click', () => {
      quickFilters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedRegion = btn.dataset.region || 'all';
      filterHome();
    });
  });

  if (statusEl) statusEl.textContent = 'Consultando países en REST Countries...';

  fetchCountries()
    .then(data => {
      allCountries = data;
      // Mostrar algunos países populares destacados de distintos continentes por defecto
      const sampleCodes = ['CO', 'JP', 'FR', 'CA', 'EG', 'AU'];
      const initial = allCountries.filter(c => sampleCodes.includes(c.code));
      if (statusEl) {
        statusEl.textContent = `Conectado con REST Countries (${allCountries.length} países cargados).`;
      }
      renderFeatured(initial.length === 6 ? initial : allCountries.slice(0, 6));
    })
    .catch(() => {
      if (statusEl) {
        statusEl.textContent = 'No se pudo conectar con REST Countries en este momento.';
      }
    });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Inicialización automática cuando el DOM esté listo en el navegador
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initExplorarCountries();
      initHomeCountries();
    });
  } else {
    initExplorarCountries();
    initHomeCountries();
  }
}
