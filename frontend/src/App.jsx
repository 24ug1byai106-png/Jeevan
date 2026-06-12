import React, { useState, useEffect } from 'react'
import { Activity, ShieldAlert, Sparkles, User, MapPin, Settings, Database, HeartPulse, Sun, Moon } from 'lucide-react'

// Import components
import EmergencyAssistant from './components/EmergencyAssistant'
import AshaAssist from './components/AshaAssist'
import HospitalLocator from './components/HospitalLocator'
import SosAction from './components/SosAction'
import SettingsConfig from './components/SettingsConfig'
import SupabaseLogs from './components/SupabaseLogs'
import { getSupabaseClient } from './supabaseClient'

export default function App() {
  const [activeTab, setActiveTab] = useState('emergency')
  const [theme, setTheme] = useState('dark')
  const [apiHealth, setApiHealth] = useState('checking') // checking, online, offline
  const [supabaseActive, setSupabaseActive] = useState(false)

  // Poll backend health API
  const checkHealth = async () => {
    try {
      const response = await fetch('/health')
      if (response.ok) {
        setApiHealth('online')
      } else {
        setApiHealth('offline')
      }
    } catch (err) {
      console.warn('API health check error:', err)
      setApiHealth('offline')
    }
  }

  // Check Supabase configurations
  const checkSupabaseStatus = () => {
    const supabase = getSupabaseClient()
    setSupabaseActive(!!supabase)
  }

  useEffect(() => {
    checkHealth()
    checkSupabaseStatus()
    
    // Poll health status every 30 seconds
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  // Check Supabase when switching tabs or loading settings
  useEffect(() => {
    checkSupabaseStatus()
  }, [activeTab])

  // Apply light/dark theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="app-sidebar">
        <div className="brand-section">
          <div className="brand-logo">
            <HeartPulse size={32} />
          </div>
          <div>
            <h1 className="brand-title">Jeevan AI</h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>v1.0 • Rural Emergency</span>
          </div>
        </div>

        <nav style={{ flex: 1 }}>
          <ul className="nav-links">
            <li>
              <button 
                className={`nav-button ${activeTab === 'emergency' ? 'active' : ''}`}
                onClick={() => setActiveTab('emergency')}
              >
                <Sparkles size={20} />
                <span>Emergency Assistant</span>
              </button>
            </li>
            <li>
              <button 
                className={`nav-button ${activeTab === 'asha' ? 'active' : ''}`}
                onClick={() => setActiveTab('asha')}
              >
                <User size={20} />
                <span>ASHA Worker Assist</span>
              </button>
            </li>
            <li>
              <button 
                className={`nav-button ${activeTab === 'hospitals' ? 'active' : ''}`}
                onClick={() => setActiveTab('hospitals')}
              >
                <MapPin size={20} />
                <span>Hospital Locator</span>
              </button>
            </li>
            <li>
              <button 
                className={`nav-button ${activeTab === 'sos' ? 'active' : ''}`}
                onClick={() => setActiveTab('sos')}
                style={activeTab === 'sos' ? {} : { borderLeft: '3px solid transparent' }}
              >
                <ShieldAlert size={20} style={{ color: 'var(--severity-critical)' }} />
                <span style={{ color: activeTab === 'sos' ? 'var(--color-emergency)' : 'var(--text-primary)' }}>
                  <strong>SOS Quick Action</strong>
                </span>
              </button>
            </li>
            <li>
              <button 
                className={`nav-button ${activeTab === 'logs' ? 'active' : ''}`}
                onClick={() => setActiveTab('logs')}
              >
                <Database size={20} />
                <span>Supabase Sync Log</span>
              </button>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button 
            className={`nav-button ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={20} />
            <span>Config & Settings</span>
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <button 
              className="btn btn-secondary"
              onClick={toggleTheme}
              style={{ width: '40px', height: '40px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyWindow: 'center' }}
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Offline-first Ready</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="app-content">
        <header className="app-header">
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', trackingLetter: '0.05em' }}>
              Multilingual Rural Healthcare Assistant
            </span>
            <h1 className="page-title">
              {activeTab === 'emergency' && 'Emergency AI Analysis'}
              {activeTab === 'asha' && 'ASHA Triage Protocol'}
              {activeTab === 'hospitals' && 'Nearby Clinics & Emergency Care'}
              {activeTab === 'sos' && 'Instant SOS Activation'}
              {activeTab === 'logs' && 'Supabase Database Dashboard'}
              {activeTab === 'settings' && 'System Configuration Settings'}
            </h1>
          </div>

          <div className="status-badges">
            <div className={`badge ${apiHealth === 'online' ? 'badge-success' : 'badge-danger'}`} title="FastAPI server connection check">
              <Activity size={12} />
              API: {apiHealth === 'online' ? 'Online' : apiHealth === 'checking' ? 'Checking' : 'Offline'}
            </div>

            <div className={`badge ${supabaseActive ? 'badge-success' : 'badge-danger'}`} style={supabaseActive ? { backgroundColor: 'rgba(62,207,142,0.1)', color: '#3ecf8e', borderColor: 'rgba(62,207,142,0.2)' } : {}} title="Supabase Database sync status">
              <Database size={12} />
              Supabase: {supabaseActive ? 'Connected' : 'Offline'}
            </div>
          </div>
        </header>

        {/* Dynamic Route Frame */}
        <div className="content-frame" style={{ flex: 1 }}>
          {activeTab === 'emergency' && <EmergencyAssistant />}
          {activeTab === 'asha' && <AshaAssist />}
          {activeTab === 'hospitals' && <HospitalLocator />}
          {activeTab === 'sos' && <SosAction />}
          {activeTab === 'logs' && <SupabaseLogs />}
          {activeTab === 'settings' && (
            <SettingsConfig apiHealth={apiHealth} refreshHealth={checkHealth} />
          )}
        </div>
      </main>
    </div>
  )
}
