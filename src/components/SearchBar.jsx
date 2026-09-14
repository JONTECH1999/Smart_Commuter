import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { LoaderCircle, Search, X } from 'lucide-react'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

function SearchBar({ onSelect, placeholder = 'Search for a destination' }) {
	const [query, setQuery] = useState('')
	const [places, setPlaces] = useState([])
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState('')
	const requestSource = useRef(null)

	useEffect(() => {
		const trimmedQuery = query.trim()

		if (trimmedQuery.length < 3) {
			setPlaces([])
			setError('')
			setIsLoading(false)
			return undefined
		}

		const timeoutId = window.setTimeout(async () => {
			requestSource.current?.abort()
			const source = new AbortController()
			requestSource.current = source
			setIsLoading(true)
			setError('')

			try {
				const response = await axios.get(NOMINATIM_URL, {
					signal: source.signal,
					params: {
						addressdetails: 1,
						format: 'jsonv2',
						limit: 5,
						q: trimmedQuery,
					},
					headers: {
						Accept: 'application/json',
					},
				})
				setPlaces(response.data)
			} catch (requestError) {
				if (!source.signal.aborted) {
					setPlaces([])
					setError('Search is unavailable right now.')
				}
			} finally {
				if (!source.signal.aborted) setIsLoading(false)
			}
		}, 350)

		return () => {
			window.clearTimeout(timeoutId)
			requestSource.current?.abort()
		}
	}, [query])

	const clearSearch = () => {
		requestSource.current?.abort()
		setQuery('')
		setPlaces([])
		setError('')
	}

	const selectPlace = (place) => {
		const selectedPlace = {
			latitude: Number(place.lat),
			longitude: Number(place.lon),
			name: place.display_name,
		}
		setQuery(place.display_name)
		setPlaces([])
		onSelect?.(selectedPlace)
	}

	return (
		<div className="relative w-full" role="search">
			<label className="sr-only" htmlFor="destination-search">Destination</label>
						<div className="flex min-h-14 items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 shadow-inner shadow-black/10 transition-all focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-500/10">
						<Search aria-hidden="true" className="shrink-0 text-blue-400" size={21} strokeWidth={2.5} />
				<input
					aria-autocomplete="list"
					aria-controls="destination-results"
					className="min-w-0 flex-1 bg-transparent py-2 text-base font-semibold text-white outline-none placeholder:text-slate-500"
					id="destination-search"
					onChange={(event) => setQuery(event.target.value)}
					placeholder={placeholder}
					role="combobox"
					type="search"
					value={query}
				/>
				{isLoading && <LoaderCircle aria-label="Searching" className="shrink-0 animate-spin text-blue-400" size={21} />}
				{query && !isLoading && (
					<button aria-label="Clear destination search" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/30" onClick={clearSearch} title="Clear search" type="button">
						<X aria-hidden="true" size={21} />
					</button>
				)}
			</div>

			{error && <p className="mt-2 text-xs font-medium text-red-400" role="status">{error}</p>}
			{places.length > 0 && (
				<ul aria-label="Destination search results" className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[1100] max-h-60 overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 p-1 shadow-2xl backdrop-blur-xl" id="destination-results" role="listbox">
					{places.map((place) => (
						<li key={place.place_id} role="option">
							<button className="flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-700 focus:bg-slate-700 focus:outline-none" onClick={() => selectPlace(place)} type="button">
								<span className="text-sm font-semibold text-white line-clamp-1">{place.display_name.split(',')[0]}</span>
								<span className="text-[11px] text-slate-400 line-clamp-1">{place.display_name}</span>
							</button>
						</li>
					))}
				</ul>
			)}

		</div>
	)
}

export default SearchBar

