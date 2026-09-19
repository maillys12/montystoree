import { useState } from 'react'
import AuthPage from './auth/AuthPage'
import { useAuth } from './auth/AuthProvider'
import { Link, NavLink, Route, Routes, useParams } from 'react-router-dom'
import { ArrowRight, BadgeCheck, Check, ChevronRight, CircleHelp, Clock3, Headphones, LayoutDashboard, Menu, Package, Search, ShieldCheck, ShoppingBag, ShoppingCart, Sparkles, Store, Wallet, X } from 'lucide-react'

type Product = {
  id: string
  name: string
  category: string
  subtitle: string
  price: number
  period: string
  gradient: string
  mark: string
  tag?: string
}

const products: Product[] = [
  { id: 'netflix', name: 'Netflix Premium', category: 'STREAMING', subtitle: 'แพ็กเกจดูหนังและซีรีส์', price: 129, period: '30 วัน', gradient: 'netflix', mark: 'N', tag: 'ยอดนิยม' },
  { id: 'youtube', name: 'YouTube Premium', category: 'ENTERTAINMENT', subtitle: 'ดูวิดีโอและฟังเพลง', price: 70, period: '30 วัน', gradient: 'youtube', mark: '▶', tag: 'ขายดี' },
  { id: 'disney', name: 'Disney+', category: 'STREAMING', subtitle: 'รวมความบันเทิงที่คุณชอบ', price: 90, period: '30 วัน', gradient: 'disney', mark: 'D+' },
  { id: 'iqiyi', name: 'iQIYI VIP', category: 'STREAMING', subtitle: 'ซีรีส์และรายการพรีเมี่ยม', price: 25, period: '30 วัน', gradient: 'iqiyi', mark: 'iQ' },
  { id: 'viu', name: 'Viu Premium', category: 'STREAMING', subtitle: 'ซีรีส์และรายการเอเชีย', price: 20, period: '30 วัน', gradient: 'viu', mark: 'viu' },
  { id: 'canva', name: 'Canva Pro', category: 'CREATIVE', subtitle: 'เครื่องมือสร้างสรรค์งาน', price: 59, period: '30 วัน', gradient: 'canva', mark: 'C' },
]
const thb = (amount: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(amount)
const DEMO = 'ภาพตัวอย่างการออกแบบ · ยังไม่เปิดระบบซื้อขายจริง'

function ProductCard({ product }: { product: Product }) {
  return <article className="product-card">
    <Link to={`/products/${product.id}`} aria-label={`ดูรายละเอียด ${product.name}`} className={`product-image ${product.gradient}`}>
      {product.tag && <span className="corner-tag">{product.tag}</span>}
      <span className="product-mark">{product.mark}</span>
      <span className="image-sparkle">✦</span>
    </Link>
    <div className="product-body">
      <span className="eyebrow">{product.category}</span>
      <Link className="product-title" to={`/products/${product.id}`}>{product.name}</Link>
      <p className="muted small">{product.subtitle}</p>
      <div className="product-meta"><span className="available"><span className="status-dot" /> แพ็กเกจตัวอย่าง</span><span>{product.period}</span></div>
      <div className="product-bottom"><div><span className="muted tiny">ราคาเริ่มต้น (ตัวอย่าง)</span><strong className="price">{thb(product.price)}</strong></div><Link to={`/products/${product.id}`} className="button button-primary button-small">ดูสินค้า <ChevronRight size={16}/></Link></div>
    </div>
  </article>
}

function ProductGrid({ limit }: { limit?: number }) {
  return <div className="product-grid">{products.slice(0, limit).map(product => <ProductCard key={product.id} product={product}/>)}</div>
}

function Home() {
  return <>
    <section className="hero">
      <div className="hero-glow" />
      <div className="hero-content"><span className="hero-pill"><Sparkles size={14}/> PREMIUM DIGITAL STORE</span><h1>ความบันเทิงที่ใช่<br/><span>ในราคาที่คุณชอบ</span></h1><p>รวมบริการดิจิทัลและแอพพรีเมี่ยมไว้ในที่เดียว เลือกแพ็กเกจที่เหมาะกับคุณได้ง่าย ๆ</p><div className="hero-actions"><Link to="/products" className="button button-white">เลือกดูสินค้า <ArrowRight size={18}/></Link><Link to="/wallet" className="button button-glass">วิธีเติมเงิน <Wallet size={18}/></Link></div><div className="hero-trust"><span><BadgeCheck size={16}/> เลือกแพ็กเกจง่าย</span><span><Headphones size={16}/> มีช่องทางติดต่อร้าน</span></div></div>
      <div className="hero-art" aria-hidden="true"><div className="orb orb-one"/><div className="orb orb-two"/><div className="glass-card"><div className="glass-icon">▶</div><div className="glass-lines"><i/><i/><i/></div><div className="glass-stars">✦ ✧</div></div><div className="floating-tile tile-one">N</div><div className="floating-tile tile-two">D+</div><div className="floating-tile tile-three">♫</div></div>
    </section>
    <section className="quick-benefits"><div><ShieldCheck/><span><strong>ดูข้อมูลแพ็กเกจชัดเจน</strong><small>ตรวจสอบรายละเอียดก่อนเลือกซื้อ</small></span></div><div><ShoppingBag/><span><strong>สินค้าในที่เดียว</strong><small>เลือกหมวดหมู่ที่ต้องการ</small></span></div><div><Headphones/><span><strong>ช่องทางช่วยเหลือ</strong><small>ติดต่อร้านเมื่อมีข้อสงสัย</small></span></div></section>
    <section className="section"><div className="section-heading"><div><span className="eyebrow blue">HANDPICKED FOR YOU</span><h2>สินค้ายอดนิยม <span>✨</span></h2><p className="muted">แพ็กเกจตัวอย่างสำหรับการออกแบบหน้าร้าน</p></div><Link to="/products" className="text-link">ดูสินค้าทั้งหมด <ArrowRight size={17}/></Link></div><ProductGrid limit={4}/></section>
    <section className="promo"><div><span className="eyebrow">BUILD YOUR OWN STORE</span><h2>อยากมีร้านค้าออนไลน์<br/>ในสไตล์ของคุณเอง?</h2><p>เริ่มจากเทมเพลต MONTYSTOREE แล้วปรับชื่อร้าน สี และสินค้าให้เป็นของคุณ</p><Link to="/rent" className="button button-white">รู้จักระบบเช่าเว็บไซต์ <ArrowRight size={17}/></Link></div><div className="promo-art" aria-hidden="true"><Store size={110} strokeWidth={1.1}/></div></section>
  </>
}

function Products() {
  const [term, setTerm] = useState('')
  const [category, setCategory] = useState('ทั้งหมด')
  const categories = ['ทั้งหมด', ...new Set(products.map(product => product.category))]
  const shown = products.filter(p => (category === 'ทั้งหมด' || p.category === category) && `${p.name} ${p.subtitle}`.toLowerCase().includes(term.toLowerCase()))
  return <section className="section page-section"><span className="eyebrow blue">OUR COLLECTION</span><h1 className="page-title">สินค้าทั้งหมด</h1><p className="muted">เลือกบริการที่ตรงกับไลฟ์สไตล์ของคุณ</p><div className="catalog-controls"><div className="search-field"><Search size={18}/><input value={term} onChange={e=>setTerm(e.target.value)} placeholder="ค้นหาสินค้า..." aria-label="ค้นหาสินค้า"/></div><div className="category-pills">{categories.map(item=><button className={category===item?'pill active':'pill'} key={item} onClick={()=>setCategory(item)}>{item}</button>)}</div></div>{shown.length?<div className="product-grid">{shown.map(product=><ProductCard key={product.id} product={product}/>)}</div>:<div className="empty"><Search/><h3>ไม่พบสินค้า</h3><p>ลองเปลี่ยนคำค้นหาหรือหมวดหมู่</p></div>}</section>
}

function ProductDetail() {
  const { id } = useParams()
  const product = products.find(item=>item.id===id)
  if (!product) return <NotFound/>
  return <section className="section page-section"><div className="breadcrumbs"><Link to="/">หน้าหลัก</Link><ChevronRight size={15}/><Link to="/products">สินค้า</Link><ChevronRight size={15}/>{product.name}</div><div className="detail-layout"><div className={`detail-art ${product.gradient}`}><span className="detail-mark">{product.mark}</span></div><div className="detail-copy"><span className="eyebrow blue">{product.category}</span><h1>{product.name}</h1><p className="muted">{product.subtitle}</p><span className="available"><span className="status-dot"/> รายละเอียดแพ็กเกจตัวอย่าง</span><div className="detail-price"><span className="muted">ราคาเริ่มต้น (ตัวอย่าง)</span><strong>{thb(product.price)}</strong><span className="muted">/ {product.period}</span></div><div className="option-box"><strong>ระยะเวลาสมาชิก</strong><div className="option-choice"><Check size={17}/>{product.period}</div></div><div className="notice"><CircleHelp size={20}/><p>ขณะนี้เป็นหน้าแสดงตัวอย่าง ยังไม่สามารถสั่งซื้อหรือชำระเงินจริงได้ เมื่อเชื่อมระบบแล้วรายละเอียดและราคาจะโหลดจากร้านนั้นโดยตรง</p></div><button className="button button-primary button-wide" disabled>เปิดให้สั่งซื้อหลังเชื่อมระบบ <ShoppingCart size={18}/></button></div></div></section>
}

function Placeholder({ kind }: { kind: 'wallet' | 'orders' | 'admin' | 'rent' }) {
  const config = {
    wallet: {icon:Wallet,title:'กระเป๋าเงิน',body:'ระบบเติมเงินและตรวจสอบสลิปจะเปิดเมื่อเชื่อมฐานข้อมูลและผู้ให้บริการชำระเงินเรียบร้อยแล้ว',cta:'กลับไปดูสินค้า'},
    orders:{icon:Package,title:'ประวัติคำสั่งซื้อ',body:'คำสั่งซื้อจริงจะปรากฏที่นี่หลังจากลูกค้าเข้าสู่ระบบและสามารถซื้อสินค้าได้',cta:'กลับไปดูสินค้า'},
    admin:{icon:LayoutDashboard,title:'ศูนย์จัดการร้านค้า',body:'Admin และ Super Admin จะเปิดหลังจากมีระบบเข้าสู่ระบบ สิทธิ์พนักงาน และการแยกข้อมูลร้านที่ตรวจสอบได้',cta:'กลับสู่หน้าหลัก'},
    rent:{icon:Store,title:'สร้างร้านค้าในแบบของคุณ',body:'ระบบสมัครเช่าเว็บ สร้างร้าน และปรับแต่งหน้าร้านกำลังอยู่ในขั้นวางรากฐาน Multi-Tenant',cta:'กลับสู่หน้าหลัก'},
  }[kind]
  const Icon = config.icon
  return <section className="placeholder"><div className="placeholder-icon"><Icon size={32}/></div><span className="eyebrow blue">COMING NEXT</span><h1>{config.title}</h1><p>{config.body}</p><div className="notice"><Clock3 size={20}/><span>ยังไม่เปิดใช้งานจริง เพื่อป้องกันยอดเงินหรือข้อมูลคำสั่งซื้อที่ไม่ตรงกับระบบ</span></div><Link to={kind==='wallet'||kind==='orders'?'/products':'/'} className="button button-primary">{config.cta}<ArrowRight size={17}/></Link></section>
}
function Tenant() {
  const { slug } = useParams()
  return <><div className="tenant-banner"><Store size={18}/> ตัวอย่างหน้าร้านลูก: <strong>{slug}</strong> — ยังไม่ใช่ร้านที่สร้างจริง</div><Home/></>
}
function NotFound() {return <section className="placeholder"><h1>ไม่พบหน้านี้</h1><p>ตรวจสอบที่อยู่แล้วลองอีกครั้ง</p><Link className="button button-primary" to="/">กลับหน้าหลัก</Link></section>}
const nav=[{to:'/',label:'หน้าหลัก'},{to:'/products',label:'สินค้า'},{to:'/orders',label:'ประวัติ'},{to:'/wallet',label:'เติมเงิน'},{to:'/rent',label:'เช่าเว็บไซต์'}]

export default function App() {
  const [menu, setMenu] = useState(false)
  const { user, loading, signOut } = useAuth()
  return <div className="app-shell"><div className="announcement"><Sparkles size={14}/> MONTYSTOREE — เว็บตัวอย่างสำหรับพัฒนาระบบร้านค้าและเช่าเว็บไซต์</div><header className="site-header"><div className="header-inner"><Link to="/" className="brand" onClick={()=>setMenu(false)}><span className="brand-icon"><ShoppingBag size={24}/></span><span>MONTY<span>STOREE</span><small>PREMIUM DIGITAL STORE</small></span></Link><nav className={menu?'main-nav open':'main-nav'} aria-label="เมนูหลัก">{nav.map(item=><NavLink onClick={()=>setMenu(false)} key={item.to} to={item.to} end={item.to==='/'} className={({isActive})=>isActive?'nav-link selected':'nav-link'}>{item.label}</NavLink>)}</nav><div className="header-actions"><Link className="wallet-chip" to="/wallet"><Wallet size={18}/> Wallet</Link><Link className="icon-button" to="/orders" aria-label="ประวัติคำสั่งซื้อ"><ShoppingCart size={21}/></Link>{!loading && (user ? <div className="account-actions"><Link className="admin-button" to="/account">{user.email?.split("@")[0] || "บัญชี"}</Link><button className="logout-button" onClick={()=>void signOut().catch(console.error)}>ออกจากระบบ</button></div> : <Link className="admin-button" to="/login">เข้าสู่ระบบ</Link>)}<button className="menu-button" onClick={()=>setMenu(x=>!x)} aria-label={menu?'ปิดเมนู':'เปิดเมนู'} aria-expanded={menu}>{menu?<X/>:<Menu/>}</button></div></div></header><main><Routes><Route path="/" element={<Home/>}/><Route path="/products" element={<Products/>}/><Route path="/products/:id" element={<ProductDetail/>}/><Route path="/login" element={<AuthPage mode="login"/>}/><Route path="/register" element={<AuthPage mode="register"/>}/><Route path="/forgot-password" element={<AuthPage mode="forgot"/>}/><Route path="/reset-password" element={<AuthPage mode="reset"/>}/><Route path="/account" element={user?<section className="placeholder"><div className="placeholder-icon"><BadgeCheck/></div><h1>บัญชีของฉัน</h1><p>เข้าสู่ระบบแล้ว: {user.email}</p><Link className="button button-primary" to="/">กลับหน้าหลัก</Link></section>:<AuthPage mode="login"/>}/><Route path="/wallet" element={<Placeholder kind="wallet"/>}/><Route path="/orders" element={<Placeholder kind="orders"/>}/><Route path="/admin" element={<Placeholder kind="admin"/>}/><Route path="/rent" element={<Placeholder kind="rent"/>}/><Route path="/s/:slug" element={<Tenant/>}/><Route path="*" element={<NotFound/>}/></Routes></main><footer><div className="footer-content"><div><Link to="/" className="footer-brand">MONTYSTOREE<span> ✦</span></Link><p>โลกของบริการดิจิทัล เริ่มต้นที่นี่</p></div><div><strong>สำรวจ</strong><Link to="/products">สินค้าทั้งหมด</Link><Link to="/rent">เช่าเว็บไซต์</Link></div><div><strong>บัญชีของฉัน</strong><Link to="/wallet">กระเป๋าเงิน</Link><Link to="/orders">ประวัติคำสั่งซื้อ</Link></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} MONTYSTOREE</span><span>{DEMO}</span></div></footer></div>
}
