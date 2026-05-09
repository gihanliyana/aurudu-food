import { useState, useEffect } from 'react'
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy, runTransaction, getDocs,
  setDoc, increment
} from 'firebase/firestore'
import { db } from './firebase'

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const LS_KEY = 'aurudu_phone'

const FOODS = [
  { name: 'Kiribath Half Tray (Slot #1)',    cat: 'Main Meal Items' },
  { name: 'Kiribath Half Tray (Slot #2)',    cat: 'Main Meal Items' },
  { name: 'Kiribath Half Tray (Slot #3)',    cat: 'Main Meal Items' },
  { name: 'Kiribath(Rathu) Half Tray',       cat: 'Main Meal Items' },
  { name: 'Yellow Rice Half Tray (Slot #1)', cat: 'Main Meal Items' },
  { name: 'Yellow Rice Half Tray (Slot #2)', cat: 'Main Meal Items' },
  { name: 'Kids Noodles Half Tray',          cat: 'Main Meal Items' },
  { name: 'Konda Kewum',                     cat: 'Traditional Sweets' },
  { name: 'Butter Cake',                     cat: 'Traditional Sweets' },
  { name: 'Milk Toffee',                     cat: 'Traditional Sweets' },
  { name: 'Kokis (Slot #1)',                 cat: 'Traditional Sweets' },
  { name: 'Kokis (Slot #2)',                 cat: 'Traditional Sweets' },
  { name: 'Aluwa',                           cat: 'Traditional Sweets' },
  { name: 'Mung Kewum',                      cat: 'Traditional Sweets' },
  { name: 'Pol Toffee',                      cat: 'Traditional Sweets' },
  { name: 'Banana',                          cat: 'Traditional Sweets' },
  { name: 'Welithalapa',                     cat: 'Traditional Sweets' },
  { name: 'Aggala/Munguli',                  cat: 'Traditional Sweets' },
  { name: 'Chocolate Cake',                  cat: 'Traditional Sweets' },
  { name: 'Potato/Milk Toffee',              cat: 'Traditional Sweets' },
  { name: 'Naran Kevum',                     cat: 'Traditional Sweets' },
  { name: 'Lunu Miris',                      cat: 'Curries & Sides' },
  { name: 'Dhal Curry',                      cat: 'Curries & Sides' },
  { name: 'Chicken Curry',                   cat: 'Curries & Sides' },
  { name: 'Fish Ambul Thiyal',               cat: 'Curries & Sides' },
]

const CAT_ORDER = ['Main Meal Items', 'Traditional Sweets', 'Curries & Sides']

const CAT_CFG = {
  'Main Meal Items':    { bg:'#dbeafe', text:'#1e40af', border:'#93c5fd', rowBg:'#eff6ff', head:'#1e40af' },
  'Traditional Sweets': { bg:'#fef3c7', text:'#92400e', border:'#fcd34d', rowBg:'#fffbeb', head:'#92400e' },
  'Curries & Sides':   { bg:'#fee2e2', text:'#991b1b', border:'#fca5a5', rowBg:'#fff5f5', head:'#991b1b' },
  'Custom':            { bg:'#f3e8ff', text:'#6b21a8', border:'#d8b4fe', rowBg:'#faf5ff', head:'#6b21a8' },
}

const knownFoodSet = new Set(FOODS.map(f => f.name))

function normalisePhone(raw) { return raw.replace(/\D/g, '') }

// ─────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────
function FoodTag({ food }) {
  const cat = FOODS.find(f => f.name === food)?.cat
  const cfg = cat ? CAT_CFG[cat] : CAT_CFG['Custom']
  return (
    <span style={{ fontSize:12, padding:'2px 9px', borderRadius:6,
      background:cfg.bg, color:cfg.text, border:`0.5px solid ${cfg.border}` }}>
      {food}
    </span>
  )
}

function NavBar({ page, setPage }) {
  const tabs = [
    { id:'home',     label:'🏠 Home' },
    { id:'food',     label:'🍛 Food Sign-up' },
    { id:'families', label:'👨‍👩‍👧‍👦 Families' },
    { id:'games',    label:'🏆 Games' },
  ]
  return (
    <nav style={{ background:'#166534', padding:'0 1rem', display:'flex', gap:4,
      position:'sticky', top:0, zIndex:100, boxShadow:'0 2px 8px rgba(0,0,0,0.15)' }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setPage(t.id)}
          style={{ padding:'12px 14px', fontSize:13, fontWeight: page===t.id ? 700 : 400,
            cursor:'pointer', border:'none', background:'transparent',
            color: page===t.id ? 'white' : 'rgba(255,255,255,0.65)',
            borderBottom: page===t.id ? '2px solid white' : '2px solid transparent',
            transition:'all 0.15s' }}>
          {t.label}
        </button>
      ))}
    </nav>
  )
}

function Footer() {
  return (
    <footer style={{ marginTop:'3rem', padding:'1.5rem 1rem', borderTop:'1px solid #e5e7eb',
      textAlign:'center', background:'#f9fafb' }}>
      <p style={{ fontSize:12, color:'#9ca3af', margin:0 }}>
        Copyright © 2026 SL Pitts Friends Group. All rights reserved.
      </p>
    </footer>
  )
}

