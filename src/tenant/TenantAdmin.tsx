import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  ArrowRight, Boxes, CheckCircle2, ClipboardList, CreditCard,
  FileCheck2, LayoutDashboard, PackagePlus, Palette,
  Plus, Save, ShoppingBag, Store, Users, Wallet,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'

type StoreRow={id:string;name:string;slug:string;status:string;theme:unknown}
type Product={id:string;name:string;slug:string;description:string;published:boolean}
type Variant={id:string;product_id:string;label:string;price_satang:number;duration_days:number|null;delivery_type:string;published:boolean}
type Stock={id:string;variant_id:string;status:string;order_id:string|null;created_at:string}
type Topup={id:string;user_id:string;amount_satang:number;slip_path:string;status:string;admin_note:string|null;created_at:string}
type Order={id:string;customer_id:string;status:string;total_satang:number;created_at:string}
type Account={id:string;user_id:string}
type Entry={id:string;account_id:string;amount_satang:number;entry_type:string;external_reference:string;created_at:string}
type Profile={store_id:string;promptpay_id:string;recipient_name:string;enabled:boolean}
type Customer={user_id:string;email:string;balance_satang:number;order_count:number}
type Section='overview'|'products'|'packages'|'stock'|'topups'|'orders'|'wallet'|'customers'|'payments'|'design'
const tabs:{id:Section;name:string;icon:typeof Store}[]=[
 {id:'overview',name:'ภาพรวม',icon:LayoutDashboard},
 {id:'products',name:'สินค้า',icon:ShoppingBag},
 {id:'packages',name:'แพ็กเกจและราคา',icon:PackagePlus},
 {id:'stock',name:'สต็อกบัญชี / โค้ด',icon:Boxes},
 {id:'topups',name:'ตรวจสลิปเติมเงิน',icon:FileCheck2},
 {id:'orders',name:'คำสั่งซื้อ',icon:ClipboardList},
 {id:'wallet',name:'บัญชี Wallet',icon:Wallet},
 {id:'customers',name:'ลูกค้า',icon:Users},
 {id:'payments',name:'ตั้งค่า PromptPay',icon:CreditCard},
 {id:'design',name:'ตั้งค่าหน้าร้าน',icon:Palette},
]
const errorText=(e:unknown)=>e instanceof Error?e.message:'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง'
const cash=(satang:number)=>'฿'+(satang/100).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})
const format=(d:string)=>new Date(d).toLocaleString('th-TH')
const moneyInput=(raw:string)=>{if(!/^\d+(?:\.\d{1,2})?$/.test(raw.trim()))throw new Error('กรุณาระบุจำนวนเงินไม่เกิน 2 ตำแหน่งทศนิยม');const value=Math.round(Number(raw)*100);if(!Number.isSafeInteger(value)||value<=0||value>100000000)throw new Error('จำนวนเงินต้องมากกว่า 0 และไม่เกิน 1 ล้านบาท');return value}

