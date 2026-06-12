import React, { useState, useEffect } from 'react'
import { getSupabaseConfig, resetSupabaseClient } from '../supabaseClient'
import { Database, Server, Save, CheckCircle, XCircle } from 'lucide-react'

export default function SettingsConfig({ apiHealth, refreshHealth }) {
  const [supabaseUrl, setSupabaseUrl] = useState('')
  const [supabaseKey, setSupabaseKey] = useState('')
  const [dbStatus, setDbStatus] = useState('untested') // untested, connecting, success, error
  const [dbError, setDbError] = useState('')
  const [saveStatus, setSaveStatus] = useState('')

  useEffect(() => {
    const config = getSupabaseConfig()
    setSupabaseUrl(config.url)
    setSupabaseKey(config.key)
  }, [])

  const handleSave = (e) => {
    e.preventDefault()
    localStorage.setItem('supabase_url', supabaseUrl.trim())
    localStorage.setItem('supabase_anon_key', supabaseKey.trim())
    
    // Reinitialize the Supabase client
    const client = resetSupabaseClient()
    setSaveStatus('Settings saved and client reinitialized!')
    setTimeout(() => setSaveStatus(''), 3000)

    if (client) {
      testSupabaseConnection(client)
    } else {
      setDbStatus('untested')
    }
  }

  const testSupabaseConnection = async (client) => {
    setDbStatus('connecting')
    setDbError('')
    try {
      // Run a simple query to test if credentials are valid
      // We query the emergency_logs table (even if it's empty, it shouldn't return authentication errors)
      const { data, error } = await client
        .from('emergency_logs')
        .select('id')
        .limit(1)

      if (error) {
        // If the table doesn't exist, that is a DB schema error, not a auth error
        if (error.code === 'PGRST116' || error.message.includes('relation "emergency_logs" does not exist')) {
          setDbStatus('success')
          setDbError('Connected! Note: Table "emergency_logs" is missing. Remember to execute the SQL setup scripts in your Supabase dashboard.')
        } else {
          throw error
        }
      } else {
        setDbStatus('success')
      }
    } catch (err) {
      console.error(err)
      setDbStatus('error')
      setDbError(err.message || 'Authentication failed. Please verify your Supabase URL and Anon Key.')
    }
  }

  const handleClear = () => {
    localStorage.removeItem('supabase_url')
    localStorage.removeItem('supabase_anon_key')
    setSupabaseUrl('')
    setSupabaseKey('')
    resetSupabaseClient()
    setDbStatus('untested')
    setDbError('')
  }

  return (
    <div className="settings-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="card">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Server size={24} className="text-primary" /> API Server Connection
        </h2>
        <p className="description">
          Status of the offline-first Jeevan AI Python backend. All emergency operations and voice transcriptions go through this endpoint.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-base)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>Backend Status:</span>
            <span className={`badge ${apiHealth === 'online' ? 'badge-success' : 'badge-danger'}`}>
              {apiHealth === 'online' ? 'Online' : 'Offline / Error'}
            </span>
          </div>
          <button className="btn btn-secondary" onClick={refreshHealth} style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
            Re-check
          </button>
        </div>
      </div>

      <div className="card">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Database size={24} style={{ color: '#3ecf8e' }} /> Supabase Integration
        </h2>
        <p className="description">
          Connect your custom Supabase database to upload emergency telemetry, logs, and coordination feeds in real-time.
        </p>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Supabase URL</label>
            <input
              type="url"
              className="form-input"
              placeholder="https://your-project.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Supabase Anon Key</label>
            <input
              type="password"
              className="form-input"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
            />
          </div>

          {saveStatus && (
            <div style={{ color: 'var(--severity-low)', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <CheckCircle size={18} /> {saveStatus}
            </div>
          )}

          {dbStatus === 'connecting' && (
            <div style={{ color: 'var(--severity-medium)', marginBottom: '1rem' }}>
              Testing database connection...
            </div>
          )}

          {dbStatus === 'success' && (
            <div style={{ color: 'var(--severity-low)', marginBottom: '1rem', background: 'var(--severity-low-bg)', border: '1px solid rgba(16,185,129,0.2)', padding: '0.75rem', borderRadius: '0.5rem' }}>
              <div style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={18} /> Supabase Connection Successful!
              </div>
              {dbError && <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>{dbError}</p>}
            </div>
          )}

          {dbStatus === 'error' && (
            <div style={{ color: 'var(--severity-critical)', marginBottom: '1rem', background: 'var(--severity-critical-bg)', border: '1px solid rgba(239,68,68,0.2)', padding: '0.75rem', borderRadius: '0.5rem' }}>
              <div style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <XCircle size={18} /> Connection Failed
              </div>
              <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>{dbError}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, backgroundColor: '#3ecf8e' }}>
              <Save size={18} /> Save Settings
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleClear}>
              Clear Config
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Supabase SQL Table Scripts</h3>
        <p className="description" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
          Execute this SQL schema inside your Supabase SQL Editor to provision the tables:
        </p>
        <pre style={{
          backgroundColor: 'var(--bg-base)',
          color: '#e2e8f0',
          padding: '1rem',
          borderRadius: '0.5rem',
          fontSize: '0.8rem',
          overflowX: 'auto',
          maxHeight: '200px',
          border: '1px solid var(--border-color)',
          fontFamily: 'monospace'
        }}>
{`create table emergency_logs (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    message text not null,
    language text not null,
    emergency_name text,
    severity text,
    severity_score integer,
    hospital_required boolean,
    source text
);

create table asha_consultations (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    patient_age integer not null,
    symptoms text not null,
    language text not null,
    emergency_name text,
    severity text,
    severity_score integer,
    referral_required boolean,
    source text
);

create table hospital_queries (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    lat double precision not null,
    lng double precision not null,
    hospitals_found_count integer
);`}
        </pre>
      </div>
    </div>
  )
}
