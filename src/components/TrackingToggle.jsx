import { LocateFixed, Target } from 'lucide-react'

function TrackingToggle({
	hasDestination = false,
	isTrackingOn = false,
	onCenter,
	onChange,
}) {
	const isDisabled = !hasDestination

		return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-4 shadow-inner shadow-black/10 transition-all">
				<div className="flex items-center gap-3">
					<div className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${isTrackingOn ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
						<Target size={22} />
					</div>
					<div>
						<p className="text-sm font-black uppercase tracking-widest text-white">Alerts</p>
						<p className="text-[11px] font-bold text-slate-500">
							{isDisabled ? 'Select Destination' : isTrackingOn ? 'Live Tracking' : 'Paused'}
						</p>
					</div>
				</div>

				<button
					aria-checked={isTrackingOn}
					aria-label={isTrackingOn ? 'Turn tracking off' : 'Turn tracking on'}
					className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-blue-500/40 focus:ring-offset-2 focus:ring-offset-slate-900 ${isDisabled ? 'cursor-not-allowed bg-slate-800' : isTrackingOn ? 'bg-blue-600' : 'bg-slate-700'}`}
					disabled={isDisabled}
					onClick={() => onChange?.(!isTrackingOn)}
					role="switch"
					type="button"
				>
					<span
						aria-hidden="true"
						className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isTrackingOn ? 'translate-x-6' : 'translate-x-0'}`}
					/>
				</button>
			</div>

			{onCenter && (
				<button
					aria-label="Center on my location"
					className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-base font-bold text-white transition-all hover:bg-slate-700 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-blue-500/30"
					onClick={onCenter}
					type="button"
				>
					<LocateFixed size={18} />
					<span>Center on Me</span>
				</button>
			)}
		</div>
	)

}

export default TrackingToggle

