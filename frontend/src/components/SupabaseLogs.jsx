import React, { useState, useEffect } from 'react'
import { getSupabaseClient, getSupabaseConfig } from '../supabaseClient'
import { Database, RefreshCw, AlertTriangle, ShieldAlert, Sparkles, User, MapPin } from 'lucide-react'

export default function SupabaseLogs() {
  const [activeTab, setActiveTab] = useState('emergency') // emergency, asha, hospital
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [config, setConfig] = useState(null)

  const loadConfig = () => {
    setConfig(getSupabaseConfig())
  }

  const fetchLogs = async () => {
    loadConfig()
    const supabase = getSupabaseClient()
    if (!supabase) {
      setLogs([])
      return
    }

    setLoading(true)
    setError('')
    try {
      let query = null
      if (activeTab === 'emergency') {
        query = supabase
          .from('emergency_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20)
      } else if (activeTab === 'asha') {
        query = supabase
          .from('asha_consultations')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20)
      } else {
        query = supabase
          .from('hospital_queries')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }
      setLogs(data || [])
    } catch (err) {
      console.error(err)
      setError(err.message || 'Could not retrieve data from Supabase. Ensure tables are created.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [activeTab])

  const formatTime = (timeString) => {
    try {
      const d = new Date(timeString)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString()
    } catch (e) {
      return timeString
    }
  }

  const isConfigured = config && config.url && config.key

  return (
    <div className="supabase-logs-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={24} style={{ color: '#3ecf8e' }} /> Supabase Telemetry Monitor
            </h2>
            <p className="description" style={{ margin: 0 }}>
              Live tracker displaying logs stored in your remote Supabase DB. Useful for healthcare center monitoring.
            </p>
          </div>
          <button 
            className="btn btn-secondary" 
            onClick={fetchLogs} 
            disabled={loading || !isConfigured}
            style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
            Refresh Logs
          </button>
        </div>

        {!isConfigured ? (
          <div style={{ background: 'var(--severity-high-bg)', border: '1px solid rgba(249, 115, 22, 0.2)', padding: '1.5rem', borderRadius: '0.5rem', textAlign: 'center' }}>
            <AlertTriangle size={32} style={{ color: 'var(--severity-high)', marginBottom: '0.5rem' }} />
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Supabase Connection Not Configured</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '600px', margin: '0 auto' }}>
              Please go to the <strong>Settings</strong> tab to enter your Supabase URL and Anon Key. 
              Once connected, emergency telemetry will automatically be logged here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'var(--bg-base)', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>Connection status:</span>
              <span className="badge badge-success">Active Sync</span>
            </div>
            <span>•</span>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '400px', color: 'var(--text-secondary)' }}>
              URL: {config.url}
            </div>
          </div>
        )}
      </div>

      {isConfigured && (
        <>
          {/* Subnavigation Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <button 
              className={`nav-button ${activeTab === 'emergency' ? 'active' : ''}`}
              onClick={() => setActiveTab('emergency')}
              style={{ width: 'auto', padding: '0.5rem 1rem', borderLeft: 'none' }}
            >
              <Sparkles size={16} /> Emergency Logs
            </button>
            <button 
              className={`nav-button ${activeTab === 'asha' ? 'active' : ''}`}
              onClick={() => setActiveTab('asha')}
              style={{ width: 'auto', padding: '0.5rem 1rem', borderLeft: 'none' }}
            >
              <User size={16} /> ASHA Consults
            </button>
            <button 
              className={`nav-button ${activeTab === 'hospital' ? 'active' : ''}`}
              onClick={() => setActiveTab('hospital')}
              style={{ width: 'auto', padding: '0.5rem 1rem', borderLeft: 'none' }}
            >
              <MapPin size={16} /> Hospital Queries
            </button>
          </div>

          {error && (
            <div style={{ color: 'var(--severity-critical)', background: 'var(--severity-critical-bg)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: '700' }}>
                <ShieldAlert size={18} /> Retrieval Error
              </div>
              <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>{error}</p>
            </div>
          )}

          {/* Logs Listings */}
          <div className="card" style={{ padding: '1rem', overflowX: 'auto' }}>
            {logs.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <th style={{ padding: '0.75rem' }}>Time</th>
                    {activeTab === 'emergency' && (
                      <>
                        <th style={{ padding: '0.75rem' }}>Input Query</th>
                        <th style={{ padding: '0.75rem' }}>Analysis</th>
                        <th style={{ padding: '0.75rem' }}>Severity</th>
                        <th style={{ padding: '0.75rem' }}>Source</th>
                      </>
                    )}
                    {activeTab === 'asha' && (
                      <>
                        <th style={{ padding: '0.75rem' }}>Age</th>
                        <th style={{ padding: '0.75rem' }}>Symptoms</th>
                        <th style={{ padding: '0.75rem' }}>suspect</th>
                        <th style={{ padding: '0.75rem' }}>Severity</th>
                        <th style={{ padding: '0.75rem' }}>Referral</th>
                      </>
                    )}
                    {activeTab === 'hospital' && (
                      <>
                        <th style={{ padding: '0.75rem' }}>Latitude</th>
                        <th style={{ padding: '0.75rem' }}>Longitude</th>
                        <th style={{ padding: '0.75rem' }}>Clinics Found</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.9rem' }}>
                  {logs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                        {formatTime(log.created_at)}
                      </td>
                      
                      {activeTab === 'emergency' && (
                        <>
                          <td style={{ padding: '0.75rem', color: 'var(--text-primary)' }}>
                            {log.message}
                          </td>
                          <td style={{ padding: '0.75rem', fontWeight: '600' }}>
                            {log.emergency_name}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <span className={`severity-badge ${log.severity?.toLowerCase() || 'low'}`} style={{ fontSize: '0.75rem' }}>
                              {log.severity} ({log.severity_score})
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', textTransform: 'capitalize' }}>
                            {log.source}
                          </td>
                        </>
                      )}

                      {activeTab === 'asha' && (
                        <>
                          <td style={{ padding: '0.75rem' }}>{log.patient_age}</td>
                          <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{log.symptoms}</td>
                          <td style={{ padding: '0.75rem', fontWeight: '600' }}>{log.emergency_name}</td>
                          <td style={{ padding: '0.75rem' }}>
                            <span className={`severity-badge ${log.severity?.toLowerCase() || 'low'}`} style={{ fontSize: '0.75rem' }}>
                              {log.severity}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <span className={`badge ${log.referral_required ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: '0.75rem' }}>
                              {log.referral_required ? 'Yes' : 'No'}
                            </span>
                          </td>
                        </>
                      )}

                      {activeTab === 'hospital' && (
                        <>
                          <td style={{ padding: '0.75rem' }}>{log.lat.toFixed(6)}</td>
                          <td style={{ padding: '0.75rem' }}>{log.lng.toFixed(6)}</td>
                          <td style={{ padding: '0.75rem', fontWeight: '600' }}>{log.hospitals_found_count}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                {loading ? 'Fetching rows...' : 'No telemetry records logged yet.'}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
