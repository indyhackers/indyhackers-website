<template>
  <div class="event-map">
    <p v-if="!events.length" class="event-map__empty">No upcoming events match your filters.</p>

    <template v-else>
      <div class="event-map__layout">
        <div
          ref="mapEl"
          class="event-map__canvas"
          role="application"
          aria-label="Map of upcoming event venues"
        ></div>

        <ol v-if="markers.length" class="event-map__legend" aria-label="Events on the map">
          <li v-for="venue in markers" :key="venue.key">
            <!-- The whole row is the trigger, so it has to be a single button:
                 nothing inside it may be separately interactive. The address
                 lives in the popup, and names the button for assistive tech and
                 on hover. Links through to an event live in the popup too. -->
            <button
              type="button"
              class="event-map__legend-item"
              :class="{ 'event-map__legend-item--active': activeKey === venue.key }"
              :title="venue.location"
              :aria-label="`Show ${venue.location} on the map`"
              @click="focusMarker(venue)"
            >
              <span class="event-map__legend-letter" aria-hidden="true">{{ venue.label }}</span>

              <span class="event-map__legend-events">
                <span v-for="event in venue.events" :key="event.id" class="event-map__legend-event">
                  <span class="event-map__legend-title">{{ event.title }}</span>
                  <span class="event-map__legend-when">{{ whenLabel(event) }}</span>
                </span>
              </span>
            </button>
          </li>
        </ol>
      </div>

      <p v-if="!markers.length" class="event-map__note">
        None of these events has a mappable address yet.
      </p>

      <p v-if="pending.length" class="event-map__pending">
        {{ pending.length }}
        {{ pending.length === 1 ? 'event is' : 'events are' }} still being placed on the map.
      </p>

      <div v-if="unmapped.length" class="event-map__unmapped">
        <h3 class="event-map__unmapped-title">Not on the map</h3>
        <p class="event-map__unmapped-sub">
          We couldn't place {{ unmapped.length === 1 ? 'this address' : 'these addresses' }}.
        </p>
        <ul class="event-map__unmapped-list">
          <li v-for="event in unmapped" :key="event.id">
            <RouterLink :to="`/event/${event.id}`">{{ event.title }}</RouterLink>
            <span class="event-map__unmapped-loc">{{ event.location }}</span>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import 'leaflet/dist/leaflet.css'
import { groupByVenue, mapBounds, CENTRAL_INDIANA_BOUNDS } from '@/composables/useEvents'
import { eventScheduleLabel } from '@/recurrence'

// Leaflet reads `window` at import time, which would crash the vite-ssg
// prerender of /calendar. Load it lazily in the browser instead — the map only
// ever exists after mount anyway, and this keeps it out of the initial bundle.
let L = null
async function loadLeaflet() {
  if (!L) L = (await import('leaflet')).default
  return L
}

const props = defineProps({
  events: { type: Array, required: true }
})

// The map always opens on central Indiana rather than on wherever the current
// pins happen to average out — see mapBounds(). This is the centre of that
// region, used for the first paint before any pins exist.
const DEFAULT_CENTER = [
  (CENTRAL_INDIANA_BOUNDS[0][0] + CENTRAL_INDIANA_BOUNDS[1][0]) / 2,
  (CENTRAL_INDIANA_BOUNDS[0][1] + CENTRAL_INDIANA_BOUNDS[1][1]) / 2
]
const DEFAULT_ZOOM = 9

const router = useRouter()
const mapEl = ref(null)
let map = null
let markerLayer = null
// venue key -> Leaflet marker, so the legend can drive the map.
const markerByKey = new Map()
// Which venue's popup is open, used to highlight its legend entry.
const activeKey = ref('')

const grouped = computed(() => groupByVenue(props.events))
const markers = computed(() => grouped.value.markers)
const unmapped = computed(() => grouped.value.unmapped)
// Addresses the geocoder hasn't reached yet — counted rather than listed, since
// there's nothing for anyone to act on.
const pending = computed(() => grouped.value.pending)

