import React, { useState, useEffect } from 'react'
import { MapPin, Navigation, Compass, Search, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react'
import { logHospitalQueryToSupabase } from '../supabaseClient'

export default function HospitalLocator() {
  const [coords, setCoords] = useState({ lat: 12.9716, lng: 77.5946 }) // Default Bangalore coords
  const [useCustomCoords, setUseCustomCoords] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hospitals, setHospitals] = useState([])
  const [error, setError] = useState('')
  const [locationStatus, setLocationStatus] = useState('click_to_locate') // click_to_locate, locating, located, error
  const [supabaseSync, setSupabaseSync] = useState(null) // null, 'synced', 'unconfigured'

  // Get browser geolocation
  const fetchBrowserLocation = () => {
    setLocationStatus('locating')
    setError('')
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      setLocationStatus('error')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        setCoords(newCoords)
        setLocationStatus('located')
        fetchHospitals(newCoords.lat, newCoords.lng)
      },
      (err) => {
        console.error(err)
        setError('Location access denied. Please enter coordinates manually or use default.')
        setLocationStatus('error')
        setUseCustomCoords(true)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const fetchHospitals = async (lat, lng) => {
    setLoading(true)
    setError('')
    setHospitals([])
    setSupabaseSync(null)

    try {
      const response = await fetch(`/api/hospitals/nearby?lat=${lat}&lng=${lng}`)
      if (!response.ok) {
        throw new Error('Hospital database search failed. Overpass API may be offline.')
      }
      const data = await response.json()
      setHospitals(data)

      // Log hospital query in Supabase
      const syncRes = await logHospitalQueryToSupabase(lat, lng, data.length)
      if (syncRes.success) {
        setSupabaseSync('synced')
      } else if (syncRes.reason === 'unconfigured') {
        setSupabaseSync('unconfigured')
      }
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to search for local hospitals.')
    } finally {
      setLoading(false)
    }
  }

  // Auto load default hospitals on component mount
  useEffect(() => {
    fetchHospitals(coords.lat, coords.lng)
  }, [])

  const handleManualSearch = (e) => {
    e.preventDefault()
    fetchHospitals(coords.lat, coords.lng)
  }

  return (
    <div className="hospital-locator" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="card">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <MapPin size={24} style={{ color: 'var(--color-emergency)' }} /> Emergency Hospital Locator
        </h2>
        <p className="description">
          Uses GPS and OpenStreetMap OpenData to find the closest emergency rooms, clinics, and government hospitals within a 25km radius.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={fetchBrowserLocation}
            disabled={locationStatus === 'locating'}
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
          >
            <Compass size={18} className={locationStatus === 'locating' ? 'animate-spin' : ''} />
            {locationStatus === 'locating' ? 'Accessing GPS...' : 'Locate Me (Use GPS)'}
          </button>

          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => setUseCustomCoords(!useCustomCoords)}
          >
            {useCustomCoords ? 'Hide Manual Settings' : 'Enter Coordinates Manually'}
          </button>
        </div>

        {useCustomCoords && (
          <form onSubmit={handleManualSearch} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'flex-end', background: 'var(--bg-base)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Latitude</label>
              <input 
                type="number" 
                step="0.000001" 
                className="form-input" 
                value={coords.lat} 
                onChange={(e) => setCoords({ ...coords, lat: parseFloat(e.target.value) })}
                required 
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Longitude</label>
              <input 
                type="number" 
                step="0.000001" 
                className="form-input" 
                value={coords.lng} 
                onChange={(e) => setCoords({ ...coords, lng: parseFloat(e.target.value) })}
                required 
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem' }} disabled={loading}>
              <Search size={18} />
            </button>
          </form>
        )}

        {locationStatus === 'located' && (
          <div style={{ fontSize: '0.85rem', color: 'var(--severity-low)', marginBottom: '1rem' }}>
            ✓ Geolocation active: Latitude {coords.lat.toFixed(4)}, Longitude {coords.lng.toFixed(4)}
          </div>
        )}
      </div>

      {error && (
        <div style={{ color: 'var(--severity-critical)', background: 'var(--severity-critical-bg)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <RefreshCw className="animate-spin" size={32} style={{ marginBottom: '1rem', color: 'var(--color-emergency)' }} />
          <p>Contacting Overpass OpenStreetMap servers. Sorting hospitals by distance...</p>
        </div>
      ) : (
        <div className="hospitals-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {hospitals.length > 0 ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.5rem' }}>
                <h3 style={{ fontSize: '1.15rem' }}>
                  Hospitals Found ({hospitals.length})
                </h3>
                {supabaseSync === 'synced' && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--severity-low)', fontWeight: '600' }}>
                    ✓ Query logged to Supabase
                  </span>
                )}
              </div>

              {hospitals.map((hosp, idx) => (
                <div 
                  key={idx} 
                  className="card" 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    margin: 0, 
                    padding: '1.25rem 1.5rem',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ 
                      backgroundColor: 'var(--color-emergency-light)', 
                      color: 'var(--color-emergency)', 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Navigation size={18} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {hosp.name || 'Unnamed Hospital/Clinic'}
                      </h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', gap: '0.5rem' }}>
                        <span>Distance: <strong>{hosp.distance}</strong></span>
                        <span>•</span>
                        <span>Lat: {hosp.lat.toFixed(4)}, Lng: {hosp.lng.toFixed(4)}</span>
                      </p>
                    </div>
                  </div>

                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${hosp.lat},${hosp.lng}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }}
                  >
                    <span>Route</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              ))}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-card)', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
              <MapPin size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
              <p style={{ color: 'var(--text-secondary)' }}>No hospitals or clinics found in 25km radius.</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Try setting a different set of coordinates.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
