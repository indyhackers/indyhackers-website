<template>
  <div v-if="hasPoint" class="event-location-map">
    <div
      ref="mapEl"
      class="event-location-map__canvas"
      role="application"
      :aria-label="`Map showing ${location}`"
    ></div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import 'leaflet/dist/leaflet.css'
import { hasCoordinates } from '@/composables/useEvents'

// Leaflet reads `window` at import time, which would crash the vite-ssg
// prerender. Load it lazily in the browser, as EventMap does.
let L = null
async function loadLeaflet() {
  if (!L) L = (await import('leaflet')).default
  return L
}

const props = defineProps({
  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
  location: { type: String, default: '' }
})

// Wide enough to place the venue in the metro — which side of the city it's on,
// which highways reach it — rather than just naming its street.
const ZOOM = 11

const mapEl = ref(null)
let map = null
let marker = null

// Guards the same 0,0 case the calendar map does: PocketBase reports an unset
// number field as 0, which is a real point in the Atlantic.
const hasPoint = computed(() => hasCoordinates({ lat: props.lat, lng: props.lng }))

function pinIcon() {
  return L.divIcon({
    className: 'event-location-map__pin-wrap',
    html: '<span class="event-location-map__pin"></span>',
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  })
}

async function createMap() {
  if (map || !mapEl.value || !hasPoint.value) return
  await loadLeaflet()
  if (map || !mapEl.value) return

  // Scroll-wheel zoom off so the page still scrolls past the map.
  map = L.map(mapEl.value, { scrollWheelZoom: false }).setView([props.lat, props.lng], ZOOM)

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map)

  marker = L.marker([props.lat, props.lng], {
    icon: pinIcon(),
    title: props.location,
    alt: props.location
  }).addTo(map)
}

// The event loads after mount, so the coordinates arrive as a prop change.
watch(
  () => [props.lat, props.lng],
  async () => {
    await nextTick()
    if (!hasPoint.value) return
    if (!map) {
      await createMap()
      return
    }
    map.invalidateSize()
    map.setView([props.lat, props.lng], ZOOM)
    if (marker) marker.setLatLng([props.lat, props.lng])
  }
)

onMounted(async () => {
  await nextTick()
  await createMap()
})

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
    marker = null
  }
})
</script>

<style scoped>
.event-location-map__canvas {
  height: 16rem;
  border: 1px solid color-mix(in srgb, var(--border) 12%, transparent);
  border-radius: var(--radius-md);
  overflow: hidden;
  /* Leaflet panes use z-index in the thousands; contain them so the map can't
     paint over the site header. */
  isolation: isolate;
  z-index: 0;
}

@media (max-width: 768px) {
  .event-location-map__canvas {
    height: 12rem;
  }
}
</style>

<style>
/* Leaflet builds the marker imperatively, so its pin sits outside the scoped
   stylesheet's reach. */
.event-location-map__pin {
  display: block;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--accent-brand);
  border: 2px solid var(--text-primary);
  box-shadow: var(--shadow-sm);
}
</style>
