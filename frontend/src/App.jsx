import React, { useState, useEffect, useRef } from 'react'
import { Activity, ShieldAlert, Sparkles, User, MapPin, Database, ShieldPlus, Wifi, Bell, UserCircle, HeartPulse, Zap, Droplet, Flame, PhoneCall, Mic, Stethoscope, Navigation, ActivitySquare, AlertCircle, Leaf, RadioTower, PlusSquare, Home, Building, MessageSquare, CheckSquare } from 'lucide-react'
import { motion, useScroll, useTransform, animate, useInView, AnimatePresence } from 'framer-motion'

// Import components
import EmergencyAssistant from './components/EmergencyAssistant'
import AshaAssist from './components/AshaAssist'
import HospitalLocator from './components/HospitalLocator'
import SosAction from './components/SosAction'
import { useLanguage } from './contexts/LanguageContext'

function AnimatedCounter({ from = 0, to, duration = 2, suffix = '', isDecimal = false }) {
  const [count, setCount] = useState(from)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  useEffect(() => {
    if (isInView) {
      const controls = animate(from, to, {
        duration,
        ease: "easeOut",
        onUpdate(value) {
          setCount(value)
        }
      })
      return () => controls.stop()
    }
  }, [isInView, from, to, duration])

  const displayValue = isDecimal ? count.toFixed(1) : Math.round(count)
  return <span ref={ref}>{displayValue}{suffix}</span>
}

