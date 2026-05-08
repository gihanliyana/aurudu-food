import { useState, useEffect } from 'react'
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy, runTransaction, getDocs,
  setDoc, increment
} from 'firebase/firestore'
import { db } from './firebase'

// ─────────────────────────────────────────────────────────────
// Constants
//Update 05/08
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
const MOD_PASSWORD = 'slpitts2026'

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
  { name:'Sagaunu Amuiththa Thereema',            kids8under:false, kids8over:true,  adultsCommon:true,  adultsMen:false, adultsWomen:false, group:false },
  { name:'Gaslabu Gediye Ata Ganan Kireema',      kids8under:false, kids8over:true,  adultsCommon:true,  adultsMen:false, adultsWomen:false, group:false },
  { name:'Deweema',                               kids8under:true,  kids8over:true,  adultsCommon:false, adultsMen:true,  adultsWomen:true,  group:false },
  { name:'Pani Bambara',                          kids8under:false, kids8over:false, adultsCommon:false, adultsMen:false, adultsWomen:false, group:true  },
  { name:'Piti Gode Penny',                       kids8under:false, kids8over:true,  adultsCommon:false, adultsMen:false, adultsWomen:false, group:false },
  { name:'Hat Passing',                           kids8under:false, kids8over:true,  adultsCommon:true,  adultsMen:false, adultsWomen:false, group:false },
  { name:'Act & Pass',                            kids8under:false, kids8over:false, adultsCommon:false, adultsMen:false, adultsWomen:false, group:true  },
  { name:'Aurudu Kumariya & Kumara',              kids8under:false, kids8over:false, adultsCommon:false, adultsMen:true,  adultsWomen:true,  group:false },
]

const GAMES_STORE_KEY = 'aurudu_games_v1'

