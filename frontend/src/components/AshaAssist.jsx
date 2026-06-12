import React, { useState } from 'react'
import { ClipboardList, Send, MapPin, RefreshCw, AlertTriangle, ShieldAlert, CheckCircle, XCircle, Activity, Ambulance } from 'lucide-react'
import { logAshaToSupabase } from '../supabaseClient'
import offlineKnowledge from '../data/offline_knowledge.json'
import { useLanguage } from '../contexts/LanguageContext'

export default function AshaAssist() {
  const { t, appLanguage } = useLanguage()
  const [patientAge, setPatientAge] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [supabaseSync, setSupabaseSync] = useState(null) // null, 'syncing', 'synced', 'error'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!patientAge || !symptoms.trim()) return

    setLoading(true)
    setError('')
    setResult(null)
    setSupabaseSync(null)

    try {
      let useOfflineFallback = !navigator.onLine

      if (!useOfflineFallback) {
        try {
          const response = await fetch('/api/asha/assist', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              patientAge: parseInt(patientAge),
              symptoms: symptoms.trim(),
              language: appLanguage,
            }),
          })

          if (!response.ok) {
            useOfflineFallback = true
          } else {
            const data = await response.json()
            setResult(data)

            // Push logs to Supabase
            setSupabaseSync('syncing')
            const syncRes = await logAshaToSupabase({
              patientAge: parseInt(patientAge),
              symptoms: symptoms.trim(),
              language: appLanguage,
              emergency: data.condition, // Mapped for legacy logger
              severity: data.severity,
              severityScore: data.severityScore,
              referralRequired: data.hospitalRequired, // Mapped for legacy logger
              source: data.source
            })
            if (syncRes.success) {
              setSupabaseSync('synced')
            } else if (syncRes.reason === 'unconfigured') {
              setSupabaseSync(null)
            } else {
              setSupabaseSync('error')
            }
          }
        } catch (err) {
          useOfflineFallback = true
        }
      }

      if (useOfflineFallback) {
        const symLower = symptoms.toLowerCase()
        let detectedAlias = 'general_emergency'
        for (const [key, val] of Object.entries(offlineKnowledge.aliases)) {
          if (symLower.includes(key)) {
            detectedAlias = val
            break
          }
        }

        const emergencyData = offlineKnowledge.emergencies[detectedAlias]
        const fallbackLang = emergencyData.languages[appLanguage] || emergencyData.languages['English']

        const data = {
          condition: fallbackLang.emergency,
          severity: emergencyData.severity,
          severityScore: emergencyData.severityScore,
          confidence: "95% (Offline Mode)",
          immediateRisk: fallbackLang.summary,
          firstAid: fallbackLang.firstAid,
          avoid: fallbackLang.avoid,
          hospitalRequired: emergencyData.hospitalRequired,
          nearestFacility: "Nearest PHC / District Hospital (Network Needed for Exact Distance)",
          referralRecommendation: emergencyData.hospitalRequired ? "Urgent transport recommended." : "Monitor patient closely.",
          messageForFamily: fallbackLang.summary,
          disclaimer: "OFFLINE MODE ACTIVE: No internet connectivity. These are automated pre-cached offline guidelines for ASHA workers. Seek professional help immediately.",
          source: "offline_pwa_cache"
        }

        setResult(data)
      }
    } catch (err) {
      console.error(err)
      setError(t('asha.error.load'))
    } finally {
      setLoading(false)
    }
  }

  // Helper to determine color based on severity
  const getSeverityColor = (severity) => {
    switch(severity?.toLowerCase()) {
      case 'critical': return '#ef4444' // Red
      case 'high': return '#f97316' // Orange
      case 'medium': return '#f59e0b' // Amber
      case 'low': return '#10b981' // Green
      default: return '#6b7280' // Gray
    }
  }

  return (
    <div className="asha-assist-container" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '4rem' }}>
      
      {/* Input Form Section */}
      <div className="card" style={{ marginBottom: '2rem', background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.5)' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', color: 'var(--text-primary)', fontSize: '1.5rem' }}>
          <Activity size={26} style={{ color: 'var(--color-primary)' }} /> {t('asha.form.title')}
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1rem', lineHeight: '1.5' }}>
          {t('asha.form.subtitle')}
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '600' }}>{t('asha.form.age')}</label>
              <input
                type="number"
                className="form-input"
                min="0"
                max="120"
                placeholder="e.g. 45"
                value={patientAge}
                onChange={(e) => setPatientAge(e.target.value)}
                required
                style={{ background: 'white' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '600' }}>{t('asha.form.language')}</label>
              <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '0.5rem', padding: '0.75rem 1rem', color: 'var(--color-primary)', fontWeight: '600', fontSize: '0.95rem' }}>
                🌐 {appLanguage} — Change in sidebar
              </div>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label" style={{ fontWeight: '600' }}>{t('asha.form.symptoms')}</label>
            <textarea
              className="form-textarea"
              rows={4}
              placeholder={t('asha.form.symptoms.placeholder')}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              required
              disabled={loading}
              style={{ background: 'white', resize: 'vertical' }}
            />
            {symptoms.trim().length > 0 && symptoms.trim().length < 10 && (
              <div style={{ color: '#f59e0b', fontSize: '0.85rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <AlertTriangle size={14} /> {t('asha.form.symptoms.error')}
              </div>
            )}
          </div>

          {error && (
            <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '1rem 0', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '0.5rem' }}>
              <AlertTriangle size={20} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !patientAge || symptoms.trim().length < 10}
            style={{ width: '100%', height: '56px', borderRadius: '0.75rem', fontSize: '1.1rem', fontWeight: '700', justifyContent: 'center', boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.39)' }}
          >
            {loading ? (
              <>
                <RefreshCw className="animate-spin" size={20} /> {t('asha.form.btn.generating')}
              </>
            ) : (
              <>
                <Send size={20} /> {t('asha.form.btn.submit')}
              </>
            )}
          </button>
        </form>
      </div>

      {/* Structured Triage Response Section */}
      {result && (
        <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
          
          <h3 style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800' }}>
            {t('asha.result.title')}
          </h3>

          {/* Top Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            
            {/* Condition Card */}
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>{t('asha.result.condition')}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)' }}>{result.condition}</div>
            </div>

            {/* Severity Card */}
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>{t('asha.result.severity')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ 
                  background: getSeverityColor(result.severity), 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '50%',
                  boxShadow: `0 0 8px ${getSeverityColor(result.severity)}` 
                }}></span>
                <span style={{ fontSize: '1.5rem', fontWeight: '800', color: getSeverityColor(result.severity) }}>{result.severity}</span>
              </div>
            </div>

            {/* Confidence Card */}
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>{t('asha.result.confidence')}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-primary)' }}>{result.confidence}</div>
            </div>

          </div>

          {/* Immediate Risk Alert */}
          <div style={{ background: '#fef2f2', borderLeft: '6px solid #ef4444', padding: '1.5rem', borderRadius: '0.5rem 1rem 1rem 0.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <ShieldAlert size={28} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ color: '#b91c1c', fontWeight: '800', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>{t('asha.result.risk')}</div>
              <div style={{ color: '#7f1d1d', fontSize: '1.1rem', lineHeight: '1.5', fontWeight: '600' }}>{result.immediateRisk}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            
            {/* Recommended First Aid */}
            <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.03)' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', color: 'var(--color-primary)', marginBottom: '1.5rem', fontWeight: '800' }}>
                <CheckCircle size={22} /> {t('asha.result.firstaid')}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {result.firstAid.map((step, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ 
                      background: 'rgba(16, 185, 129, 0.1)', 
                      color: 'var(--color-primary)', 
                      width: '28px', height: '28px', 
                      borderRadius: '50%', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      fontWeight: '800', fontSize: '0.9rem', flexShrink: 0,
                      border: '2px solid rgba(16, 185, 129, 0.2)'
                    }}>
                      {idx + 1}
                    </div>
                    <div style={{ color: 'var(--text-primary)', fontSize: '1.05rem', lineHeight: '1.5', paddingTop: '2px' }}>
                      {step}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Avoid Section */}
            <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.03)' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', color: '#ef4444', marginBottom: '1.5rem', fontWeight: '800' }}>
                <XCircle size={22} /> {t('asha.result.avoid')}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {result.avoid.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '1.2rem', lineHeight: '1', flexShrink: 0 }}>❌</span>
                    <div style={{ color: 'var(--text-primary)', fontSize: '1.05rem', lineHeight: '1.4' }}>
                      {item}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Hospital / Referral Section */}
          <div style={{ background: 'linear-gradient(to right, #1e293b, #0f172a)', borderRadius: '1rem', color: 'white', padding: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)' }}>
            
            <div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Ambulance size={16} /> {t('asha.result.hospital')}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: result.hospitalRequired ? '#f87171' : '#34d399' }}>
                {result.hospitalRequired ? t('asha.result.urgent') : t('asha.result.monitor')}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={16} /> {t('asha.result.facility')}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', lineHeight: '1.4' }}>
                {result.nearestFacility}
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
                {t('asha.result.referral')}
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#e2e8f0' }}>
                {result.referralRecommendation}
              </div>
            </div>
            
          </div>

          {/* Legacy Disclaimer/Source footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '0 1rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {t('asha.result.disclaimer')}: {result.disclaimer}
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span className="badge" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)' }}>
                {t('asha.result.source')}: {result.source}
              </span>
              {supabaseSync === 'synced' && (
                <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                  ✓ Synced to Supabase
                </span>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
