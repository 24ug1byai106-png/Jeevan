import { createClient } from '@supabase/supabase-js'

// Helper to retrieve connection settings from either LocalStorage or Vite Env
export function getSupabaseConfig() {
  const localUrl = localStorage.getItem('supabase_url')
  const localKey = localStorage.getItem('supabase_anon_key')

  const config = {
    url: localUrl || import.meta.env.VITE_SUPABASE_URL || '',
    key: localKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    source: localUrl ? 'localstorage' : (import.meta.env.VITE_SUPABASE_URL ? 'env' : 'none')
  }
  return config
}

// Global cached client instance
let supabaseInstance = null

export function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance

  const { url, key } = getSupabaseConfig()

  if (url && key) {
    try {
      // Create a new Supabase client
      supabaseInstance = createClient(url, key)
      return supabaseInstance
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err)
      return null
    }
  }

  return null
}

// Reset instance when keys are updated via the settings panel
export function resetSupabaseClient() {
  supabaseInstance = null
  return getSupabaseClient()
}

// Telemetry logging helper
export async function logEmergencyToSupabase(logData) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    console.warn('Supabase not configured. Skipping remote telemetry log.')
    return { success: false, reason: 'unconfigured' }
  }

  try {
    const { error } = await supabase
      .from('emergency_logs')
      .insert([
        {
          message: logData.message,
          language: logData.language,
          emergency_name: logData.emergency,
          severity: logData.severity,
          severity_score: logData.severityScore,
          hospital_required: logData.hospitalRequired,
          source: logData.source || 'api'
        }
      ])
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Failed to log emergency report to Supabase:', error.message)
    return { success: false, error: error.message }
  }
}

export async function logAshaToSupabase(logData) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    console.warn('Supabase not configured. Skipping remote ASHA consultation log.')
    return { success: false, reason: 'unconfigured' }
  }

  try {
    const { error } = await supabase
      .from('asha_consultations')
      .insert([
        {
          patient_age: logData.patientAge,
          symptoms: logData.symptoms,
          language: logData.language,
          emergency_name: logData.emergency,
          severity: logData.severity,
          severity_score: logData.severityScore,
          referral_required: logData.referralRequired,
          source: logData.source || 'api'
        }
      ])
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Failed to log ASHA consultation to Supabase:', error.message)
    return { success: false, error: error.message }
  }
}

export async function logHospitalQueryToSupabase(lat, lng, count) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    console.warn('Supabase not configured. Skipping hospital locator log.')
    return { success: false, reason: 'unconfigured' }
  }

  try {
    const { error } = await supabase
      .from('hospital_queries')
      .insert([
        {
          lat,
          lng,
          hospitals_found_count: count
        }
      ])
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Failed to log hospital query to Supabase:', error.message)
    return { success: false, error: error.message }
  }
}
