const EARTH_RADIUS_METERS = 6_371_000

export const POLLING_INTERVALS_MS = Object.freeze({
	monitoring: 120_000,
	approaching: 10_000,
	nearDestination: 3_000,
})

/**
 * Calculates the shortest distance between two latitude/longitude points.
 * @returns {number} Distance in meters.
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
	const toRadians = (degrees) => (degrees * Math.PI) / 180
	const latitudeDelta = toRadians(lat2 - lat1)
	const longitudeDelta = toRadians(lon2 - lon1)
	const firstLatitude = toRadians(lat1)
	const secondLatitude = toRadians(lat2)

	const haversine =
		Math.sin(latitudeDelta / 2) ** 2 +
		Math.cos(firstLatitude) *
			Math.cos(secondLatitude) *
			Math.sin(longitudeDelta / 2) ** 2

	return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

/**
 * Resolves the tracking state and the next location polling interval.
 * Intervals are milliseconds and can be passed directly to setInterval.
 */
export function getSystemState(distance, wakeDistance, alertDistance, isTrackingOn) {
	if (!isTrackingOn) {
		return { title: 'Tracking Off', pollingIntervalMs: null }
	}

	if (distance <= alertDistance) {
		return { title: 'Near Destination', pollingIntervalMs: POLLING_INTERVALS_MS.nearDestination }
	}

	if (distance <= wakeDistance) {
		return { title: 'Approaching', pollingIntervalMs: POLLING_INTERVALS_MS.approaching }
	}

	return { title: 'Monitoring', pollingIntervalMs: POLLING_INTERVALS_MS.monitoring }
}

/**
 * Requests the standard Para Po vibration pattern when supported.
 * @returns {boolean} Whether the vibration request was accepted.
 */
export function triggerVibration() {
	if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
		return false
	}

	try {
		return navigator.vibrate([200, 100, 200])
	} catch {
		return false
	}
}

