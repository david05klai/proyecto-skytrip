const WMO = {
  0: ["Despejado", "☀️"],
  1: ["Mayormente despejado", "🌤️"],
  2: ["Parcialmente nublado", "⛅"],
  3: ["Nublado", "☁️"],
  45: ["Niebla", "🌫️"],
  48: ["Niebla con escarcha", "🌫️"],
  51: ["Llovizna ligera", "🌦️"],
  53: ["Llovizna moderada", "🌦️"],
  55: ["Llovizna intensa", "🌧️"],
  56: ["Llovizna helada ligera", "🌧️"],
  57: ["Llovizna helada intensa", "🌧️"],
  61: ["Lluvia ligera", "🌦️"],
  63: ["Lluvia moderada", "🌧️"],
  65: ["Lluvia intensa", "🌧️"],
  66: ["Lluvia helada ligera", "🌧️"],
  67: ["Lluvia helada intensa", "🌧️"],
  71: ["Nieve ligera", "🌨️"],
  73: ["Nieve moderada", "🌨️"],
  75: ["Nieve intensa", "❄️"],
  77: ["Granizo menudo", "🌨️"],
  80: ["Chubascos ligeros", "🌦️"],
  81: ["Chubascos moderados", "🌧️"],
  82: ["Chubascos intensos", "🌧️"],
  85: ["Chubascos de nieve", "🌨️"],
  86: ["Chubascos fuertes de nieve", "❄️"],
  95: ["Tormenta", "⛈️"],
  96: ["Tormenta con granizo ligero", "⛈️"],
  99: ["Tormenta con granizo", "⛈️"]
};

const locations = new WeakMap();

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function setStatus(widget, message, state) {
  const status = widget.querySelector("[data-weather-status]");
  status.textContent = message;
  status.dataset.state = state;
}

function describeWeather(code) {
  return WMO[code] || ["Condición variable", "◌"];
}

function formatTemperature(value) {
  return Number.isFinite(value) ? Math.round(value) + "°C" : "—";
}

function formatLocation(result) {
  return [result.name, result.admin1, result.country]
    .filter((part, index, values) => part && values.indexOf(part) === index)
    .join(", ");
}

function formatForecastDate(date) {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC"
  }).format(new Date(date + "T12:00:00Z"));
}

function formatLocalTime(isoTime, timezone) {
  try {
    return new Intl.DateTimeFormat("es-CO", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone
    }).format(new Date(isoTime));
  } catch {
    return isoTime;
  }
}

function renderWeather(widget, location, weather) {
  const current = widget.querySelector("[data-weather-current]");
  const forecastSection = widget.querySelector("[data-weather-forecast-section]");
  const forecast = widget.querySelector("[data-weather-forecast]");
  const place = widget.querySelector("[data-weather-location]");
  const now = weather.current;
  const daily = weather.daily;
  const condition = describeWeather(now.weather_code);

  place.textContent = "Datos meteorológicos para " + location.label + ".";
  setStatus(widget, "Última actualización local: " + formatLocalTime(now.time, weather.timezone) + ".", "success");

  const summary = makeElement("div", "weather-now");
  summary.append(
    makeElement("p", "weather-now-label", "Ahora en " + location.label),
    makeElement("p", "weather-now-temperature", formatTemperature(now.temperature_2m)),
    makeElement("p", "weather-now-condition", condition[1] + " " + condition[0])
  );

  const metrics = makeElement("div", "weather-metrics");
  const metricRows = [
    ["Viento", Math.round(now.wind_speed_10m) + " km/h"],
    ["Sensación térmica", formatTemperature(now.apparent_temperature)],
    ["Humedad", Math.round(now.relative_humidity_2m) + "%"]
  ];
  for (const [label, value] of metricRows) {
    const row = makeElement("p");
    row.append(makeElement("span", "", label), makeElement("strong", "", value));
    metrics.append(row);
  }

  current.replaceChildren(summary, metrics);
  current.hidden = false;

  forecast.replaceChildren();
  daily.time.forEach((date, index) => {
    const dayCondition = describeWeather(daily.weather_code[index]);
    const item = makeElement("li");
    const iconNode = makeElement("span", "weather-icon", dayCondition[1]);
    iconNode.setAttribute("aria-hidden", "true");
    const rainChance = daily.precipitation_probability_max[index];
    item.append(
      makeElement("p", "weather-day", formatForecastDate(date)),
      iconNode,
      makeElement("p", "weather-forecast-condition", dayCondition[0]),
      makeElement(
        "strong",
        "weather-forecast-temperatures",
        formatTemperature(daily.temperature_2m_min[index]) + " / " + formatTemperature(daily.temperature_2m_max[index])
      ),
      makeElement(
        "small",
        "weather-forecast-rain",
        "Lluvia: " + (Number.isFinite(rainChance) ? Math.round(rainChance) + "%" : "—")
      )
    );
    forecast.append(item);
  });
  forecastSection.hidden = false;
  widget.querySelector("[data-weather-retry]").hidden = true;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.reason || "La consulta no tuvo respuesta.");
    }
    return data;
  } finally {
    window.clearTimeout(timeout);
  }
}

