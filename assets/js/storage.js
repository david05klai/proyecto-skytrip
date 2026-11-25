const FAVORITES_KEY = 'skytrip:favorites:v1';
const TRIPS_KEY = 'skytrip:trips:v1';

export const destinations = {
  cartagena: 'Cartagena', alpes: 'Alpes', londres: 'Londres',
  bali: 'Bali', bosque: 'Escapada al bosque', desierto: 'Ruta por el desierto'
};

function read(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function getFavorites() {
  return read(FAVORITES_KEY, []).filter(id => Object.hasOwn(destinations, id));
}

export function setFavorite(id, enabled) {
  if (!Object.hasOwn(destinations, id)) return false;
  const favorites = new Set(getFavorites());
  if (enabled) favorites.add(id);
  else favorites.delete(id);
  return write(FAVORITES_KEY, [...favorites]);
}

export function getTrips() {
  return read(TRIPS_KEY, []).filter(trip => trip && typeof trip.id === 'string');
}

export function saveTrip(trip) {
  const trips = getTrips();
  const index = trips.findIndex(item => item.id === trip.id);
  if (index < 0) trips.push(trip);
  else trips[index] = trip;
  return write(TRIPS_KEY, trips);
}

export function deleteTrip(id) {
  return write(TRIPS_KEY, getTrips().filter(trip => trip.id !== id));
}