function loadGames() {
  try {
    const raw = localStorage.getItem(GAMES_STORE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return DEFAULT_GAMES
}

function saveGames(games) {
  try { localStorage.setItem(GAMES_STORE_KEY, JSON.stringify(games)) } catch {}
}

function Tick({ yes }) {
  if (yes) return <span style={{ color:'#166534', fontSize:16, fontWeight:700 }}>✓</span>
  return <span style={{ color:'#d1d5db', fontSize:14 }}>—</span>
}

function GamesPage() {
  const [games, setGames]           = useState(loadGames)
  const [modModal, setModModal]     = useState(null) // 'edit' | 'delete' | 'add'
  const [modTarget, setModTarget]   = useState(null) // index
  const [modPass, setModPass]       = useState('')
  const [modErr, setModErr]         = useState('')

  // Edit/Add form state
  const [editMode, setEditMode]     = useState(null) // { type:'add'|'edit', idx?:number }
  const [formName, setFormName]     = useState('')
  const [formCols, setFormCols]     = useState({})
  const [formErr, setFormErr]       = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  function persist(next) { setGames(next); saveGames(next) }

  function openModModal(type, idx = null) {
    setModTarget(idx)
    setModModal(type)
    setModPass(''); setModErr('')
  }

  function confirmMod() {
    if (modPass !== MOD_PASSWORD) { setModErr('Incorrect password.'); return }
    if (modModal === 'delete') {
      setDeleteTarget(modTarget)
      setModModal(null)
    } else if (modModal === 'edit') {
      const g = games[modTarget]
      setFormName(g.name)
      const cols = {}; COLS.forEach(c => { cols[c.key] = g[c.key] || false }); setFormCols(cols)
      setEditMode({ type:'edit', idx: modTarget })
      setModModal(null)
    } else if (modModal === 'add') {
      setFormName('')
      const cols = {}; COLS.forEach(c => { cols[c.key] = false }); setFormCols(cols)
      setEditMode({ type:'add' })
      setModModal(null)
    }
  }

  function saveForm() {
    if (!formName.trim()) { setFormErr('Game name is required.'); return }
    const entry = { name: formName.trim(), ...formCols }
    if (editMode.type === 'add') {
      persist([...games, entry])
    } else {
      persist(games.map((g, i) => i === editMode.idx ? entry : g))
    }
    setEditMode(null); setFormErr('')
  }

  function confirmDelete() {
    persist(games.filter((_, i) => i !== deleteTarget))
    setDeleteTarget(null)
  }

  // Summary: count winners per category
  const summary = COLS.map(c => ({
    ...c,
    winners: games.reduce((sum, g) => sum + (g[c.key] ? 1 : 0), 0),
  }))

  return (
    <div style={{ maxWidth:780, margin:'0 auto', padding:'0 1rem 3rem' }}>
      <div style={{ paddingTop:'1.5rem', marginBottom:'1.5rem', display:'flex',
        justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:700, margin:'0 0 4px', color:'#111827' }}>
            🏆 Aurudu Games
          </h2>
          <p style={{ fontSize:13, color:'#6b7280', margin:0 }}>
            Each ✓ means 1 winner is selected for that category in that game.
          </p>
        </div>
        <button onClick={() => openModModal('add')}
          style={{ padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:600,
            cursor:'pointer', border:'none', background:'#166534', color:'white', whiteSpace:'nowrap' }}>
          + Add game
        </button>
      </div>

      {/* Games table */}
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
                <td style={{ padding:'9px 14px', color:'#111827', fontWeight:500 }}>{g.name}</td>
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

      {/* Winners Summary */}
      <div style={{ marginBottom:'2rem', borderRadius:12, border:'1px solid #e5e7eb',
        overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ padding:'10px 16px', background:'#166534' }}>
          <span style={{ fontSize:12, fontWeight:700, color:'white',
            textTransform:'uppercase', letterSpacing:'0.07em' }}>🏅 Winners summary</span>
        </div>
        <div style={{ padding:'12px 16px', background:'#f9fafb',
          fontSize:12, color:'#6b7280', borderBottom:'1px solid #e5e7eb' }}>
          Total winners = 1 winner per ✓ per game. Group games = 1 winning group.
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:0 }}>
          {summary.map((s, i) => (
            <div key={s.key} style={{ padding:'14px 16px', textAlign:'center',
              background:s.bg, borderBottom:'1px solid #e5e7eb',
              borderRight: i % 3 !== 2 ? '1px solid #e5e7eb' : 'none' }}>
              <p style={{ fontSize:24, fontWeight:700, color:s.text, margin:'0 0 4px' }}>{s.winners}</p>
              <p style={{ fontSize:11, color:s.text, margin:0, opacity:0.8,
                whiteSpace:'pre-line', lineHeight:1.3 }}>{s.label} winners</p>
            </div>
          ))}
        </div>
        <div style={{ padding:'12px 16px', background:'white', borderTop:'1px solid #e5e7eb',
          fontSize:13, color:'#374151' }}>
          <strong style={{ color:'#111827' }}>Total winners across all categories: </strong>
          <span style={{ fontSize:16, fontWeight:700, color:'#166534' }}>
            {summary.reduce((s, c) => s + c.winners, 0)}
          </span>
        </div>
      </div>

      <Footer />

      {/* Moderator password modal */}
      {modModal && (
        <div onClick={() => setModModal(null)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)',
            display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'1rem' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:'white', borderRadius:14, padding:'1.75rem',
              width:'100%', maxWidth:380, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width:48, height:48, borderRadius:'50%', margin:'0 auto 1rem',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
              background: modModal === 'delete' ? '#fee2e2' : '#dbeafe' }}>
              {modModal === 'delete' ? '🗑️' : modModal === 'add' ? '➕' : '✏️'}
            </div>
            <h3 style={{ fontSize:17, fontWeight:700, textAlign:'center', margin:'0 0 6px', color:'#111827' }}>
              Moderator access required
            </h3>
            <p style={{ fontSize:13, color:'#6b7280', textAlign:'center', margin:'0 0 1.25rem' }}>
              {modModal === 'delete' ? 'Enter the moderator password to delete this game.'
                : modModal === 'add' ? 'Enter the moderator password to add a new game.'
                : 'Enter the moderator password to edit this game.'}
            </p>
            <div style={{ marginBottom:'1rem' }}>
              <input type="password" value={modPass}
                onChange={e => { setModPass(e.target.value); setModErr('') }}
                onKeyDown={e => e.key === 'Enter' && confirmMod()}
                placeholder="Moderator password" autoFocus
                style={{ width:'100%', padding:'9px 12px', borderRadius:8, fontSize:14,
                  border: modErr ? '1px solid #ef4444' : '1px solid #d1d5db',
                  outline:'none', boxSizing:'border-box' }} />
              {modErr && <p style={{ fontSize:12, color:'#ef4444', margin:'6px 0 0' }}>{modErr}</p>}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setModModal(null)}
                style={{ flex:1, padding:'10px', borderRadius:8, fontSize:14, cursor:'pointer',
                  border:'1px solid #d1d5db', background:'white', color:'#374151', fontWeight:500 }}>
                Cancel
              </button>
              <button onClick={confirmMod}
                style={{ flex:1, padding:'10px', borderRadius:8, fontSize:14, cursor:'pointer',
                  border:'none', fontWeight:600, color:'white',
                  background: modModal === 'delete' ? '#991b1b' : '#166534' }}>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Add form modal */}
      {editMode && (
        <div onClick={() => setEditMode(null)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)',
            display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'1rem' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:'white', borderRadius:14, padding:'1.75rem',
              width:'100%', maxWidth:480, boxShadow:'0 20px 60px rgba(0,0,0,0.2)',
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
              <button onClick={saveForm}
                style={{ flex:1, padding:'10px', borderRadius:8, fontSize:14, fontWeight:600,
                  cursor:'pointer', border:'none', background:'#166534', color:'white' }}>
                {editMode.type === 'add' ? 'Add game' : 'Save changes'}
              </button>
              <button onClick={() => setEditMode(null)}
                style={{ padding:'10px 16px', borderRadius:8, fontSize:14, cursor:'pointer',
                  border:'1px solid #d1d5db', background:'transparent', color:'#6b7280' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteTarget !== null && (
        <div onClick={() => setDeleteTarget(null)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)',
            display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'1rem' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:'white', borderRadius:14, padding:'1.75rem',
              width:'100%', maxWidth:380, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width:48, height:48, borderRadius:'50%', margin:'0 auto 1rem',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:22, background:'#fee2e2' }}>🗑️</div>
            <h3 style={{ fontSize:17, fontWeight:700, textAlign:'center', margin:'0 0 6px', color:'#111827' }}>
              Delete game?
            </h3>
            <p style={{ fontSize:13, color:'#6b7280', textAlign:'center', margin:'0 0 1.5rem', lineHeight:1.6 }}>
              You are about to remove <strong style={{ color:'#111827' }}>{games[deleteTarget]?.name}</strong>.<br />
              This cannot be undone.
            </p>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setDeleteTarget(null)}
                style={{ flex:1, padding:'10px', borderRadius:8, fontSize:14, cursor:'pointer',
                  border:'1px solid #d1d5db', background:'white', color:'#374151', fontWeight:500 }}>
                Cancel
              </button>
              <button onClick={confirmDelete}
                style={{ flex:1, padding:'10px', borderRadius:8, fontSize:14, cursor:'pointer',
                  border:'none', fontWeight:600, color:'white', background:'#991b1b' }}>
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
