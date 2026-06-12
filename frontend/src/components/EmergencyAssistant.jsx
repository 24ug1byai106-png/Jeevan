import React, { useState, useRef, useEffect } from 'react'
import { Mic, Square, AlertCircle, ShieldAlert, HeartPulse, CheckSquare, RefreshCw, Send, Sparkles, Leaf } from 'lucide-react'
import { logEmergencyToSupabase } from '../supabaseClient'
import offlineKnowledge from '../data/offline_knowledge.json'
import { useLanguage } from '../contexts/LanguageContext'

export default function EmergencyAssistant({ externalMessage }) {
  const { t, appLanguage, setAppLanguage } = useLanguage()
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState('')
  const [supabaseSync, setSupabaseSync] = useState(null)

  const messagesEndRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  const suggestedChips = [
    "Snake bite in the field",
    "Farmer collapsed from heat",
    "Accidental pesticide inhalation",
    "Severe cut from tractor blade"
  ]

  useEffect(() => {
    if (externalMessage) {
      setMessage(externalMessage)
    }
  }, [externalMessage])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setRecording(true)
    } catch (err) {
      console.error(err)
      setError(t("ai.error.mic"))
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

      if (!response.ok) throw new Error('Voice transcription failed')

      const data = await response.json()
      if (data.transcript) {
        setMessage(prev => (prev ? prev + ' ' + data.transcript : data.transcript))
      }
    } catch (err) {
      console.error(err)
      setError(t("ai.error.transcribe"))
    } finally {
      setTranscribing(false)
    }
  }

  const handleAnalyze = async (e, customMessage = null) => {
    if (e) e.preventDefault()
    const textToAnalyze = customMessage || message.trim()
    if (!textToAnalyze) return

    const newMessages = [...messages, { role: 'user', content: textToAnalyze }]
    setMessages(newMessages)
    setMessage('')
    setLoading(true)
    setError('')
    setSupabaseSync(null)

    setMessages(prev => [...prev, { role: 'assistant', isThinking: true }])

    try {
      let useOfflineFallback = !navigator.onLine;
      let finalData = null;

      if (!useOfflineFallback) {
        try {
          const response = await fetch('/api/emergency/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: textToAnalyze, language: appLanguage }),
          })

          if (!response.ok) {
            useOfflineFallback = true;
          } else {
            finalData = await response.json()
            setSupabaseSync('syncing')
            const syncRes = await logEmergencyToSupabase({
              message: textToAnalyze,
              language: appLanguage,
              emergency: finalData.emergency,
              severity: finalData.severity,
              severityScore: finalData.severityScore,
              hospitalRequired: finalData.hospitalRequired,
              source: finalData.source
            })
            if (syncRes.success) setSupabaseSync('synced')
            else if (syncRes.reason === 'unconfigured') setSupabaseSync(null)
            else setSupabaseSync('error')
          }
        } catch (networkErr) {
          useOfflineFallback = true;
        }
      }

      if (useOfflineFallback) {
        const msgLower = textToAnalyze.toLowerCase();
        let detectedAlias = 'general_emergency';
        for (const [key, val] of Object.entries(offlineKnowledge.aliases)) {
          if (msgLower.includes(key)) {
            detectedAlias = val;
            break;
          }
        }
        const emergencyData = offlineKnowledge.emergencies[detectedAlias];
        const fallbackLang = emergencyData.languages[appLanguage] || emergencyData.languages['English'];
        
        finalData = {
          emergency: fallbackLang.emergency,
          severity: emergencyData.severity,
          severityScore: emergencyData.severityScore,
          hospitalRequired: emergencyData.hospitalRequired,
          summary: fallbackLang.summary,
          firstAid: fallbackLang.firstAid,
          avoid: fallbackLang.avoid,
          disclaimer: "OFFLINE MODE ACTIVE: Automated pre-cached instructions.",
          source: "offline_pwa_cache"
        };
      }

      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: finalData, isThinking: false }
        return updated
      })

    } catch (err) {
      console.error(err)
      setMessages(prev => {
        const updated = [...prev]
        updated.pop() // Remove thinking message
        return updated
      })
      setError(t("ai.error.advice"))
    } finally {
      setLoading(false)
    }
  }

  const renderAIResponse = (result) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <span className={`severity-badge ${result.severity.toLowerCase()}`} style={{ marginBottom: '0.5rem', display: 'inline-block' }}>
              {result.severity} Risk (Score: {result.severityScore})
            </span>
            <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-heading)', marginTop: '0' }}>{result.emergency}</h3>
          </div>
        </div>

        <div style={{ width: '100%', backgroundColor: 'rgba(0,0,0,0.05)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${result.severityScore}%`, backgroundColor: `var(--severity-${result.severity.toLowerCase()})`, height: '100%', transition: 'width 1s ease' }} />
        </div>

        <div>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.9rem' }}><HeartPulse size={16} /> Summary</h4>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.02)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(0,0,0,0.05)' }}>{result.summary}</p>
        </div>

        <div>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--severity-low)', fontSize: '0.9rem' }}><CheckSquare size={16} /> First Aid Protocol</h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: 0, padding: 0 }}>
            {result.firstAid.map((step, idx) => (
              <li key={idx} style={{ padding: '0.5rem 0.75rem', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: '0.5rem', fontSize: '0.9rem', display: 'flex', gap: '0.5rem' }}>
                <strong style={{ color: 'var(--severity-low)' }}>{idx + 1}.</strong> <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>

        {result.avoid && result.avoid.length > 0 && (
          <div>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--severity-critical)', fontSize: '0.9rem' }}><ShieldAlert size={16} /> Avoid</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: 0, padding: 0 }}>
              {result.avoid.map((step, idx) => (
                <li key={idx} style={{ padding: '0.5rem 0.75rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem', fontSize: '0.9rem', display: 'flex', gap: '0.5rem' }}>
                  <strong style={{ color: 'var(--severity-critical)' }}>⚠</strong> <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.hospitalRequired && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--severity-high-bg)', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.85rem' }}>
            <AlertCircle size={20} style={{ color: 'var(--severity-high)' }} />
            <strong style={{ color: 'var(--severity-high)' }}>Hospital Referral Mandatory</strong>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: 'white' }}>
      
      {/* Header */}
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.9)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'var(--color-primary-light)', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}>
            <Sparkles size={18} color="var(--color-primary)" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>{t("ai.header.title")}</h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{t("ai.header.subtitle")}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {supabaseSync === 'syncing' && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t("ai.header.syncing")}</span>}
          {supabaseSync === 'synced' && <span style={{ fontSize: '0.7rem', color: 'var(--severity-low)' }}>{t("ai.header.synced")}</span>}
          <div style={{ background: '#ecfdf5', color: '#10b981', padding: '0.2rem 0.6rem', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', background: '#10b981', borderRadius: '50%' }}></span> {t("ai.header.online")}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', backgroundColor: '#fafafa' }}>
        {messages.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.9 }}>
            <div style={{ background: 'var(--color-primary-light)', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
              <Leaf size={32} color="var(--color-primary)" />
            </div>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', fontSize: '1.2rem' }}>{t("ai.welcome.title")}</h4>
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '350px', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.5' }}>
              {t("ai.welcome.subtitle")}
            </p>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', maxWidth: '400px' }}>
              {suggestedChips.map(chip => (
                <button 
                  key={chip} 
                  onClick={() => handleAnalyze(null, chip)}
                  style={{ padding: '0.5rem 1rem', background: 'white', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '99px', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-primary)', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            msg.role === 'user' ? (
              <div key={i} style={{ alignSelf: 'flex-end', background: 'var(--color-primary)', color: 'white', padding: '0.75rem 1.25rem', borderRadius: '1.25rem 1.25rem 0 1.25rem', maxWidth: '80%', boxShadow: 'var(--shadow-sm)', fontSize: '0.95rem' }}>
                {msg.content}
              </div>
            ) : (
              <div key={i} style={{ alignSelf: 'flex-start', background: 'white', border: '1px solid #e2e8f0', color: 'var(--text-primary)', padding: '1.25rem', borderRadius: '1.25rem 1.25rem 1.25rem 0', maxWidth: '90%', boxShadow: 'var(--shadow-sm)' }}>
                {msg.isThinking ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    <RefreshCw className="animate-spin" size={16} /> {t("ai.generating")}
                  </div>
                ) : (
                  renderAIResponse(msg.content)
                )}
              </div>
            )
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div style={{ padding: '1rem', background: 'white', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
        {error && <div style={{ color: 'red', fontSize: '0.8rem', marginBottom: '0.5rem', padding: '0 0.5rem' }}>{error}</div>}
        {transcribing && <div style={{ color: 'var(--color-primary)', fontSize: '0.8rem', marginBottom: '0.5rem', padding: '0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><RefreshCw className="animate-spin" size={12}/> {t("ai.transcribing")}</div>}
        
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', background: '#f8fafc', padding: '0.5rem', borderRadius: '1.5rem', border: '1px solid #e2e8f0', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
          
          <textarea 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAnalyze(); } }}
            placeholder={t("ai.input.placeholder")}
            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', resize: 'none', maxHeight: '120px', padding: '0.75rem 0.5rem', fontFamily: 'var(--font-sans)', fontSize: '0.95rem', lineHeight: '1.4' }}
            rows={1}
          />
          
          {!recording ? (
            <button type="button" onClick={startRecording} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', padding: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mic size={20} />
            </button>
          ) : (
            <button type="button" onClick={stopRecording} style={{ background: '#fee2e2', border: 'none', color: '#dc2626', padding: '0.75rem', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="animate-pulse-glow">
              <Square size={20} />
            </button>
          )}

          <button type="button" onClick={(e) => handleAnalyze(e)} disabled={loading || !message.trim()} style={{ background: (loading || !message.trim()) ? '#cbd5e1' : 'var(--color-primary)', border: 'none', color: 'white', padding: '0.75rem', borderRadius: '50%', cursor: (loading || !message.trim()) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
            <Send size={18} style={{ transform: 'translateX(-1px) translateY(1px)' }} />
          </button>
        </div>
      </div>
    </div>
  )
}