export function TenantAdmin(){
 const {user,loading:authLoading}=useAuth()
 const [store,setStore]=useState<StoreRow|null>(null)
 const [section,setSection]=useState<Section>('overview')
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false)
 const [error,setError]=useState(''),[success,setSuccess]=useState('')
 const [products,setProducts]=useState<Product[]>([]),[variants,setVariants]=useState<Variant[]>([])
 const [stock,setStock]=useState<Stock[]>([]),[topups,setTopups]=useState<Topup[]>([])
 const [orders,setOrders]=useState<Order[]>([]),[accounts,setAccounts]=useState<Account[]>([]),[entries,setEntries]=useState<Entry[]>([])
 const [profile,setProfile]=useState<Profile|null>(null)
 const [customers,setCustomers]=useState<Customer[]>([])
 const [storeName,setStoreName]=useState(''),[primary,setPrimary]=useState('#1769e0')
 const [paymentId,setPaymentId]=useState(''),[recipient,setRecipient]=useState(''),[paymentEnabled,setPaymentEnabled]=useState(false)
 const [productName,setProductName]=useState(''),[productSlug,setProductSlug]=useState(''),[description,setDescription]=useState('')
 const [packageProduct,setPackageProduct]=useState(''),[packageLabel,setPackageLabel]=useState('')
 const [price,setPrice]=useState(''),[days,setDays]=useState('30'),[delivery,setDelivery]=useState<'account'|'code'>('account')
 const [stockVariant,setStockVariant]=useState(''),[stockText,setStockText]=useState('')
 const [slipUrls,setSlipUrls]=useState<Record<string,string>>({})
 const [reviewNotes,setReviewNotes]=useState<Record<string,string>>({})
 const [editing,setEditing]=useState('')
 const [editPrice,setEditPrice]=useState('')
 const [editProduct,setEditProduct]=useState('')
 const [editDescription,setEditDescription]=useState('')

 const load=async()=>{
  if(!user)return
  const s=await supabase.from('stores').select('id,name,slug,status,theme').eq('slug','otpthai').eq('owner_id',user.id).maybeSingle()
  if(s.error)throw s.error
  if(!s.data){setStore(null);return}
  const current=s.data as StoreRow
  setStore(current);setStoreName(current.name)
  const theme=current.theme && typeof current.theme==='object' ? current.theme as {primary?:unknown}:{}
  setPrimary(typeof theme.primary==='string'&&/^#[0-9a-fA-F]{6}$/.test(theme.primary)?theme.primary:'#1769e0')
  const results=await Promise.all([
   supabase.from('products').select('id,name,slug,description,published').eq('store_id',current.id).order('created_at',{ascending:false}),
   supabase.from('product_variants').select('id,product_id,label,price_satang,duration_days,delivery_type,published').eq('store_id',current.id),
   supabase.from('stock_units').select('id,variant_id,status,order_id,created_at').eq('store_id',current.id),
   supabase.from('topup_requests').select('id,user_id,amount_satang,slip_path,status,admin_note,created_at').eq('store_id',current.id).order('created_at',{ascending:false}),
   supabase.from('orders').select('id,customer_id,status,total_satang,created_at').eq('store_id',current.id).order('created_at',{ascending:false}),
   supabase.from('wallet_accounts').select('id,user_id').eq('store_id',current.id),
   supabase.from('wallet_entries').select('id,account_id,amount_satang,entry_type,external_reference,created_at').eq('store_id',current.id).order('created_at',{ascending:false}).limit(300),
   supabase.from('store_payment_profiles').select('store_id,promptpay_id,recipient_name,enabled').eq('store_id',current.id).maybeSingle(),
   supabase.rpc('store_wallet_customers'),
  ])
  for(const r of results)if(r.error)throw r.error
  setProducts((results[0].data??[]) as Product[])
  setVariants((results[1].data??[]) as Variant[])
  setStock((results[2].data??[]) as Stock[])
  setTopups((results[3].data??[]) as Topup[])
  setOrders((results[4].data??[]) as Order[])
  setAccounts((results[5].data??[]) as Account[])
  setEntries((results[6].data??[]) as Entry[])
  const p=results[7].data as Profile|null
  setProfile(p);setPaymentId(p?.promptpay_id??'');setRecipient(p?.recipient_name??'');setPaymentEnabled(p?.enabled??false)
  setCustomers((results[8].data??[]) as Customer[])
 }
 useEffect(()=>{if(!user){setLoading(false);return}let live=true;setLoading(true);void load().catch(e=>{if(live)setError(errorText(e))}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[user?.id])
 const run=async(fn:()=>Promise<void>,message:string)=>{
  if(busy)return
  setBusy(true);setError('');setSuccess('')
  try{await fn();await load();setSuccess(message)}catch(e){setError(errorText(e))}finally{setBusy(false)}
 }
 const addProduct=async(e:FormEvent)=>{
  e.preventDefault()
  await run(async()=>{
   if(!store||!productName.trim()||!description.trim())throw new Error('กรุณากรอกชื่อและรายละเอียดสินค้า')
   if(!/^[a-z0-9][a-z0-9-]{2,39}$/.test(productSlug))throw new Error('รหัสสินค้าใช้ a-z, 0-9 หรือ - จำนวน 3–40 ตัว')
   const {error}=await supabase.from('products').insert({store_id:store.id,name:productName.trim(),slug:productSlug,description:description.trim(),published:false})
   if(error)throw error
   setProductName('');setProductSlug('');setDescription('')
  },'เพิ่มสินค้าแบบร่างแล้ว กรุณาเพิ่มแพ็กเกจและสต็อกก่อนเผยแพร่')
 }
 const addPackage=async(e:FormEvent)=>{
  e.preventDefault()
  await run(async()=>{
   if(!store||!packageProduct||!packageLabel.trim())throw new Error('กรุณาเลือกสินค้าและชื่อแพ็กเกจ')
   const d=Number(days)
   if(!Number.isSafeInteger(d)||d<1||d>3650)throw new Error('ระยะเวลา 1–3650 วัน')
   const {error}=await supabase.from('product_variants').insert({store_id:store.id,product_id:packageProduct,label:packageLabel.trim(),price_satang:moneyInput(price),duration_days:d,delivery_type:delivery,published:false})
   if(error)throw error
   setPackageLabel('');setPrice('')
  },'เพิ่มแพ็กเกจแล้ว กรุณาใส่สต็อกจริง')
 }
 const addStock=async(e:FormEvent)=>{
  e.preventDefault()
  await run(async()=>{
   if(!store||!stockVariant)throw new Error('กรุณาเลือกแพ็กเกจ')
   const secrets=stockText.split(/\r?\n/).map(x=>x.trim()).filter(Boolean)
   if(!secrets.length||secrets.length>100)throw new Error('ใส่สต็อก 1–100 รายการต่อครั้ง')
   if(secrets.some(x=>x.length>2000))throw new Error('แต่ละรายการยาวไม่เกิน 2000 ตัวอักษร')
   const values=await Promise.all(secrets.map(async(secret_text)=>{
    const bytes=new TextEncoder().encode(secret_text)
    const dig=await crypto.subtle.digest('SHA-256',bytes)
    const secret_hash=Array.from(new Uint8Array(dig)).map(x=>x.toString(16).padStart(2,'0')).join('')
    return {store_id:store.id,variant_id:stockVariant,secret_text,secret_hash,status:'available'}
   }))
   const {error}=await supabase.from('stock_units').upsert(values,{onConflict:'store_id,variant_id,secret_hash',ignoreDuplicates:true})
   if(error)throw error
   setStockText('')
  },'บันทึกสต็อกจริงแล้ว รายการซ้ำจะไม่ถูกเพิ่มอีก')
 }
 const savePayment=async(e:FormEvent)=>{
  e.preventDefault()
  await run(async()=>{
   if(!store)throw new Error('ไม่พบร้าน')
   if(!/^(\d{10}|\d{13})$/.test(paymentId))throw new Error('PromptPay ต้องเป็นเบอร์ 10 หลักหรือเลขบัตร 13 หลัก')
   if(recipient.trim().length<2)throw new Error('กรุณากรอกชื่อบัญชีรับเงิน')
   const {error}=await supabase.from('store_payment_profiles').upsert({store_id:store.id,promptpay_id:paymentId,recipient_name:recipient.trim(),enabled:paymentEnabled,updated_at:new Date().toISOString()})
   if(error)throw error
  },'บันทึกบัญชีรับเงินแล้ว')
 }
 const saveDesign=async(e:FormEvent)=>{
  e.preventDefault()
  await run(async()=>{
   if(!store)throw new Error('ไม่พบร้าน')
   const {error}=await supabase.rpc('update_store_design',{p_store_id:store.id,p_name:storeName.trim(),p_theme:{primary}})
   if(error)throw error
  },'บันทึกหน้าร้านแล้ว')
 }
 const toggle=async(p:Product)=>{
  await run(async()=>{
   if(!store)throw new Error('ไม่พบร้าน')
   const own=variants.filter(v=>v.product_id===p.id)
   if(!p.published){
    if(!own.length)throw new Error('กรุณาเพิ่มแพ็กเกจก่อน')
    if(!own.some(v=>stock.some(s=>s.variant_id===v.id&&s.status==='available')))throw new Error('กรุณาเพิ่มสต็อกก่อนเผยแพร่')
   }
   if(p.published){
    const h=await supabase.from('products').update({published:false}).eq('id',p.id).eq('store_id',store.id);if(h.error)throw h.error
    const v=await supabase.from('product_variants').update({published:false}).eq('product_id',p.id).eq('store_id',store.id);if(v.error)throw v.error
   }else{
    const v=await supabase.from('product_variants').update({published:true}).eq('product_id',p.id).eq('store_id',store.id);if(v.error)throw v.error
    const h=await supabase.from('products').update({published:true}).eq('id',p.id).eq('store_id',store.id);if(h.error)throw h.error
   }
  },p.published?'ซ่อนสินค้าแล้ว':'เผยแพร่สินค้าที่มีสต็อกแล้ว')
 }
 const review=async(t:Topup,approve:boolean)=>{
  await run(async()=>{
   const {error}=await supabase.rpc('approve_topup',{p_request:t.id,p_approve:approve,p_note:reviewNotes[t.id]||null})
   if(error)throw error
  },approve?'อนุมัติและเพิ่มยอด Wallet แล้ว':'ปฏิเสธสลิปแล้ว ไม่เพิ่มยอด Wallet')
 }
 const slip=async(t:Topup)=>{
  setError('')
  const r=await supabase.storage.from('payment-slips').createSignedUrl(t.slip_path,300)
  if(r.error){setError(r.error.message);return}
  setSlipUrls(old=>({...old,[t.id]:r.data.signedUrl}))
 }
 const edit=async()=>{
  await run(async()=>{
   if(!store||!editing)throw new Error('ไม่พบสินค้า')
   const {error}=await supabase.from('products').update({name:editProduct.trim(),description:editDescription.trim()}).eq('id',editing).eq('store_id',store.id)
   if(error)throw error
   setEditing('')
  },'บันทึกข้อมูลสินค้าแล้ว')
 }
 const updatePackage=async(v:Variant)=>{
  await run(async()=>{
   if(!store)throw new Error('ไม่พบร้าน')
   const {error}=await supabase.from('product_variants').update({price_satang:moneyInput(editPrice)}).eq('id',v.id).eq('store_id',store.id)
   if(error)throw error
   setEditing('')
  },'บันทึกราคาใหม่แล้ว')
 }
 const counts=useMemo(()=>({available:stock.filter(s=>s.status==='available').length,pending:topups.filter(t=>t.status==='pending').length,fulfilled:orders.filter(o=>o.status==='fulfilled').length}),[stock,topups,orders])
 if(authLoading||loading)return <section className="placeholder">กำลังโหลดหลังบ้าน OTPTHAI...</section>
 if(!user)return <Navigate replace to="/login?next=/admin"/>
 if(!store)return <section className="section page-section"><h1>บัญชีนี้ไม่มีสิทธิ์จัดการร้าน OTPTHAI</h1><Link to="/">กลับหน้าร้าน</Link></section>
 const accountById=new Map(accounts.map(a=>[a.id,a.user_id]))
 const productById=new Map(products.map(p=>[p.id,p.name]))
 return <section className="section page-section shop-admin">
  <div className="section-heading"><div><span className="eyebrow blue">OTPTHAI ADMINISTRATION</span><h1 className="page-title">หลังบ้านร้านค้า</h1><p className="muted">สินค้า · สต็อก · เติมเงิน · Wallet · คำสั่งซื้อ · ลูกค้า</p></div><Link className="button button-primary" to="/">ดูหน้าร้าน <ArrowRight size={16}/></Link></div>
  <div className="shop-admin-tabs" role="tablist" aria-label="ส่วนจัดการร้าน">{tabs.map(t=><button key={t.id} type="button" role="tab" aria-selected={section===t.id} className={section===t.id?'shop-admin-tab active':'shop-admin-tab'} onClick={()=>{setSection(t.id);setError('');setSuccess('')}}><t.icon size={18}/>{t.name}{t.id==='topups'&&counts.pending>0?<span className="shop-admin-count">{counts.pending}</span>:null}</button>)}</div>
  {error&&<p role="alert" className="auth-error">{error}</p>}{success&&<p role="status" className="auth-success"><CheckCircle2 size={18}/>{success}</p>}
  <div className="shop-admin-content">
  {section==='overview'&&<><div className="admin-summary-grid">
   {[['สินค้า',products.length],['แพ็กเกจ',variants.length],['สต็อกพร้อมขาย',counts.available],['สลิปรอตรวจ',counts.pending],['ออเดอร์ส่งมอบ',counts.fulfilled],['บัญชี Wallet',accounts.length]].map(([label,value])=><div className="admin-panel" key={label}><span className="muted">{label}</span><h2 className="shop-admin-metric">{value}</h2></div>)}
   </div><div className="admin-panel"><h2>งานที่ต้องดำเนินการ</h2><p>คำขอเติมเงินรอตรวจ: <strong>{counts.pending}</strong> รายการ</p><p>สต็อกคงเหลือ: <strong>{counts.available}</strong> รายการ</p><button className="button button-primary" onClick={()=>setSection('topups')}>ตรวจสลิปเติมเงิน</button> <button className="button" onClick={()=>setSection('stock')}>จัดการสต็อก</button></div></>}
  {section==='products'&&<><div className="admin-panel"><h2><Plus size={20}/> เพิ่มสินค้า</h2><form className="admin-form" onSubmit={e=>void addProduct(e)}><label>ชื่อสินค้า<input required maxLength={120} value={productName} onChange={e=>setProductName(e.target.value)}/></label><label>รหัส URL สินค้า<input required value={productSlug} onChange={e=>setProductSlug(e.target.value.toLowerCase())} placeholder="my-product"/></label><label>รายละเอียดสินค้า<textarea required rows={3} value={description} onChange={e=>setDescription(e.target.value)}/></label><button disabled={busy} className="button button-primary">เพิ่มสินค้า</button></form></div>
   <div className="admin-panel"><h2>สินค้าทั้งหมด ({products.length})</h2><div className="admin-products">{products.map(p=><div className="admin-product" key={p.id}><div><strong>{p.name}</strong><small>/{p.slug} · {p.description}</small><small>{p.published?'เผยแพร่แล้ว':'แบบร่าง'}</small></div><div className="admin-product-actions"><button className="button button-small" onClick={()=>{setEditing(p.id);setEditProduct(p.name);setEditDescription(p.description)}}>แก้ไข</button><button disabled={busy} className="button button-primary button-small" onClick={()=>void toggle(p)}>{p.published?'ซ่อน':'เผยแพร่'}</button></div></div>)}</div>{!products.length&&<p className="muted">ยังไม่มีสินค้า กรอกแบบฟอร์มด้านบนได้เลย</p>}</div>
   {products.some(p=>p.id===editing)&&<div className="admin-panel"><h2>แก้ไขสินค้า</h2><form className="admin-form" onSubmit={e=>{e.preventDefault();void edit()}}><label>ชื่อ<input required value={editProduct} onChange={e=>setEditProduct(e.target.value)}/></label><label>รายละเอียด<textarea required value={editDescription} onChange={e=>setEditDescription(e.target.value)}/></label><button className="button button-primary" disabled={busy}>บันทึก</button><button type="button" className="button" onClick={()=>setEditing('')}>ยกเลิก</button></form></div>}</>}
  {section==='packages'&&<><div className="admin-panel"><h2>เพิ่มแพ็กเกจและราคา</h2><form className="admin-form" onSubmit={e=>void addPackage(e)}><label>สินค้า<select required value={packageProduct} onChange={e=>setPackageProduct(e.target.value)}><option value="">เลือกสินค้า</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>ชื่อแพ็กเกจ<input required value={packageLabel} onChange={e=>setPackageLabel(e.target.value)} placeholder="30 วัน"/></label><label>ราคาขาย (บาท)<input required inputMode="decimal" value={price} onChange={e=>setPrice(e.target.value)} placeholder="99.00"/></label><label>ระยะเวลา (วัน)<input required type="number" min="1" max="3650" value={days} onChange={e=>setDays(e.target.value)}/></label><label>ประเภทสต็อก<select value={delivery} onChange={e=>setDelivery(e.target.value as 'account'|'code')}><option value="account">บัญชี</option><option value="code">โค้ด</option></select></label><button disabled={busy} className="button button-primary">เพิ่มแพ็กเกจ</button></form></div>
   <div className="admin-panel"><h2>แพ็กเกจ ({variants.length})</h2><div className="admin-products">{variants.map(v=><div className="admin-product" key={v.id}><div><strong>{productById.get(v.product_id)} — {v.label}</strong><small>{cash(v.price_satang)} · สต็อก {stock.filter(s=>s.variant_id===v.id&&s.status==='available').length} ชิ้น · {v.delivery_type}</small></div><button className="button button-small" onClick={()=>{setEditing(v.id);setEditPrice((v.price_satang/100).toFixed(2))}}>แก้ราคา</button></div>)}</div></div>{variants.some(v=>v.id===editing)&&<div className="admin-panel"><h2>แก้ไขราคา</h2><form className="admin-form" onSubmit={e=>{e.preventDefault();const v=variants.find(x=>x.id===editing);if(v)void updatePackage(v)}}><label>ราคาขาย (บาท)<input required value={editPrice} onChange={e=>setEditPrice(e.target.value)}/></label><button className="button button-primary" disabled={busy}>บันทึก</button><button type="button" className="button" onClick={()=>setEditing('')}>ยกเลิก</button></form></div>}</>}
  {section==='stock'&&<><div className="admin-panel"><h2>นำเข้าบัญชีหรือโค้ดจริง</h2><p className="muted small">กรอกหนึ่งบัญชีหรือหนึ่งโค้ดต่อบรรทัด ข้อมูลจะส่งให้ผู้ซื้อหลังหัก Wallet สำเร็จเท่านั้น</p><form className="admin-form" onSubmit={e=>void addStock(e)}><label>แพ็กเกจ<select required value={stockVariant} onChange={e=>setStockVariant(e.target.value)}><option value="">เลือกแพ็กเกจ</option>{variants.map(v=><option key={v.id} value={v.id}>{productById.get(v.product_id)} — {v.label}</option>)}</select></label><label>สต็อก (บรรทัดละ 1 รายการ)<textarea required rows={8} value={stockText} onChange={e=>setStockText(e.target.value)} placeholder="บัญชีหรือโค้ดจริงของร้าน"/></label><button disabled={busy} className="button button-primary">บันทึกสต็อก</button></form></div><div className="admin-panel"><h2>จำนวนสต็อกตามแพ็กเกจ</h2><div className="admin-products">{variants.map(v=><div className="admin-product" key={v.id}><div><strong>{productById.get(v.product_id)} — {v.label}</strong><small>ส่งมอบแล้ว {stock.filter(s=>s.variant_id===v.id&&s.status==='delivered').length} รายการ</small></div><strong>{stock.filter(s=>s.variant_id===v.id&&s.status==='available').length} พร้อมขาย</strong></div>)}</div></div></>}
  {section==='topups'&&<div className="admin-panel"><h2>ตรวจสอบคำขอเติมเงิน</h2><p className="muted small">ตรวจยอด สลิป บัญชีผู้รับ และการโอนในบัญชีจริงก่อนกดอนุมัติ การกดอนุมัติจะเพิ่มยอด Wallet ทันที</p><div className="admin-products">{topups.map(t=><div className="admin-product shop-admin-review" key={t.id}><div><strong>{cash(t.amount_satang)}</strong><small>ลูกค้า {t.user_id.slice(0,8)} · {format(t.created_at)}</small><small>สถานะ: {t.status}</small>{t.admin_note&&<small>หมายเหตุ: {t.admin_note}</small>}{slipUrls[t.id]&&<a href={slipUrls[t.id]} target="_blank" rel="noopener noreferrer">เปิดภาพสลิป</a>}</div><div className="admin-product-actions"><button className="button button-small" onClick={()=>void slip(t)}>ดูสลิป</button>{t.status==='pending'&&<><input aria-label="หมายเหตุการตรวจสลิป" placeholder="หมายเหตุ" value={reviewNotes[t.id]??''} onChange={e=>setReviewNotes(old=>({...old,[t.id]:e.target.value}))}/><button disabled={busy} className="button button-primary button-small" onClick={()=>void review(t,true)}>อนุมัติ</button><button disabled={busy} className="button button-small" onClick={()=>void review(t,false)}>ปฏิเสธ</button></>}</div></div>)}</div>{!topups.length&&<p>ยังไม่มีคำขอเติมเงิน</p>}</div>}
  {section==='orders'&&<div className="admin-panel"><h2>คำสั่งซื้อ ({orders.length})</h2><div className="admin-products">{orders.map(o=><div className="admin-product" key={o.id}><div><strong>#{o.id.slice(0,8).toUpperCase()}</strong><small>ลูกค้า {o.customer_id.slice(0,8)} · {format(o.created_at)}</small><small>{o.status}</small></div><strong>{cash(o.total_satang)}</strong></div>)}</div>{!orders.length&&<p>ยังไม่มีคำสั่งซื้อ</p>}</div>}
  {section==='wallet'&&<div className="admin-panel"><h2>รายการเคลื่อนไหว Wallet</h2><p className="muted small">รายการจริงของร้าน OTPTHAI (300 รายการล่าสุด)</p><div className="admin-products">{entries.map(e=><div className="admin-product" key={e.id}><div><strong>{e.entry_type}</strong><small>ลูกค้า {accountById.get(e.account_id)?.slice(0,8)??'ไม่พบ'} · {format(e.created_at)}</small><small>อ้างอิง {e.external_reference}</small></div><strong>{cash(e.amount_satang)}</strong></div>)}</div>{!entries.length&&<p>ยังไม่มีรายการเงิน</p>}</div>}
  {section==='customers'&&<div className="admin-panel"><h2>ลูกค้าที่มี Wallet ({customers.length})</h2><div className="admin-products">{customers.map(a=><div className="admin-product" key={a.user_id}><div><strong>{a.email}</strong><small>คำสั่งซื้อ {a.order_count} รายการ</small></div><strong>{cash(a.balance_satang)}</strong></div>)}</div>{!customers.length&&<p>ยังไม่มีบัญชี Wallet ของลูกค้า</p>}</div>}
  {section==='payments'&&<div className="admin-panel"><h2>ตั้งค่าบัญชีรับเติมเงิน</h2><p className="muted small">คุณใส่บัญชีภายหลังได้ ระบบไม่แสดงบัญชีรับเงินก่อนตั้งค่าและเปิดใช้งาน</p><form className="admin-form" onSubmit={e=>void savePayment(e)}><label>เบอร์ PromptPay 10 หลัก หรือเลขประจำตัว 13 หลัก<input required inputMode="numeric" value={paymentId} onChange={e=>setPaymentId(e.target.value.replace(/\D/g,''))} maxLength={13}/></label><label>ชื่อบัญชีผู้รับเงิน<input required value={recipient} onChange={e=>setRecipient(e.target.value)}/></label><label className="shop-admin-check"><input type="checkbox" checked={paymentEnabled} onChange={e=>setPaymentEnabled(e.target.checked)}/> เปิดรับการเติมเงิน</label><button disabled={busy} className="button button-primary"><Save size={16}/> บันทึกบัญชี</button></form><p className="muted small">สถานะปัจจุบัน: {profile?.enabled?'เปิดรับเติมเงิน':'ยังไม่เปิดรับเติมเงิน'}</p></div>}
  {section==='design'&&<div className="admin-panel"><h2>ตั้งค่าร้าน OTPTHAI</h2><form className="admin-form" onSubmit={e=>void saveDesign(e)}><label>ชื่อร้าน<input required value={storeName} onChange={e=>setStoreName(e.target.value)}/></label><label>สีหลัก<input type="color" value={primary} onChange={e=>setPrimary(e.target.value)}/></label><button disabled={busy} className="button button-primary"><Save size={16}/> บันทึก</button></form><p className="muted small">ที่อยู่ร้าน: www.otpthai.shop · สถานะ: {store.status}</p></div>}
  </div>
 </section>
}
