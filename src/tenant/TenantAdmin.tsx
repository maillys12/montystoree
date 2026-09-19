import { useEffect, useState, type FormEvent, type CSSProperties } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowRight, CheckCircle2, CircleAlert, LayoutDashboard, PackagePlus, Plus, Save, Store, Wallet } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'

type StoreRecord = { id: string; slug: string; name: string; status: string; theme: unknown }
type ProductRecord = { id: string; name: string; slug: string; description: string; published: boolean }
type VariantRecord = { id: string; product_id: string; label: string; price_satang: number; published: boolean }

const shortError = (error: unknown) => error instanceof Error ? error.message : 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง'

export function TenantAdmin() {
  const { user, loading } = useAuth()
  const [stores, setStores] = useState<StoreRecord[]>([])
  const [selected, setSelected] = useState('')
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [variants, setVariants] = useState<VariantRecord[]>([])
  const [busy, setBusy] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
    const [storeName, setStoreName] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#1769e0')
  const [productName, setProductName] = useState('')
  const [productSlug, setProductSlug] = useState('')
  const [productPrice, setProductPrice] = useState('')
  const [productDuration, setProductDuration] = useState('30')
  const [deliveryType, setDeliveryType] = useState<'account'|'code'>('account')

  const refreshStores = async () => {
    const { data, error: queryError } = await supabase.from('stores')
      .select('id,slug,name,status,theme').eq('owner_id',user!.id).eq('slug','otpthai').limit(1)
    if (queryError) throw queryError
    const list = (data ?? []) as StoreRecord[]
    setStores(list)
    setSelected(current => list.some(x=>x.id===current) ? current : (list[0]?.id ?? ''))
  }
  useEffect(() => {
    if (!user) { setFetching(false); return }
    setFetching(true)
    void refreshStores().catch(e=>setError(shortError(e))).finally(()=>setFetching(false))
  }, [user?.id])
  const current = stores.find(x=>x.id===selected)
  useEffect(() => {
    if (!selected || !user) { setProducts([]);setVariants([]);return }
    const load = async () => {
      const [p,v] = await Promise.all([
        supabase.from('products').select('id,name,slug,description,published').eq('store_id',selected).order('created_at',{ascending:false}),
        supabase.from('product_variants').select('id,product_id,label,price_satang,published').eq('store_id',selected),
      ])
      if(p.error) throw p.error
      if(v.error) throw v.error
      setProducts((p.data??[]) as ProductRecord[])
      setVariants((v.data??[]) as VariantRecord[])
    }
    void load().catch(e=>setError(shortError(e)))
  },[selected,user?.id])
  useEffect(()=>{
    setStoreName(current?.name??'')
    const theme = current?.theme && typeof current.theme==='object' ? current.theme as { primary?: unknown } : {}
    setPrimaryColor(typeof theme.primary==='string' && /^#[0-9a-fA-F]{6}$/.test(theme.primary) ? theme.primary : '#1769e0')
  },[current?.id])

  const updateDesign = async (event:FormEvent) => {
    event.preventDefault();if(!current)return
    setBusy(true);setError('');setSuccess('')
    try {
      const {error:rpcError}=await supabase.rpc('update_store_design',{p_store_id:current.id,p_name:storeName.trim(),p_theme:{primary:primaryColor}})
      if(rpcError)throw rpcError
      await refreshStores();setSuccess('บันทึกชื่อร้านและสีหลักแล้ว')
    }catch(e){setError(shortError(e))}finally{setBusy(false)}
  }
  const addProduct = async (event:FormEvent) => {
    event.preventDefault();if(!current)return
    setBusy(true);setError('');setSuccess('')
    try {
      const amount=Number(productPrice)
      const days=Number(productDuration)
      if(!Number.isFinite(amount)||amount<0||Math.round(amount*100)!==amount*100||!Number.isSafeInteger(Math.round(amount*100)))throw new Error('โปรดระบุราคาที่ถูกต้อง (ทศนิยมไม่เกิน 2 ตำแหน่ง)')
      if(!Number.isInteger(days)||days<=0)throw new Error('ระยะเวลาต้องเป็นจำนวนวันมากกว่า 0')
      if(!/^[a-z0-9][a-z0-9-]{2,39}$/.test(productSlug))throw new Error('รหัสสินค้าใช้ a-z, 0-9 และขีดกลาง 3–40 ตัวอักษร')
      const {data:p,error:productError}=await supabase.from('products').insert({
        store_id:current.id,name:productName.trim(),slug:productSlug,description:'',published:false,
      }).select('id').single()
      if(productError)throw productError
      const {error:variantError}=await supabase.from('product_variants').insert({
        store_id:current.id,product_id:p.id,label:`${days} วัน`,price_satang:Math.round(amount*100),
        duration_days:days,delivery_type:deliveryType,published:false,
      })
      if(variantError)throw new Error('สร้างสินค้าแล้ว แต่สร้างแพ็กเกจไม่สำเร็จ: '+variantError.message)
      const [pRes,vRes]=await Promise.all([
        supabase.from('products').select('id,name,slug,description,published').eq('store_id',current.id).order('created_at',{ascending:false}),
        supabase.from('product_variants').select('id,product_id,label,price_satang,published').eq('store_id',current.id),
      ])
      if(pRes.error)throw pRes.error
      if(vRes.error)throw vRes.error
      setProducts((pRes.data??[]) as ProductRecord[]);setVariants((vRes.data??[]) as VariantRecord[])
      setProductName('');setProductSlug('');setProductPrice('')
      setSuccess('เพิ่มสินค้าแล้ว กดเผยแพร่เพื่อแสดงรายละเอียดบนหน้าร้าน ระบบรับเงินยังไม่เปิด')
    }catch(e){setError(shortError(e))}finally{setBusy(false)}
  }
  const toggleProduct = async (product: ProductRecord) => {
    if (!current || busy) return
    if (current.status !== 'active') { setError('ร้านยังไม่เปิดใช้งาน จึงเผยแพร่สินค้าไม่ได้'); return }
    const matching = variants.filter(v => v.product_id === product.id)
    if (!product.published && !matching.length) { setError('กรุณาเพิ่มแพ็กเกจก่อนเผยแพร่สินค้า'); return }
    setBusy(true); setError(''); setSuccess('')
    try {
      if (product.published) {
        const {error: hideError} = await supabase.from('products').update({published:false}).eq('id',product.id).eq('store_id',current.id)
        if (hideError) throw hideError
        const {error: variantError} = await supabase.from('product_variants').update({published:false}).eq('product_id',product.id).eq('store_id',current.id)
        if (variantError) throw variantError
      } else {
        const {error: variantError} = await supabase.from('product_variants').update({published:true}).eq('product_id',product.id).eq('store_id',current.id)
        if (variantError) throw variantError
        const {error: showError} = await supabase.from('products').update({published:true}).eq('id',product.id).eq('store_id',current.id)
        if (showError) throw showError
      }
      const [pRes,vRes] = await Promise.all([
        supabase.from('products').select('id,name,slug,description,published').eq('store_id',current.id).order('created_at',{ascending:false}),
        supabase.from('product_variants').select('id,product_id,label,price_satang,published').eq('store_id',current.id),
      ])
      if (pRes.error) throw pRes.error
      if (vRes.error) throw vRes.error
      setProducts((pRes.data??[]) as ProductRecord[])
      setVariants((vRes.data??[]) as VariantRecord[])
      setSuccess(product.published ? 'ซ่อนสินค้าจากหน้าร้านแล้ว' : 'เผยแพร่รายละเอียดสินค้าแล้ว (ระบบรับชำระเงินยังไม่เปิด)')
    } catch(e) { setError(shortError(e)) } finally { setBusy(false) }
  }
  if(loading||fetching)return <section className="placeholder"><p>กำลังโหลดร้านค้าของคุณ...</p></section>
  if(!user)return <Navigate to="/login?next=/admin" replace/>
  return <section className="section page-section tenant-admin">
    <div className="section-heading"><div><span className="eyebrow blue">STORE CONTROL CENTER</span><h1 className="page-title">จัดการร้านค้าของฉัน</h1><p className="muted">จัดการร้าน OTPTHAI สินค้า ราคา และสต็อก</p></div><LayoutDashboard size={34} color="#1769e0"/></div>
    {error&&<p role="alert" className="auth-error">{error}</p>}
    {success&&<p role="status" className="auth-success"><CheckCircle2 size={17}/>{success}</p>}
    <div className="admin-columns">
      <div className="admin-panel"><h2><Store size={20}/> ร้าน OTPTHAI</h2>
        {current?<div className="store-picker"><button type="button" className="store-choice active"><strong>{current.name}</strong><small>ร้านหลัก · {current.status}</small></button></div>:<p className="muted small">ไม่พบร้านหลัก OTPTHAI สำหรับบัญชีนี้</p>}
      </div>
      <div className="admin-panel">{current?<><div className="admin-heading"><h2>ตั้งค่าร้านค้า</h2><span className="draft-badge">{current.status==='active'?'เปิดใช้งานแล้ว':'รออนุมัติการเช่า'}</span></div>
        <p className="muted small">ร้านหลัก OTPTHAI</p>
        <form onSubmit={updateDesign} className="admin-form"><label>ชื่อร้าน<input required minLength={2} maxLength={120} value={storeName} onChange={e=>setStoreName(e.target.value)}/></label><label>สีหลักของร้าน<input type="color" aria-label="สีหลักของร้าน" value={primaryColor} onChange={e=>setPrimaryColor(e.target.value)}/></label><button className="button button-primary" disabled={busy} type="submit"><Save size={16}/> บันทึกการปรับแต่ง</button></form>
        <Link className="text-link" to="/">ดูหน้าร้าน <ArrowRight size={16}/></Link>
      </>:<div className="empty"><Store/><p>เลือกร้านทางซ้ายเพื่อจัดการ</p></div>}</div>
    </div>
    {current&&<div className="admin-panel catalog-panel"><h2><PackagePlus size={20}/> สินค้าของ {current.name}</h2><p className="muted small">เพิ่มสินค้าและสต็อกจริงจากหลังบ้าน ก่อนเผยแพร่ขาย</p>
      <div className="catalog-admin-grid"><form className="admin-form" onSubmit={addProduct}>
        <h3>เพิ่มสินค้าแบบร่าง</h3><label>ชื่อสินค้า<input required maxLength={120} value={productName} onChange={e=>setProductName(e.target.value)} placeholder="ชื่อสินค้าที่ต้องการจำหน่าย"/></label>
        <label>รหัส URL สินค้า<input required value={productSlug} onChange={e=>setProductSlug(e.target.value.toLowerCase())} placeholder="netflix-30-days"/></label>
        <label>ราคาขาย (บาท)<input required type="number" min="0" max="1000000" step="0.01" value={productPrice} onChange={e=>setProductPrice(e.target.value)} placeholder="0.00"/></label>
        <label>ระยะเวลา (วัน)<input required type="number" min="1" max="3650" value={productDuration} onChange={e=>setProductDuration(e.target.value)}/></label>
        <label>วิธีส่งมอบ<select value={deliveryType} onChange={e=>setDeliveryType(e.target.value as typeof deliveryType)}><option value="account">บัญชีจากสต็อกอัตโนมัติ</option><option value="code">โค้ดจากสต็อกอัตโนมัติ</option></select></label>
        <button disabled={busy} className="button button-primary" type="submit"><Plus size={16}/> เพิ่มสินค้า</button>
      </form><div className="admin-products">{products.length?products.map(product=><div className="admin-product" key={product.id}><div><strong>{product.name}</strong><small>/{product.slug} · {variants.filter(v=>v.product_id===product.id).map(v=>`${v.label} ฿${(v.price_satang/100).toLocaleString('th-TH')}`).join(', ')||'ไม่มีแพ็กเกจ'}</small></div><div className="admin-product-actions"><span className="draft-badge">{product.published?'เผยแพร่':'แบบร่าง'}</span><button type="button" className="button button-primary button-small" disabled={busy||current.status!=='active'} onClick={()=>void toggleProduct(product)}>{product.published?'ซ่อนสินค้า':'เผยแพร่'}</button></div></div>):<div className="empty"><PackagePlus/><p>ยังไม่มีสินค้าในร้านนี้</p></div>}</div></div>
    </div>}
  </section>
}

export function TenantStorefront({ overrideSlug }: { overrideSlug?: string }) {
  const { slug: routeSlug }=useParams()
  const slug = overrideSlug ?? routeSlug
  const {user,loading}=useAuth()
  const [store,setStore]=useState<StoreRecord|null>(null)
  const [items,setItems]=useState<ProductRecord[]>([])
  const [variants,setVariants]=useState<VariantRecord[]>([])
  const [pending,setPending]=useState(true)
  useEffect(()=>{
    if(loading)return
    let live=true
    const load=async()=>{
      const {data,error}=await supabase.from('stores').select('id,slug,name,status,theme').eq('slug',slug??'').maybeSingle()
      if(error)throw error
      if(!live)return
      setStore(data as StoreRecord|null)
      if(!data)return
      const [p,v]=await Promise.all([
        supabase.from('products').select('id,name,slug,description,published').eq('store_id',data.id),
        supabase.from('product_variants').select('id,product_id,label,price_satang,published').eq('store_id',data.id),
      ])
      if(p.error)throw p.error
      if(v.error)throw v.error
      if(live){setItems((p.data??[]) as ProductRecord[]);setVariants((v.data??[]) as VariantRecord[])}
    }
    setPending(true)
    void load().catch(()=>{if(live)setStore(null)}).finally(()=>{if(live)setPending(false)})
    return()=>{live=false}
  },[slug,user?.id,loading])
  if(loading||pending)return <section className="placeholder">กำลังโหลดร้านค้า...</section>
  if(!store)return <section className="placeholder"><Store size={35}/><h1>ไม่พบร้านค้านี้</h1><p>ร้านอาจยังไม่เปิดใช้งาน หรือคุณไม่มีสิทธิ์ดูร้านร่าง</p><Link className="button button-primary" to="/">หน้าหลัก</Link></section>
  const theme=store.theme&&typeof store.theme==='object'?store.theme as {primary?:unknown}:{}
  const primary=typeof theme.primary==='string'&&/^#[0-9a-fA-F]{6}$/.test(theme.primary)?theme.primary:'#1769e0'
  return <section className="section page-section tenant-page" style={{'--tenant-primary':primary} as CSSProperties}>
    {store.status!=='active'&&<div className="notice"><CircleAlert size={19}/> หน้าตัวอย่างสำหรับเจ้าของร้าน — ร้านยังไม่เปิดให้สาธารณะเข้าชมหรือสั่งซื้อ</div>}
    <div className="tenant-hero"><span className="eyebrow">PREMIUM DIGITAL STORE</span><h1>{store.name}</h1><p>ร้านค้าดิจิทัลของคุณ · {store.slug}.{ROOT_DOMAIN}</p><a href={`https://www.${ROOT_DOMAIN}/admin`} className="button button-white">กลับหลังบ้าน <ArrowRight size={16}/></a></div>
    <div className="section-heading"><div><span className="eyebrow blue">STORE CATALOG</span><h2>สินค้าของร้าน</h2><p className="muted">สินค้าจะแสดงข้อมูลจากร้านนี้เท่านั้น</p></div></div>
    {items.length?<div className="tenant-items">{items.map(product=><article className="tenant-item" key={product.id}><div className="tenant-item-art"><Store size={38}/></div><h3>{product.name}</h3><p className="muted small">{product.description||'สินค้าแบบร่าง'}</p>{variants.filter(v=>v.product_id===product.id).map(v=><div className="tenant-item-price" key={v.id}><span>{v.label}</span><strong>฿{(v.price_satang/100).toLocaleString('th-TH')}</strong></div>)}<button className="button button-primary button-wide" disabled>ยังไม่เปิดรับคำสั่งซื้อ</button></article>)}</div>:<div className="empty"><PackagePlus/><h3>ยังไม่มีสินค้า</h3><p>เจ้าของร้านสามารถเพิ่มสินค้าจากหน้า Admin ได้</p></div>}
  </section>
}
