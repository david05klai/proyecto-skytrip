import { getTrips, saveTrip, deleteTrip } from './storage.js';

const form = document.querySelector('#trip-form');
const list = document.querySelector('#saved-trips');
const days = document.querySelector('#trip-days');
const message = document.querySelector('#trip-message');
const cancelBtn = document.querySelector('#cancel-edit');
const start = form.elements.inicio;
const end = form.elements.fin;
const requestedDestination = new URLSearchParams(location.search).get('destino');
if (requestedDestination && requestedDestination.length <= 100) {
  const option = document.createElement('option');
  option.value = requestedDestination;
  option.textContent = requestedDestination;
  form.elements.destino.append(option);
  form.elements.destino.value = requestedDestination;
}
let editingId = null;
let draftActivities = [];

function dateAtUTC(value) { return Date.parse(`${value}T00:00:00Z`); }
function showMessage(value) { message.textContent = value; message.hidden = false; }

function formatBudget(amount, currency) {
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency || 'COP',
      maximumFractionDigits: 0
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function formatDuration(startVal, endVal) {
  const diff = Math.round((dateAtUTC(endVal) - dateAtUTC(startVal)) / 86400000) + 1;
  return `${diff} día${diff > 1 ? 's' : ''}`;
}

function cancelEditing() {
  editingId = null;
  draftActivities = [];
  form.reset();
  days.replaceChildren();
  form.querySelector('[type=submit]').textContent = 'Guardar viaje ↗';
  if (cancelBtn) cancelBtn.hidden = true;
  showMessage('Edición cancelada.');
}

if (cancelBtn) {
  cancelBtn.addEventListener('click', cancelEditing);
}

function renderDays() {
  days.replaceChildren();
  if (!start.value || !end.value || dateAtUTC(end.value) < dateAtUTC(start.value)) return;
  const count = Math.round((dateAtUTC(end.value) - dateAtUTC(start.value)) / 86400000) + 1;
  if (count > 60) {
    showMessage('El itinerario puede tener hasta 60 días. Ajusta las fechas.');
    return;
  }
  draftActivities = Array.from({ length: count }, (_, i) => draftActivities[i] || '');
  draftActivities.length = count;
  draftActivities.forEach((value, index) => {
    const label = document.createElement('label');
    label.textContent = `Día ${index + 1} · ${new Date(dateAtUTC(start.value) + index * 86400000).toLocaleDateString('es-CO', { timeZone: 'UTC', day: 'numeric', month: 'short' })}`;
    const textarea = document.createElement('textarea');
    textarea.rows = 2;
    textarea.maxLength = 500;
    textarea.placeholder = 'Una actividad por línea';
    textarea.value = value;
    textarea.addEventListener('input', () => { draftActivities[index] = textarea.value; });
    label.append(textarea);
    days.append(label);
  });
}

function renderTrips() {
  list.replaceChildren();
  const trips = getTrips();
  if (!trips.length) { list.textContent = 'Todavía no tienes viajes guardados.'; return; }
  trips.forEach(trip => {
    const article = document.createElement('article');
    article.className = 'saved-trip';
    const title = document.createElement('h3');
    title.textContent = trip.name;
    const summary = document.createElement('p');
    summary.textContent = `${trip.destination} · ${trip.start} al ${trip.end} (${formatDuration(trip.start, trip.end)}) · ${trip.travelers} viajero(s) · ${formatBudget(trip.budget, trip.currency)}`;
    const details = document.createElement('details');
    const heading = document.createElement('summary');
    heading.textContent = 'Ver actividades';
    details.append(heading);
    (trip.activities || []).forEach((activity, index) => {
      const p = document.createElement('p');
      p.textContent = `Día ${index + 1}: ${activity || 'Sin actividades'}`;
      details.append(p);
    });
    const edit = document.createElement('button');
    edit.type = 'button'; edit.textContent = 'Editar';
    edit.addEventListener('click', () => {
      editingId = trip.id;
      form.elements.viaje.value = trip.name;
      start.value = trip.start;
      end.value = trip.end;
      if (![...form.elements.destino.options].some(option => option.value === trip.destination)) {
        form.elements.destino.add(new Option(trip.destination, trip.destination));
      }
      form.elements.destino.value = trip.destination;
      form.elements.viajeros.value = trip.travelers;
      form.elements.presupuesto.value = trip.budget;
      form.elements.moneda.value = trip.currency;
      form.elements.preferencias.value = trip.notes || '';
      draftActivities = [...(trip.activities || [])];
      renderDays();
      form.querySelector('[type=submit]').textContent = 'Guardar cambios ↗';
      if (cancelBtn) cancelBtn.hidden = false;
      form.scrollIntoView({ behavior: 'smooth' });
    });
    const remove = document.createElement('button');
    remove.type = 'button'; remove.textContent = 'Eliminar';
    remove.addEventListener('click', () => {
      if (!confirm(`¿Eliminar el viaje «${trip.name}»?`)) return;
      if (deleteTrip(trip.id)) { renderTrips(); showMessage('Viaje eliminado.'); }
      else showMessage('No se pudo eliminar el viaje.');
    });
    article.append(title, summary, details, edit, remove);
    list.append(article);
  });
}

start.addEventListener('change', () => { draftActivities = []; end.min = start.value; renderDays(); });
end.addEventListener('change', () => { renderDays(); });
form.addEventListener('submit', event => {
  event.preventDefault();
  const startTime = dateAtUTC(start.value), endTime = dateAtUTC(end.value);
  const travelers = Number(form.elements.viajeros.value);
  const budget = Number(form.elements.presupuesto.value);
  if (!form.reportValidity()) return;
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime || (endTime - startTime) / 86400000 >= 60) {
    showMessage('Revisa las fechas: el regreso debe ser igual o posterior al inicio y el viaje puede durar hasta 60 días.'); return;
  }
  if (!Number.isInteger(travelers) || travelers < 1 || !Number.isFinite(budget) || budget <= 0) {
    showMessage('Indica al menos un viajero y un presupuesto mayor que cero.'); return;
  }
  const trip = {
    id: editingId || crypto.randomUUID(), name: form.elements.viaje.value.trim(),
    start: start.value, end: end.value, destination: form.elements.destino.value,
    travelers, budget, currency: form.elements.moneda.value,
    notes: form.elements.preferencias.value.trim(), activities: [...draftActivities]
  };
  if (!trip.name || !saveTrip(trip)) { showMessage('No se pudo guardar el viaje en este navegador.'); return; }
  editingId = null; draftActivities = []; form.reset(); days.replaceChildren();
  if (cancelBtn) cancelBtn.hidden = true;
  form.querySelector('[type=submit]').textContent = 'Guardar viaje ↗';
  renderTrips(); showMessage('Viaje guardado correctamente.');
});

window.addEventListener('storage', renderTrips);
renderTrips();
