import { useEffect, useRef } from 'react'
import { Bell, Check } from 'lucide-react'

let audioContext

/**
 * Plays a short, quiet two-tone chime. Browsers may reject resume/startup
 * until a user gesture has occurred; that case is intentionally ignored.
 */
export async function playSoftChime() {
	if (typeof window === 'undefined') return false

	const AudioContextClass = window.AudioContext || window.webkitAudioContext
	if (!AudioContextClass) return false

	try {
		audioContext ??= new AudioContextClass()
		if (audioContext.state === 'suspended') await audioContext.resume()
		if (audioContext.state !== 'running') return false

		const now = audioContext.currentTime
		const gain = audioContext.createGain()
		gain.gain.setValueAtTime(0.0001, now)
		gain.gain.exponentialRampToValueAtTime(0.08, now + 0.025)
		gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65)
		gain.connect(audioContext.destination)

		;[523.25, 659.25].forEach((frequency, index) => {
			const oscillator = audioContext.createOscillator()
			oscillator.type = 'sine'
			oscillator.frequency.setValueAtTime(frequency, now + index * 0.12)
			oscillator.connect(gain)
			oscillator.start(now + index * 0.12)
			oscillator.stop(now + 0.65)
		})

		return true
	} catch {
		return false
	}
}

function AlertModal({ isOpen = false, onAcknowledge, playSound = true }) {
	const acknowledgeButtonRef = useRef(null)

	useEffect(() => {
		if (!isOpen) return undefined

		if (playSound) void playSoftChime()
		acknowledgeButtonRef.current?.focus()

		const handleKeyDown = (event) => {
			if (event.key === 'Escape') onAcknowledge?.()
		}

		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	}, [isOpen, onAcknowledge, playSound])

	if (!isOpen) return null

	return (
		<div aria-hidden="false" className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/70 p-4" role="presentation">
			<div
				aria-describedby="arrival-alert-message"
				aria-labelledby="arrival-alert-title"
				aria-modal="true"
				className="w-full max-w-lg rounded-xl border-4 border-blue-950 bg-blue-800 p-6 text-white shadow-2xl sm:p-8"
				role="dialog"
			>
				<div className="mb-5 flex items-center gap-4">
					<span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-white bg-blue-950" aria-hidden="true">
						<Bell size={30} strokeWidth={3} />
					</span>
					<h2 className="m-0 text-3xl font-extrabold tracking-normal text-white" id="arrival-alert-title">Please Note</h2>
				</div>
				<p className="text-xl font-semibold leading-relaxed text-white" id="arrival-alert-message">
					You are approaching your destination. Please prepare to arrive.
				</p>
				<button
					className="mt-7 flex min-h-16 w-full items-center justify-center gap-3 rounded-lg border-2 border-white bg-white px-6 py-4 text-lg font-extrabold text-blue-950 shadow-lg transition hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-yellow-300"
					onClick={onAcknowledge}
					ref={acknowledgeButtonRef}
					type="button"
				>
					<Check aria-hidden="true" size={28} strokeWidth={3} />
					Acknowledge
				</button>
			</div>
		</div>
	)
}

export default AlertModal

