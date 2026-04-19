import { useState, useEffect } from 'react'
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy
} from 'firebase/firestore'
import { db } from './firebase'

// ── Food list ──────────────────────────────────────────────
const FOODS = [
  { name: 'Kiribath Half Tray 1',        cat: 'Main Meal Items' },
  { name: 'Kiribath Half Tray 2',        cat: 'Main Meal Items' },
  { name: 'Kiribath Half Tray 3',        cat: 'Main Meal Items' },
  { name: 'Kiribath(Rathu) Half Tray 1', cat: 'Main Meal Items' },
  { name: 'Yellow Rice Half Tray 1',     cat: 'Main Meal Items' },
  { name: 'Yellow Rice Half Tray 2',     cat: 'Main Meal Items' },
  { name: 'Kids Noodles Half Tray',      cat: 'Main Meal Items' },
  { name: 'Konda Kewum',                 cat: 'Traditional Sweets' },
  { name: 'Butter Cake',                 cat: 'Traditional Sweets' },
  { name: 'Milk Toffee',                 cat: 'Traditional Sweets' },
  { name: 'Kokis 1',                     cat: 'Traditional Sweets' },
  { name: 'Kokis 2',                     cat: 'Traditional Sweets' },
  { name: 'Aluwa',                       cat: 'Traditional Sweets' },
  { name: 'Mung Kewum',                  cat: 'Traditional Sweets' },
  { name: 'Pol Toffee',                  cat: 'Traditional Sweets' },
  { name: 'Banana',                      cat: 'Traditional Sweets' },
  { name: 'Welithalapa',                 cat: 'Traditional Sweets' },
  { name: 'Aggala/Munguli',              cat: 'Traditional Sweets' },
  { name: 'Chocolate Cake',              cat: 'Traditional Sweets' },
  { name: 'Potato/Milk Toffee',          cat: 'Traditional Sweets' },
  { name: 'Naran Kevum',                 cat: 'Traditional Sweets' },
  { name: 'Lunu Miris',                  cat: 'Curries & Sides' },
  { name: 'Dhal Curry',                  cat: 'Curries & Sides' },
  { name: 'Chicken Curry',               cat: 'Curries & Sides' },
  { name: 'Fish Ambul Thiyal',           cat: 'Curries & Sides' },
]

const CAT_ORDER = ['Main Meal Items', 'Traditional Sweets', 'Curries & Sides']

const CAT_CFG = {
  'Main Meal Items':    { bg:'#dbeafe', text:'#1e40af', border:'#93c5fd', rowBg:'#eff6ff', head:'#1e40af' },
  'Traditional Sweets': { bg:'#fef3c7', text:'#92400e', border:'#fcd34d', rowBg:'#fffbeb', head:'#92400e' },
  'Curries & Sides':   { bg:'#fee2e2', text:'#991b1b', border:'#fca5a5', rowBg:'#fff5f5', head:'#991b1b' },
  'Custom':            { bg:'#f3e8ff', text:'#6b21a8', border:'#d8b4fe', rowBg:'#faf5ff', head:'#6b21a8' },
}

// ── Helpers ────────────────────────────────────────────────
const knownFoodSet = new Set(FOODS.map(f => f.name))

function FoodTag({ food }) {
  const cat  = FOODS.find(f => f.name === food)?.cat
  const cfg  = cat ? CAT_CFG[cat] : CAT_CFG['Custom']
  return (
    <span style={{ fontSize:12, padding:'2px 9px', borderRadius:6,
      background:cfg.bg, color:cfg.text, border:`0.5px solid ${cfg.border}` }}>
      {food}
    </span>
  )
}