// Leaflet's default icon resolves its PNGs against the page URL, which breaks
// under a bundler. A div icon sidesteps that, keeps the pin on-brand, and gives
// us somewhere to put the letter that ties it to the legend.
//
// The label comes from groupByVenue and is a plain A-Z string, so it needs no
// escaping here.
function pinIcon(label) {
  return L.divIcon({
    className: 'event-map__pin-wrap',
    html: `<span class="event-map__pin">${label}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14]
  })
}

function dateLabel(event) {
  const start = new Date(event.start)
  if (Number.isNaN(start.getTime())) return ''
  const date = start.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
  if (event.isAllDay) return `${date} · All day`
  const time = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${date} · ${time}`
}

// A collapsed series stands in for every occurrence at this venue, so its
// cadence says more than the date of the next one. The time comes along because
// this line replaces the date rather than sitting beside one — "Every Sunday at
// 10am". One-off events show their date.
function whenLabel(event) {
  return eventScheduleLabel(event, { withTime: true }) || dateLabel(event)
}

// Popups are built as DOM nodes rather than an HTML string: titles and
// addresses are user-supplied, and textContent escapes them for us. It also
// lets each link route client-side instead of reloading the page.
function popupNode(venue) {
  const root = document.createElement('div')
  root.className = 'event-map__popup'

  const address = document.createElement('p')
  address.className = 'event-map__popup-venue'
  address.textContent = venue.location
  root.appendChild(address)

  const list = document.createElement('ul')
  list.className = 'event-map__popup-list'

  venue.events.forEach((event) => {
    const item = document.createElement('li')
    item.className = 'event-map__popup-item'

    const title = document.createElement('span')
    title.className = 'event-map__popup-title'
    title.textContent = event.title
    item.appendChild(title)

    const when = document.createElement('span')
    when.className = 'event-map__popup-when'
    when.textContent = whenLabel(event)
    item.appendChild(when)

    // The popup is the only route through to an event now that the legend row
    // is a single button, so the way in has to be explicit rather than a
    // clickable title someone has to guess at.
    const to = `/event/${event.id}`
    const link = document.createElement('a')
    link.className = 'event-map__popup-link'
    link.textContent = 'View details →'
    link.href = to
    link.addEventListener('click', (e) => {
      // Leave modified clicks to the browser so "open in new tab" still works.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
      e.preventDefault()
      router.push(to)
    })
    item.appendChild(link)

    list.appendChild(item)
  })

  root.appendChild(list)
  return root
}

function renderMarkers() {
  if (!map) return

  markerLayer.clearLayers()
  markerByKey.clear()
  activeKey.value = ''
  markers.value.forEach((venue) => {
    const marker = L.marker([venue.lat, venue.lng], {
      icon: pinIcon(venue.label),
      title: `${venue.label} — ${venue.location}`,
      alt: `${venue.label} — ${venue.location}`
    })
      .bindPopup(() => popupNode(venue))
      .addTo(markerLayer)

    // Clicking a legend entry has to reach this exact marker.
    markerByKey.set(venue.key, marker)
    marker.on('popupopen', () => {
      activeKey.value = venue.key
    })
    marker.on('popupclose', () => {
      if (activeKey.value === venue.key) activeKey.value = ''
    })
  })

  // Central Indiana, stretched to take in any pins outside it — see mapBounds.
  map.fitBounds(L.latLngBounds(mapBounds(markers.value)), { padding: [30, 30] })
}

async function createMap() {
  if (map || !mapEl.value) return
  await loadLeaflet()
  // The component can unmount while the chunk loads.
  if (map || !mapEl.value) return

  // Scroll-wheel zoom off so the page still scrolls past a full-width map;
  // ctrl/cmd + wheel and the +/- control still zoom.
  map = L.map(mapEl.value, { scrollWheelZoom: false }).setView(DEFAULT_CENTER, DEFAULT_ZOOM)

  // OpenStreetMap tiles need no key, but the licence requires visible
  // attribution — Leaflet renders this into the map's corner.
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map)

  markerLayer = L.layerGroup().addTo(map)
  renderMarkers()
}

onMounted(async () => {
  // The canvas only exists once there are events to show, so wait for the DOM.
  await nextTick()
  await createMap()
})

watch(
  () => props.events,
  async () => {
    await nextTick()
    if (!map) {
      await createMap()
      return
    }
    // The map may have been built while its tab was hidden (zero size), so let
    // Leaflet re-measure before laying tiles out.
    map.invalidateSize()
    renderMarkers()
  }
)

// Legend -> map: centre on the venue and open its popup.
function focusMarker(venue) {
  const marker = markerByKey.get(venue.key)
  if (!map || !marker) return
  map.panTo([venue.lat, venue.lng])
  marker.openPopup()
}

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
    markerLayer = null
  }
  markerByKey.clear()
})
</script>

