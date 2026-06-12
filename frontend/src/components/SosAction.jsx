import React, { useState, useEffect, useRef } from 'react'
import { Bell, BellOff, Volume2, ShieldAlert, AlertTriangle, Zap, RefreshCw, Phone } from 'lucide-react'
import { logEmergencyToSupabase } from '../supabaseClient'
import { useLanguage } from '../contexts/LanguageContext'

export default function SosAction() {
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [sosCard, setSosCard] = useState(null)
  const [isAlertActive, setIsAlertActive] = useState(false)
  const [audioSiren, setAudioSiren] = useState(false)
  const [error, setError] = useState('')
  
  const audioCtxRef = useRef(null)
  const oscillatorRef = useRef(null)
  const gainNodeRef = useRef(null)

  // Hotkeys to trigger instant response - keys for translation
  const hotkeyKeys = [
    { label_key: 'sos.card.hotkey.snake', query: 'snake bite' },
    { label_key: 'sos.card.hotkey.heart', query: 'heart attack' },
    { label_key: 'sos.card.hotkey.bleeding', query: 'severe bleeding' },
    { label_key: 'sos.card.hotkey.drowning', query: 'drowning' },
    { label_key: 'sos.card.hotkey.choking', query: 'choking' },
  ]

  const triggerSos = async (searchQuery) => {
    const q = searchQuery || query
    if (!q.trim()) return

    setLoading(true)
    setError('')
    setSosCard(null)
    setIsAlertActive(true) // Turn on the visual flasher immediately

    try {
      const response = await fetch('/api/emergency/sos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: q.trim() })
      })

      if (!response.ok) {
        throw new Error('SOS Card generation failed')
      }

      const data = await response.json()
      setSosCard(data)

      // Optionally write to Supabase (log as an emergency with source 'sos')
      await logEmergencyToSupabase({
        message: q.trim(),
        language: 'English',
        emergency: data.emergency,
        severity: data.severity,
        severityScore: data.severityScore,
        hospitalRequired: data.hospitalRequired,
        source: 'sos_card'
      })

    } catch (err) {
      console.error(err)
      setError('Could not establish contact with emergency API.')
    } finally {
      setLoading(false)
    }
  }

  // synthesized sound siren utilizing Web Audio API
  useEffect(() => {
    if (audioSiren && isAlertActive) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext
        const ctx = new AudioContext()
        audioCtxRef.current = ctx

        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(440, ctx.currentTime) // default frequency

        // LFO siren modulation (creates the oscillating police siren sound)
        const sirenSpeed = 2.5 // Hz
        const freqMod = ctx.createOscillator()
        const modGain = ctx.createGain()
        
        freqMod.frequency.value = sirenSpeed
        modGain.gain.value = 150 // swing 150Hz up/down
        
        freqMod.connect(modGain)
        modGain.connect(osc.frequency)
        
        osc.connect(gain)
        gain.connect(ctx.destination)
        
        gain.gain.setValueAtTime(0.3, ctx.currentTime) // volume

        freqMod.start()
        osc.start()

        oscillatorRef.current = osc
        gainNodeRef.current = gain
      } catch (err) {
        console.error('Web Audio API not supported:', err)
      }
    } else {
      stopSiren()
    }

    return () => stopSiren()
  }, [audioSiren, isAlertActive])

  const stopSiren = () => {
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop()
      } catch(e){}
      oscillatorRef.current = null
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close()
      } catch(e){}
      audioCtxRef.current = null
    }
  }

  const deactivateAlert = () => {
    setIsAlertActive(false)
    setAudioSiren(false)
    stopSiren()
    setSosCard(null)
  }

  return (
    <div className={`sos-view ${isAlertActive ? 'flash-sos' : ''}`} style={{ minHeight: '100%', padding: '1rem', transition: 'background-color 0.5s' }}>
      <div className="sos-container" style={{ maxWidth: '750px', margin: '0 auto' }}>
        
        {/* Active Alert State */}
        {isAlertActive && (
          <div className="card" style={{ border: '3px solid var(--severity-critical)', boxShadow: '0 0 30px rgba(239, 68, 68, 0.4)', textAlign: 'center', backgroundColor: '#181212', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setAudioSiren(!audioSiren)}
                style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}
              >
                {audioSiren ? (
                  <>
                    <BellOff size={16} /> {t('sos.mute')}
                  </>
                ) : (
                  <>
                    <Volume2 size={16} /> {t('sos.sound')}
                  </>
                )}
              </button>

              <button 
                className="btn btn-primary" 
                onClick={deactivateAlert}
                style={{ backgroundColor: 'var(--text-primary)', color: 'var(--bg-base)' }}
              >
                {t('sos.btn.cancel')}
              </button>
            </div>

            <div style={{ margin: '2rem 0' }}>
              <ShieldAlert size={80} style={{ color: 'var(--severity-critical)', animation: 'pulse-red 1s infinite', margin: '0 auto 1rem' }} />
              <h2 style={{ fontSize: '2.5rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--severity-critical)', fontFamily: 'var(--font-heading)' }}>
                {t('sos.activated.emergency')}
              </h2>
            </div>

            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--severity-critical)' }} />
                <p style={{ color: 'var(--text-primary)' }}>{t('sos.activated.loading')}</p>
              </div>
            )}

            {error && (
              <div style={{ color: 'var(--severity-critical)', margin: '1rem 0' }}>
                {error}
              </div>
            )}

            {sosCard && (
              <div style={{ background: '#120a0a', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', marginTop: '1.5rem', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span className="severity-badge critical" style={{ fontSize: '1rem' }}>
                    {sosCard.severity} Triage: {sosCard.severityScore}/100
                  </span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Jeevan SOS Protocol</span>
                </div>

                <h3 style={{ fontSize: '1.85rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                  {sosCard.emergency}
                </h3>

                <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1.25rem', borderLeft: '4px solid var(--severity-critical)', borderRadius: '0.25rem', marginBottom: '1.5rem' }}>
                  <strong style={{ display: 'block', fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--severity-critical)', textTransform: 'uppercase' }}>
                    {t('sos.activated.action_label')}
                  </strong>
                  <p style={{ fontSize: '1.5rem', fontWeight: '700', lineHeight: '1.4', color: 'white' }}>
                    {sosCard.action}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: 'var(--bg-base)', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid var(--border-color)' }}>
                  <Phone size={18} style={{ color: 'var(--severity-low)' }} />
                  <div>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{t('sos.activated.ambulance_label')}</strong>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{t('sos.activated.ambulance_text')}</p>
                  </div>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem' }}>
                  {sosCard.disclaimer}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Standard Config State */}
        {!isAlertActive && (
          <div className="card">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Zap size={24} style={{ color: 'var(--color-emergency)' }} /> {t('sos.card.title')}
            </h2>
            <p className="description">
              {t('sos.card.description')}
            </p>

            {/* Hotkeys Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {hotkeyKeys.map((hk) => (
                <button
                  key={hk.label_key}
                  onClick={() => {
                    setQuery(hk.query)
                    setAudioSiren(true) // Turn on alarm by default for hotkeys
                    triggerSos(hk.query)
                  }}
                  className="btn btn-secondary"
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    padding: '1.25rem 1rem', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-base)',
                    borderRadius: '0.75rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <AlertTriangle size={24} style={{ color: 'var(--color-emergency)' }} />
                  <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{t(hk.label_key)}</span>
                </button>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">{t('sos.card.custom.label')}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={t('sos.card.custom.placeholder')}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <button
                onClick={() => {
                  setAudioSiren(true)
                  triggerSos()
                }}
                className="btn btn-primary"
                disabled={!query.trim()}
                style={{ width: '100%', padding: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                {t('sos.btn.trigger')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