function showError(widget, message) {
  setStatus(widget, message, "error");
  widget.querySelector("[data-weather-retry]").hidden = false;
}

async function loadWeather(widget, location) {
  locations.set(widget, location);
  const current = widget.querySelector("[data-weather-current]");
  const forecastSection = widget.querySelector("[data-weather-forecast-section]");
  const retry = widget.querySelector("[data-weather-retry]");
  current.hidden = true;
  forecastSection.hidden = true;
  retry.hidden = true;
  setStatus(widget, "Cargando el clima actual y el pronóstico…", "loading");

  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    forecast_days: "5",
    timezone: "auto"
  });

  try {
    const weather = await fetchJson("https://api.open-meteo.com/v1/forecast?" + params);
    if (!weather.current || !weather.daily?.time?.length) {
      throw new Error("La respuesta no incluye el pronóstico esperado.");
    }
    renderWeather(widget, location, weather);
  } catch {
    showError(widget, "No se pudo cargar el clima. Revisa tu conexión y vuelve a intentarlo.");
  }
}

async function findLocation(query) {
  const params = new URLSearchParams({
    name: query,
    count: "5",
    language: "es",
    format: "json"
  });
  const data = await fetchJson("https://geocoding-api.open-meteo.com/v1/search?" + params);
  const place = data.results?.[0];
  if (!place || !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) {
    throw new Error("No encontramos esa ciudad. Prueba con el nombre y el país.");
  }
  return {
    latitude: place.latitude,
    longitude: place.longitude,
    label: formatLocation(place)
  };
}

function initializeWeather(widget) {
  const defaultLocation = {
    latitude: Number(widget.dataset.latitude),
    longitude: Number(widget.dataset.longitude),
    label: widget.dataset.locationLabel
  };

  if (!Number.isFinite(defaultLocation.latitude) || !Number.isFinite(defaultLocation.longitude)) {
    setStatus(widget, "Escribe una ciudad para consultar el clima.", "loading");
  } else {
    locations.set(widget, defaultLocation);
    loadWeather(widget, defaultLocation);
  }

  widget.querySelector("[data-weather-retry]").addEventListener("click", () => {
    const location = locations.get(widget);
    if (location) loadWeather(widget, location);
  });

  const form = widget.querySelector("[data-weather-search]");
  const input = form.querySelector("input");
  const button = form.querySelector("[data-weather-search-button]");
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const query = input.value.trim();
    if (!query) {
      input.focus();
      return;
    }

    button.disabled = true;
    button.textContent = "Buscando…";
    setStatus(widget, "Buscando la ciudad…", "loading");
    widget.querySelector("[data-weather-retry]").hidden = true;

    try {
      const location = await findLocation(query);
      await loadWeather(widget, location);
    } catch (error) {
      showError(
        widget,
        error.message || "No se pudo buscar la ciudad. Revisa tu conexión e inténtalo de nuevo."
      );
      widget.querySelector("[data-weather-retry]").hidden = true;
    } finally {
      button.disabled = false;
      button.textContent = "Buscar";
    }
  });
}

document.querySelectorAll("[data-weather-widget]").forEach(initializeWeather);
