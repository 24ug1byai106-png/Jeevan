import React, { useState, useRef } from 'react'
import { Mic, Square, Play, AlertCircle, ShieldAlert, HeartPulse, CheckSquare, RefreshCw, Send, Sparkles } from 'lucide-react'
import { logEmergencyToSupabase } from '../supabaseClient'

export default function EmergencyAssistant() {
  const [message, setMessage] = useState('')
  const [language, setLanguage] = useState('English')
  const [loading, setLoading] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [recording, setRecording] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [supabaseSync, setSupabaseSync] = useState(null) // null, 'syncing', 'synced', 'error'

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  // Audio recording handlers
  const startRecording = async () => {
    setError('')
    audioChunksRef.current = []
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        uploadAudio(audioBlob)
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setRecording(true)
    } catch (err) {
      console.error(err)
      setError('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }

  const uploadAudio = async (blob) => {
    setTranscribing(true)
    setError('')
    const formData = new FormData()
    formData.append('file', blob, 'emergency_audio.wav')

    try {
      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Voice transcription failed')
      }

      const data = await response.json()
      if (data.transcript) {
        setMessage(prev => (prev ? prev + ' ' + data.transcript : data.transcript))
      }
    } catch (err) {
      console.error(err)
      setError('Failed to transcribe voice audio. Please enter description manually.')
    } finally {
      setTranscribing(false)
    }
  }

  const handleAnalyze = async (e) => {
    e.preventDefault()
    if (!message.trim()) return

    setLoading(true)
    setError('')
    setResult(null)
    setSupabaseSync(null)

    try {
      const response = await fetch('/api/emergency/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          language: language,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to analyze emergency details.')
      }

      const data = await response.json()
      setResult(data)

      // Pushing to Supabase for emergency reporting
      setSupabaseSync('syncing')
      const syncRes = await logEmergencyToSupabase({
        message: message.trim(),
        language: language,
        emergency: data.emergency,
        severity: data.severity,
        severityScore: data.severityScore,
        hospitalRequired: data.hospitalRequired,
        source: data.source
      })
      if (syncRes.success) {
        setSupabaseSync('synced')
      } else if (syncRes.reason === 'unconfigured') {
        setSupabaseSync(null)
      } else {
        setSupabaseSync('error')
      }

    } catch (err) {
      console.error(err)
      setError('Failed to retrieve emergency advice. Check your backend status.')
    } finally {
      setLoading(false)
    }
  }

  const resetAll = () => {
    setMessage('')
    setResult(null)
    setError('')
    setSupabaseSync(null)
  }

  return (
    <div className="emergency-assistant" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="card">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Sparkles size={24} style={{ color: 'var(--color-emergency)' }} /> AI Emergency Assistant
        </h2>
        <p className="description">
          Describe the situation below in plain text or click the microphone to describe it by speaking in English, Hindi, Kannada, or Tamil.
        </p>

        <form onSubmit={handleAnalyze}>
          <div className="form-group">
            <label className="form-label">Select Response Language</label>
            <select 
              className="form-select" 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi (हिंदी)</option>
              <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
              <option value="Tamil">Tamil (தமிழ்)</option>
            </select>
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">Describe the Emergency</label>
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="Example: My father is having sudden chest pain and sweating, or a snake bit my sister in the field..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading || transcribing}
            />
          </div>

          {error && (
            <div style={{ color: 'var(--severity-critical)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '1rem 0' }}>
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
            {!recording ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={startRecording}
                disabled={loading || transcribing}
                style={{ borderRadius: '50%', width: '60px', height: '60px', padding: 0 }}
                title="Start Voice Recording"
              >
                <Mic size={24} style={{ color: 'var(--color-emergency)' }} />
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary voice-record-btn recording"
                onClick={stopRecording}
                style={{ borderRadius: '50%', width: '60px', height: '60px', padding: 0, margin: 0 }}
                title="Stop Voice Recording"
              >
                <Square size={24} />
              </button>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || transcribing || !message.trim()}
              style={{ flex: 1, minWidth: '150px' }}
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin" size={18} /> Analyzing Situation...
                </>
              ) : (
                <>
                  <Send size={18} /> Analyze Emergency
                </>
              )}
            </button>

            {result && (
              <button type="button" className="btn btn-secondary" onClick={resetAll}>
                Clear
              </button>
            )}
          </div>

          {transcribing && (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <RefreshCw className="animate-spin" size={16} /> Transcribing speech audio...
            </div>
          )}
        </form>
      </div>

      {result && (
        <div className="card" style={{ borderLeft: `6px solid var(--severity-${result.severity.toLowerCase()})` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <span className={`severity-badge ${result.severity.toLowerCase()}`} style={{ marginBottom: '0.5rem' }}>
                {result.severity} Risk (Score: {result.severityScore}/100)
              </span>
              <h3 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-heading)', marginTop: '0.25rem' }}>
                {result.emergency}
              </h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
              <span className="badge badge-success" style={{ background: 'var(--border-color)', color: 'var(--text-primary)' }}>
                Source: {result.source}
              </span>
              {supabaseSync === 'synced' && (
                <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                  ✓ Synced to Supabase
                </span>
              )}
              {supabaseSync === 'syncing' && (
                <span className="badge" style={{ fontSize: '0.7rem', color: 'var(--severity-medium)' }}>
                  Syncing to Supabase...
                </span>
              )}
            </div>
          </div>

          {/* Severity Score Bar */}
          <div style={{ width: '100%', backgroundColor: 'var(--bg-base)', height: '8px', borderRadius: '4px', marginBottom: '1.5rem', overflow: 'hidden' }}>
            <div 
              style={{ 
                width: `${result.severityScore}%`, 
                backgroundColor: `var(--severity-${result.severity.toLowerCase()})`, 
                height: '100%',
                transition: 'width 1s ease'
              }} 
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              <HeartPulse size={18} /> Situation Summary
            </h4>
            <p style={{ background: 'var(--bg-base)', padding: '1rem', borderRadius: '0.5rem', color: 'var(--text-secondary)' }}>
              {result.summary}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--severity-low)' }}>
                <CheckSquare size={18} /> FIRST AID STEPS (PROTOCAL)
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {result.firstAid.map((step, idx) => (
                  <li 
                    key={idx} 
                    style={{ 
                      padding: '0.75rem', 
                      background: 'rgba(16, 185, 129, 0.05)', 
                      border: '1px solid rgba(16, 185, 129, 0.1)', 
                      borderRadius: '0.5rem', 
                      color: 'var(--text-primary)',
                      display: 'flex',
                      gap: '0.5rem'
                    }}
                  >
                    <strong style={{ color: 'var(--severity-low)' }}>{idx + 1}.</strong>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--severity-critical)' }}>
                <ShieldAlert size={18} /> ACTIONS TO AVOID
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {result.avoid.map((step, idx) => (
                  <li 
                    key={idx} 
                    style={{ 
                      padding: '0.75rem', 
                      background: 'rgba(239, 68, 68, 0.05)', 
                      border: '1px solid rgba(239, 68, 68, 0.1)', 
                      borderRadius: '0.5rem', 
                      color: 'var(--text-primary)',
                      display: 'flex',
                      gap: '0.5rem'
                    }}
                  >
                    <strong style={{ color: 'var(--severity-critical)' }}>⚠</strong>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {result.hospitalRequired && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--severity-high-bg)', border: '1px solid rgba(249, 115, 22, 0.2)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
              <AlertCircle size={24} style={{ color: 'var(--severity-high)' }} />
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Hospital Referral Mandatory:</strong>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  This emergency requires professional medical treatment. Please locate and travel to the nearest hospital immediately.
                </p>
              </div>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            <strong>Safety Disclaimer:</strong> {result.disclaimer}
          </div>
        </div>
      )}
    </div>
  )
}
