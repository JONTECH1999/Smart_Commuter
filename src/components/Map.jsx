import { useEffect, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import axios from 'axios'
import L from 'leaflet'
import { LocateFixed, MapPin, Minus, Navigation, Plus, Store } from 'lucide-react'
import {
	Circle,
	MapContainer,
	Marker,
	Popup,
	TileLayer,
	useMap,
	useMapEvents,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const MANILA_CENTER = [14.5995, 120.9842]
const DEFAULT_WAKE_DISTANCE = 1000
const DEFAULT_ALERT_DISTANCE = 200
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

function toLatLng(position) {
	if (Array.isArray(position) && position.length >= 2) {
		return [Number(position[0]), Number(position[1])]
	}
	if (position && position.lat !== undefined && position.lng !== undefined) {
		return [Number(position.lat), Number(position.lng)]
	}
	return null
}

function isValidLatLng(position) {
	return Boolean(
		position &&
			Number.isFinite(position[0]) &&
			Number.isFinite(position[1]) &&
			position[0] >= -90 &&
			position[0] <= 90 &&
			position[1] >= -180 &&
			position[1] <= 180,
	)
}

function createMarkerIcon({ background, icon: Icon, label }) {
	return L.divIcon({
		className: 'para-po-marker',
		html: `<span aria-label="${label}" class="flex h-14 w-14 items-center justify-center rounded-full border-4 border-white shadow-[0_3px_10px_rgba(0,0,0,0.35)]" style="background-color:${background}">${renderToStaticMarkup(<Icon aria-hidden="true" color="white" size={30} strokeWidth={3} />)}</span>`,
		iconAnchor: [28, 28],
		iconSize: [56, 56],
	})
}

const userIcon = createMarkerIcon({
	background: '#075985',
	icon: LocateFixed,
	label: 'Your current location',
})

const destinationIcon = createMarkerIcon({
	background: '#b91c1c',
	icon: MapPin,
	label: 'Destination',
})

const poiIcon = createMarkerIcon({
	background: '#047857',
	icon: Store,
	label: 'Nearby place',
})

function MapControls({ onLocate }) {
	const map = useMap()
	const buttonClass = 'flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-600/80 bg-slate-950/90 text-white shadow-xl transition-all hover:border-blue-400 hover:bg-slate-900 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-400/40'

	return (
		<div className="absolute right-4 top-4 z-[1000] flex flex-col gap-2">
				<button aria-label="Zoom in" className={buttonClass} onClick={() => map.zoomIn()} title="Zoom in" type="button"><Plus size={23} strokeWidth={2.5} /></button>
				<button aria-label="Zoom out" className={buttonClass} onClick={() => map.zoomOut()} title="Zoom out" type="button"><Minus size={23} strokeWidth={2.5} /></button>
				<button aria-label="Center map on your location" className={`${buttonClass} border-blue-400/80 bg-blue-600 text-white hover:bg-blue-500`} onClick={onLocate} title="Center on my location" type="button"><Navigation size={21} fill="currentColor" /></button>
		</div>
	)
}


function MapViewport({ currentPosition, destinationPosition }) {
	const map = useMap()

	useEffect(() => {
		if (isValidLatLng(currentPosition)) map.setView(currentPosition, Math.max(map.getZoom(), 14), { animate: true })
	}, [currentPosition, map])

	useEffect(() => {
		if (isValidLatLng(destinationPosition)) map.setView(destinationPosition, Math.max(map.getZoom(), 14), { animate: false })
	}, [destinationPosition, map])

	useEffect(() => {
		map.invalidateSize()
	}, [map])

	return null
}

function InteractiveMapLayer({ onPlaceSelect }) {
	const map = useMapEvents({
		click: async (event) => {
			try {
				const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
					params: {
						format: 'jsonv2',
						lat: event.latlng.lat,
						lon: event.latlng.lng,
					},
					headers: { Accept: 'application/json' },
				})
				onPlaceSelect?.({
					latitude: event.latlng.lat,
					longitude: event.latlng.lng,
					name: response.data.display_name || 'Selected map location',
				})
			} catch {
				onPlaceSelect?.({
					latitude: event.latlng.lat,
					longitude: event.latlng.lng,
					name: 'Selected map location',
				})
			}
		},
	})

	useEffect(() => {
		map.getContainer().setAttribute('aria-label', 'Interactive map. Click anywhere to choose a destination.')
	}, [map])

	return null
}

