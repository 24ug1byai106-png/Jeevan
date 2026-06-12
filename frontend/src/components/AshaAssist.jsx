import React, { useState } from 'react'
import { CheckSquare, AlertCircle, HeartPulse, User, ClipboardList, Send, MapPin, RefreshCw } from 'lucide-react'
import { logAshaToSupabase } from '../supabaseClient'

export default function AshaAssist() {
  const [patientAge, setPatientAge] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [language, setLanguage] = useState('Hindi')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  
  // Checklist state for red flags
  const [checkedFlags, setCheckedFlags] = useState({})
  const [supabaseSync, setSupabaseSync] = useState(null) // null, 'syncing', 'synced', 'error'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!patientAge || !symptoms.trim()) return

    setLoading(true)
    setError('')
    setResult(null)
    setCheckedFlags({})
    setSupabaseSync(null)

    try {
      const response = await fetch('/api/asha/assist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientAge: parseInt(patientAge),
          symptoms: symptoms.trim(),
          language: language,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch ASHA protocols.')
      }

      const data = await response.json()
      setResult(data)

      // Initialize red flag checklist state
      const initialFlags = {}
      data.redFlags.forEach((flag) => {
        initialFlags[flag] = false
      })
      setCheckedFlags(initialFlags)

      // Push logs to Supabase
      setSupabaseSync('syncing')
      const syncRes = await logAshaToSupabase({
        patientAge: parseInt(patientAge),
        symptoms: symptoms.trim(),
        language: language,
        emergency: data.emergency,
        severity: data.severity,
        severityScore: data.severityScore,
        referralRequired: data.referralRequired,
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
      setError('Failed to load ASHA protocols. Please ensure backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const toggleFlag = (flag) => {
    setCheckedFlags(prev => ({
      ...prev,
      [flag]: !prev[flag]
    }))
  }

  const anyFlagsChecked = Object.values(checkedFlags).some(val => val === true)

  return (
    <div className="asha-assist-container" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="card">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <ClipboardList size={24} style={{ color: 'var(--color-emergency)' }} /> ASHA Worker Assistance
        </h2>
        <p className="description">
          Accredited Social Health Activist (ASHA) mode. Designed for simplified first-response triage, step-by-step guidance, and patient's family coordination.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Patient Age (years)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  max="120"
                  placeholder="e.g. 45"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  required
                />
                <User size={18} style={{ position: 'absolute', right: '10px', top: '12px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Response Language</label>
              <select 
                className="form-select" 
                value={language} 
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="Hindi">Hindi (हिंदी)</option>
                <option value="English">English</option>
                <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                <option value="Tamil">Tamil (தமிழ்)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Observe and Describe Symptoms</label>
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="e.g. vomiting, extreme stomach pain, high fever..."
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div style={{ color: 'var(--severity-critical)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '1rem 0' }}>
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !patientAge || !symptoms.trim()}
            style={{ width: '100%', marginTop: '1rem' }}
          >
            {loading ? (
              <>
                <RefreshCw className="animate-spin" size={18} /> Retrieving Protocols...
              </>
            ) : (
              <>
                <Send size={18} /> Get ASHA Protocols
              </>
            )}
          </button>
        </form>
      </div>

      {result && (
        <div className="card" style={{ borderLeft: `6px solid var(--severity-${result.severity.toLowerCase()})` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <span className={`severity-badge ${result.severity.toLowerCase()}`} style={{ marginBottom: '0.5rem' }}>
                ASHA TRIAGE: {result.severity} ({result.severityScore}/100)
              </span>
              <h3 style={{ fontSize: '1.75rem', marginTop: '0.25rem' }}>
                Suspected Case: {result.emergency}
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
              <span className="badge" style={{ background: 'var(--border-color)', color: 'var(--text-primary)' }}>
                Source: {result.source}
              </span>
              {supabaseSync === 'synced' && (
                <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                  ✓ Synced to Supabase
                </span>
              )}
            </div>
          </div>

          {/* Instructions section */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              <HeartPulse size={18} /> Action Protocol for ASHA Worker
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {result.instructions.map((step, idx) => (
                <li 
                  key={idx} 
                  style={{ 
                    padding: '0.75rem', 
                    background: 'var(--bg-base)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '0.5rem',
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'flex-start'
                  }}
                >
                  <span style={{ 
                    background: 'var(--color-emergency)', 
                    color: 'white', 
                    borderRadius: '50%', 
                    width: '24px', 
                    height: '24px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '0.85rem',
                    flexShrink: 0
                  }}>
                    {idx + 1}
                  </span>
                  <span style={{ color: 'var(--text-primary)' }}>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Red flags section */}
          {result.redFlags && result.redFlags.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--severity-critical)' }}>
                <AlertCircle size={18} /> Red Flags Monitoring checklist
              </h4>
              <p className="description" style={{ fontSize: '0.85rem' }}>
                Tap observed symptoms to document severity. Checkbox items assist in patient tracking.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {result.redFlags.map((flag) => (
                  <label key={flag} className="checklist-item" style={{
                    backgroundColor: checkedFlags[flag] ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-base)',
                    borderColor: checkedFlags[flag] ? 'var(--severity-critical)' : 'var(--border-color)'
                  }}>
                    <input 
                      type="checkbox" 
                      checked={checkedFlags[flag] || false}
                      onChange={() => toggleFlag(flag)} 
                    />
                    <span>{flag}</span>
                  </label>
                ))}
              </div>

              {anyFlagsChecked && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--severity-critical-bg)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '0.5rem', marginTop: '1rem' }}>
                  <AlertCircle size={24} style={{ color: 'var(--severity-critical)' }} />
                  <div>
                    <strong style={{ color: 'var(--severity-critical)' }}>CRITICAL PROTOCOL TRIGGERED:</strong>
                    <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      One or more Red Flags are active. This patient needs urgent professional medical intervention. Prepare immediate referral documents.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Message for family */}
          <div style={{ marginBottom: '1.5rem', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.1)', padding: '1.25rem', borderRadius: '0.5rem' }}>
            <h4 style={{ color: 'var(--severity-medium)', marginBottom: '0.5rem' }}>
              Family Communication Aid (पारिवारिक संवाद सहायता)
            </h4>
            <p style={{ color: 'var(--text-primary)', fontStyle: 'italic', fontSize: '1.05rem', lineHeight: '1.6' }}>
              &ldquo;{result.messageForFamily}&rdquo;
            </p>
          </div>

          {result.referralRequired && !anyFlagsChecked && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--severity-high-bg)', border: '1px solid rgba(249, 115, 22, 0.2)', padding: '1rem', borderRadius: '0.5rem' }}>
              <MapPin size={24} style={{ color: 'var(--severity-high)' }} />
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Referral Mandated:</strong>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  ASHA diagnostics advise hospital reference. Support the family in arranging transport.
                </p>
              </div>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Disclaimer: {result.disclaimer}
          </div>
        </div>
      )}
    </div>
  )
}
