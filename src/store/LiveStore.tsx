import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowRight, ChevronRight, Package, Search, ShieldCheck, ShoppingBag, Wallet } from 'lucide-react'
import { supabase } from '../lib/supabase'
import QRCode from 'qrcode'
import { promptpayPayload } from '../lib/promptpay'
import { useAuth } from '../auth/AuthProvider'

type StoreRow = { id: string; name: string; slug: string; status: string }
type ProductRow = { id: string; store_id: string; name: string; slug: string; description: string; published: boolean }
type VariantRow = { id: string; product_id: string; store_id: string; label: string; price_satang: number; published: boolean; duration_days: number | null }
const money = (satang: number) => new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB'}).format(satang / 100)
const errText = (cause: unknown) => cause instanceof Error ? cause.message : 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองอีกครั้ง'

function useMainCatalog() {
  const [store, setStore] = useState<StoreRow | null>(null)
  const [products, setProducts] = useState<ProductRow[]>([])
  const [variants, setVariants] = useState<VariantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(()=>{
    let live=true
    const run=async()=>{
      // The platform shop is a real, separate tenant. Only its published products are shown.
      const s=await supabase.from('stores').select('id,name,slug,status').eq('slug','otpthai').eq('status','active').maybeSingle()
      if(s.error)throw s.error
      if(!live)return
      setStore(s.data as StoreRow | null)
      if(!s.data)return
      const [p,v]=await Promise.all([
        supabase.from('products').select('id,store_id,name,slug,description,published').eq('store_id',s.data.id).eq('published',true).order('sort_order'),
        supabase.from('product_variants').select('id,product_id,store_id,label,price_satang,published,duration_days').eq('store_id',s.data.id).eq('published',true),
      ])
      if(p.error)throw p.error
      if(v.error)throw v.error
      if(live){setProducts((p.data??[]) as ProductRow[]);setVariants((v.data??[]) as VariantRow[])}
    }
    void run().catch(e=>{if(live)setError(errText(e))}).finally(()=>{if(live)setLoading(false)})
    return()=>{live=false}
  },[])
  return {store,products,variants,loading,error}
}

function ProductTile({product,variants}:{product:ProductRow;variants:VariantRow[]}) {
 const options=variants.filter(v=>v.product_id===product.id)
 const min=options.length?Math.min(...options.map(x=>x.price_satang)):null
 return <article className="product-card">
   <Link to={`/products/${product.id}`} className="product-image canva" aria-label={`ดูสินค้า ${product.name}`}><span className="product-mark">{product.name.slice(0,1).toUpperCase()}</span></Link>
   <div className="product-body"><span className="eyebrow">DIGITAL PRODUCT</span><Link to={`/products/${product.id}`} className="product-title">{product.name}</Link><p className="muted small">{product.description||'ดูรายละเอียดสินค้าและตัวเลือกแพ็กเกจ'}</p>
    <div className="product-meta">{options.length ? `${options.length} แพ็กเกจ`:'สอบถามรายละเอียดกับร้าน'}</div>
    <div className="product-bottom"><div><span className="muted tiny">{min===null?'สอบถามราคา':'ราคาเริ่มต้น'}</span><strong className="price">{min===null?'—':money(min)}</strong></div><Link to={`/products/${product.id}`} className="button button-primary button-small">ดูรายละเอียด <ChevronRight size={16}/></Link></div>
   </div>
 </article>
}

function CatalogResults({limit,search}:{limit?:number;search?:string}) {
 const {products,variants,loading,error}=useMainCatalog()
 const filtered=useMemo(()=>products.filter(p=>`${p.name} ${p.description}`.toLocaleLowerCase().includes((search??'').toLocaleLowerCase())).slice(0,limit),[products,search,limit])
 if(loading)return <div className="empty"><p>กำลังโหลดสินค้าจากร้าน...</p></div>
 if(error)return <div role="alert" className="notice">{error}</div>
 if(!filtered.length)return <div className="empty"><ShoppingBag size={32}/><h3>{search?'ไม่พบสินค้าที่ค้นหา':'ยังไม่มีสินค้าเปิดขาย'}</h3><p>สินค้าและราคาจะปรากฏหลังร้านเพิ่มและเผยแพร่สินค้าในหลังบ้าน</p></div>
 return <div className="product-grid">{filtered.map(p=><ProductTile key={p.id} product={p} variants={variants}/>)}</div>
}