function NearbyPlacesLayer({ onPlaceSelect }) {
	const [places, setPlaces] = useState([])
	const [isLoading, setIsLoading] = useState(false)
	const map = useMap()

	useEffect(() => {
		let cancelled = false
		const center = map.getCenter()
		const query = `[out:json][timeout:10];(nwr[shop](around:1200,${center.lat},${center.lng});nwr[amenity~"cafe|restaurant|pharmacy|bank"](around:1200,${center.lat},${center.lng}););out center tags;`

		setIsLoading(true)
		axios.post(OVERPASS_URL, query, { headers: { 'Content-Type': 'text/plain' } })
			.then((response) => {
				if (!cancelled) setPlaces(response.data.elements || [])
			})
			.catch(() => {
				if (!cancelled) setPlaces([])
			})
			.finally(() => {
				if (!cancelled) setIsLoading(false)
			})

		return () => {
			cancelled = true
		}
	}, [map])

	useMapEvents({
		moveend: () => {
			const center = map.getCenter()
			const query = `[out:json][timeout:10];(nwr[shop](around:1200,${center.lat},${center.lng});nwr[amenity~"cafe|restaurant|pharmacy|bank"](around:1200,${center.lat},${center.lng}););out center tags;`
			axios.post(OVERPASS_URL, query, { headers: { 'Content-Type': 'text/plain' } })
				.then((response) => setPlaces(response.data.elements || []))
				.catch(() => setPlaces([]))
		},
	})

	return (
		<>
			{places.slice(0, 80).map((place) => {
				const latitude = place.lat ?? place.center?.lat
				const longitude = place.lon ?? place.center?.lon
				if (latitude === undefined || longitude === undefined) return null
				const name = place.tags?.name || 'Unnamed nearby place'
				const category = place.tags?.shop || place.tags?.amenity || 'place'
				return (
					<Marker
						icon={poiIcon}
						key={`${place.type}-${place.id}`}
						position={[latitude, longitude]}
					>
						<Popup>
							<strong>{name}</strong>
							<br />
							<span className="capitalize">{category}</span>
							<br />
							<button
								className="mt-2 rounded-md bg-blue-700 px-3 py-2 text-sm font-bold text-white"
								onClick={() => onPlaceSelect?.({ latitude: Number(latitude), longitude: Number(longitude), name })}
								type="button"
							>
								Set as destination
							</button>
						</Popup>
					</Marker>
				)
			})}
			{isLoading && <div className="pointer-events-none absolute left-4 top-4 z-[1000] rounded-lg bg-slate-900/90 px-3 py-2 text-xs font-bold text-white shadow-lg">Loading nearby places...</div>}
		</>
	)
}

function Map({ alertDistance = DEFAULT_ALERT_DISTANCE, currentPosition, destination, onLocate, onPlaceSelect, wakeDistance = DEFAULT_WAKE_DISTANCE }) {
	const userPosition = toLatLng(currentPosition)
	const destinationPosition = toLatLng(destination)
	const hasUserPosition = isValidLatLng(userPosition)
	const hasDestination = isValidLatLng(destinationPosition)
	const center = hasUserPosition ? userPosition : MANILA_CENTER
	const wakeRadius = Number(wakeDistance) || DEFAULT_WAKE_DISTANCE
	const alertRadius = Number(alertDistance) || DEFAULT_ALERT_DISTANCE
	const locateUser = () => hasUserPosition && onLocate?.(userPosition)

	return (
		<section aria-label="Commuter map" className="relative h-full min-h-[350px] w-full overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800 shadow-lg md:min-h-full">
			<div className="relative h-full min-h-[350px] w-full overflow-hidden rounded-2xl">
			<MapContainer center={center} className="h-full min-h-[350px] w-full" scrollWheelZoom zoom={13}>
				<TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
				{hasUserPosition && <Marker icon={userIcon} position={userPosition}><Popup><strong>Your location</strong></Popup></Marker>}
				{hasDestination && <>
					<Circle center={destinationPosition} pathOptions={{ color: '#1d4ed8', fillColor: '#facc15', fillOpacity: 0.16, weight: 5 }} radius={wakeRadius}><Popup><strong>Wake zone</strong><br />Wake distance: {wakeRadius} m</Popup></Circle>
					<Circle center={destinationPosition} pathOptions={{ color: '#1e40af', fillColor: '#2563eb', fillOpacity: 0.2, weight: 5 }} radius={alertRadius}><Popup><strong>Alert zone</strong><br />Alert distance: {alertRadius} m</Popup></Circle>
					<Marker icon={destinationIcon} position={destinationPosition}><Popup><strong>{destination?.name || 'Destination'}</strong></Popup></Marker>
				</>}
				<MapViewport currentPosition={userPosition} destinationPosition={destinationPosition} />
				<InteractiveMapLayer onPlaceSelect={onPlaceSelect} />
				<NearbyPlacesLayer onPlaceSelect={onPlaceSelect} />
				<MapControls onLocate={locateUser} />
			</MapContainer>
						<div className="pointer-events-none absolute bottom-4 left-4 z-[1000] overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900/90 p-3 text-left shadow-2xl backdrop-blur-md">
				<div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Map Legend</div>
				<div className="flex flex-col gap-2">
					<div className="flex items-center gap-2 text-xs font-bold text-white"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-blue-400/40 ring-1 ring-blue-400" />Wake Zone</div>
					<div className="flex items-center gap-2 text-xs font-bold text-white"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-blue-600 ring-1 ring-white/20" />Alert Zone</div>
				</div>
			</div>

			</div>
		</section>
	)
}

export default Map

