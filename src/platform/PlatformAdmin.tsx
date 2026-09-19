import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { CheckCircle2, CircleAlert, ShieldCheck, Store, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'

type TenantRow = { id:string; slug:string; name:string; status:string; created_at:string }
type AuditRow = { id:string; store_id:string; previous_status:string; next_status:string; note:string; created_at:string }
const messageFor=(error:unknown)=>error instanceof Error?error.message:'ไม่สามารถดำเนินการได้'

export function PlatformAdminLink(){
  const {user}=useAuth()
  const [allowed,setAllowed]=useState(false)
  useEffect(()=>{
    if(!user){setAllowed(false);return}
    let live=true
    void supabase.from('platform_admins').select('user_id').eq('user_id',user.id).maybeSingle()
      .then(({data})=>{if(live)setAllowed(Boolean(data))})
    return()=>{live=false}
  },[user?.id])
  return allowed?<Link className="button button-primary" to="/platform-admin"><ShieldCheck size={17}/> จัดการแพลตฟอร์มและอนุมัติร้าน</Link>:null
}
export default function PlatformAdmin(){
  const {user,loading:authLoading}=useAuth()
  const [allowed,setAllowed]=useState<boolean|null>(null)
  const [stores,setStores]=useState<TenantRow[]>([])
  const [events,setEvents]=useState<AuditRow[]>([])
  const [selected,setSelected]=useState('')
  const [note,setNote]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [success,setSuccess]=useState('')

  const load=async()=>{
    const [s,e]=await Promise.all([
      supabase.from('stores').select('id,slug,name,status,created_at').order('created_at',{ascending:false}),
      supabase.from('store_status_events').select('id,store_id,previous_status,next_status,note,created_at').order('created_at',{ascending:false}).limit(20),
    ])
    if(s.error)throw s.error
    if(e.error)throw e.error
    setStores((s.data??[]) as TenantRow[])
    setEvents((e.data??[]) as AuditRow[])
    setSelected(old=>(s.data??[]).some(x=>x.id===old)?old:((s.data??[]).find(x=>x.slug!=='otpthai')?.id??''))
  }

  useEffect(()=>{
    if(!user){setAllowed(false);return}
    let live=true
    const init=async()=>{
      const {data,error:checkError}=await supabase.from('platform_admins').select('user_id')
        .eq('user_id',user.id).maybeSingle()
      if(checkError)throw checkError
      if(!live)return
      setAllowed(Boolean(data))
      if(data)await load()
    }
    void init().catch(e=>{if(live){setError(messageFor(e));setAllowed(false)}})
    return()=>{live=false}
  },[user?.id])

  const updateStatus=async(event:FormEvent,status:'active'|'suspended')=>{
    event.preventDefault()
    if(!selected||busy||note.trim().length<10)return
    setBusy(true);setError('');setSuccess('')
    try{
      const {error:rpcError}=await supabase.rpc('set_store_operational_status',{
        p_store_id:selected,p_new_status:status,p_note:note.trim(),
      })
      if(rpcError)throw rpcError
      await load()
      setNote('')
      setSuccess(status==='active'?'เปิดใช้งานร้านแล้ว โดยยังไม่ได้บันทึกว่ารับชำระค่าเช่า':'ระงับร้านและปิดหน้าสาธารณะแล้ว')
    }catch(e){setError(messageFor(e))}finally{setBusy(false)}
  }
  if(authLoading||allowed===null)return <section className="placeholder"><p>กำลังตรวจสอบสิทธิ์ผู้ดูแลแพลตฟอร์ม...</p></section>
  if(!user)return <Navigate replace to="/login?next=/platform-admin"/>
  if(!allowed)return <section className="placeholder"><ShieldCheck size={33}/><h1>ไม่มีสิทธิ์เข้าถึงส่วนนี้</h1><p>หน้านี้สงวนไว้สำหรับผู้ดูแลแพลตฟอร์มเท่านั้น</p><Link className="button button-primary" to="/admin">กลับหลังบ้านร้านค้า</Link></section>
  const chosen=stores.find(x=>x.id===selected)
  return <section className="section page-section tenant-admin">
    <Link to="/admin" className="auth-back"><ArrowLeft size={16}/> กลับหลังบ้านร้านค้า</Link>
    <div className="section-heading"><div><span className="eyebrow blue">PLATFORM CONTROL</span><h1 className="page-title">ผู้ดูแลแพลตฟอร์ม</h1><p className="muted">ตรวจสอบร้านเช่าและอนุมัติเปิดหรือระงับร้านพร้อมบันทึกเหตุผล</p></div><ShieldCheck size={36} color="#1769e0"/></div>
    {error&&<p role="alert" className="auth-error">{error}</p>}
    {success&&<p role="status" className="auth-success"><CheckCircle2 size={18}/>{success}</p>}
    <div className="admin-columns">
      <section className="admin-panel"><h2><Store size={19}/> ร้านในระบบ ({stores.length})</h2><div className="store-picker">
      {stores.map(store=><button type="button" key={store.id} disabled={store.slug==='otpthai'} className={selected===store.id?'store-choice active':'store-choice'} onClick={()=>{setSelected(store.id);setNote('');setError('')}}><strong>{store.name}</strong><small>{store.slug}.otpthai.shop · {store.status}{store.slug==='otpthai'?' · ร้านหลัก':''}</small></button>)}
      </div></section>
      <section className="admin-panel"><h2>อนุมัติสถานะร้าน</h2>{chosen?<><p className="muted small">{chosen.name} · {chosen.slug}.otpthai.shop</p><p><span className="draft-badge">สถานะปัจจุบัน: {chosen.status}</span></p>
       <form className="admin-form" onSubmit={e=>void updateStatus(e,chosen.status==='active'?'suspended':'active')}>
         <label>เหตุผลสำหรับบันทึกการอนุมัติ (อย่างน้อย 10 ตัวอักษร)
           <textarea required minLength={10} maxLength={500} rows={4} value={note} onChange={e=>setNote(e.target.value)} placeholder="เช่น อนุมัติเปิดร้านทดลองโดยไม่เรียกเก็บค่าเช่า"/></label>
         <button type="submit" disabled={busy||note.trim().length<10} className="button button-primary">
           {chosen.status==='active'?'ระงับร้านนี้':'อนุมัติเปิดร้านนี้'}
         </button>
       </form>
       <div className="notice"><CircleAlert size={19}/><span>การอนุมัติเปิดร้านเป็นการกำหนดสถานะใช้งานเท่านั้น ไม่ใช่หลักฐานรับเงินค่าเช่า และไม่ได้เปิดระบบ Checkout ที่ยังไม่ผ่านการทดสอบ</span></div>
      </>:<p className="muted">เลือกร้านลูกจากรายการทางซ้าย</p>}</section>
    </div>
    <section className="admin-panel"><h2>บันทึกการเปลี่ยนสถานะ</h2>{events.length?<div className="admin-products">
      {events.map(e=><div className="admin-product" key={e.id}><div><strong>{stores.find(s=>s.id===e.store_id)?.name??e.store_id} · {e.previous_status} → {e.next_status}</strong><small>{new Date(e.created_at).toLocaleString('th-TH')} · {e.note}</small></div></div>)}
    </div>:<p className="muted small">ยังไม่มีรายการเปลี่ยนสถานะ</p>}</section>
  </section>
}
