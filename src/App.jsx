import { useEffect, useRef, useState } from 'react'
import { Activity, LocateFixed, MapPinned, Radio } from 'lucide-react'
import AlertModal, { playSoftChime } from './components/AlertModal'
import Map from './components/Map'
import SearchBar from './components/SearchBar'
import TrackingToggle from './components/TrackingToggle'
import { calculateDistanceMeters, getSystemState, triggerVibration } from './services/geofenceService'
import './App.css';
import { requestNotificationPermission, showBrowserNotification } from './notifications/notificationService';

const WAKE_DISTANCE_METERS = 1000
const ALERT_DISTANCE_METERS = 200

function App() {
  const [destination, setDestination] = useState(null)
  const [currentPosition, setCurrentPosition] = useState(null)
  const [isTrackingOn, setIsTrackingOn] = useState(false)
  const [systemState, setSystemState] = useState(getSystemState(Infinity, WAKE_DISTANCE_METERS, ALERT_DISTANCE_METERS, false))
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [locationError, setLocationError] = useState('')
  const watchId = useRef(null)
  const lastProcessedAt = useRef(0)
  const wasInsideAlertZone = useRef(false)

  useEffect(() => {
    if (!isTrackingOn || !destination) {
      if (watchId.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
      setSystemState(getSystemState(Infinity, WAKE_DISTANCE_METERS, ALERT_DISTANCE_METERS, false))
      lastProcessedAt.current = 0
      wasInsideAlertZone.current = false
      return undefined
    }

    if (!navigator.geolocation) {
      setLocationError('Location services are not available on this device.')
      setIsTrackingOn(false)
      return undefined
    }

    setLocationError('')
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const nextPosition = { lat: position.coords.latitude, lng: position.coords.longitude }
        const distance = calculateDistanceMeters(nextPosition.lat, nextPosition.lng, destination.latitude, destination.longitude)
        const nextState = getSystemState(distance, WAKE_DISTANCE_METERS, ALERT_DISTANCE_METERS, true)
        const now = Date.now()
        if (lastProcessedAt.current && now - lastProcessedAt.current < nextState.pollingIntervalMs) return

        lastProcessedAt.current = now
        setCurrentPosition(nextPosition)
        setSystemState(nextState)
        const insideAlertZone = distance <= ALERT_DISTANCE_METERS
        if (insideAlertZone && !wasInsideAlertZone.current) {
          setIsAlertOpen(true);
          triggerVibration();
          void playSoftChime();
          showBrowserNotification();
        }
        wasInsideAlertZone.current = insideAlertZone
      },
      () => setLocationError('Unable to access your location. Please check device permissions.'),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 },
    )

    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
  }, [destination, isTrackingOn]);

  // Request notification permission on mount
  useEffect(() => { requestNotificationPermission(); }, []);

  const selectDestination = (nextDestination) => {
    setDestination(nextDestination)
    setIsTrackingOn(false)
    setIsAlertOpen(false)
    wasInsideAlertZone.current = false
  }

  const centerOnLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((position) => setCurrentPosition({ lat: position.coords.latitude, lng: position.coords.longitude }))
  }

    const controls = (
    <div className="flex flex-col gap-4">
      <SearchBar onSelect={selectDestination} />
      {locationError && (
        <div className="animate-in fade-in slide-in-from-top-2 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200" role="alert">
          <p className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            {locationError}
          </p>
        </div>
      )}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 transition-all hover:bg-slate-900/80">
        <div className="flex items-start gap-4">
          <div className="relative mt-1">
            <span className={`block h-3 w-3 rounded-full ${isTrackingOn ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            {isTrackingOn && <span className="absolute inset-0 h-3 w-3 animate-ping rounded-full bg-emerald-400 opacity-75" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">System Status</p>
            <p className="mt-0.5 text-base font-bold text-white line-clamp-1">
              {destination ? systemState.title : 'Ready to start'}
            </p>
            <p className="mt-1 text-xs text-slate-400 line-clamp-2 italic">
              {destination?.name || 'Please select a destination to begin tracking.'}
            </p>
          </div>
        </div>
      </div>
      <TrackingToggle 
        hasDestination={Boolean(destination)} 
        isTrackingOn={isTrackingOn} 
        onCenter={centerOnLocation} 
        onChange={(next) => { 
          setIsTrackingOn(next); 
          if (!next) setIsAlertOpen(false) 
        }} 
      />
    </div>
  )

  return (
    <main className="para-po-shell flex h-screen flex-col overflow-hidden bg-slate-950 text-slate-100 md:flex-row">
      {/* Mobile Header */}
      <header className="z-30 flex items-center justify-center border-b border-white/10 bg-slate-900/90 px-4 py-3 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-900/20">
            <MapPinned className="text-white" size={22} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white leading-tight">Para Po Web</h1>
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 leading-tight">Smart Commute</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${isTrackingOn ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isTrackingOn ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          {isTrackingOn ? 'Tracking' : 'Idle'}
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="z-30 hidden w-80 shrink-0 flex-col border-r border-white/10 bg-slate-900/95 md:flex lg:w-96">
        <div className="flex flex-col gap-2 border-b border-white/10 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 shadow-xl shadow-blue-900/40">
              <MapPinned className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-white">Para Po!</h1>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">Smart Commuter</p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {controls}
        </div>

        <div className="mt-auto border-t border-white/10 bg-slate-950/30 p-6">
          <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <Radio className="text-blue-500" size={16} />
            <span>Local privacy protection active</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-slate-950 p-2 md:p-4 lg:p-5">
        <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/30">
          <Map 
            currentPosition={currentPosition} 
            destination={destination} 
            wakeDistance={WAKE_DISTANCE_METERS} 
            alertDistance={ALERT_DISTANCE_METERS} 
            onLocate={centerOnLocation} 
            onPlaceSelect={selectDestination}
          />
          
          {/* Mobile Overlay Controls */}
          <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[1000] md:hidden">
            <div className="pointer-events-auto max-h-[58vh] overflow-y-auto rounded-3xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl no-scrollbar ring-1 ring-white/10">
              <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Trip Dashboard</h2>
                <Activity className="text-blue-400" size={18} />
              </div>
              {controls}
            </div>
          </div>
        </div>

        {/* Desktop Status Bar */}
        <footer className="hidden h-12 items-center justify-between px-2 text-[11px] font-black uppercase tracking-widest text-slate-500 md:flex">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${currentPosition ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {currentPosition ? 'GPS Signal Active' : 'Searching for GPS...'}
            </span>
            <div className="h-4 w-px bg-slate-800" />
            <span className="max-w-md truncate">
              {destination ? `To: ${destination.name}` : 'No active destination'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-400">v1.0.0</span>
          </div>
        </footer>
      </section>

      <AlertModal 
        isOpen={isAlertOpen} 
        onAcknowledge={() => setIsAlertOpen(false)} 
        playSound={true} 
      />
    </main>
  )

}

export default App