// ─────────────────────────────────────────────────────────────
// Phone Gate
// ─────────────────────────────────────────────────────────────
function PhoneGate({ onAccess }) {
  const [phone, setPhone]     = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    const digits = normalisePhone(phone)
    if (digits.length < 7) { setError('Please enter a valid phone number'); return }
    setLoading(true)
    try {
      const ref = doc(db, 'access_log', digits)
      await setDoc(ref, {
        phone: phone.trim(),
        lastAccessed: serverTimestamp(),
        accessCount: increment(1),
      }, { merge: true })
      localStorage.setItem(LS_KEY, phone.trim())
      onAccess(phone.trim())
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center',
      justifyContent:'center', padding:'1rem', background:'#f9fafb' }}>
      <div style={{ background:'white', borderRadius:16, padding:'2rem',
        width:'100%', maxWidth:380, boxShadow:'0 4px 24px rgba(0,0,0,0.08)',
        border:'1px solid #e5e7eb' }}>
        <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
          <div style={{ fontSize:36, marginBottom:12 }}>🇱🇰</div>
          <h1 style={{ fontSize:20, fontWeight:700, margin:'0 0 6px', color:'#111827' }}>
            SL Pitts Aurudu 2026
          </h1>
          <p style={{ fontSize:13, color:'#6b7280', margin:0, lineHeight:1.6 }}>
            This page is for invited families only.<br />
            Please enter your phone number to continue.
          </p>
        </div>
        <div style={{ marginBottom:'1rem' }}>
          <label style={{ fontSize:13, fontWeight:500, color:'#374151', display:'block', marginBottom:6 }}>
            Phone number
          </label>
          <input type="tel" value={phone}
            onChange={e => { setPhone(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="e.g. 412-377-7786" autoFocus
            style={{ width:'100%', padding:'10px 12px', borderRadius:8, fontSize:14,
              border: error ? '1px solid #ef4444' : '1px solid #d1d5db',
              outline:'none', boxSizing:'border-box' }} />
          {error && <p style={{ fontSize:12, color:'#ef4444', margin:'6px 0 0' }}>{error}</p>}
        </div>
        <p style={{ fontSize:11, color:'#9ca3af', margin:'0 0 1rem', lineHeight:1.5 }}>
          Your number is only used to track the food signup. No spams 😄
        </p>
        <button onClick={handleSubmit} disabled={loading}
          style={{ width:'100%', padding:'11px', borderRadius:8, fontSize:14,
            fontWeight:600, cursor:'pointer', border:'none',
            background: loading ? '#4ade80' : '#166534', color:'white' }}>
          {loading ? 'Verifying...' : 'Continue'}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Weather widget (Open-Meteo, no API key needed)
// ─────────────────────────────────────────────────────────────
const WMO_LABELS = {
  0:'Clear sky', 1:'Mainly clear', 2:'Partly cloudy', 3:'Overcast',
  45:'Foggy', 48:'Icy fog', 51:'Light drizzle', 53:'Drizzle', 55:'Heavy drizzle',
  61:'Light rain', 63:'Rain', 65:'Heavy rain', 71:'Light snow', 73:'Snow', 75:'Heavy snow',
  80:'Rain showers', 81:'Rain showers', 82:'Violent showers',
  95:'Thunderstorm', 96:'Thunderstorm w/ hail', 99:'Thunderstorm w/ hail',
}
const WMO_EMOJI = {
  0:'☀️', 1:'🌤️', 2:'⛅', 3:'☁️', 45:'🌫️', 48:'🌫️',
  51:'🌦️', 53:'🌦️', 55:'🌧️', 61:'🌧️', 63:'🌧️', 65:'🌧️',
  71:'❄️', 73:'❄️', 75:'❄️', 80:'🌦️', 81:'🌧️', 82:'⛈️',
  95:'⛈️', 96:'⛈️', 99:'⛈️',
}

function WeatherWidget() {
  const [wx, setWx]     = useState(null)
  const [wxErr, setWxErr] = useState(false)

  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=40.5529&longitude=-79.9943&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max&temperature_unit=fahrenheit&timezone=America%2FNew_York&start_date=2026-05-09&end_date=2026-05-09')
      .then(r => r.json())
      .then(d => {
        const daily = d.daily
        setWx({
          max:   Math.round(daily.temperature_2m_max[0]),
          min:   Math.round(daily.temperature_2m_min[0]),
          code:  daily.weathercode[0],
          rain:  daily.precipitation_probability_max[0],
        })
      })
      .catch(() => setWxErr(true))
  }, [])

  if (wxErr) return null
  if (!wx) return (
    <div style={{ padding:'12px 16px', borderRadius:12, background:'#f0fdf4',
      border:'1px solid #86efac', fontSize:13, color:'#166534', textAlign:'center' }}>
      Loading May 9 weather...
    </div>
  )

  const emoji = WMO_EMOJI[wx.code] || '🌡️'
  const label = WMO_LABELS[wx.code] || 'Mixed conditions'

  return (
    <div style={{ padding:'16px 20px', borderRadius:14, background:'linear-gradient(135deg,#f0fdf4,#dcfce7)',
      border:'1px solid #86efac', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
      <div style={{ fontSize:42 }}>{emoji}</div>
      <div style={{ flex:1 }}>
        <p style={{ fontSize:11, fontWeight:600, color:'#166534', margin:'0 0 2px',
          textTransform:'uppercase', letterSpacing:'0.07em' }}>May 9 Weather · North Park, Pittsburgh</p>
        <p style={{ fontSize:20, fontWeight:700, color:'#14532d', margin:'0 0 2px' }}>
          {wx.max}°F / {wx.min}°F
        </p>
        <p style={{ fontSize:13, color:'#166534', margin:0 }}>{label}</p>
      </div>
      <div style={{ textAlign:'center', padding:'8px 14px', background:'white',
        borderRadius:10, border:'1px solid #86efac' }}>
        <p style={{ fontSize:11, color:'#6b7280', margin:'0 0 2px' }}>Rain chance</p>
        <p style={{ fontSize:18, fontWeight:700, color: wx.rain > 50 ? '#dc2626' : '#166534', margin:0 }}>
          {wx.rain}%
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Home Page
// ─────────────────────────────────────────────────────────────
function HomePage({ setPage, signupCount, familyCount }) {
  return (
    <div style={{ maxWidth:680, margin:'0 auto', padding:'0 1rem 2rem' }}>

      {/* Event details (header top) */}
      <div style={{ textAlign:'center', marginBottom:'1.25rem', paddingTop:'1.5rem' }}>
        <p style={{ fontSize:12, color:'#9ca3af', margin:'0 0 4px', letterSpacing:'0.1em' }}>
          අලුත් අවුරුදු 2026
        </p>
        <h1 style={{ fontSize:26, fontWeight:700, margin:'0 0 6px', color:'#111827' }}>
          Pittsburgh Aurudu Celebration
        </h1>
        <p style={{ fontSize:14, color:'#6b7280', margin:'0 0 1.25rem' }}>
          05/09 · 8:30 AM until sunset &nbsp;·&nbsp;{' '}
          <a href="https://share.google/IwYq0P0lnavxqvXis"
            target="_blank" rel="noreferrer"
            style={{ color:'#1d4ed8', textDecoration:'underline' }}>
            Garner Pavilion · North Park
          </a>
        </p>
        <div style={{ fontSize:13, color:'#6b7280', lineHeight:1.7, textAlign:'left',
          padding:'1rem 1.25rem', background:'#f9fafb', borderRadius:12, border:'1px solid #e5e7eb',
          marginBottom:'1.25rem' }}>
          We're excited to celebrate Sinhala and Tamil New Year together! Please sign up to bring one
          or more food items from the list. You can also add a custom dish if you prefer.
          <br /><br />
          We'll have around 19 families (30 adults, 6 big kids, and 6 small kids), so every
          contribution helps. We're also sharing lunch items. If all items aren't covered, we may
          arrange catering and split the cost among families later.
          <br /><br />
          Thank you for helping make this a great celebration!
        </div>
      </div>

      {/* Weather */}
      <div style={{ marginBottom:'1.25rem' }}>
        <WeatherWidget />
      </div>

      {/* Hero image — reduced size */}
      <div style={{ margin:'0 auto 1.5rem', borderRadius:14, overflow:'hidden',
        boxShadow:'0 4px 20px rgba(0,0,0,0.10)', border:'3px solid #d4a017',
        maxWidth:'60%' }}>
        <img src="https://i.postimg.cc/sX03Lgbw/IMG-6624.jpg"
          alt="SL Pitts Aurudu 2026"
          style={{ width:'100%', display:'block', objectFit:'cover' }} />
      </div>

      {/* Quick stats */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:'1.5rem' }}>
        <div style={{ padding:'14px', borderRadius:12, background:'#fef3c7',
          border:'1px solid #fcd34d', textAlign:'center' }}>
          <p style={{ fontSize:28, fontWeight:700, margin:'0 0 2px', color:'#92400e' }}>{signupCount}</p>
          <p style={{ fontSize:12, color:'#92400e', margin:0 }}>Food sign-ups</p>
        </div>
        <div style={{ padding:'14px', borderRadius:12, background:'#dbeafe',
          border:'1px solid #93c5fd', textAlign:'center' }}>
          <p style={{ fontSize:28, fontWeight:700, margin:'0 0 2px', color:'#1e40af' }}>{familyCount}</p>
          <p style={{ fontSize:12, color:'#1e40af', margin:0 }}>Families registered</p>
        </div>
      </div>

      {/* Navigation cards */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:'1rem' }}>
        <button onClick={() => setPage('food')}
          style={{ padding:'1.25rem', borderRadius:14, background:'#166534', color:'white',
            border:'none', cursor:'pointer', textAlign:'left',
            boxShadow:'0 2px 12px rgba(22,101,52,0.3)' }}>
          <div style={{ fontSize:28, marginBottom:8 }}>🍛</div>
          <p style={{ fontSize:15, fontWeight:700, margin:'0 0 4px' }}>Food Sign-up</p>
          <p style={{ fontSize:12, opacity:0.8, margin:0 }}>Pick what you're bringing</p>
        </button>
        <button onClick={() => setPage('families')}
          style={{ padding:'1.25rem', borderRadius:14, background:'#1e40af', color:'white',
            border:'none', cursor:'pointer', textAlign:'left',
            boxShadow:'0 2px 12px rgba(30,64,175,0.3)' }}>
          <div style={{ fontSize:28, marginBottom:8 }}>👨‍👩‍👧‍👦</div>
          <p style={{ fontSize:15, fontWeight:700, margin:'0 0 4px' }}>My Family</p>
          <p style={{ fontSize:12, opacity:0.8, margin:0 }}>Register your family members</p>
        </button>
      </div>

      <Footer />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Families Page
// ─────────────────────────────────────────────────────────────
const GENDERS = ['Male', 'Female', 'Other']

function FamiliesPage() {
  const [families, setFamilies]         = useState([])
  const [loading, setLoading]           = useState(true)

  // Form state
  const [showForm, setShowForm]         = useState(false)
  const [editFamilyId, setEditFamilyId] = useState(null)
  const [familyName, setFamilyName]     = useState('')
  const [members, setMembers]           = useState([{ name:'', age:'', gender:'Male' }])
  const [formError, setFormError]       = useState('')
  const [saving, setSaving]             = useState(false)

  // Verify modal
  const [verifyModal, setVerifyModal]       = useState(null) // { mode:'edit'|'delete', family }
  const [verifyInput, setVerifyInput]       = useState('')
  const [verifyError, setVerifyError]       = useState('')

  useEffect(() => {
    const q = query(collection(db, 'families'), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, snap => {
      setFamilies(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return () => unsub()
  }, [])

  function resetForm() {
    setFamilyName(''); setMembers([{ name:'', age:'', gender:'Male' }])
    setFormError(''); setEditFamilyId(null); setShowForm(false)
  }

  function addMember() {
    setMembers(p => [...p, { name:'', age:'', gender:'Male' }])
  }

  function removeMember(i) {
    setMembers(p => p.filter((_, idx) => idx !== i))
  }

  function updateMember(i, field, val) {
    setMembers(p => p.map((m, idx) => idx === i ? { ...m, [field]: val } : m))
  }

  async function saveFamily() {
    if (!familyName.trim()) { setFormError('Please enter a family name'); return }
    const validMembers = members.filter(m => m.name.trim())
    if (!validMembers.length) { setFormError('Please add at least one family member'); return }
    for (const m of validMembers) {
      if (!m.age || isNaN(m.age) || Number(m.age) < 0 || Number(m.age) > 120) {
        setFormError(`Please enter a valid age for "${m.name}"`); return
      }
    }
    setSaving(true); setFormError('')
    try {
      const data = {
        familyName: familyName.trim(),
        members: validMembers.map(m => ({ name: m.name.trim(), age: Number(m.age), gender: m.gender })),
        updatedAt: serverTimestamp(),
      }
      if (editFamilyId) {
        await updateDoc(doc(db, 'families', editFamilyId), data)
      } else {
        await addDoc(collection(db, 'families'), { ...data, createdAt: serverTimestamp() })
      }
      resetForm()
    } catch (err) {
      console.error(err); setFormError('Something went wrong. Please try again.')
    }
    setSaving(false)
  }

  function openVerify(mode, family) {
    setVerifyModal({ mode, family }); setVerifyInput(''); setVerifyError('')
  }

  function closeVerify() {
    setVerifyModal(null); setVerifyInput(''); setVerifyError('')
  }

  async function confirmVerify() {
    if (verifyInput.trim().toLowerCase() !== verifyModal.family.familyName.trim().toLowerCase()) {
      setVerifyError('Family name does not match. Please try again.'); return
    }
    if (verifyModal.mode === 'delete') {
      await deleteDoc(doc(db, 'families', verifyModal.family.id))
      if (editFamilyId === verifyModal.family.id) resetForm()
    } else {
      const f = verifyModal.family
      setEditFamilyId(f.id)
      setFamilyName(f.familyName)
      setMembers(f.members.map(m => ({ name: m.name, age: String(m.age), gender: m.gender })))
      setShowForm(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    closeVerify()
  }

  // Summary stats
  const allMembers = families.flatMap(f => f.members || [])
  const stats = {
    families:   families.length,
    adultMen:   allMembers.filter(m => m.age >= 18 && m.gender === 'Male').length,
    adultWomen: allMembers.filter(m => m.age >= 18 && m.gender === 'Female').length,
    adultOther: allMembers.filter(m => m.age >= 18 && m.gender === 'Other').length,
    babies:     allMembers.filter(m => m.age >= 0 && m.age < 4).length,
    kids4to8:   allMembers.filter(m => m.age >= 4 && m.age < 10).length,
    kids8to18:  allMembers.filter(m => m.age >= 10 && m.age < 18).length,
  }
  const totalAdults = stats.adultMen + stats.adultWomen + stats.adultOther

  return (
    <div style={{ maxWidth:680, margin:'0 auto', padding:'0 1rem 3rem' }}>
      <div style={{ paddingTop:'1.5rem', marginBottom:'1.5rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h2 style={{ fontSize:18, fontWeight:700, margin:0, color:'#111827' }}>Families</h2>
          {!showForm && (
            <button onClick={() => setShowForm(true)}
              style={{ padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:600,
                cursor:'pointer', border:'none', background:'#1e40af', color:'white' }}>
              + Add my family
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background:'white', borderRadius:14, border:'1px solid #e5e7eb',
          padding:'1.5rem', marginBottom:'1.5rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize:15, fontWeight:700, margin:'0 0 1.25rem', color:'#111827' }}>
            {editFamilyId ? 'Edit family' : 'Add your family'}
          </h3>

          <div style={{ marginBottom:'1rem' }}>
            <label style={{ fontSize:13, fontWeight:500, color:'#374151', display:'block', marginBottom:6 }}>
              Family name
            </label>
            <input value={familyName} onChange={e => setFamilyName(e.target.value)}
              placeholder="e.g. Perera Family"
              style={{ width:'100%', padding:'9px 12px', borderRadius:8, fontSize:14,
                border:'1px solid #d1d5db', outline:'none', boxSizing:'border-box' }} />
          </div>

          <div style={{ marginBottom:'1rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <label style={{ fontSize:13, fontWeight:500, color:'#374151' }}>Family members</label>
              <button onClick={addMember}
                style={{ fontSize:12, padding:'4px 10px', borderRadius:6, cursor:'pointer',
                  border:'1px solid #93c5fd', background:'#dbeafe', color:'#1e40af', fontWeight:500 }}>
                + Add member
              </button>
            </div>

            {members.map((m, i) => (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 70px 90px auto',
                gap:8, marginBottom:8, alignItems:'center' }}>
                <input value={m.name} onChange={e => updateMember(i, 'name', e.target.value)}
                  placeholder="First / Used name"
                  style={{ padding:'8px 10px', borderRadius:7, fontSize:13,
                    border:'1px solid #d1d5db', outline:'none', boxSizing:'border-box' }} />
                <input type="number" value={m.age} onChange={e => updateMember(i, 'age', e.target.value)}
                  placeholder="Age" min={0} max={120}
                  style={{ padding:'8px 10px', borderRadius:7, fontSize:13,
                    border:'1px solid #d1d5db', outline:'none', boxSizing:'border-box' }} />
                <select value={m.gender} onChange={e => updateMember(i, 'gender', e.target.value)}
                  style={{ padding:'8px 10px', borderRadius:7, fontSize:13,
                    border:'1px solid #d1d5db', outline:'none', boxSizing:'border-box',
                    background:'white', cursor:'pointer' }}>
                  {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                {members.length > 1 && (
                  <button onClick={() => removeMember(i)}
                    style={{ padding:'6px 9px', borderRadius:7, cursor:'pointer',
                      border:'1px solid #fca5a5', background:'#fee2e2', color:'#991b1b',
                      fontSize:13, fontWeight:600 }}>✕</button>
                )}
              </div>
            ))}
          </div>

          {formError && (
            <div style={{ fontSize:13, color:'#991b1b', padding:'8px 12px', background:'#fee2e2',
              borderRadius:8, border:'1px solid #fca5a5', marginBottom:'1rem' }}>
              {formError}
            </div>
          )}

          <div style={{ display:'flex', gap:8 }}>
            <button onClick={saveFamily} disabled={saving}
              style={{ flex:1, padding:'10px', borderRadius:8, fontSize:14, fontWeight:600,
                cursor:'pointer', border:'none', background:'#166534', color:'white' }}>
              {saving ? 'Saving...' : editFamilyId ? 'Save changes' : 'Save family'}
            </button>
            <button onClick={resetForm}
              style={{ padding:'10px 16px', borderRadius:8, fontSize:14, cursor:'pointer',
                border:'1px solid #d1d5db', background:'transparent', color:'#6b7280' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Summary stats */}
      {families.length > 0 && (
        <div style={{ marginBottom:'1.5rem', borderRadius:12, border:'1px solid #e5e7eb',
          overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ padding:'10px 16px', background:'#1e40af' }}>
            <span style={{ fontSize:12, fontWeight:700, color:'white',
              textTransform:'uppercase', letterSpacing:'0.07em' }}>Attendance summary</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:0 }}>
            {[
              { label:'Families',      val: stats.families,   bg:'#eff6ff', color:'#1e40af' },
              { label:'Adults (18+)',  val: totalAdults,       bg:'#f0fdf4', color:'#166534' },
              { label:'Babies (0–4)', val: stats.babies,      bg:'#fef3c7', color:'#92400e' },
              { label:'Kids (4–10)',   val: stats.kids4to8,    bg:'#fff5f5', color:'#991b1b' },
              { label:'Kids (10–18)', val: stats.kids8to18,    bg:'#faf5ff', color:'#6b21a8' },
              { label:'Total people', val: allMembers.length,  bg:'#f9fafb', color:'#374151' },
            ].map(s => (
              <div key={s.label} style={{ padding:'12px 14px', background:s.bg,
                borderBottom:'1px solid #e5e7eb', borderRight:'1px solid #e5e7eb', textAlign:'center' }}>
                <p style={{ fontSize:22, fontWeight:700, color:s.color, margin:'0 0 2px' }}>{s.val}</p>
                <p style={{ fontSize:11, color:'#6b7280', margin:0 }}>{s.label}</p>
              </div>
            ))}
          </div>
          {/* Adult breakdown */}
          <div style={{ padding:'10px 16px', background:'#f9fafb', borderTop:'1px solid #e5e7eb',
            fontSize:12, color:'#6b7280', display:'flex', gap:16, flexWrap:'wrap' }}>
            <span>👨 Men (18+): <strong style={{ color:'#111827' }}>{stats.adultMen}</strong></span>
            <span>👩 Women (18+): <strong style={{ color:'#111827' }}>{stats.adultWomen}</strong></span>
            {stats.adultOther > 0 && <span>Other (18+): <strong style={{ color:'#111827' }}>{stats.adultOther}</strong></span>}
          </div>
        </div>
      )}

      {/* Families list */}
      {loading ? (
        <p style={{ fontSize:14, color:'#6b7280' }}>Loading...</p>
      ) : families.length === 0 ? (
        <p style={{ fontSize:14, color:'#6b7280' }}>No families registered yet — add yours!</p>
      ) : (
        <div>
          <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 1rem', color:'#111827' }}>
            Registered families ({families.length})
          </h3>
          {families.map(family => (
            <div key={family.id} style={{ background:'white', borderRadius:12, border:'1px solid #e5e7eb',
              marginBottom:12, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ padding:'10px 14px', background:'#1e40af',
                display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:14, fontWeight:700, color:'white' }}>{family.familyName}</span>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={() => openVerify('edit', family)}
                    style={{ fontSize:12, padding:'3px 10px', borderRadius:6, cursor:'pointer',
                      border:'1px solid rgba(255,255,255,0.4)', background:'rgba(255,255,255,0.15)',
                      color:'white' }}>Edit</button>
                  <button onClick={() => openVerify('delete', family)}
                    style={{ fontSize:12, padding:'3px 10px', borderRadius:6, cursor:'pointer',
                      border:'1px solid #fca5a5', background:'#fee2e2', color:'#991b1b' }}>Delete</button>
                </div>
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ background:'#eff6ff' }}>
                    <th style={{ padding:'7px 14px', textAlign:'left', fontWeight:600,
                      color:'#1e40af', borderBottom:'1px solid #dbeafe' }}>Name</th>
                    <th style={{ padding:'7px 14px', textAlign:'left', fontWeight:600,
                      color:'#1e40af', borderBottom:'1px solid #dbeafe', width:80 }}>Gender</th>
                    <th style={{ padding:'7px 14px', textAlign:'left', fontWeight:600,
                      color:'#1e40af', borderBottom:'1px solid #dbeafe', width:80 }}>Group</th>
                  </tr>
                </thead>
                <tbody>
                  {(family.members || []).map((m, i) => {
                    const group = m.age < 4 ? 'Baby' : m.age < 10 ? 'Kid (4–10)' : m.age < 18 ? 'Kid (10–18)' : 'Adult'
                    const groupColor = m.age < 4 ? '#92400e' : m.age < 10 ? '#991b1b' : m.age < 18 ? '#6b21a8' : '#166534'
                    const groupBg   = m.age < 4 ? '#fef3c7' : m.age < 10 ? '#fee2e2' : m.age < 18 ? '#f3e8ff' : '#dcfce7'
                    return (
                      <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                        <td style={{ padding:'8px 14px', color:'#111827', borderBottom:'0.5px solid #e5e7eb' }}>{m.name}</td>
                        <td style={{ padding:'8px 14px', color:'#374151', borderBottom:'0.5px solid #e5e7eb' }}>{m.gender}</td>
                        <td style={{ padding:'8px 14px', borderBottom:'0.5px solid #e5e7eb' }}>
                          <span style={{ fontSize:11, padding:'2px 8px', borderRadius:6,
                            background:groupBg, color:groupColor, fontWeight:600 }}>{group}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      <Footer />

      {/* Verify modal */}
      {verifyModal && (
        <div onClick={closeVerify} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:14,
            padding:'1.75rem', width:'100%', maxWidth:400, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width:48, height:48, borderRadius:'50%', margin:'0 auto 1rem',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
              background: verifyModal.mode === 'delete' ? '#fee2e2' : '#dbeafe' }}>
              {verifyModal.mode === 'delete' ? '🗑️' : '✏️'}
            </div>
            <h3 style={{ fontSize:17, fontWeight:700, textAlign:'center', margin:'0 0 6px', color:'#111827' }}>
              {verifyModal.mode === 'delete' ? 'Delete family?' : 'Edit family?'}
            </h3>
            <p style={{ fontSize:13, color:'#6b7280', textAlign:'center', margin:'0 0 1.25rem', lineHeight:1.6 }}>
              {verifyModal.mode === 'delete'
                ? <>You are about to remove <strong style={{ color:'#111827' }}>{verifyModal.family.familyName}</strong>.<br />This cannot be undone.</>
                : <>To edit <strong style={{ color:'#111827' }}>{verifyModal.family.familyName}</strong>, please confirm the family name.</>}
            </p>
            <div style={{ background:'#fff7ed', border:'1px solid #fed7aa',
              borderRadius:8, padding:'12px 14px', marginBottom:'1rem' }}>
              <p style={{ fontSize:12, color:'#92400e', margin:'0 0 8px', fontWeight:500 }}>
                Type the family name to confirm: <strong>{verifyModal.family.familyName}</strong>
              </p>
              <input value={verifyInput}
                onChange={e => { setVerifyInput(e.target.value); setVerifyError('') }}
                placeholder="Type family name here..." autoFocus
                onKeyDown={e => e.key === 'Enter' && confirmVerify()}
                style={{ width:'100%', padding:'8px 10px', borderRadius:6, fontSize:13,
                  border: verifyError ? '1px solid #ef4444' : '1px solid #d1d5db',
                  outline:'none', boxSizing:'border-box' }} />
              {verifyError && <p style={{ fontSize:12, color:'#ef4444', margin:'6px 0 0' }}>{verifyError}</p>}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={closeVerify}
                style={{ flex:1, padding:'10px', borderRadius:8, fontSize:14, cursor:'pointer',
                  border:'1px solid #d1d5db', background:'white', color:'#374151', fontWeight:500 }}>
                Cancel
              </button>
              <button onClick={confirmVerify} disabled={!verifyInput.trim()}
                style={{ flex:1, padding:'10px', borderRadius:8, fontSize:14, cursor:'pointer',
                  border:'none', fontWeight:600, color:'white', transition:'background 0.15s',
                  background: !verifyInput.trim() ? '#d1d5db'
                    : verifyModal.mode === 'delete' ? '#991b1b' : '#1e40af' }}>
                {verifyModal.mode === 'delete' ? 'Yes, delete' : 'Yes, edit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Food Sign-up Page (all original logic preserved)
// ─────────────────────────────────────────────────────────────
function FoodPage() {
  const [name, setName]             = useState('')
  const [selected, setSelected]     = useState([])
  const [custom, setCustom]         = useState('')
  const [signups, setSignups]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [submitted, setSubmitted]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')
  const [editId, setEditId]         = useState(null)

  const [verifyModal, setVerifyModal]         = useState(null)
  const [verifyNameInput, setVerifyNameInput] = useState('')
  const [verifyError, setVerifyError]         = useState('')

  useEffect(() => {
    const q = query(collection(db, 'signups'), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, snap => {
      setSignups(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const takenByOthers = new Set(
    signups.filter(e => e.id !== editId).flatMap(e => e.foods || [])
  )

  function toggle(food) {
    if (takenByOthers.has(food)) return
    setSelected(p => p.includes(food) ? p.filter(f => f !== food) : [...p, food])
  }

  async function submit() {
    if (!name.trim()) { setError('Please enter your name'); return }
    const extras = custom.split(',').map(s => s.trim()).filter(Boolean)
    const foods  = [...selected, ...extras]
    if (!foods.length) { setError('Please select or add at least one food item'); return }
    setSubmitting(true); setError('')
    try {
      await runTransaction(db, async (transaction) => {
        const snapshot = await getDocs(collection(db, 'signups'))
        const currentSignups = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        const takenNow = new Set(
          currentSignups.filter(e => e.id !== editId).flatMap(e => e.foods || [])
        )
        const conflicts = foods.filter(f => knownFoodSet.has(f) && takenNow.has(f))
        if (conflicts.length > 0) {
          setSelected(prev => prev.filter(f => !conflicts.includes(f)))
          throw new Error(
            `"${conflicts.join('", "')}" ${conflicts.length === 1 ? 'was' : 'were'} just taken by someone else and ${conflicts.length === 1 ? 'has' : 'have'} been removed from your selections. Please review and sign up again.`
          )
        }
        if (editId) {
          transaction.update(doc(db, 'signups', editId), {
            name: name.trim(), foods, updatedAt: serverTimestamp()
          })
        } else {
          const newRef = doc(collection(db, 'signups'))
          transaction.set(newRef, {
            name: name.trim(), foods, createdAt: serverTimestamp()
          })
        }
      })
      setSubmitted(true); setEditId(null)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Something went wrong, please try again.')
    }
    setSubmitting(false)
  }

  function startEdit(entry) {
    setEditId(entry.id); setName(entry.name)
    setSelected((entry.foods || []).filter(f => knownFoodSet.has(f)))
    setCustom((entry.foods || []).filter(f => !knownFoodSet.has(f)).join(', '))
    setSubmitted(false); setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditId(null); setName(''); setSelected([]); setCustom(''); setError(''); setSubmitted(false)
  }

  function resetForm() {
    setSubmitted(false); setName(''); setSelected([]); setCustom(''); setError(''); setEditId(null)
  }

  function openVerifyModal(mode, entry) {
    setVerifyModal({ mode, entry }); setVerifyNameInput(''); setVerifyError('')
  }

  function closeVerifyModal() {
    setVerifyModal(null); setVerifyNameInput(''); setVerifyError('')
  }

  async function confirmVerify() {
    if (verifyNameInput.trim().toLowerCase() !== verifyModal.entry.name.trim().toLowerCase()) {
      setVerifyError('Name does not match. Please type the exact name shown.'); return
    }
    if (verifyModal.mode === 'delete') {
      await deleteDoc(doc(db, 'signups', verifyModal.entry.id))
      if (editId === verifyModal.entry.id) cancelEdit()
    } else {
      startEdit(verifyModal.entry)
    }
    closeVerifyModal()
  }

  const byCategory = Object.fromEntries(
    CAT_ORDER.map(cat => [cat, FOODS.filter(f => f.cat === cat).map(f => f.name)])
  )
  const foodOwner = {}
  signups.forEach(e => (e.foods || []).forEach(f => { foodOwner[f] = e.name }))
  const whoTook = food => foodOwner[food] || null
  const customRows = signups.flatMap(e =>
    (e.foods || []).filter(f => !knownFoodSet.has(f)).map(f => ({ food: f, person: e.name }))
  )

  const card = { background:'white', borderRadius:12, border:'1px solid #e5e7eb', padding:'12px 16px', marginBottom:10 }

  return (
    <div style={{ maxWidth:640, margin:'0 auto', padding:'0 1rem 3rem' }}>

      {/* Header */}
      <div style={{ textAlign:'center', padding:'1.5rem 0 1.25rem', borderBottom:'1px solid #e5e7eb' }}>
        <p style={{ fontSize:12, color:'#9ca3af', margin:'0 0 4px', letterSpacing:'0.1em' }}>
          අලුත් අවුරුදු 2026
        </p>
        <h1 style={{ fontSize:22, fontWeight:700, margin:'0 0 4px', color:'#111827' }}>
          Pittsburgh Aurudu Celebration
        </h1>
        <p style={{ fontSize:14, color:'#6b7280', margin:'0 0 1.25rem' }}>
          05/09 · 8:30 AM until sunset &nbsp;·&nbsp;{' '}
          <a href="https://share.google/IwYq0P0lnavxqvXis" target="_blank" rel="noreferrer"
            style={{ color:'#1d4ed8', textDecoration:'underline' }}>
            Garner Pavilion · North Park
          </a>
        </p>
        <p style={{ fontSize:13, color:'#6b7280', lineHeight:1.7, textAlign:'left',
          padding:'1rem 1.25rem', background:'#f9fafb', borderRadius:10, border:'1px solid #e5e7eb' }}>
          We're excited to celebrate Sinhala and Tamil New Year together! Please sign up to bring one
          or more food items from the list. You can also add a custom dish if you prefer.
          <br /><br />
          We'll have around 19 families (30 adults, 6 big kids, and 6 small kids), so every
          contribution helps. We're also sharing lunch items. If all items aren't covered, we may
          arrange catering and split the cost among families later.
          <br /><br />
          Thank you for helping make this a great celebration!
        </p>
      </div>

      {/* Sign-up form */}
      <div style={{ paddingTop:'1.5rem' }}>
        {submitted ? (
          <div style={{ textAlign:'center', padding:'2rem 1rem 1.5rem', background:'#f0fdf4',
            borderRadius:12, border:'1px solid #86efac', marginBottom:'1.5rem' }}>
            <p style={{ fontSize:17, fontWeight:600, margin:'0 0 4px', color:'#166534' }}>You're signed up!</p>
            <p style={{ fontSize:13, color:'#166534', margin:'0 0 1rem', opacity:0.85 }}>
              Subha Aluth Avuruddak Wewa!
            </p>
            <button onClick={resetForm} style={{ fontSize:13, padding:'7px 20px', borderRadius:8,
              cursor:'pointer', border:'1px solid #86efac', background:'transparent', color:'#166534' }}>
              Add another person
            </button>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize:16, fontWeight:600, margin:'0 0 1.25rem', paddingBottom:'0.5rem',
              borderBottom:'1px solid #e5e7eb', color:'#111827' }}>
              {editId ? `Editing: ${signups.find(e => e.id === editId)?.name}` : 'Sign up'}
            </h2>
            <div style={{ marginBottom:'1.25rem' }}>
              <label style={{ fontSize:13, color:'#374151', display:'block', marginBottom:6, fontWeight:500 }}>Your name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Anura Kumara" />
            </div>
            <div style={{ marginBottom:'1.25rem' }}>
              <label style={{ fontSize:13, color:'#374151', display:'block', marginBottom:4, fontWeight:500 }}>What will you bring?</label>
              <p style={{ fontSize:12, color:'#9ca3af', margin:'0 0 14px' }}>
                Greyed out items are already taken. Highlighted items are your picks.
              </p>
              {CAT_ORDER.map(cat => {
                const cfg = CAT_CFG[cat]
                return (
                  <div key={cat} style={{ marginBottom:'1.25rem' }}>
                    <p style={{ fontSize:11, fontWeight:600, color:'#6b7280', margin:'0 0 8px',
                      letterSpacing:'0.08em', textTransform:'uppercase' }}>{cat}</p>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                      {byCategory[cat].map(food => {
                        const taken  = takenByOthers.has(food)
                        const chosen = selected.includes(food)
                        const taker  = whoTook(food)
                        return (
                          <button key={food} onClick={() => toggle(food)} disabled={taken}
                            title={taken ? `Taken by ${taker}` : ''}
                            style={{
                              padding:'6px 13px', borderRadius:8, fontSize:13,
                              cursor: taken ? 'not-allowed' : 'pointer', transition:'all 0.12s',
                              ...(taken ? {
                                background:'#f3f4f6', color:'#9ca3af',
                                border:'1px dashed #d1d5db', opacity:0.6, textDecoration:'line-through',
                              } : chosen ? {
                                background:cfg.bg, color:cfg.text, border:`2px solid ${cfg.border}`,
                                fontWeight:600, transform:'scale(1.05)',
                              } : {
                                background:'white', color:'#374151', border:'1px solid #d1d5db',
                              }),
                            }}>
                            {chosen && <span style={{ marginRight:4, fontSize:11 }}>✓</span>}
                            {food}
                            {taken && <span style={{ marginLeft:5, fontSize:10 }}>({taker})</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ marginBottom:'1.25rem' }}>
              <label style={{ fontSize:13, color:'#374151', display:'block', marginBottom:4, fontWeight:500 }}>
                Bringing something not on the list?
              </label>
              <p style={{ fontSize:12, color:'#9ca3af', margin:'0 0 8px' }}>Separate multiple items with commas</p>
              <input value={custom} onChange={e => setCustom(e.target.value)}
                placeholder="e.g. Payasam, Wattalapam..." />
            </div>
            {selected.length > 0 && (
              <div style={{ padding:'10px 14px', borderRadius:8, background:'#f9fafb',
                border:'1px solid #e5e7eb', marginBottom:'1rem' }}>
                <p style={{ fontSize:12, color:'#9ca3af', margin:'0 0 7px' }}>Your selections ({selected.length})</p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                  {selected.map(f => <FoodTag key={f} food={f} />)}
                </div>
              </div>
            )}
            {error && (
              <div style={{ fontSize:13, color:'#991b1b', marginBottom:'0.75rem', padding:'10px 14px',
                background:'#fee2e2', borderRadius:8, border:'1px solid #fca5a5', lineHeight:1.5 }}>
                {error}
              </div>
            )}
            <button onClick={submit} disabled={submitting}
              style={{ width:'100%', padding:'11px', borderRadius:8, fontSize:14, fontWeight:600,
                cursor:'pointer', border:'none', background: submitting ? '#4ade80' : '#166534',
                color:'white', transition:'background 0.15s' }}>
              {submitting ? 'Saving...' : editId ? 'Save changes' : 'Sign up'}
            </button>
            {editId && (
              <button onClick={cancelEdit}
                style={{ width:'100%', padding:'9px', marginTop:8, borderRadius:8, fontSize:14,
                  cursor:'pointer', border:'1px solid #d1d5db', background:'transparent', color:'#6b7280' }}>
                Cancel
              </button>
            )}
          </>
        )}
      </div>

      {/* Who's signed up */}
      <div style={{ marginTop:'2.5rem', paddingTop:'1.5rem', borderTop:'1px solid #e5e7eb' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
          <h2 style={{ fontSize:16, fontWeight:600, margin:0, color:'#111827' }}>Who's signed up</h2>
          <span style={{ fontSize:13, color:'#6b7280' }}>{signups.length} {signups.length === 1 ? 'person' : 'people'}</span>
        </div>
        {loading ? (
          <p style={{ fontSize:14, color:'#6b7280' }}>Loading...</p>
        ) : signups.length === 0 ? (
          <p style={{ fontSize:14, color:'#6b7280' }}>No sign-ups yet — be the first!</p>
        ) : (
          <>
            {signups.map(entry => (
              <div key={entry.id} style={{ ...card, border: editId === entry.id ? '2px solid #93c5fd' : '1px solid #e5e7eb' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                  <p style={{ fontSize:14, fontWeight:600, margin:0 }}>{entry.name}</p>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => openVerifyModal('edit', entry)}
                      style={{ fontSize:12, padding:'3px 10px', borderRadius:6, cursor:'pointer',
                        border:'1px solid #93c5fd', background:'#dbeafe', color:'#1e40af' }}>Edit</button>
                    <button onClick={() => openVerifyModal('delete', entry)}
                      style={{ fontSize:12, padding:'3px 10px', borderRadius:6, cursor:'pointer',
                        border:'1px solid #fca5a5', background:'#fee2e2', color:'#991b1b' }}>Delete</button>
                  </div>
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                  {(entry.foods || []).map(f => <FoodTag key={f} food={f} />)}
                </div>
              </div>
            ))}

            {/* Category tables */}
            <div style={{ marginTop:'2rem' }}>
              <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 1rem', color:'#111827' }}>Food coverage by category</h3>
              {CAT_ORDER.map(cat => {
                const cfg = CAT_CFG[cat]; const items = byCategory[cat]
                return (
                  <div key={cat} style={{ marginBottom:'1.25rem', borderRadius:10,
                    border:`1px solid ${cfg.border}`, overflow:'hidden' }}>
                    <div style={{ padding:'8px 14px', background:cfg.bg, borderBottom:`1px solid ${cfg.border}` }}>
                      <span style={{ fontSize:12, fontWeight:600, color:cfg.head,
                        textTransform:'uppercase', letterSpacing:'0.07em' }}>{cat}</span>
                    </div>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                      <thead>
                        <tr style={{ background:cfg.rowBg }}>
                          <th style={{ padding:'7px 14px', textAlign:'left', fontWeight:600,
                            color:cfg.head, borderBottom:`1px solid ${cfg.border}`, width:'60%' }}>Food item</th>
                          <th style={{ padding:'7px 14px', textAlign:'left', fontWeight:600,
                            color:cfg.head, borderBottom:`1px solid ${cfg.border}` }}>Assigned to</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((food, i) => {
                          const owner = whoTook(food)
                          return (
                            <tr key={food} style={{ background: i % 2 === 0 ? 'white' : cfg.rowBg }}>
                              <td style={{ padding:'7px 14px', color:'#111827', borderBottom:`0.5px solid ${cfg.border}` }}>{food}</td>
                              <td style={{ padding:'7px 14px', borderBottom:`0.5px solid ${cfg.border}` }}>
                                {owner
                                  ? <span style={{ fontSize:12, padding:'2px 9px', borderRadius:6,
                                      background:cfg.bg, color:cfg.head, border:`0.5px solid ${cfg.border}`, fontWeight:600 }}>{owner}</span>
                                  : <span style={{ fontSize:12, color:'#9ca3af', fontStyle:'italic' }}>— available</span>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })}
              {customRows.length > 0 && (
                <div style={{ marginBottom:'1.25rem', borderRadius:10, border:'1px solid #d8b4fe', overflow:'hidden' }}>
                  <div style={{ padding:'8px 14px', background:'#f3e8ff', borderBottom:'1px solid #d8b4fe' }}>
                    <span style={{ fontSize:12, fontWeight:600, color:'#6b21a8',
                      textTransform:'uppercase', letterSpacing:'0.07em' }}>Custom additions</span>
                  </div>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                    <thead>
                      <tr style={{ background:'#faf5ff' }}>
                        <th style={{ padding:'7px 14px', textAlign:'left', fontWeight:600,
                          color:'#6b21a8', borderBottom:'1px solid #d8b4fe', width:'60%' }}>Food item</th>
                        <th style={{ padding:'7px 14px', textAlign:'left', fontWeight:600,
                          color:'#6b21a8', borderBottom:'1px solid #d8b4fe' }}>Bringing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customRows.map(({ food, person }, i) => (
                        <tr key={`${food}-${person}`} style={{ background: i % 2 === 0 ? 'white' : '#faf5ff' }}>
                          <td style={{ padding:'7px 14px', color:'#111827', borderBottom:'0.5px solid #d8b4fe' }}>{food}</td>
                          <td style={{ padding:'7px 14px', borderBottom:'0.5px solid #d8b4fe' }}>
                            <span style={{ fontSize:12, padding:'2px 9px', borderRadius:6,
                              background:'#f3e8ff', color:'#6b21a8', border:'0.5px solid #d8b4fe', fontWeight:600 }}>{person}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <Footer />

      {/* Verify modal */}
      {verifyModal && (
        <div onClick={closeVerifyModal} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:14,
            padding:'1.75rem', width:'100%', maxWidth:400, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width:48, height:48, borderRadius:'50%', margin:'0 auto 1rem',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
              background: verifyModal.mode === 'delete' ? '#fee2e2' : '#dbeafe' }}>
              {verifyModal.mode === 'delete' ? '🗑️' : '✏️'}
            </div>
            <h3 style={{ fontSize:17, fontWeight:700, textAlign:'center', margin:'0 0 6px', color:'#111827' }}>
              {verifyModal.mode === 'delete' ? 'Delete entry?' : 'Edit entry?'}
            </h3>
            <p style={{ fontSize:13, color:'#6b7280', textAlign:'center', margin:'0 0 1.25rem', lineHeight:1.6 }}>
              {verifyModal.mode === 'delete'
                ? <>You are about to remove <strong style={{ color:'#111827' }}>{verifyModal.entry.name}</strong>'s sign-up.<br />This cannot be undone.</>
                : <>To edit <strong style={{ color:'#111827' }}>{verifyModal.entry.name}</strong>'s entry, please verify your identity.</>}
            </p>
            <div style={{ background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:8,
              padding:'12px 14px', marginBottom:'1rem' }}>
              <p style={{ fontSize:12, color:'#92400e', margin:'0 0 8px', fontWeight:500 }}>
                To confirm, type the name: <strong>{verifyModal.entry.name}</strong>
              </p>
              <input value={verifyNameInput}
                onChange={e => { setVerifyNameInput(e.target.value); setVerifyError('') }}
                placeholder="Type name here..." autoFocus
                onKeyDown={e => e.key === 'Enter' && confirmVerify()}
                style={{ width:'100%', padding:'8px 10px', borderRadius:6, fontSize:13,
                  border: verifyError ? '1px solid #ef4444' : '1px solid #d1d5db',
                  outline:'none', boxSizing:'border-box' }} />
              {verifyError && <p style={{ fontSize:12, color:'#ef4444', margin:'6px 0 0' }}>{verifyError}</p>}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={closeVerifyModal}
                style={{ flex:1, padding:'10px', borderRadius:8, fontSize:14, cursor:'pointer',
                  border:'1px solid #d1d5db', background:'white', color:'#374151', fontWeight:500 }}>
                Cancel
              </button>
              <button onClick={confirmVerify} disabled={!verifyNameInput.trim()}
                style={{ flex:1, padding:'10px', borderRadius:8, fontSize:14, cursor:'pointer',
                  border:'none', fontWeight:600, color:'white', transition:'background 0.15s',
                  background: !verifyNameInput.trim() ? '#d1d5db'
                    : verifyModal.mode === 'delete' ? '#991b1b' : '#1e40af' }}>
                {verifyModal.mode === 'delete' ? 'Yes, delete' : 'Yes, edit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Games Page
// ─────────────────────────────────────────────────────────────
const MOD_PASSWORD = 'slpmod2026'

const COLS = [
  { key:'kids8under',   label:'Kids\nUnder 10', short:'K<10', bg:'#fef3c7', text:'#92400e', border:'#fcd34d' },
  { key:'kids8over',    label:'Kids\n10 – 18',  short:'K>10', bg:'#dbeafe', text:'#1e40af', border:'#93c5fd' },
  { key:'adultsCommon', label:'Adults\nCommon', short:'A-Com', bg:'#dcfce7', text:'#166534', border:'#86efac' },
  { key:'adultsMen',   label:'Adults\nMen',   short:'A-Men', bg:'#eff6ff', text:'#1e40af', border:'#bfdbfe' },
  { key:'adultsWomen', label:'Adults\nWomen', short:'A-Wom', bg:'#fce7f3', text:'#9d174d', border:'#fbcfe8' },
  { key:'group',        label:'Group',         short:'Group', bg:'#f3e8ff', text:'#6b21a8', border:'#d8b4fe' },
]

const DEFAULT_GAMES = [
  { name:'Kana Muttiya Bindeema',                 kids8under:false, kids8over:true,  adultsCommon:true,  adultsMen:false, adultsWomen:false, group:false },
  { name:'Banis Kaema',                           kids8under:false, kids8over:true,  adultsCommon:false, adultsMen:true,  adultsWomen:true,  group:false },
  { name:'Kiri Keweema',                          kids8under:false, kids8over:true,  adultsCommon:true,  adultsMen:false, adultsWomen:false, group:false },
  { name:'Aliyata Aha Thabeema',                  kids8under:true,  kids8over:true,  adultsCommon:true,  adultsMen:false, adultsWomen:false, group:false },
  { name:'Tug-of-War (Kamba Adeema)',             kids8under:false, kids8over:true,  adultsCommon:false, adultsMen:false, adultsWomen:false, group:true  },
  { name:'Egg Pass',                              kids8under:false, kids8over:false, adultsCommon:true,  adultsMen:false, adultsWomen:false, group:false },
  { name:'Dehi Gediya Handa Matha Thaba Diveema',kids8under:false, kids8over:true,  adultsCommon:true,  adultsMen:false, adultsWomen:false, group:false },
  { name:'Balloon Pipiraveema',                   kids8under:true,  kids8over:true,  adultsCommon:false, adultsMen:true,  adultsWomen:true,  group:false },
  { name:'Beema Baten Beema Beema',               kids8under:true,  kids8over:true,  adultsCommon:false, adultsMen:true,  adultsWomen:true,  group:false },
  { name:'Sagaunu Amutha Thereema',            kids8under:false, kids8over:true,  adultsCommon:true,  adultsMen:false, adultsWomen:false, group:false },
  { name:'Gaslabu Gediye Ata Ganan Kireema',      kids8under:false, kids8over:true,  adultsCommon:true,  adultsMen:false, adultsWomen:false, group:false },
  { name:'Deweema',                               kids8under:true,  kids8over:true,  adultsCommon:false, adultsMen:true,  adultsWomen:true,  group:false },
  { name:'Pani Bambara',                          kids8under:false, kids8over:false, adultsCommon:false, adultsMen:false, adultsWomen:false, group:true  },
  { name:'Piti Gode Penny',                       kids8under:false, kids8over:true,  adultsCommon:false, adultsMen:false, adultsWomen:false, group:false },
  { name:'Hat Passing',                           kids8under:false, kids8over:true,  adultsCommon:true,  adultsMen:false, adultsWomen:false, group:false },
  { name:'Act & Pass',                            kids8under:false, kids8over:false, adultsCommon:false, adultsMen:false, adultsWomen:false, group:true  },
  { name:'Aurudu Kumariya & Kumara',              kids8under:false, kids8over:false, adultsCommon:false, adultsMen:true,  adultsWomen:true,  group:false },
]

// ── Firestore collection/doc references ──
const GAME_CONFIG_COL = 'game_config'
const GAMES_DOC       = 'games'
const WINNERS_DOC     = 'winners'
const SAGAUNU_DOC     = 'sagaunu'
const GASLABU_DOC     = 'gaslabu_meta'
const GASLABU_COL     = 'gaslabu_guesses'

// Seed Firestore with DEFAULT_GAMES if the doc doesn't exist yet
async function seedGamesIfNeeded() {
  const ref = doc(db, GAME_CONFIG_COL, GAMES_DOC)
  const snap = await getDocs(query(collection(db, GAME_CONFIG_COL)))
  const exists = snap.docs.some(d => d.id === GAMES_DOC)
  if (!exists) {
    await setDoc(ref, { list: DEFAULT_GAMES })
  }
}

function Tick({ yes }) {
  if (yes) return <span style={{ color:'#166534', fontSize:16, fontWeight:700 }}>✓</span>
  return <span style={{ color:'#d1d5db', fontSize:14 }}>—</span>
}

// Games with fully custom logic — handled separately in special panels below
const SPECIAL_GAMES = ['Sagaunu Amutha Thereema', 'Gaslabu Gediye Ata Ganan Kireema']
// Group games — winner entry is captain/team name (coordinator only)
const GROUP_GAMES   = ['Tug-of-War (Kamba Adeema)', 'Pani Bambara', 'Act & Pass']
// Nothing is fully excluded anymore — all games get a winner entry slot
const WINNER_EXCLUDED = SPECIAL_GAMES  // these are handled by their own panels
const GC_PASSWORD         = 'slpittsgc'    // general game coordinator (winner entry)
const SAGAUNU_GC_PASSWORD = 'slpittssa'    // coordinator for Sagaunu Amutha game only
const GASLABU_GC_PASSWORD = 'slpittsga'    // coordinator for Gaslabu game only

// ─────────────────────────────────────────────────────────────
// Special Game: Sagaunu Amutha Thereema  — Firestore backed
// ─────────────────────────────────────────────────────────────
function SagaunuPanel({ onWinnerSet, families }) {
  const allPeople = families.flatMap(f => (f.members || []).map(m => m.name)).sort()

  const [data, setData]           = useState({ secret:null, votes:[], revealed:false })
  const [loading, setLoading]     = useState(true)
  const [gcAuth, setGcAuth]       = useState(false)
  const [gcPrompt, setGcPrompt]   = useState(false)
  const [phase, setPhase]         = useState('vote')
  const [secretPick, setSecretPick] = useState('')
  const [secretErr, setSecretErr]   = useState('')
  const [vGuess, setVGuess]   = useState('')
  const [vName, setVName]     = useState('')
  const [vErr, setVErr]       = useState('')
  const [saving, setSaving]   = useState(false)
  const [resetConfirm, setResetConfirm] = useState(false)

  const sagaunuRef = doc(db, GAME_CONFIG_COL, SAGAUNU_DOC)

  // Live listener
  useEffect(() => {
    const unsub = onSnapshot(sagaunuRef, snap => {
      if (snap.exists()) setData(snap.data())
      else setData({ secret:null, votes:[], revealed:false })
      setLoading(false)
    })
    return unsub
  }, [])

  function handleGcLogin(pass, setErr) {
    if (pass !== SAGAUNU_GC_PASSWORD) { setErr('Incorrect password.'); return }
    setGcAuth(true); setGcPrompt(false)
  }

  async function saveSecret() {
    if (!secretPick) { setSecretErr('Please select a person.'); return }
    await setDoc(sagaunuRef, { ...data, secret: secretPick }, { merge:true })
    setSecretPick(''); setSecretErr('')
  }

  async function submitVote() {
    if (!vGuess) { setVErr('Please select your guess.'); return }
    if (!vName.trim()) { setVErr('Please enter your name.'); return }
    setSaving(true)
    try {
      // Use transaction to prevent duplicate votes
      await runTransaction(db, async tx => {
        const snap = await tx.get(sagaunuRef)
        const current = snap.exists() ? snap.data() : { secret:null, votes:[], revealed:false }
        const already = (current.votes || []).find(
          v => v.guesserName.trim().toLowerCase() === vName.trim().toLowerCase()
        )
        if (already) throw new Error('duplicate')
        const vote = { guesserName: vName.trim(), guessedPerson: vGuess, ts: Date.now() }
        tx.set(sagaunuRef, { ...current, votes: [...(current.votes||[]), vote] }, { merge:true })
      })
      setVGuess(''); setVName(''); setPhase('thanks')
      setTimeout(() => setPhase('vote'), 3000)
    } catch(e) {
      if (e.message === 'duplicate') setVErr('This name has already voted. Each person can only vote once.')
      else setVErr('Error saving vote. Please try again.')
    }
    setSaving(false)
  }

  async function reveal() {
    if (!data.secret) return
    const correct = (data.votes||[]).filter(v => v.guessedPerson === data.secret)
    let winnerName
    if (correct.length > 0) {
      correct.sort((a,b) => a.ts - b.ts)
      winnerName = `${correct[0].guesserName} (guessed correctly at ${new Date(correct[0].ts).toLocaleTimeString()})`
    } else {
      winnerName = 'No correct guesses — no winner'
    }
    await setDoc(sagaunuRef, { ...data, revealed: true }, { merge:true })
    onWinnerSet(winnerName)
  }

  async function doReset(pass, setErr) {
    if (pass !== SAGAUNU_GC_PASSWORD) { setErr('Incorrect coordinator password.'); return }
    await setDoc(sagaunuRef, { secret:null, votes:[], revealed:false })
    onWinnerSet(null)
    setResetConfirm(false); setPhase('vote')
  }

  if (loading) return <div style={{ padding:16, textAlign:'center', color:'#9ca3af', fontSize:13 }}>Loading…</div>

  const secretSet  = !!data.secret
  const isRevealed = data.revealed
  const votes      = data.votes || []

  return (
    <div style={{ border:'1px solid #d8b4fe', borderRadius:12, overflow:'hidden', marginTop:8 }}>
      {/* Header */}
      <div style={{ padding:'10px 14px', background:'linear-gradient(135deg,#7e22ce,#a855f7)',
        display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:6 }}>
        <div>
          <span style={{ fontSize:13, fontWeight:700, color:'white' }}>🔮 Sagaunu Amutha Thereema</span>
          <span style={{ fontSize:11, color:'rgba(255,255,255,0.75)', marginLeft:8 }}>
            {data.votes.length} vote{data.votes.length !== 1 ? 's' : ''} recorded
          </span>
        </div>
        {gcAuth && !isRevealed && (
          <div style={{ display:'flex', gap:6 }}>
            {secretSet && (
              <button onClick={reveal}
                style={{ fontSize:11, padding:'4px 12px', borderRadius:7, cursor:'pointer',
                  border:'none', background:'#fbbf24', color:'#1f2937', fontWeight:700 }}>
                🔓 Reveal & pick winner
              </button>
            )}
            <button onClick={() => setResetConfirm(true)}
              style={{ fontSize:11, padding:'4px 10px', borderRadius:7, cursor:'pointer',
                border:'1px solid rgba(255,255,255,0.4)', background:'rgba(255,0,0,0.25)', color:'white', fontWeight:600 }}>
              🗑 Reset
            </button>
          </div>
        )}
        {!gcAuth && (
          <button onClick={() => setGcPrompt(true)}
            style={{ fontSize:11, padding:'4px 12px', borderRadius:7, cursor:'pointer',
              border:'1px solid rgba(255,255,255,0.5)', background:'transparent', color:'white', fontWeight:600 }}>
            🔐 Coordinator login
          </button>
        )}
        {gcAuth && isRevealed && (
          <button onClick={() => setResetConfirm(true)}
            style={{ fontSize:11, padding:'4px 10px', borderRadius:7, cursor:'pointer',
              border:'1px solid rgba(255,255,255,0.4)', background:'rgba(255,0,0,0.25)', color:'white', fontWeight:600 }}>
            🗑 Reset
          </button>
        )}
      </div>

      <div style={{ padding:'12px 14px', background:'#faf5ff' }}>
        {/* GC: set secret */}
        {gcAuth && !isRevealed && (
          <div style={{ background:'white', border:'1px solid #d8b4fe', borderRadius:10, padding:'12px',
            marginBottom:'12px' }}>
            <p style={{ fontSize:12, fontWeight:600, color:'#6b21a8', margin:'0 0 8px' }}>
              🔐 Coordinator: {secretSet ? `Secret person is set (${data.secret})` : 'Set the secret Sagaunu Amutha'}
            </p>
            {!secretSet ? (
              <div style={{ display:'flex', gap:6 }}>
                <select value={secretPick} onChange={e => { setSecretPick(e.target.value); setSecretErr('') }}
                  style={{ flex:1, padding:'7px 10px', borderRadius:7, fontSize:13,
                    border: secretErr ? '1px solid #ef4444' : '1px solid #d1d5db',
                    outline:'none', background:'white', cursor:'pointer' }}>
                  <option value=''>— Select person —</option>
                  {allPeople.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <button onClick={saveSecret}
                  style={{ padding:'7px 14px', borderRadius:7, fontSize:13, fontWeight:600,
                    cursor:'pointer', border:'none', background:'#7e22ce', color:'white' }}>
                  Set
                </button>
              </div>
            ) : (
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:13, color:'#166534', fontWeight:600 }}>✓ Secret locked in</span>
                <button onClick={() => setDoc(sagaunuRef, { ...data, secret:null }, { merge:true })}
                  style={{ fontSize:11, padding:'3px 10px', borderRadius:6, cursor:'pointer',
                    border:'1px solid #fca5a5', background:'#fee2e2', color:'#991b1b' }}>
                  Change
                </button>
              </div>
            )}
            {secretErr && <p style={{ fontSize:12, color:'#ef4444', margin:'6px 0 0' }}>{secretErr}</p>}
          </div>
        )}

        {/* Revealed results */}
        {isRevealed && (
          <div style={{ background:'#f3e8ff', border:'1px solid #d8b4fe', borderRadius:10, padding:'12px', marginBottom:'12px' }}>
            <p style={{ fontSize:13, fontWeight:700, color:'#6b21a8', margin:'0 0 8px' }}>
              🔓 Revealed! Secret Sagaunu Amutha: <strong>{data.secret || '—'}</strong>
            </p>
            <div style={{ maxHeight:200, overflowY:'auto' }}>
              {votes.length === 0
                ? <p style={{ fontSize:12, color:'#9ca3af', margin:0 }}>No votes were submitted.</p>
                : votes.slice().sort((a,b)=>a.ts-b.ts).map((v,i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between',
                    padding:'5px 8px', background: v.guessedPerson===data.secret ? '#dcfce7' : 'white',
                    borderRadius:6, marginBottom:4, border: v.guessedPerson===data.secret ? '1px solid #86efac' : '1px solid #e5e7eb' }}>
                    <span style={{ fontSize:12, color:'#111827' }}>
                      {v.guessedPerson===data.secret ? '✅' : '❌'} <strong>{v.guesserName}</strong> → {v.guessedPerson}
                    </span>
                    <span style={{ fontSize:11, color:'#9ca3af' }}>{new Date(v.ts).toLocaleTimeString()}</span>
                  </div>
                ))
              }
            </div>
            {gcAuth && (
              <button onClick={() => setResetConfirm(true)}
                style={{ marginTop:8, fontSize:11, padding:'4px 10px', borderRadius:6, cursor:'pointer',
                  border:'1px solid #fca5a5', background:'#fee2e2', color:'#991b1b' }}>
                🗑 Reset game
              </button>
            )}
          </div>
        )}

        {/* Voting form — shown to everyone if secret is set and not revealed */}
        {!isRevealed && secretSet && (
          <>
            {phase === 'thanks' ? (
              <div style={{ textAlign:'center', padding:'16px', background:'#dcfce7',
                borderRadius:10, border:'1px solid #86efac' }}>
                <p style={{ fontSize:15, fontWeight:700, color:'#166534', margin:0 }}>
                  ✅ Your vote is recorded!
                </p>
                <p style={{ fontSize:12, color:'#6b7280', margin:'4px 0 0' }}>
                  Results will be revealed by the coordinator.
                </p>
              </div>
            ) : (
              <div style={{ background:'white', border:'1px solid #e5e7eb', borderRadius:10, padding:'12px' }}>
                <p style={{ fontSize:13, fontWeight:600, color:'#111827', margin:'0 0 10px' }}>
                  🤔 Who is the Sagaunu Amutha? Cast your vote!
                </p>
                <div style={{ marginBottom:8 }}>
                  <label style={{ fontSize:12, color:'#6b7280', display:'block', marginBottom:4 }}>
                    Your name
                  </label>
                  <input value={vName} onChange={e => { setVName(e.target.value); setVErr('') }}
                    placeholder="Enter your name"
                    style={{ width:'100%', padding:'8px 10px', borderRadius:7, fontSize:13,
                      border:'1px solid #d1d5db', outline:'none', boxSizing:'border-box' }} />
                </div>
                <div style={{ marginBottom:10 }}>
                  <label style={{ fontSize:12, color:'#6b7280', display:'block', marginBottom:4 }}>
                    I think the Sagaunu Amutha is…
                  </label>
                  <select value={vGuess} onChange={e => { setVGuess(e.target.value); setVErr('') }}
                    style={{ width:'100%', padding:'8px 10px', borderRadius:7, fontSize:13,
                      border:'1px solid #d1d5db', outline:'none', background:'white',
                      cursor:'pointer', boxSizing:'border-box' }}>
                    <option value=''>— Select a person —</option>
                    {allPeople.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                {vErr && <p style={{ fontSize:12, color:'#ef4444', margin:'0 0 8px' }}>{vErr}</p>}
                <button onClick={submitVote} disabled={saving}
                  style={{ width:'100%', padding:'9px', borderRadius:8, fontSize:14, fontWeight:600,
                    cursor: saving ? 'not-allowed' : 'pointer', border:'none',
                    background: saving ? '#a78bfa' : '#7e22ce', color:'white' }}>
                  {saving ? 'Saving…' : 'Submit my vote 🗳️'}
                </button>
                <p style={{ fontSize:11, color:'#9ca3af', textAlign:'center', margin:'6px 0 0' }}>
                  Votes are recorded once — they cannot be edited after submission.
                </p>
              </div>
            )}
          </>
        )}

        {!isRevealed && !secretSet && !gcAuth && (
          <p style={{ fontSize:13, color:'#9ca3af', textAlign:'center', margin:0, padding:'8px 0' }}>
            Waiting for coordinator to start this game…
          </p>
        )}
      </div>

      {/* Reset confirm modal */}
      {resetConfirm && (
        <PasswordModal title="Reset Sagaunu game?" icon="🗑️" iconBg="#fee2e2"
          subtitle="This will erase all votes, the secret person, and the winner. Enter coordinator password to confirm."
          confirmLabel="Reset all data" confirmBg="#991b1b"
          onConfirm={doReset} onCancel={() => setResetConfirm(false)} />
      )}
      {gcPrompt && (
        <PasswordModal title="Sagaunu Coordinator Login"
          subtitle="Enter the Sagaunu Amutha game coordinator password."
          icon="🔮" iconBg="#f3e8ff" confirmLabel="Login" confirmBg="#7e22ce"
          onConfirm={handleGcLogin} onCancel={() => setGcPrompt(false)} />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Special Game: Gaslabu Gediye Ata Ganan Kireema — Firestore backed
// ─────────────────────────────────────────────────────────────
function GaslabuPanel({ onWinnerSet, currentWinner }) {
  const [meta, setMeta]         = useState({ actual:null, closed:false })
  const [guesses, setGuesses]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [gcAuth, setGcAuth]     = useState(false)
  const [gcPrompt, setGcPrompt] = useState(false)
  const [gName, setGName]       = useState('')
  const [gCount, setGCount]     = useState('')
  const [gErr, setGErr]         = useState('')
  const [phase, setPhase]       = useState('form')
  const [saving, setSaving]     = useState(false)
  const [actualInput, setActualInput] = useState('')
  const [actualErr, setActualErr]     = useState('')
  const [resetConfirm, setResetConfirm] = useState(false)

  const metaRef = doc(db, GAME_CONFIG_COL, GASLABU_DOC)

  // Live listeners
  useEffect(() => {
    const u1 = onSnapshot(metaRef, snap => {
      setMeta(snap.exists() ? snap.data() : { actual:null, closed:false })
      setLoading(false)
    })
    const u2 = onSnapshot(
      query(collection(db, GASLABU_COL), orderBy('ts', 'asc')),
      snap => setGuesses(snap.docs.map(d => ({ id:d.id, ...d.data() })))
    )
    return () => { u1(); u2() }
  }, [])

  function handleGcLogin(pass, setErr) {
    if (pass !== GASLABU_GC_PASSWORD) { setErr('Incorrect password.'); return }
    setGcAuth(true); setGcPrompt(false)
  }

  async function submitGuess() {
    if (!gName.trim()) { setGErr('Please enter your name.'); return }
    const n = parseInt(gCount)
    if (!gCount || isNaN(n) || n < 0 || n > 9999) { setGErr('Please enter a valid seed count (0–9999).'); return }
    setSaving(true)
    try {
      await runTransaction(db, async tx => {
        const colSnap = await getDocs(collection(db, GASLABU_COL))
        const already = colSnap.docs.find(
          d => d.data().name.trim().toLowerCase() === gName.trim().toLowerCase()
        )
        if (already) throw new Error('duplicate')
        const newRef = doc(collection(db, GASLABU_COL))
        tx.set(newRef, { name: gName.trim(), count: n, ts: Date.now() })
      })
      setGName(''); setGCount(''); setPhase('thanks')
      setTimeout(() => setPhase('form'), 3000)
    } catch(e) {
      if (e.message === 'duplicate') setGErr('This name already has a guess recorded.')
      else setGErr('Error saving guess. Please try again.')
    }
    setSaving(false)
  }

  async function closeGame() {
    if (!actualInput || isNaN(parseInt(actualInput))) { setActualErr('Enter the actual seed count.'); return }
    const actual = parseInt(actualInput)
    const sorted = guesses.slice().sort((a,b) => Math.abs(a.count-actual) - Math.abs(b.count-actual) || a.ts-b.ts)
    const winner = sorted[0]
    await setDoc(metaRef, { actual, closed:true })
    if (winner) onWinnerSet(`${winner.name} (guessed ${winner.count}, actual: ${actual})`)
    else onWinnerSet('No guesses recorded')
    setActualInput(''); setActualErr('')
  }

  async function doReset(pass, setErr) {
    if (pass !== GASLABU_GC_PASSWORD) { setErr('Incorrect coordinator password.'); return }
    await setDoc(metaRef, { actual:null, closed:false })
    // delete all guesses
    const snap = await getDocs(collection(db, GASLABU_COL))
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
    onWinnerSet(null)
    setResetConfirm(false); setPhase('form')
  }

  if (loading) return <div style={{ padding:16, textAlign:'center', color:'#9ca3af', fontSize:13 }}>Loading…</div>

  const sortedByCloseness = meta.closed
    ? guesses.slice().sort((a,b) => Math.abs(a.count-meta.actual)-Math.abs(b.count-meta.actual)||a.ts-b.ts)
    : []
  const winner = sortedByCloseness[0] || null

  return (
    <div style={{ border:'1px solid #86efac', borderRadius:12, overflow:'hidden', marginTop:8 }}>
      <div style={{ padding:'10px 14px', background:'linear-gradient(135deg,#14532d,#15803d)',
        display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:6 }}>
        <div>
          <span style={{ fontSize:13, fontWeight:700, color:'white' }}>🎃 Gaslabu Gediye Ata Ganan Kireema</span>
          <span style={{ fontSize:11, color:'rgba(255,255,255,0.75)', marginLeft:8 }}>
            {guesses.length} guess{guesses.length !== 1 ? 'es' : ''} · {meta.closed ? 'Closed' : 'Open'}
          </span>
        </div>
        {gcAuth && (
          <button onClick={() => setResetConfirm(true)}
            style={{ fontSize:11, padding:'4px 10px', borderRadius:7, cursor:'pointer',
              border:'1px solid rgba(255,255,255,0.4)', background:'rgba(255,0,0,0.25)', color:'white', fontWeight:600 }}>
            🗑 Reset
          </button>
        )}
        {!gcAuth && (
          <button onClick={() => setGcPrompt(true)}
            style={{ fontSize:11, padding:'4px 12px', borderRadius:7, cursor:'pointer',
              border:'1px solid rgba(255,255,255,0.5)', background:'transparent', color:'white', fontWeight:600 }}>
            🔐 Coordinator login
          </button>
        )}
      </div>

      <div style={{ padding:'12px 14px', background:'#f0fdf4' }}>
        {/* Results shown after closing */}
        {meta.closed && (
          <div style={{ background:'#dcfce7', border:'1px solid #86efac', borderRadius:10, padding:'12px', marginBottom:'12px' }}>
            <p style={{ fontSize:13, fontWeight:700, color:'#166534', margin:'0 0 6px' }}>
              🏆 Actual seed count: <strong>{meta.actual}</strong>
            </p>
            {winner && (
              <p style={{ fontSize:13, color:'#166534', margin:'0 0 10px' }}>
                Winner: <strong>{winner.name}</strong> — guessed {winner.count}
                {winner.count === meta.actual ? ' (exact!)' : ` (off by ${Math.abs(winner.count - meta.actual)})`}
              </p>
            )}
            <div style={{ maxHeight:200, overflowY:'auto' }}>
              {sortedByCloseness.map((g,i) => (
                <div key={g.id||i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'5px 8px', borderRadius:6, marginBottom:3,
                  background: i===0 ? '#bbf7d0' : 'white', border: i===0 ? '1px solid #4ade80' : '1px solid #e5e7eb' }}>
                  <span style={{ fontSize:12 }}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`} <strong>{g.name}</strong> → {g.count}</span>
                  <span style={{ fontSize:11, color:'#6b7280' }}>
                    {g.count===meta.actual ? 'Exact!' : `±${Math.abs(g.count-meta.actual)}`} · {new Date(g.ts).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
            {gcAuth && (
              <button onClick={() => setResetConfirm(true)}
                style={{ marginTop:8, fontSize:11, padding:'4px 10px', borderRadius:6, cursor:'pointer',
                  border:'1px solid #fca5a5', background:'#fee2e2', color:'#991b1b' }}>
                🗑 Reset game
              </button>
            )}
          </div>
        )}

        {/* GC: close & enter actual */}
        {gcAuth && !meta.closed && (
          <div style={{ background:'white', border:'1px solid #86efac', borderRadius:10, padding:'12px', marginBottom:'12px' }}>
            <p style={{ fontSize:12, fontWeight:600, color:'#166534', margin:'0 0 8px' }}>
              📊 Coordinator: Enter actual seed count to close guessing & pick winner
            </p>
            <div style={{ display:'flex', gap:6 }}>
              <input type="number" value={actualInput} onChange={e => { setActualInput(e.target.value); setActualErr('') }}
                placeholder="Actual seed count" min={0} max={9999}
                style={{ flex:1, padding:'7px 10px', borderRadius:7, fontSize:13,
                  border: actualErr ? '1px solid #ef4444' : '1px solid #d1d5db', outline:'none' }} />
              <button onClick={closeGame}
                style={{ padding:'7px 14px', borderRadius:7, fontSize:13, fontWeight:600,
                  cursor:'pointer', border:'none', background:'#166534', color:'white' }}>
                Close & pick winner
              </button>
            </div>
            {actualErr && <p style={{ fontSize:12, color:'#ef4444', margin:'6px 0 0' }}>{actualErr}</p>}
            {guesses.length > 0 && (
              <p style={{ fontSize:11, color:'#6b7280', margin:'6px 0 0' }}>
                Current guesses: {guesses.map(g => `${g.name} (${g.count})`).join(' · ')}
              </p>
            )}
          </div>
        )}

        {/* Guess form */}
        {!meta.closed && (
          <>
            {phase === 'thanks' ? (
              <div style={{ textAlign:'center', padding:'14px', background:'#dcfce7',
                borderRadius:10, border:'1px solid #86efac' }}>
                <p style={{ fontSize:15, fontWeight:700, color:'#166534', margin:0 }}>✅ Guess recorded!</p>
                <p style={{ fontSize:12, color:'#6b7280', margin:'4px 0 0' }}>Good luck! 🍀</p>
              </div>
            ) : (
              <div style={{ background:'white', border:'1px solid #e5e7eb', borderRadius:10, padding:'12px' }}>
                <p style={{ fontSize:13, fontWeight:600, color:'#111827', margin:'0 0 10px' }}>
                  🎃 How many seeds are in the Papaya?
                </p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                  <div>
                    <label style={{ fontSize:12, color:'#6b7280', display:'block', marginBottom:4 }}>Your name</label>
                    <input value={gName} onChange={e => { setGName(e.target.value); setGErr('') }}
                      placeholder="Enter your name"
                      style={{ width:'100%', padding:'8px 10px', borderRadius:7, fontSize:13,
                        border:'1px solid #d1d5db', outline:'none', boxSizing:'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize:12, color:'#6b7280', display:'block', marginBottom:4 }}>Seed count guess</label>
                    <input type="number" value={gCount} onChange={e => { setGCount(e.target.value); setGErr('') }}
                      placeholder="e.g. 247" min={0} max={9999}
                      style={{ width:'100%', padding:'8px 10px', borderRadius:7, fontSize:13,
                        border:'1px solid #d1d5db', outline:'none', boxSizing:'border-box' }} />
                  </div>
                </div>
                {gErr && <p style={{ fontSize:12, color:'#ef4444', margin:'0 0 8px' }}>{gErr}</p>}
                <button onClick={submitGuess} disabled={saving}
                  style={{ width:'100%', padding:'9px', borderRadius:8, fontSize:14, fontWeight:600,
                    cursor: saving ? 'not-allowed' : 'pointer', border:'none',
                    background: saving ? '#4ade80' : '#166534', color:'white' }}>
                  {saving ? 'Saving…' : 'Submit my guess 🎯'}
                </button>
                <p style={{ fontSize:11, color:'#9ca3af', textAlign:'center', margin:'6px 0 0' }}>
                  One guess per person · Cannot be edited after submission
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {resetConfirm && (
        <PasswordModal title="Reset Gaslabu game?" icon="🗑️" iconBg="#fee2e2"
          subtitle="This will erase all guesses and the winner. Enter coordinator password to confirm."
          confirmLabel="Reset all data" confirmBg="#991b1b"
          onConfirm={doReset} onCancel={() => setResetConfirm(false)} />
      )}
      {gcPrompt && (
        <PasswordModal title="Gaslabu Coordinator Login"
          subtitle="Enter the Gaslabu game coordinator password."
          icon="🎃" iconBg="#f0fdf4" confirmLabel="Login" confirmBg="#166534"
          onConfirm={handleGcLogin} onCancel={() => setGcPrompt(false)} />
      )}
    </div>
  )
}

// Winners now live in Firestore — these are no-ops kept for reference only
function loadWinners() { return {} }
function saveWinnersStore() {}

// ── shared password modal ──────────────────────────────────────
function PasswordModal({ title, subtitle, icon, iconBg, confirmLabel, confirmBg, onConfirm, onCancel }) {
  const [pass, setPass] = useState('')
  const [err, setErr]   = useState('')
  return (
    <div onClick={onCancel} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:14,
        padding:'1.75rem', width:'100%', maxWidth:380, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ width:48, height:48, borderRadius:'50%', margin:'0 auto 1rem',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, background:iconBg }}>
          {icon}
        </div>
        <h3 style={{ fontSize:17, fontWeight:700, textAlign:'center', margin:'0 0 6px', color:'#111827' }}>{title}</h3>
        <p style={{ fontSize:13, color:'#6b7280', textAlign:'center', margin:'0 0 1.25rem', lineHeight:1.5 }}>{subtitle}</p>
        <input type="password" value={pass} autoFocus placeholder="Enter password"
          onChange={e => { setPass(e.target.value); setErr('') }}
          onKeyDown={e => e.key === 'Enter' && onConfirm(pass, setErr)}
          style={{ width:'100%', padding:'9px 12px', borderRadius:8, fontSize:14, boxSizing:'border-box',
            border: err ? '1px solid #ef4444' : '1px solid #d1d5db', outline:'none', marginBottom:6 }} />
        {err && <p style={{ fontSize:12, color:'#ef4444', margin:'0 0 10px' }}>{err}</p>}
        <div style={{ display:'flex', gap:8, marginTop:10 }}>
          <button onClick={onCancel} style={{ flex:1, padding:'10px', borderRadius:8, fontSize:14,
            cursor:'pointer', border:'1px solid #d1d5db', background:'white', color:'#374151', fontWeight:500 }}>
            Cancel
          </button>
          <button onClick={() => onConfirm(pass, setErr)} style={{ flex:1, padding:'10px', borderRadius:8,
            fontSize:14, cursor:'pointer', border:'none', fontWeight:600, color:'white', background:confirmBg }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Winner Entry Panel (game-day section) ─────────────────────
function WinnersPanel({ games, families, winners, persistWinners }) {
  const [gcAuth, setGcAuth]     = useState(false)
  const [gcPrompt, setGcPrompt] = useState(false)
  const [editCell, setEditCell] = useState(null)
  const [draftName, setDraftName] = useState('')
  const [delConfirm, setDelConfirm] = useState(null)

  const normalGames = games.filter(g => !SPECIAL_GAMES.includes(g.name))
  const isGroup     = (name) => GROUP_GAMES.includes(name)

  function persist(next) { persistWinners(next) }
  function winnerKey(gameName, colKey) { return `${gameName}||${colKey}` }
  function getWinner(gameName, colKey) { return winners[winnerKey(gameName, colKey)] || null }

  function handleGcLogin(pass, setErr) {
    if (pass !== GC_PASSWORD) { setErr('Incorrect coordinator password.'); return }
    setGcAuth(true); setGcPrompt(false)
  }

  function startEdit(gameName, colKey) {
    setDraftName(getWinner(gameName, colKey)?.name || '')
    setEditCell({ game: gameName, colKey })
  }

  async function saveWinner() {
    if (!draftName.trim()) return
    const k = winnerKey(editCell.game, editCell.colKey)
    await persist({ ...winners, [k]: { name: draftName.trim(), ts: Date.now() } })
    setEditCell(null); setDraftName('')
  }

  async function deleteWinner(gameName, colKey) {
    const k = winnerKey(gameName, colKey)
    const next = { ...winners }; delete next[k]; await persist(next)
    setDelConfirm(null)
  }

  const totalPossible = normalGames.reduce((s,g) => s + COLS.filter(c => g[c.key]).length, 0)
  const totalEntered  = Object.keys(winners).length

  return (
    <div>
      {/* Header */}
      <div style={{ borderRadius:12, overflow:'hidden', border:'1px solid #e5e7eb',
        boxShadow:'0 1px 4px rgba(0,0,0,0.06)', marginBottom:'1.25rem' }}>
        <div style={{ background:'linear-gradient(135deg,#92400e,#d97706)', padding:'12px 16px',
          display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'white' }}>🏅 Winner Entry — Game Coordinator</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.8)', marginTop:2 }}>
              {totalEntered} of {totalPossible} slots filled
            </div>
          </div>
          {!gcAuth
            ? <button onClick={() => setGcPrompt(true)}
                style={{ padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:600,
                  cursor:'pointer', border:'1px solid rgba(255,255,255,0.5)',
                  background:'transparent', color:'white' }}>
                🔐 Coordinator login
              </button>
            : <span style={{ fontSize:12, background:'rgba(255,255,255,0.2)', color:'white',
                padding:'5px 12px', borderRadius:8, fontWeight:600 }}>✓ Coordinator active</span>
          }
        </div>
        <div style={{ height:4, background:'#fef3c7' }}>
          <div style={{ height:'100%', background:'#d97706', borderRadius:2,
            width: totalPossible ? `${Math.round(totalEntered/totalPossible*100)}%` : '0%',
            transition:'width 0.4s' }} />
        </div>
      </div>

      {!gcAuth && (
        <div style={{ padding:'12px 16px', background:'#fffbeb', border:'1px solid #fcd34d',
          borderRadius:10, fontSize:13, color:'#92400e', marginBottom:'1rem' }}>
          Login as Game Coordinator above to add or edit winners. Everyone can view the board in the 🏆 Board tab.
        </div>
      )}

      {/* Game cards */}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {normalGames.map(g => {
          const eligibleCols = COLS.filter(c => g[c.key])
          const filled = eligibleCols.filter(c => getWinner(g.name, c.key)).length
          const grp = isGroup(g.name)
          return (
            <div key={g.name} style={{ borderRadius:12, border: grp ? '1px solid #d8b4fe' : '1px solid #e5e7eb',
              overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ padding:'10px 14px',
                background: grp ? '#f5f3ff' : (filled===eligibleCols.length && filled>0 ? '#f0fdf4' : '#f9fafb'),
                borderBottom:'1px solid #e5e7eb', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <span style={{ fontSize:13, fontWeight:600, color:'#111827' }}>{g.name}</span>
                  {grp && <span style={{ fontSize:10, marginLeft:6, padding:'1px 6px', borderRadius:5,
                    background:'#ede9fe', color:'#6b21a8', fontWeight:600 }}>GROUP — enter winning captain</span>}
                </div>
                <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, fontWeight:600,
                  background: filled===eligibleCols.length&&filled>0 ? '#dcfce7' : filled>0 ? '#fef3c7' : '#f3f4f6',
                  color:      filled===eligibleCols.length&&filled>0 ? '#166534' : filled>0 ? '#92400e' : '#6b7280' }}>
                  {filled}/{eligibleCols.length} filled
                </span>
              </div>
              <div style={{ padding:'10px 12px', display:'flex', flexDirection:'column', gap:7 }}>
                {eligibleCols.map(c => {
                  const w = getWinner(g.name, c.key)
                  const isEditing = editCell?.game===g.name && editCell?.colKey===c.key
                  return (
                    <div key={c.key} style={{ display:'flex', alignItems:'center', gap:8,
                      padding:'8px 10px', borderRadius:8, border:`1px solid ${w ? c.border : '#e5e7eb'}`,
                      background: w ? c.bg : 'white' }}>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, fontWeight:600,
                        background:c.bg, color:c.text, border:`1px solid ${c.border}`,
                        whiteSpace:'nowrap', flexShrink:0 }}>{c.label.replace('\n',' ')}</span>
                      {isEditing ? (
                        <div style={{ display:'flex', flex:1, gap:6, alignItems:'center' }}>
                          <input value={draftName} onChange={e => setDraftName(e.target.value)}
                            onKeyDown={e => { if(e.key==='Enter') saveWinner(); if(e.key==='Escape') setEditCell(null) }}
                            autoFocus placeholder={grp ? 'Winning team captain…' : 'Winner name…'}
                            style={{ flex:1, padding:'5px 9px', borderRadius:7, fontSize:13,
                              border:'1px solid #93c5fd', outline:'none' }} />
                          <button onClick={saveWinner}
                            style={{ padding:'5px 12px', borderRadius:7, fontSize:12, fontWeight:600,
                              cursor:'pointer', border:'none', background:'#166534', color:'white' }}>Save</button>
                          <button onClick={() => setEditCell(null)}
                            style={{ padding:'5px 10px', borderRadius:7, fontSize:12,
                              cursor:'pointer', border:'1px solid #d1d5db', background:'white', color:'#6b7280' }}>✕</button>
                        </div>
                      ) : w ? (
                        <div style={{ display:'flex', flex:1, justifyContent:'space-between', alignItems:'center' }}>
                          <span style={{ fontSize:13, fontWeight:600, color:'#111827' }}>
                            {grp ? '🏅' : '🥇'} {w.name}
                          </span>
                          {gcAuth && (
                            <div style={{ display:'flex', gap:5 }}>
                              <button onClick={() => startEdit(g.name, c.key)}
                                style={{ fontSize:11, padding:'3px 9px', borderRadius:6, cursor:'pointer',
                                  border:'1px solid #93c5fd', background:'#dbeafe', color:'#1e40af', fontWeight:500 }}>Edit</button>
                              <button onClick={() => setDelConfirm({ game:g.name, colKey:c.key })}
                                style={{ fontSize:11, padding:'3px 9px', borderRadius:6, cursor:'pointer',
                                  border:'1px solid #fca5a5', background:'#fee2e2', color:'#991b1b', fontWeight:500 }}>✕</button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ display:'flex', flex:1, justifyContent:'space-between', alignItems:'center' }}>
                          <span style={{ fontSize:12, color:'#9ca3af', fontStyle:'italic' }}>No winner yet</span>
                          {gcAuth && (
                            <button onClick={() => startEdit(g.name, c.key)}
                              style={{ fontSize:11, padding:'4px 12px', borderRadius:6, cursor:'pointer',
                                border:'1px solid #86efac', background:'#dcfce7', color:'#166534', fontWeight:600 }}>
                              + Add {grp ? 'winning captain' : 'winner'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* GC login modal */}
      {gcPrompt && (
        <PasswordModal title="Game Coordinator Login"
          subtitle="Enter the coordinator password to add or edit winners."
          icon="🏅" iconBg="#fef3c7" confirmLabel="Login" confirmBg="#d97706"
          onConfirm={handleGcLogin} onCancel={() => setGcPrompt(false)} />
      )}

      {/* Delete winner confirm */}
      {delConfirm && (
        <div onClick={() => setDelConfirm(null)} style={{ position:'fixed', inset:0,
          background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center',
          justifyContent:'center', zIndex:1000, padding:'1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:14,
            padding:'1.75rem', width:'100%', maxWidth:360, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width:44, height:44, borderRadius:'50%', margin:'0 auto 1rem',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:20, background:'#fee2e2' }}>🗑️</div>
            <h3 style={{ fontSize:16, fontWeight:700, textAlign:'center', margin:'0 0 8px', color:'#111827' }}>Remove winner?</h3>
            <p style={{ fontSize:13, color:'#6b7280', textAlign:'center', margin:'0 0 1.25rem', lineHeight:1.5 }}>
              Remove <strong>{getWinner(delConfirm.game, delConfirm.colKey)?.name}</strong> from{' '}
              <strong>{delConfirm.game}</strong>?
            </p>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setDelConfirm(null)} style={{ flex:1, padding:'10px', borderRadius:8,
                fontSize:14, cursor:'pointer', border:'1px solid #d1d5db', background:'white', color:'#374151' }}>
                Cancel
              </button>
              <button onClick={() => deleteWinner(delConfirm.game, delConfirm.colKey)}
                style={{ flex:1, padding:'10px', borderRadius:8, fontSize:14, fontWeight:600,
                  cursor:'pointer', border:'none', color:'white', background:'#991b1b' }}>
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Winners Board — public read-only view grouped by category
// ─────────────────────────────────────────────────────────────
function WinnersBoard({ games, winners }) {
  function getWinner(gameName, colKey) { return winners[`${gameName}||${colKey}`] || null }

  const boardByCat = COLS.map(c => ({
    ...c,
    entries: games.filter(g => g[c.key]).map(g => ({ game: g.name, winner: getWinner(g.name, c.key) }))
  }))

  const totalWinners = Object.keys(winners).length
  const totalSlots   = games.reduce((s,g) => s + COLS.filter(c => g[c.key]).length, 0)

  return (
    <div>
      <div style={{ marginBottom:'1.25rem', padding:'12px 16px',
        background:'linear-gradient(135deg,#166534,#15803d)', borderRadius:12,
        display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:'white' }}>🏆 Winners Board</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.8)', marginTop:2 }}>
            {totalWinners} of {totalSlots} winners announced
          </div>
        </div>
        <div style={{ fontSize:22, fontWeight:700, color:'#fbbf24' }}>
          {totalSlots > 0 ? Math.round(totalWinners/totalSlots*100) : 0}%
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {boardByCat.map(cat => {
          if (cat.entries.length === 0) return null
          const filled = cat.entries.filter(e => e.winner).length
          return (
            <div key={cat.key} style={{ borderRadius:12, border:`1px solid ${cat.border}`,
              overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ padding:'10px 16px', background:cat.bg, display:'flex',
                justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:14, fontWeight:700, color:cat.text }}>{cat.label.replace('\n',' ')}</span>
                <span style={{ fontSize:12, color:cat.text, opacity:0.8 }}>{filled}/{cat.entries.length} winners</span>
              </div>
              <div style={{ background:'white' }}>
                {cat.entries.map((e,i) => (
                  <div key={e.game} style={{ padding:'10px 16px', display:'flex',
                    justifyContent:'space-between', alignItems:'center',
                    borderBottom: i<cat.entries.length-1 ? '1px solid #f3f4f6' : 'none',
                    background: e.winner ? 'white' : '#fafafa' }}>
                    <div>
                      <span style={{ fontSize:13, color:'#374151' }}>{e.game}</span>
                      {GROUP_GAMES.includes(e.game) && (
                        <span style={{ fontSize:10, marginLeft:6, color:'#9ca3af' }}>team captain</span>
                      )}
                      {SPECIAL_GAMES.includes(e.game) && (
                        <span style={{ fontSize:10, marginLeft:6, color:'#7e22ce' }}>★ special</span>
                      )}
                    </div>
                    {e.winner
                      ? <span style={{ fontSize:13, fontWeight:700, color:'#166534' }}>🥇 {e.winner.name}</span>
                      : <span style={{ fontSize:12, color:'#d1d5db', fontStyle:'italic' }}>TBD</span>
                    }
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Games sub-pages rendered inside GamesPage
// ─────────────────────────────────────────────────────────────
const GAME_TABS = [
  { id:'table',   label:'📋 Games',       title:'Games List' },
  { id:'winners', label:'🏅 Winners',      title:'Winner Entry' },
  { id:'special', label:'🔮 Special',      title:'Special Games' },
  { id:'board',   label:'🏆 Board',        title:'Winners Board' },
]

function GamesPage() {
  const [games, setGames]           = useState(DEFAULT_GAMES)
  const [families, setFamilies]     = useState([])
  const [subPage, setSubPage]       = useState('table')
  const [modModal, setModModal]     = useState(null)
  const [modTarget, setModTarget]   = useState(null)
  const [editMode, setEditMode]     = useState(null)
  const [formName, setFormName]     = useState('')
  const [formCols, setFormCols]     = useState({})
  const [formErr, setFormErr]       = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [winners, setWinners]       = useState({})
  const [gamesLoading, setGamesLoading] = useState(true)

  const gamesRef   = doc(db, GAME_CONFIG_COL, GAMES_DOC)
  const winnersRef = doc(db, GAME_CONFIG_COL, WINNERS_DOC)

  // Firestore listeners for games + winners + families
  useEffect(() => {
    // Seed games doc on first load if it doesn't exist
    const unsubGames = onSnapshot(gamesRef, async snap => {
      if (snap.exists()) {
        setGames(snap.data().list || DEFAULT_GAMES)
      } else {
        // First time — seed with defaults
        await setDoc(gamesRef, { list: DEFAULT_GAMES })
      }
      setGamesLoading(false)
    })
    const unsubWinners = onSnapshot(winnersRef, snap => {
      setWinners(snap.exists() ? (snap.data().map || {}) : {})
    })
    const unsubFamilies = onSnapshot(collection(db, 'families'), snap => {
      setFamilies(snap.docs.map(d => ({ id:d.id, ...d.data() })))
    })
    return () => { unsubGames(); unsubWinners(); unsubFamilies() }
  }, [])

  async function persistGames(next) {
    setGames(next)
    await setDoc(gamesRef, { list: next })
  }

  async function persistWinners(next) {
    setWinners(next)
    await setDoc(winnersRef, { map: next })
  }

  function openModModal(type, idx = null) { setModTarget(idx); setModModal(type) }

  function confirmMod(pass, setErr) {
    if (pass !== MOD_PASSWORD) { setErr('Incorrect password.'); return }
    if (modModal === 'delete') {
      setDeleteTarget(modTarget); setModModal(null)
    } else if (modModal === 'edit') {
      const g = games[modTarget]
      setFormName(g.name)
      const cols = {}; COLS.forEach(c => { cols[c.key] = g[c.key] || false }); setFormCols(cols)
      setEditMode({ type:'edit', idx: modTarget }); setModModal(null)
    } else if (modModal === 'add') {
      setFormName('')
      const cols = {}; COLS.forEach(c => { cols[c.key] = false }); setFormCols(cols)
      setEditMode({ type:'add' }); setModModal(null)
    }
  }

  async function saveForm() {
    if (!formName.trim()) { setFormErr('Game name is required.'); return }
    const entry = { name: formName.trim(), ...formCols }
    if (editMode.type === 'add') await persistGames([...games, entry])
    else await persistGames(games.map((g, i) => i === editMode.idx ? entry : g))
    setEditMode(null); setFormErr('')
  }

  async function confirmDelete() {
    await persistGames(games.filter((_, i) => i !== deleteTarget))
    setDeleteTarget(null)
  }

  const summary = COLS.map(c => ({
    ...c,
    winners: games.reduce((sum, g) => sum + (g[c.key] ? 1 : 0), 0),
  }))

  // Sub-nav bar
  const SubNav = () => (
    <div style={{ display:'flex', gap:3, overflowX:'auto', marginBottom:'1.5rem',
      background:'white', borderRadius:12, border:'1px solid #e5e7eb', padding:4,
      boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
      {GAME_TABS.map(t => (
        <button key={t.id} onClick={() => setSubPage(t.id)}
          style={{ flex:1, padding:'9px 10px', borderRadius:9, fontSize:12, fontWeight:600,
            cursor:'pointer', border:'none', whiteSpace:'nowrap', transition:'all 0.15s',
            background: subPage===t.id ? '#166534' : 'transparent',
            color: subPage===t.id ? 'white' : '#6b7280' }}>
          {t.label}
        </button>
      ))}
    </div>
  )

  return (
    <div style={{ maxWidth:800, margin:'0 auto', padding:'0 1rem 3rem' }}>
      <div style={{ paddingTop:'1.5rem', marginBottom:'1.25rem' }}>
        <h2 style={{ fontSize:20, fontWeight:700, margin:'0 0 4px', color:'#111827' }}>🏆 Aurudu Games</h2>
        <p style={{ fontSize:13, color:'#6b7280', margin:0 }}>Manage games, record winners, and track results.</p>
      </div>

      <SubNav />

      {/* ── TAB: Games Table ─────────────────────────────────── */}
      {subPage === 'table' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
            <p style={{ fontSize:13, color:'#6b7280', margin:0 }}>Each ✓ = 1 winner for that category. Moderator password required to edit.</p>
            <button onClick={() => openModModal('add')}
              style={{ padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:600,
                cursor:'pointer', border:'none', background:'#166534', color:'white', whiteSpace:'nowrap' }}>
              + Add game
            </button>
          </div>
          <div style={{ overflowX:'auto', marginBottom:'2rem', borderRadius:12,
            border:'1px solid #e5e7eb', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, minWidth:600 }}>
              <thead>
                <tr style={{ background:'#166534' }}>
                  <th style={{ padding:'10px 14px', textAlign:'left', color:'white',
                    fontWeight:600, borderBottom:'1px solid #15803d', minWidth:180 }}>Game</th>
                  {COLS.map(c => (
                    <th key={c.key} style={{ padding:'8px 10px', textAlign:'center', color:'white',
                      fontWeight:600, borderBottom:'1px solid #15803d', whiteSpace:'pre-line',
                      fontSize:11, lineHeight:1.3, minWidth:62 }}>{c.label}</th>
                  ))}
                  <th style={{ padding:'8px 10px', textAlign:'center', color:'white',
                    fontWeight:600, borderBottom:'1px solid #15803d', minWidth:90 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {games.map((g, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc',
                    borderBottom:'0.5px solid #e5e7eb' }}>
                    <td style={{ padding:'9px 14px', color:'#111827', fontWeight:500 }}>
                      {SPECIAL_GAMES.includes(g.name)
                        ? <span>{g.name} <span style={{ fontSize:10, color:'#7e22ce', marginLeft:4, fontWeight:600 }}>★ special</span></span>
                        : GROUP_GAMES.includes(g.name)
                        ? <span>{g.name} <span style={{ fontSize:10, color:'#6b21a8', marginLeft:4 }}>group</span></span>
                        : g.name}
                    </td>
                    {COLS.map(c => (
                      <td key={c.key} style={{ padding:'9px 10px', textAlign:'center' }}>
                        {g[c.key]
                          ? <span style={{ display:'inline-block', width:22, height:22,
                              borderRadius:6, background:c.bg, border:`1px solid ${c.border}`,
                              lineHeight:'22px', fontSize:13, color:c.text, fontWeight:700 }}>✓</span>
                          : <span style={{ color:'#d1d5db', fontSize:14 }}>—</span>
                        }
                      </td>
                    ))}
                    <td style={{ padding:'9px 10px', textAlign:'center' }}>
                      <div style={{ display:'flex', gap:5, justifyContent:'center' }}>
                        <button onClick={() => openModModal('edit', i)}
                          style={{ fontSize:11, padding:'3px 9px', borderRadius:6, cursor:'pointer',
                            border:'1px solid #93c5fd', background:'#dbeafe', color:'#1e40af', fontWeight:500 }}>
                          Edit
                        </button>
                        <button onClick={() => openModModal('delete', i)}
                          style={{ fontSize:11, padding:'3px 9px', borderRadius:6, cursor:'pointer',
                            border:'1px solid #fca5a5', background:'#fee2e2', color:'#991b1b', fontWeight:500 }}>
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Winner count summary */}
          <div style={{ borderRadius:12, border:'1px solid #e5e7eb', overflow:'hidden',
            boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ padding:'10px 16px', background:'#166534' }}>
              <span style={{ fontSize:12, fontWeight:700, color:'white',
                textTransform:'uppercase', letterSpacing:'0.07em' }}>🏅 Possible winners per category</span>
            </div>
            <div style={{ padding:'10px 16px', background:'#f9fafb',
              fontSize:12, color:'#6b7280', borderBottom:'1px solid #e5e7eb' }}>
              1 winner per ✓ per game. Group games = 1 winning team. Special games = 1 winner each.
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:0 }}>
              {summary.map((s, i) => (
                <div key={s.key} style={{ padding:'14px 16px', textAlign:'center',
                  background:s.bg, borderBottom:'1px solid #e5e7eb',
                  borderRight: i % 3 !== 2 ? '1px solid #e5e7eb' : 'none' }}>
                  <p style={{ fontSize:24, fontWeight:700, color:s.text, margin:'0 0 4px' }}>{s.winners}</p>
                  <p style={{ fontSize:11, color:s.text, margin:0, opacity:0.8,
                    whiteSpace:'pre-line', lineHeight:1.3 }}>{s.label}</p>
                </div>
              ))}
            </div>
            <div style={{ padding:'12px 16px', background:'white', borderTop:'1px solid #e5e7eb', fontSize:13, color:'#374151' }}>
              <strong style={{ color:'#111827' }}>Total: </strong>
              <span style={{ fontSize:16, fontWeight:700, color:'#166534' }}>
                {summary.reduce((s, c) => s + c.winners, 0)}
              </span>
              <span style={{ color:'#6b7280', fontSize:13 }}> possible winners</span>
            </div>
          </div>

          <div style={{ marginTop:'2rem' }}><Footer /></div>
        </div>
      )}

      {/* ── TAB: Winner Entry ─────────────────────────────────── */}
      {subPage === 'winners' && (
        <div>
          <WinnersPanel games={games} families={families}
            winners={winners} persistWinners={persistWinners} />
          <div style={{ marginTop:'2rem' }}><Footer /></div>
        </div>
      )}

      {/* ── TAB: Special Games ────────────────────────────────── */}
      {subPage === 'special' && (
        <div>
          <div style={{ marginBottom:'1rem', padding:'12px 16px', background:'#faf5ff',
            border:'1px solid #d8b4fe', borderRadius:12, fontSize:13, color:'#6b21a8' }}>
            <strong>Special games</strong> have unique rules — voters guess directly, coordinators reveal results and winners are auto-calculated.
            Each game has its own separate coordinator password.
          </div>
          <SagaunuPanel families={families}
            currentWinner={winners['Sagaunu Amutha Thereema||adultsCommon']?.name}
            onWinnerSet={async name => {
              const k = 'Sagaunu Amutha Thereema||adultsCommon'
              const next = { ...winners }
              if (!name) delete next[k]
              else next[k] = { name, ts: Date.now() }
              await persistWinners(next)
            }} />
          <div style={{ marginTop:'1.5rem' }}>
            <GaslabuPanel
              currentWinner={winners['Gaslabu Gediye Ata Ganan Kireema||adultsCommon']?.name}
              onWinnerSet={async name => {
                const k = 'Gaslabu Gediye Ata Ganan Kireema||adultsCommon'
                const next = { ...winners }
                if (!name) delete next[k]
                else next[k] = { name, ts: Date.now() }
                await persistWinners(next)
              }} />
          </div>
          <div style={{ marginTop:'2rem' }}><Footer /></div>
        </div>
      )}

      {/* ── TAB: Winners Board ────────────────────────────────── */}
      {subPage === 'board' && (
        <div>
          <WinnersBoard games={games} winners={winners} />
          <div style={{ marginTop:'2rem' }}><Footer /></div>
        </div>
      )}

      {/* Moderator password modal */}
      {modModal && (
        <PasswordModal
          title="Moderator access required"
          subtitle={modModal === 'delete' ? 'Enter the moderator password to delete this game.'
            : modModal === 'add' ? 'Enter the moderator password to add a new game.'
            : 'Enter the moderator password to edit this game.'}
          icon={modModal === 'delete' ? '🗑️' : modModal === 'add' ? '➕' : '✏️'}
          iconBg={modModal === 'delete' ? '#fee2e2' : '#dbeafe'}
          confirmLabel="Continue"
          confirmBg={modModal === 'delete' ? '#991b1b' : '#166534'}
          onConfirm={confirmMod}
          onCancel={() => setModModal(null)}
        />
      )}

      {/* Edit / Add game form */}
      {editMode && (
        <div onClick={() => setEditMode(null)} style={{ position:'fixed', inset:0,
          background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center',
          justifyContent:'center', zIndex:1000, padding:'1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:14,
            padding:'1.75rem', width:'100%', maxWidth:480, boxShadow:'0 20px 60px rgba(0,0,0,0.2)',
            maxHeight:'90vh', overflowY:'auto' }}>
            <h3 style={{ fontSize:16, fontWeight:700, margin:'0 0 1.25rem', color:'#111827' }}>
              {editMode.type === 'add' ? 'Add new game' : 'Edit game'}
            </h3>
            <div style={{ marginBottom:'1rem' }}>
              <label style={{ fontSize:13, fontWeight:500, color:'#374151', display:'block', marginBottom:6 }}>
                Game name
              </label>
              <input value={formName} onChange={e => setFormName(e.target.value)}
                placeholder="e.g. Kana Muttiya Bindeema"
                style={{ width:'100%', padding:'9px 12px', borderRadius:8, fontSize:14,
                  border:'1px solid #d1d5db', outline:'none', boxSizing:'border-box' }} />
            </div>
            <div style={{ marginBottom:'1.25rem' }}>
              <label style={{ fontSize:13, fontWeight:500, color:'#374151', display:'block', marginBottom:10 }}>
                Available for categories
              </label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {COLS.map(c => (
                  <label key={c.key} style={{ display:'flex', alignItems:'center', gap:8,
                    padding:'8px 12px', borderRadius:8, cursor:'pointer',
                    background: formCols[c.key] ? c.bg : '#f9fafb',
                    border: `1px solid ${formCols[c.key] ? c.border : '#e5e7eb'}` }}>
                    <input type="checkbox" checked={!!formCols[c.key]}
                      onChange={e => setFormCols(p => ({ ...p, [c.key]: e.target.checked }))}
                      style={{ accentColor: c.text, width:16, height:16 }} />
                    <span style={{ fontSize:13, color: formCols[c.key] ? c.text : '#6b7280',
                      fontWeight: formCols[c.key] ? 600 : 400 }}>{c.label.replace('\n', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
            {formErr && <p style={{ fontSize:12, color:'#ef4444', marginBottom:'1rem' }}>{formErr}</p>}
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={saveForm} style={{ flex:1, padding:'10px', borderRadius:8, fontSize:14,
                fontWeight:600, cursor:'pointer', border:'none', background:'#166534', color:'white' }}>
                {editMode.type === 'add' ? 'Add game' : 'Save changes'}
              </button>
              <button onClick={() => setEditMode(null)} style={{ padding:'10px 16px', borderRadius:8,
                fontSize:14, cursor:'pointer', border:'1px solid #d1d5db', background:'transparent', color:'#6b7280' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete game confirm */}
      {deleteTarget !== null && (
        <div onClick={() => setDeleteTarget(null)} style={{ position:'fixed', inset:0,
          background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center',
          justifyContent:'center', zIndex:1000, padding:'1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:14,
            padding:'1.75rem', width:'100%', maxWidth:380, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width:48, height:48, borderRadius:'50%', margin:'0 auto 1rem',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, background:'#fee2e2' }}>🗑️</div>
            <h3 style={{ fontSize:17, fontWeight:700, textAlign:'center', margin:'0 0 6px', color:'#111827' }}>Delete game?</h3>
            <p style={{ fontSize:13, color:'#6b7280', textAlign:'center', margin:'0 0 1.5rem', lineHeight:1.6 }}>
              Remove <strong style={{ color:'#111827' }}>{games[deleteTarget]?.name}</strong>? This cannot be undone.
            </p>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setDeleteTarget(null)} style={{ flex:1, padding:'10px', borderRadius:8,
                fontSize:14, cursor:'pointer', border:'1px solid #d1d5db', background:'white', color:'#374151', fontWeight:500 }}>
                Cancel
              </button>
              <button onClick={confirmDelete} style={{ flex:1, padding:'10px', borderRadius:8, fontSize:14,
                fontWeight:600, cursor:'pointer', border:'none', color:'white', background:'#991b1b' }}>
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


// ─────────────────────────────────────────────────────────────
// Root App — routing + phone gate
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [accessPhone, setAccessPhone] = useState(() => localStorage.getItem(LS_KEY) || '')
  const [page, setPage]               = useState('home')

  // Counts for home page stats
  const [signupCount, setSignupCount]   = useState(0)
  const [familyCount, setFamilyCount]   = useState(0)

  // Log returning visitor
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY)
    if (saved) {
      const digits = saved.replace(/\D/g, '')
      if (digits.length >= 7) {
        const ref = doc(db, 'access_log', digits)
        setDoc(ref, { phone: saved, lastAccessed: serverTimestamp(), accessCount: increment(1) }, { merge: true })
          .catch(console.error)
      }
    }
  }, [])

  // Live counts for home stats
  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'signups'),   s => setSignupCount(s.size))
    const u2 = onSnapshot(collection(db, 'families'),  s => setFamilyCount(s.size))
    return () => { u1(); u2() }
  }, [])

  if (!accessPhone) return <PhoneGate onAccess={setAccessPhone} />

  return (
    <div style={{ minHeight:'100vh', background:'#f9fafb' }}>
      <NavBar page={page} setPage={setPage} />
      {page === 'home'     && <HomePage setPage={setPage} signupCount={signupCount} familyCount={familyCount} />}
      {page === 'food'     && <FoodPage />}
      {page === 'families' && <FamiliesPage />}
      {page === 'games'    && <GamesPage />}
    </div>
  )
}