// ── Main component ─────────────────────────────────────────
export default function App() {
  const [name, setName]             = useState('')
  const [selected, setSelected]     = useState([])
  const [custom, setCustom]         = useState('')
  const [signups, setSignups]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [submitted, setSubmitted]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')
  const [editId, setEditId]         = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // Real-time Firestore listener
  useEffect(() => {
    const q = query(collection(db, 'signups'), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, snapshot => {
      setSignups(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return () => unsub()  // cleanup on unmount
  }, [])

  // Foods taken by people OTHER than the one currently being edited
  const takenByOthers = new Set(
    signups.filter(e => e.id !== editId).flatMap(e => e.foods || [])
  )

  function toggle(food) {
    if (takenByOthers.has(food)) return
    setSelected(p => p.includes(food) ? p.filter(f => f !== food) : [...p, food])
  }

  async function submit() {
    if (!name.trim())              { setError('Please enter your name'); return }
    const extras = custom.split(',').map(s => s.trim()).filter(Boolean)
    const foods  = [...selected, ...extras]
    if (!foods.length)             { setError('Please select or add at least one food item'); return }

    setSubmitting(true); setError('')
    try {
      if (editId) {
        // Update existing doc
        await updateDoc(doc(db, 'signups', editId), { name: name.trim(), foods, updatedAt: serverTimestamp() })
      } else {
        // Create new doc
        await addDoc(collection(db, 'signups'), { name: name.trim(), foods, createdAt: serverTimestamp() })
      }
      setSubmitted(true); setEditId(null)
    } catch (err) {
      console.error(err)
      setError('Something went wrong, please try again.')
    }
    setSubmitting(false)
  }

  function startEdit(entry) {
    setEditId(entry.id)
    setName(entry.name)
    setSelected((entry.foods || []).filter(f => knownFoodSet.has(f)))
    setCustom((entry.foods || []).filter(f => !knownFoodSet.has(f)).join(', '))
    setSubmitted(false); setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditId(null); setName(''); setSelected([]); setCustom(''); setError(''); setSubmitted(false)
  }

  async function deleteEntry(id) {
    await deleteDoc(doc(db, 'signups', id))
    setDeleteConfirm(null)
    if (editId === id) cancelEdit()
  }

  function resetForm() {
    setSubmitted(false); setName(''); setSelected([]); setCustom(''); setError(''); setEditId(null)
  }

  const byCategory = Object.fromEntries(
    CAT_ORDER.map(cat => [cat, FOODS.filter(f => f.cat === cat).map(f => f.name)])
  )

  const foodOwner = {}
  signups.forEach(e => (e.foods || []).forEach(f => { foodOwner[f] = e.name }))
  const whoTook = food => foodOwner[food] || null

  // Custom items (not in the preset list)
  const customRows = signups.flatMap(e =>
    (e.foods || []).filter(f => !knownFoodSet.has(f)).map(f => ({ food: f, person: e.name }))
  )

  // ── Styles ──────────────────────────────────────────────
  const card = {
    background: 'white', borderRadius: 12, border: '1px solid #e5e7eb',
    padding: '12px 16px', marginBottom: 10,
  }

  return (
    <div style={{ maxWidth:640, margin:'0 auto', padding:'0 1rem 3rem' }}>

      {/* Header */}
      <div style={{ textAlign:'center', padding:'2rem 0 1.5rem', borderBottom:'1px solid #e5e7eb' }}>
        <p style={{ fontSize:12, color:'#9ca3af', margin:'0 0 4px', letterSpacing:'0.1em' }}>
          අලුත් අවුරුදු 2026
        </p>
        <h1 style={{ fontSize:24, fontWeight:600, margin:'0 0 4px', color:'#111827' }}>
          Pittsburgh Aurudu Celebration
        </h1>
        <p style={{ fontSize:14, color:'#6b7280', margin:'0 0 1.25rem' }}>
          05/09 · Garner Pavilion · North Park
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

            {/* Name */}
            <div style={{ marginBottom:'1.25rem' }}>
              <label style={{ fontSize:13, color:'#374151', display:'block', marginBottom:6, fontWeight:500 }}>
                Your name
              </label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Anura Kumara" />
            </div>

            {/* Food selection */}
            <div style={{ marginBottom:'1.25rem' }}>
              <label style={{ fontSize:13, color:'#374151', display:'block', marginBottom:4, fontWeight:500 }}>
                What will you bring?
              </label>
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
                                background:'white', color:'#374151',
                                border:'1px solid #d1d5db', fontWeight:400,
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

            {/* Custom items */}
            <div style={{ marginBottom:'1.25rem' }}>
              <label style={{ fontSize:13, color:'#374151', display:'block', marginBottom:4, fontWeight:500 }}>
                Bringing something not on the list?
              </label>
              <p style={{ fontSize:12, color:'#9ca3af', margin:'0 0 8px' }}>Separate multiple items with commas</p>
              <input value={custom} onChange={e => setCustom(e.target.value)}
                placeholder="e.g. Peni Walalu, Coconut Crapes..." />
            </div>

            {/* Selection preview */}
            {selected.length > 0 && (
              <div style={{ padding:'10px 14px', borderRadius:8, background:'#f9fafb',
                border:'1px solid #e5e7eb', marginBottom:'1rem' }}>
                <p style={{ fontSize:12, color:'#9ca3af', margin:'0 0 7px' }}>
                  Your selections ({selected.length})
                </p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                  {selected.map(f => <FoodTag key={f} food={f} />)}
                </div>
              </div>
            )}

            {error && <p style={{ fontSize:13, color:'#991b1b', marginBottom:'0.75rem' }}>{error}</p>}

            <button onClick={submit} disabled={submitting} style={{ width:'100%', padding:'11px',
              borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer',
              background:'#166534', color:'white', border:'none' }}>
              {submitting ? 'Saving...' : editId ? 'Save changes' : 'Sign up'}
            </button>
            {editId && (
              <button onClick={cancelEdit} style={{ width:'100%', padding:'9px', marginTop:8,
                borderRadius:8, fontSize:14, cursor:'pointer',
                border:'1px solid #d1d5db', background:'transparent', color:'#6b7280' }}>
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
          <span style={{ fontSize:13, color:'#6b7280' }}>
            {signups.length} {signups.length === 1 ? 'person' : 'people'}
          </span>
        </div>

        {loading ? (
          <p style={{ fontSize:14, color:'#6b7280' }}>Loading...</p>
        ) : signups.length === 0 ? (
          <p style={{ fontSize:14, color:'#6b7280' }}>No sign-ups yet — be the first!</p>
        ) : (
          <>
            {/* Per-person cards */}
            {signups.map(entry => (
              <div key={entry.id} style={{ ...card,
                border: editId === entry.id ? '2px solid #93c5fd' : '1px solid #e5e7eb' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                  <p style={{ fontSize:14, fontWeight:600, margin:0 }}>{entry.name}</p>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => startEdit(entry)} style={{ fontSize:12, padding:'3px 10px',
                      borderRadius:6, cursor:'pointer', border:'1px solid #93c5fd',
                      background:'#dbeafe', color:'#1e40af' }}>Edit</button>
                    <button onClick={() => setDeleteConfirm(entry.id)} style={{ fontSize:12, padding:'3px 10px',
                      borderRadius:6, cursor:'pointer', border:'1px solid #fca5a5',
                      background:'#fee2e2', color:'#991b1b' }}>Delete</button>
                  </div>
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                  {(entry.foods || []).map(f => <FoodTag key={f} food={f} />)}
                </div>
                {deleteConfirm === entry.id && (
                  <div style={{ marginTop:10, padding:'10px 12px', borderRadius:8,
                    background:'#fee2e2', border:'1px solid #fca5a5',
                    display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                    <span style={{ fontSize:13, color:'#7f1d1d', flex:1 }}>
                      Remove {entry.name}'s entry?
                    </span>
                    <button onClick={() => deleteEntry(entry.id)} style={{ fontSize:13,
                      padding:'5px 14px', borderRadius:6, cursor:'pointer',
                      border:'none', background:'#991b1b', color:'white', fontWeight:600 }}>
                      Yes, remove
                    </button>
                    <button onClick={() => setDeleteConfirm(null)} style={{ fontSize:13,
                      padding:'5px 14px', borderRadius:6, cursor:'pointer',
                      border:'1px solid #fca5a5', background:'white', color:'#991b1b' }}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Category tables */}
            <div style={{ marginTop:'2rem' }}>
              <h3 style={{ fontSize:14, fontWeight:600, margin:'0 0 1rem', color:'#111827' }}>
                Food coverage by category
              </h3>

              {CAT_ORDER.map(cat => {
                const cfg   = CAT_CFG[cat]
                const items = byCategory[cat]
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
                              <td style={{ padding:'7px 14px', color:'#111827',
                                borderBottom:`0.5px solid ${cfg.border}` }}>{food}</td>
                              <td style={{ padding:'7px 14px', borderBottom:`0.5px solid ${cfg.border}` }}>
                                {owner ? (
                                  <span style={{ fontSize:12, padding:'2px 9px', borderRadius:6,
                                    background:cfg.bg, color:cfg.head,
                                    border:`0.5px solid ${cfg.border}`, fontWeight:600 }}>{owner}</span>
                                ) : (
                                  <span style={{ fontSize:12, color:'#9ca3af', fontStyle:'italic' }}>— available</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })}

              {/* Custom additions table */}
              {customRows.length > 0 && (
                <div style={{ marginBottom:'1.25rem', borderRadius:10,
                  border:'1px solid #d8b4fe', overflow:'hidden' }}>
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
                          <td style={{ padding:'7px 14px', color:'#111827', borderBottom:'0.5px solid #d8b4fe' }}>
                            {food}
                          </td>
                          <td style={{ padding:'7px 14px', borderBottom:'0.5px solid #d8b4fe' }}>
                            <span style={{ fontSize:12, padding:'2px 9px', borderRadius:6,
                              background:'#f3e8ff', color:'#6b21a8',
                              border:'0.5px solid #d8b4fe', fontWeight:600 }}>{person}</span>
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
    </div>
  )
}