export default function App() {
  const [apiHealth, setApiHealth] = useState('checking')
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [quickActionText, setQuickActionText] = useState('')
  const [activeTab, setActiveTab] = useState('home')

  const { scrollYProgress } = useScroll()
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '50%'])
  const imageScale = useTransform(scrollYProgress, [0, 0.5], [1, 1.1])

  const { t, appLanguage, setAppLanguage } = useLanguage()

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

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 30000)
    
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleQuickAction = (text) => {
    setQuickActionText(text)
    setActiveTab('health') // Instantly switch to the Health tab where the AI assistant is
  }

  const quickActionsList = [
    { id: 'snake', labelKey: 'home.quick.snake', icon: Zap, color: '#f59e0b', text: 'Someone was just bitten by a snake in the field. Swelling is starting.' },
    { id: 'heat', labelKey: 'home.quick.heat', icon: SunIcon, color: '#ef4444', text: 'Farmer collapsed from extreme heat, skin is dry and hot, pulse is rapid.' },
    { id: 'pesticide', labelKey: 'home.quick.pesticide', icon: Droplet, color: '#8b5cf6', text: 'Accidental inhalation and skin contact with chemical pesticides. Experiencing dizziness and nausea.' },
    { id: 'burns', labelKey: 'home.quick.burns', icon: Flame, color: '#f97316', text: 'Burn injury from electrical equipment/fire. Blistering skin.' },
    { id: 'fracture', labelKey: 'home.quick.fracture', icon: Activity, color: '#3b82f6', text: 'Fell from a tractor. Severe pain in leg, unable to move it.' },
    { id: 'contacts', labelKey: 'home.quick.contacts', icon: PhoneCall, color: '#10b981', text: 'Need immediate ambulance and local village health officer contact.' },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 12 } }
  }

  return (
    <div className="app-container">
      
      {/* LEFT SIDEBAR */}
      <aside className="app-sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'white', cursor: 'pointer' }} onClick={() => setActiveTab('home')}>
          <Leaf size={28} fill="currentColor" />
          <h1 style={{ fontSize: '1.4rem', fontWeight: '800', letterSpacing: '-0.02em', display: 'flex', flexDirection: 'column' }}>
            <span>{t("app.title")}</span>
            <span style={{ fontSize: '0.6rem', background: 'var(--color-gold)', color: 'var(--color-primary)', padding: '0.1rem 0.4rem', borderRadius: '4px', alignSelf: 'flex-start', fontWeight: '800' }}>{t("app.beta")}</span>
          </h1>
        </div>

        <div className="sidebar-links">
          <button className={`sidebar-btn ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
            <Home size={18} /> {t("sidebar.home")}
          </button>
          <button className={`sidebar-btn ${activeTab === 'health' ? 'active' : ''}`} onClick={() => setActiveTab('health')}>
            <Sparkles size={18} /> {t("sidebar.ai_assistant")}
          </button>
          <button className={`sidebar-btn ${activeTab === 'hospitals' ? 'active' : ''}`} onClick={() => setActiveTab('hospitals')}>
            <Building size={18} /> {t("sidebar.hospitals")}
          </button>
          <button className={`sidebar-btn ${activeTab === 'ai-chat' ? 'active' : ''}`} onClick={() => setActiveTab('ai-chat')}>
            <MessageSquare size={18} /> {t("sidebar.asha_protocol")}
          </button>
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ background: 'rgba(0,0,0,0.1)', padding: '0.75rem', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', fontWeight: '700' }}>{t("sidebar.language")}</label>
            <select 
              value={appLanguage} 
              onChange={(e) => setAppLanguage(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '0.5rem', borderRadius: '0.25rem', outline: 'none' }}
            >
              <option value="English" style={{ color: 'black' }}>English</option>
              <option value="Hindi" style={{ color: 'black' }}>हिन्दी (Hindi)</option>
              <option value="Kannada" style={{ color: 'black' }}>ಕನ್ನಡ (Kannada)</option>
              <option value="Tamil" style={{ color: 'black' }}>தமிழ் (Tamil)</option>
              <option value="Telugu" style={{ color: 'black' }}>తెలుగు (Telugu)</option>
            </select>
          </div>

          {isOffline ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#fca5a5' }}>
              <Wifi size={14} /> {t("sidebar.offline_ready")}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#6ee7b7' }}>
              <Wifi size={14} /> {t("sidebar.api_online")}
            </div>
          )}
          
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn" 
            onClick={() => setActiveTab('sos')}
            style={{ background: 'linear-gradient(90deg, #dc2626 0%, #ef4444 100%)', color: 'white', padding: '1rem', border: '2px solid rgba(255,255,255,0.2)', width: '100%', justifyContent: 'center' }}>
            <AlertCircle size={18} /> {t("sidebar.emergency")}
          </motion.button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="app-main">
        

        {/* Background Decor */}
        <div className="bg-orb green" style={{ width: '800px', height: '800px', top: '15%', right: '-10%' }}></div>
        <div className="bg-orb gold" style={{ width: '600px', height: '600px', top: '45%', left: '-10%' }}></div>
        
        {/* Subtle Leaf Patterns SVG */}
        <motion.svg style={{ y: heroY, top: '25%', left: '5%', width: '150px', position: 'absolute' }} className="leaf-pattern animate-float" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zM12 20c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><path d="M11 11c0 2.21-1.79 4-4 4s-4-1.79-4-4 1.79-4 4-4 4 1.79 4 4z"/>
        </motion.svg>

        <div style={{ flex: 1, position: 'relative', zIndex: 2 }}>
          <AnimatePresence mode="wait">
            
            {/* --- HOME VIEW --- */}
            {activeTab === 'home' && (
              <motion.div 
                key="home"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <section className="hero-section">
                  <div className="hero-grid">
                    {/* Left Content Column */}
                    <div className="hero-content">
                      <div className="badge" style={{ backgroundColor: '#c6f6d5', color: 'var(--color-primary)', marginBottom: '2rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                        <Leaf size={14} /> {t("home.badge")}
                      </div>
                      
                      <h1 className="hero-title">
                        {t("home.title.part1")} <br/><span>{t("home.title.part2")}</span>
                      </h1>
                      
                      <p className="hero-subtitle">
                        {t("home.subtitle")}
                      </p>
                      
                      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '3rem' }}>
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="btn btn-primary" 
                          onClick={() => setActiveTab('sos')} 
                          style={{ padding: '1rem 2rem', fontSize: '1rem', flex: 1, display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                          <RadioTower size={20} />
                          <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
                            <div style={{ fontWeight: '700' }}>{t("home.btn.emergency.line1")}</div>
                            <div style={{ fontWeight: '700' }}>{t("home.btn.emergency.line2")}</div>
                          </div>
                        </motion.button>
                        
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="btn btn-secondary glass" 
                          onClick={() => setActiveTab('hospitals')} 
                          style={{ padding: '1rem 2rem', fontSize: '1rem', flex: 1, display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                          <PlusSquare size={20} color="var(--color-primary)" />
                          <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
                            <div style={{ fontWeight: '700' }}>{t("home.btn.hospital.line1")}</div>
                            <div style={{ fontWeight: '700' }}>{t("home.btn.hospital.line2")}</div>
                          </div>
                        </motion.button>
                      </div>

                      {/* Stats Row */}
                      <div style={{ display: 'flex', gap: '3rem', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '2rem' }}>
                        <div>
                          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-primary)', lineHeight: '1' }}>
                            <AnimatedCounter to={2.3} isDecimal={true} suffix="L+" />
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t("home.stats.helped")}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-primary)', lineHeight: '1' }}>
                            <AnimatedCounter to={4} suffix=" min" />
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t("home.stats.response")}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-primary)', lineHeight: '1' }}>
                            <AnimatedCounter to={18} suffix="+" />
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t("home.stats.states")}</div>
                        </div>
                      </div>
                    </div>

                    {/* Right Image Column */}
                    <div className="hero-image-wrapper">
                      <motion.img 
                        src="/hero-farmer.png" 
                        alt="Indian Farmer" 
                        className="hero-image"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1 }}
                      />
                      
                      {/* Holograms */}
                      <div className="hologram-card animate-float" style={{ top: '35%', left: '-5%', padding: '0.75rem 1.25rem' }}>
                        <div style={{ background: '#e0e7ff', padding: '0.4rem', borderRadius: '50%' }}><MapPin size={14} color="#4338ca" /></div>
                        <div>
                          <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '800' }}>{t("home.hologram1.shared")}</div>
                          <div style={{ fontSize: '0.9rem', color: 'var(--color-primary)', lineHeight: '1.2' }}>{t("home.hologram1.tracked")}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '500' }}>{t("home.hologram1.pin")}</div>
                        </div>
                      </div>

                      <div className="hologram-card animate-float-delayed" style={{ top: '15%', right: '5%', padding: '0.75rem 1.25rem' }}>
                        <div>
                          <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span style={{ color: '#dc2626' }}>*</span> {t("home.hologram2.eta")}
                          </div>
                          <div style={{ fontSize: '1.25rem', color: 'var(--color-primary)', lineHeight: '1.2', fontWeight: '800' }}>8 min</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '500' }}>{t("home.hologram2.dispatched")}</div>
                        </div>
                      </div>

                      <div className="hologram-card animate-float-reverse" style={{ bottom: '25%', right: '-10%', maxWidth: '220px', padding: '0.75rem 1.25rem' }}>
                        <div>
                          <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--color-primary)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                            <ActivitySquare size={12} /> {t("home.hologram3.step")}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500', lineHeight: '1.4' }}>
                            {t("home.hologram3.text")}
                          </div>
                        </div>
                      </div>

                      <div className="hologram-card animate-pulse-glow" style={{ bottom: '5%', left: '50%', transform: 'translateX(-50%)', padding: '0.5rem 1.5rem', borderRadius: '999px', background: 'white' }}>
                        <div style={{ fontSize: '1rem', color: 'var(--color-primary)', fontWeight: '800' }}>{t("home.hologram4.text")}</div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="section-container" style={{ paddingTop: 0 }}>
                  <div className="section-header">
                    <h2 className="section-title">{t("home.quick.title")}</h2>
                    <p className="section-subtitle">{t("home.quick.subtitle")}</p>
                  </div>
                  <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="quick-action-grid"
                  >
                    {quickActionsList.map(action => {
                      const IconComponent = action.icon;
                      return (
                        <motion.div 
                          key={action.id} 
                          variants={itemVariants}
                          whileHover={{ scale: 1.05, y: -8 }}
                          whileTap={{ scale: 0.95 }}
                          className="quick-action-btn" 
                          onClick={() => handleQuickAction(action.text)}
                        >
                          <div className="quick-action-icon" style={{ color: action.color, backgroundColor: `${action.color}15` }}>
                            <IconComponent size={24} />
                          </div>
                          <h4 style={{ fontSize: '1.1rem', textAlign: 'center', color: 'var(--text-primary)' }}>{t(action.labelKey)}</h4>
                        </motion.div>
                      )
                    })}
                  </motion.div>
                </section>
              </motion.div>
            )}

            {/* --- HEALTH VIEW --- */}
            {activeTab === 'health' && (
              <motion.div
                key="health"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                style={{ padding: '2rem 4rem', height: '100vh', display: 'flex', alignItems: 'center' }}
              >
                <div style={{ display: 'flex', height: '85vh', width: '100%', gap: '4rem' }}>
                  
                  {/* Left Column - Farmer & Holograms */}
                  <div style={{ flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '1', borderRadius: '2rem' }}>
                      <motion.img 
                        src="/farmer_assistant_2.png" 
                        alt="Farmer AI Assistant" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '2rem', boxShadow: 'var(--shadow-xl)' }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1 }}
                      />
                      
                      {/* Floating Holograms */}
                      <div className="hologram-card animate-float" style={{ top: '15%', left: '-5%' }}>
                        <div style={{ background: '#e0e7ff', padding: '0.4rem', borderRadius: '50%' }}><Sparkles size={14} color="#4338ca" /></div>
                        <div>
                          <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '800' }}>AI ANALYSIS</div>
                          <div style={{ fontSize: '0.9rem', color: 'var(--color-primary)', lineHeight: '1.2' }}>Listening to Symptoms</div>
                        </div>
                      </div>

                      <div className="hologram-card animate-float-delayed" style={{ bottom: '25%', right: '-10%' }}>
                        <div>
                          <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--color-primary)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                            <CheckSquare size={12} /> PROTOCOL VERIFIED
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500', lineHeight: '1.4' }}>
                            Generating multi-lingual first aid...
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - ChatGPT Interface */}
                  <div style={{ flex: '1.2', display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255, 255, 255, 0.8)', borderRadius: '1.5rem', boxShadow: 'var(--shadow-xl)', overflow: 'hidden' }}>
                    <EmergencyAssistant externalMessage={quickActionText} />
                  </div>
                  
                </div>
              </motion.div>
            )}

            {/* --- HOSPITALS VIEW --- */}
            {activeTab === 'hospitals' && (
              <motion.div
                key="hospitals"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                style={{ padding: '4rem' }}
              >
                <div className="section-header">
                  <h2 className="section-title">{t("hospital.header.title")}</h2>
                  <p className="section-subtitle">{t("hospital.header.subtitle")}</p>
                </div>
                <HospitalLocator />
              </motion.div>
            )}

            {/* --- AI CHAT VIEW (ASHA) --- */}
            {activeTab === 'ai-chat' && (
              <motion.div
                key="ai-chat"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                style={{ padding: '4rem' }}
              >
                <div className="section-header">
                  <div className="badge badge-success glass" style={{ marginBottom: '1rem' }}>
                    <Stethoscope size={14} /> {t("asha.header.badge")}
                  </div>
                  <h2 className="section-title">{t("asha.header.title")}</h2>
                  <p className="section-subtitle">{t("asha.header.subtitle")}</p>
                </div>
                <AshaAssist />
              </motion.div>
            )}

            {/* --- SOS VIEW --- */}
            {activeTab === 'sos' && (
              <motion.div
                key="sos"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, type: 'spring' }}
                style={{ padding: '4rem' }}
              >
                <div className="glass-card" style={{ background: 'var(--color-primary)', color: 'white', position: 'relative', overflow: 'hidden', padding: '4rem' }}>
                  <div className="bg-orb gold" style={{ width: '400px', height: '400px', top: '10%', right: '20%' }}></div>
                  <div className="section-header" style={{ color: 'white', zIndex: 2, position: 'relative' }}>
                    <div className="badge animate-pulse-glow" style={{ background: 'var(--severity-critical)', color: 'white', marginBottom: '1.5rem', border: 'none', padding: '0.5rem 1rem' }}>
                      <AlertCircle size={16} /> {t("sos.header.badge")}
                    </div>
                    <h2 className="section-title" style={{ color: 'white' }}>{t("sos.header.title")}</h2>
                    <p className="section-subtitle" style={{ color: 'rgba(255,255,255,0.8)' }}>{t("sos.header.subtitle")}</p>
                  </div>
                  <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
                    <SosAction />
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </main>
    </div>
  )
}

// Simple Sun Icon Component
function SunIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="4"></circle>
      <path d="M12 2v2"></path>
      <path d="M12 20v2"></path>
      <path d="M4.93 4.93l1.41 1.41"></path>
      <path d="M17.66 17.66l1.41 1.41"></path>
      <path d="M2 12h2"></path>
      <path d="M20 12h2"></path>
      <path d="M6.34 17.66l-1.41 1.41"></path>
      <path d="M19.07 4.93l-1.41 1.41"></path>
    </svg>
  );
}