export function LiveHome(){
 return <>
 <section className="hero"><div className="hero-glow"/><div className="hero-content"><span className="hero-pill">✦ OTPTHAI DIGITAL STORE</span><h1>ความบันเทิงที่ใช่<br/><span>ในราคาที่คุณชอบ</span></h1><p>เลือกแพ็กเกจดิจิทัลจากสินค้าที่ร้านเปิดจำหน่ายจริง ตรวจสอบรายละเอียดและราคาได้ก่อนตัดสินใจ</p><div className="hero-actions"><Link className="button button-white" to="/products">เลือกดูสินค้า <ArrowRight size={17}/></Link><Link className="button button-glass" to="/admin">จัดการร้าน <Store size={17}/></Link></div></div><div className="hero-art" aria-hidden="true"><div className="orb orb-one"/><div className="glass-card"><div className="glass-icon">✦</div><div className="glass-lines"><i/><i/><i/></div></div></div></section>
 <section className="quick-benefits"><div><ShieldCheck/><span><strong>ข้อมูลจากร้านจริง</strong><small>ไม่แสดงยอดสั่งซื้อหรือสต็อกสมมุติ</small></span></div><div><ShoppingBag/><span><strong>เลือกจากสินค้าจริง</strong><small>ร้านเป็นผู้จัดการราคาและรายการสินค้า</small></span></div><div><Wallet/><span><strong>ยอดเงินตรวจสอบได้</strong><small>อ้างอิงรายการในระบบเท่านั้น</small></span></div></section>
 <section className="section"><div className="section-heading"><div><span className="eyebrow blue">OUR PRODUCTS</span><h2>สินค้าของร้าน</h2><p className="muted">รายการที่เผยแพร่จากหลังบ้าน OTPTHAI</p></div><Link className="text-link" to="/products">ดูสินค้าทั้งหมด <ArrowRight size={17}/></Link></div><CatalogResults limit={4}/></section>
 <section className="promo"><div><span className="eyebrow">OTPTHAI WALLET</span><h2>เติมเงินครั้งเดียว ซื้อได้หลายสินค้า</h2><p>เติมเงินเข้า Wallet รอแอดมินตรวจสลิป จากนั้นใช้ยอดคงเหลือซื้อแพ็กเกจได้เลย</p><Link className="button button-white" to="/wallet">ไปที่ Wallet <ArrowRight size={17}/></Link></div><div className="promo-art" aria-hidden="true"><Wallet size={110}/></div></section>
 </>
}
export function LiveProducts(){
 const [search,setSearch]=useState('')
 return <section className="section page-section"><span className="eyebrow blue">OUR COLLECTION</span><h1 className="page-title">สินค้าทั้งหมด</h1><p className="muted">แสดงเฉพาะสินค้าจริงจากฐานข้อมูลของร้าน OTPTHAI</p><div className="catalog-controls"><div className="search-field"><Search size={18}/><input aria-label="ค้นหาสินค้า" placeholder="ค้นหาสินค้า..." value={search} onChange={e=>setSearch(e.target.value)}/></div></div><CatalogResults search={search}/></section>
}
export function LiveProductDetail(){
 const {id}=useParams();const {user}=useAuth()
 const {products,variants,loading,error}=useMainCatalog()
 const [buying,setBuying]=useState(''),[buyError,setBuyError]=useState('')
 if(loading)return <section className="placeholder"><p>กำลังโหลดรายละเอียดสินค้า...</p></section>
 if(error)return <section className="placeholder" role="alert">{error}</section>
 const p=products.find(x=>x.id===id)
 if(!p)return <section className="placeholder"><h1>ไม่พบสินค้านี้</h1><Link className="button button-primary" to="/products">กลับไปรายการสินค้า</Link></section>
 const options=variants.filter(v=>v.product_id===p.id)
 const buy=async(variantId:string)=>{
   if(!user){location.assign('/login?next='+encodeURIComponent(location.pathname));return}
   if(buying)return
   setBuying(variantId);setBuyError('')
   try{
     const {data,error:purchaseError}=await supabase.rpc('purchase_with_wallet',{p_variant:variantId,p_request:crypto.randomUUID()})
     if(purchaseError)throw purchaseError
     location.assign('/orders?order='+data)
   }catch(e){setBuyError(errText(e))}finally{setBuying('')}
 }
 return <section className="section page-section"><div className="breadcrumbs"><Link to="/">หน้าหลัก</Link><ChevronRight size={15}/><Link to="/products">สินค้า</Link><ChevronRight size={15}/>{p.name}</div><div className="detail-layout"><div className="detail-art canva"><span className="detail-mark">{p.name.slice(0,1).toUpperCase()}</span></div><div className="detail-copy"><span className="eyebrow blue">OTPTHAI PRODUCT</span><h1>{p.name}</h1><p className="muted">{p.description}</p>{buyError&&<p role="alert" className="auth-error">{buyError}</p>}<div className="admin-products">{options.map(v=><div key={v.id} className="admin-product"><div><strong>{v.label}</strong><small>{v.duration_days?`${v.duration_days} วัน`:'รายละเอียดแพ็กเกจ'}</small></div><div className="admin-product-actions"><strong className="price">{money(v.price_satang)}</strong><button disabled={Boolean(buying)} onClick={()=>void buy(v.id)} className="button button-primary button-small">{buying===v.id?'กำลังซื้อ...':'ซื้อด้วย Wallet'}</button></div></div>)}</div><div className="notice"><Wallet size={19}/><span>ชำระด้วยยอดเงินใน Wallet เท่านั้น ระบบจะหักเงินและส่งสต็อกให้อัตโนมัติเมื่อซื้อสำเร็จ</span></div><Link to="/wallet" className="button button-primary button-wide">เติมเงินเข้า Wallet <ArrowRight size={17}/></Link></div></div></section>
}
export function LiveOrders(){
 const {user,loading:authLoading}=useAuth()
 const [orders,setOrders]=useState<Array<{id:string;status:string;total_satang:number;created_at:string}>>([])
 const [deliveries,setDeliveries]=useState<Record<string,string[]>>({})
 const [loading,setLoading]=useState(true),[error,setError]=useState('')
 useEffect(()=>{
   if(!user){setOrders([]);setDeliveries({});setLoading(false);return}
   let active=true
   setLoading(true);setError('');setOrders([]);setDeliveries({})
   const load=async()=>{
     const main=await supabase.from('stores').select('id').eq('slug','otpthai').eq('status','active').maybeSingle()
     if(main.error)throw main.error
     if(!main.data)return
     const result=await supabase.from('orders').select('id,status,total_satang,created_at')
       .eq('customer_id',user.id).eq('store_id',main.data.id).order('created_at',{ascending:false})
     if(result.error)throw result.error
     const own=result.data??[]
     if(!active)return
     setOrders(own)
     if(!own.length)return
     const stock=await supabase.from('stock_units').select('order_id,secret_text')
       .eq('store_id',main.data.id).eq('status','delivered').in('order_id',own.map(x=>x.id))
     if(stock.error)throw stock.error
     const grouped:Record<string,string[]>={}
     for(const x of stock.data??[]){
       if(!x.order_id)continue
       grouped[x.order_id]??=[]
       grouped[x.order_id].push(x.secret_text)
     }
     if(active)setDeliveries(grouped)
   }
   void load().catch(e=>{if(active)setError(errText(e))}).finally(()=>{if(active)setLoading(false)})
   return()=>{active=false}
 },[user?.id])
 if(authLoading)return <section className="placeholder">กำลังตรวจสอบบัญชี...</section>
 if(!user)return <Navigate to="/login?next=/orders" replace/>
 return <section className="section page-section"><h1 className="page-title">ประวัติคำสั่งซื้อ</h1><p className="muted">บัญชีและโค้ดที่ส่งมอบจากการซื้อด้วย Wallet จะแสดงเฉพาะในบัญชีของคุณ</p>
 {error?<div role="alert" className="notice">{error}</div>:loading?<div className="empty">กำลังโหลด...</div>:orders.length?
 <div className="admin-products">{orders.map(o=><div className="admin-product order-fulfilled" key={o.id}><div><strong>#{o.id.slice(0,8).toUpperCase()}</strong><small>{new Date(o.created_at).toLocaleString('th-TH')} · {o.status}</small>
 {(deliveries[o.id]??[]).map((secret,i)=><div className="delivered-code" key={i}><strong>สินค้าที่ได้รับ #{i+1}</strong><pre>{secret}</pre><button type="button" className="button button-small" onClick={()=>void navigator.clipboard.writeText(secret)}>คัดลอกข้อมูล</button></div>)}
 </div><strong>{money(o.total_satang)}</strong></div>)}</div>:
 <div className="empty"><Package size={34}/><h3>ยังไม่มีคำสั่งซื้อ</h3><p>เมื่อซื้อสินค้าด้วย Wallet สำเร็จ รายการและข้อมูลสินค้าจะปรากฏที่นี่</p><Link className="button button-primary" to="/products">ดูสินค้า</Link></div>}</section>
}
export function LiveWallet(){
 const {user,loading:authLoading}=useAuth()
 const [entries,setEntries]=useState<Array<{id:string;amount_satang:number;entry_type:string;created_at:string}>>([])
 const [profile,setProfile]=useState<{store_id:string;promptpay_id:string;recipient_name:string}|null>(null)
 const [requests,setRequests]=useState<Array<{id:string;amount_satang:number;status:string;created_at:string}>>([])
 const [amount,setAmount]=useState('100')
 const [qr,setQr]=useState(''),[qrError,setQrError]=useState('')
 const [slip,setSlip]=useState<File|null>(null)
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false)
 const [error,setError]=useState(''),[success,setSuccess]=useState('')
 const load=async()=>{
   if(!user)return
   const main=await supabase.from('stores').select('id').eq('slug','otpthai').eq('status','active').maybeSingle()
   if(main.error)throw main.error
   if(!main.data)return
   const [prof,accounts,reqs]=await Promise.all([
     supabase.from('store_payment_profiles').select('store_id,promptpay_id,recipient_name').eq('store_id',main.data.id).eq('enabled',true).maybeSingle(),
     supabase.from('wallet_accounts').select('id').eq('user_id',user.id).eq('store_id',main.data.id),
     supabase.from('topup_requests').select('id,amount_satang,status,created_at').eq('user_id',user.id).eq('store_id',main.data.id).order('created_at',{ascending:false}),
   ])
   if(prof.error)throw prof.error;if(accounts.error)throw accounts.error;if(reqs.error)throw reqs.error
   setProfile(prof.data);setRequests(reqs.data??[])
   const ids=(accounts.data??[]).map(a=>a.id)
   if(!ids.length){setEntries([]);return}
   const e=await supabase.from('wallet_entries').select('id,amount_satang,entry_type,created_at').eq('store_id',main.data.id).in('account_id',ids).order('created_at',{ascending:false})
   if(e.error)throw e.error;setEntries(e.data??[])
 }
 useEffect(()=>{if(!user){setLoading(false);return}let live=true;void load().catch(e=>{if(live)setError(errText(e))}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[user?.id])
 useEffect(()=>{
   let active=true
   setQr('');setQrError('')
   if(!profile||!amount)return
   const baht=Number(amount)
   if(!Number.isFinite(baht)||baht<1||baht>1000000)return
   try{
     const payload=promptpayPayload(profile.promptpay_id,baht)
     void QRCode.toDataURL(payload,{width:300,margin:2,errorCorrectionLevel:'M'})
       .then(src=>{if(active)setQr(src)})
       .catch(e=>{if(active)setQrError(errText(e))})
   }catch(e){setQrError(errText(e))}
   return()=>{active=false}
 },[profile?.promptpay_id,amount])
 const submit=async(e:FormEvent)=>{
   e.preventDefault();if(!user||!profile||!slip||busy)return
   const baht=Number(amount);if(!Number.isFinite(baht)||baht<=0){setError('กรุณาระบุยอดเติมเงิน');return}
   setBusy(true);setError('');setSuccess('')
   try{
     const ext=slip.name.split('.').pop()?.toLowerCase()||'jpg'
     const path=`${user.id}/${crypto.randomUUID()}.${ext}`
     const up=await supabase.storage.from('payment-slips').upload(path,slip,{contentType:slip.type,upsert:false})
     if(up.error)throw up.error
     const ins=await supabase.from('topup_requests').insert({store_id:profile.store_id,user_id:user.id,amount_satang:Math.round(baht*100),slip_path:path})
     if(ins.error){await supabase.storage.from('payment-slips').remove([path]);throw ins.error}
     setAmount('100');setSlip(null);setSuccess('ส่งสลิปแล้ว รอแอดมินตรวจสอบ ยอดเงินจะเข้า Wallet หลังอนุมัติ')
     await load()
   }catch(e){setError(errText(e))}finally{setBusy(false)}
 }
 if(authLoading)return <section className="placeholder">กำลังตรวจสอบบัญชี...</section>
 if(!user)return <Navigate to="/login?next=/wallet" replace/>
 const balance=entries.reduce((sum,e)=>sum+e.amount_satang,0)
 return <section className="section page-section"><span className="eyebrow blue">MY WALLET</span><h1 className="page-title">กระเป๋าเงิน</h1>
 {error&&<p role="alert" className="auth-error">{error}</p>}{success&&<p role="status" className="auth-success">{success}</p>}
 {loading?<div className="empty">กำลังโหลด...</div>:<><div className="detail-price"><span>ยอดเงินคงเหลือ</span><strong>{money(balance)}</strong></div>
 <section className="admin-panel"><h2>เติมเงิน</h2>{profile?<form className="admin-form" onSubmit={e=>void submit(e)}><p><strong>PromptPay:</strong> {profile.promptpay_id}<br/><span className="muted small">ชื่อผู้รับ: {profile.recipient_name}</span></p><label>จำนวนเงิน (บาท)<input required inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="100"/></label>{qr&&<div className="topup-qr"><img src={qr} alt={`PromptPay QR เติมเงิน ${amount} บาท`}/><strong>สแกนจ่าย {amount} บาท</strong><small>โปรดตรวจสอบชื่อบัญชีผู้รับก่อนโอน</small></div>}{qrError&&<p role="alert" className="auth-error">{qrError}</p>}<label>แนบสลิป<input required type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setSlip(e.target.files?.[0]??null)}/></label><button disabled={busy||!slip} className="button button-primary">{busy?'กำลังส่ง...':'ส่งสลิปให้แอดมินตรวจ'}</button></form>:<div className="notice"><ShieldCheck size={19}/><span>แอดมินยังไม่ได้ตั้งค่าบัญชี PromptPay จึงยังไม่เปิดรับเติมเงิน</span></div>}</section>
 <h2>คำขอเติมเงิน</h2>{requests.length?<div className="admin-products">{requests.map(r=><div className="admin-product" key={r.id}><div><strong>{money(r.amount_satang)}</strong><small>{new Date(r.created_at).toLocaleString('th-TH')}</small></div><span className="draft-badge">{r.status}</span></div>)}</div>:<div className="empty">ยังไม่มีคำขอเติมเงิน</div>}
 <h2>รายการเคลื่อนไหว</h2>{entries.length?<div className="admin-products">{entries.map(e=><div className="admin-product" key={e.id}><div><strong>{e.entry_type}</strong><small>{new Date(e.created_at).toLocaleString('th-TH')}</small></div><strong>{money(e.amount_satang)}</strong></div>)}</div>:<div className="empty"><Wallet size={34}/><p>ยังไม่มีรายการเงินในบัญชี</p></div>}</>}</section>
}

