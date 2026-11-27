const title = document.querySelector('#country-title');
const status = document.querySelector('#country-status');
const weatherStatus = document.querySelector('#weather-status');
const code = new URLSearchParams(location.search).get('code')?.toUpperCase();
const field = (name, value) => {
  const dl = document.querySelector('#country-meta');
  const dt = document.createElement('dt'), dd = document.createElement('dd');
  dt.textContent = name; dd.textContent = value || 'No disponible'; dl.append(dt, dd);
};
async function request(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try { const response = await fetch(url, { signal: controller.signal }); if (!response.ok) throw new Error('HTTP ' + response.status); return await response.json(); }
  finally { clearTimeout(timer); }
}
async function main() {
  if (!/^[A-Z]{2}$/.test(code || '')) { status.textContent = 'Código de país inválido.'; weatherStatus.textContent = ''; return; }
  try {
    const [country] = await request('https://restcountries.com/v3.1/alpha/' + code + '?fields=name,capital,region,subregion,population,languages,currencies,flags,latlng,capitalInfo,translations');
    const data = country || {};
    const name = data.translations?.spa?.common || data.name?.common || code;
    title.textContent = name; document.title = name + ' · SkyTrip';
    status.textContent = 'Información obtenida de REST Countries.';
    const flag = document.querySelector('#country-flag');
    if (data.flags?.svg || data.flags?.png) { flag.src = data.flags.svg || data.flags.png; flag.alt = 'Bandera de ' + name; flag.hidden = false; }
    field('Capital', data.capital?.join(', ')); field('Región', data.region);
    field('Subregión', data.subregion); field('Población', new Intl.NumberFormat('es-CO').format(data.population || 0));
    field('Idiomas', Object.values(data.languages || {}).join(', '));
    field('Monedas', Object.values(data.currencies || {}).map(c => c.name).join(', '));
    const coords = data.capitalInfo?.latlng?.length === 2 ? data.capitalInfo.latlng : data.latlng;
    if (!coords || coords.length !== 2) { weatherStatus.textContent = 'No hay coordenadas disponibles.'; return; }
    const query = new URLSearchParams({latitude: coords[0], longitude: coords[1], current:'temperature_2m,weather_code,wind_speed_10m', daily:'temperature_2m_max,temperature_2m_min,precipitation_probability_max', forecast_days:'5', timezone:'auto'});
    try {
      const weather = await request('https://api.open-meteo.com/v1/forecast?' + query);
      weatherStatus.textContent = 'Clima para ' + (data.capital?.[0] || name) + ' · ' + weather.current.time;
      document.querySelector('#weather-current').textContent = 'Ahora: ' + Math.round(weather.current.temperature_2m) + ' °C · Viento: ' + Math.round(weather.current.wind_speed_10m) + ' km/h';
      const ul = document.querySelector('#forecast');
      weather.daily.time.forEach((day, i) => { const li = document.createElement('li'); li.textContent = day + ': ' + Math.round(weather.daily.temperature_2m_min[i]) + '–' + Math.round(weather.daily.temperature_2m_max[i]) + ' °C · Lluvia ' + (weather.daily.precipitation_probability_max[i] ?? '—') + '%'; ul.append(li); });
    } catch { weatherStatus.textContent = 'No se pudo consultar el clima. Inténtalo más tarde.'; }
    document.querySelector('#plan-country').href = 'itinerario.html?destino=' + encodeURIComponent(name);
  } catch { title.textContent = 'No se pudo cargar el país'; status.textContent = 'Revisa la conexión y vuelve a abrir el destino.'; weatherStatus.textContent = ''; }
}
main();