<style scoped>
.event-map__empty,
.event-map__note,
.event-map__pending {
  padding: 1rem 0;
  color: var(--text-muted);
}

/* Map beside its legend; the legend scrolls independently so the pair keeps a
   fixed height however many venues there are. */
.event-map__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 20rem;
  gap: 1rem;
  align-items: start;
}

.event-map__canvas {
  height: 34rem;
  min-height: 20rem;
  border: 1px solid color-mix(in srgb, var(--border) 12%, transparent);
  border-radius: var(--radius-lg);
  overflow: hidden;
  /* Leaflet panes use z-index in the thousands; contain them so the map can't
     paint over the site header. */
  isolation: isolate;
  z-index: 0;
}

.event-map__legend {
  list-style: none;
  margin: 0;
  padding: 0;
  height: 34rem;
  overflow-y: auto;
  border: 1px solid color-mix(in srgb, var(--border) 12%, transparent);
  border-radius: var(--radius-lg);
  background: var(--surface-1);
}

.event-map__legend-item {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  width: 100%;
  padding: 0.75rem 0.875rem;
  border: none;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 8%, transparent);
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.event-map__legend li:last-child .event-map__legend-item {
  border-bottom: none;
}

.event-map__legend-item:hover,
.event-map__legend-item--active {
  background: var(--surface-hover);
}

/* Matches the map pin, so the pairing reads at a glance. */
.event-map__legend-letter {
  /* The row is the button now; the letter is decoration inside it. */
  pointer-events: none;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--text-primary);
  background: var(--accent-brand);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 700;
  line-height: 1;
  color: var(--text-primary);
  cursor: pointer;
}

.event-map__legend-item--active .event-map__legend-letter {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-brand) 45%, transparent);
}

.event-map__legend-events {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  /* Long titles wrap instead of stretching the row. */
  min-width: 0;
}

.event-map__legend-event {
  display: flex;
  flex-direction: column;
}

.event-map__legend-title {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.35;
  color: var(--text-primary);
}

.event-map__legend-when {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent-deep);
}

.event-map__unmapped {
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid color-mix(in srgb, var(--border) 10%, transparent);
}

.event-map__unmapped-title {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 0.25rem;
}

.event-map__unmapped-sub {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 0 0 0.75rem;
}

.event-map__unmapped-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.event-map__unmapped-list li {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.75rem;
  align-items: baseline;
  font-size: 0.9375rem;
}

.event-map__unmapped-loc {
  font-size: 0.8125rem;
  color: var(--text-muted);
}

/* Below the sidebar breakpoint the main column is too narrow for two panes, so
   the legend drops under the map. */
@media (max-width: 1100px) {
  .event-map__layout {
    grid-template-columns: 1fr;
  }

  .event-map__legend {
    height: auto;
    max-height: 22rem;
  }
}

@media (max-width: 768px) {
  .event-map__canvas {
    height: 24rem;
  }
}
</style>

<style>
/* Pins and popup internals are created imperatively by Leaflet, so they sit
   outside the scoped stylesheet's reach. */
/* A lettered disc rather than a blank teardrop: the letter is what ties the pin
   to its legend entry, and a circle keeps it upright and legible. */
.event-map__pin {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--accent-brand);
  border: 2px solid var(--text-primary);
  box-shadow: var(--shadow-sm);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  color: var(--text-primary);
}

.event-map__popup-venue {
  margin: 0 0 0.5rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.event-map__popup-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.event-map__popup-item {
  display: flex;
  flex-direction: column;
}

.event-map__popup-list > .event-map__popup-item + .event-map__popup-item {
  padding-top: 0.5rem;
  border-top: 1px solid color-mix(in srgb, var(--border) 10%, transparent);
}

.event-map__popup-title {
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.35;
  color: var(--text-primary);
}

/* Scoped under .leaflet-popup-content to outrank Leaflet's own anchor styling,
   which would otherwise render these as default blue links. */
.leaflet-popup-content .event-map__popup-link {
  align-self: flex-start;
  margin-top: 0.25rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--accent-deep);
  text-decoration: none;
}

.leaflet-popup-content .event-map__popup-link:hover {
  text-decoration: underline;
}

.event-map__popup-when {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent-deep);
}
</style>
