import { useState } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router-dom'
import { BadgeCheck, Menu, ShoppingBag, ShoppingCart, Sparkles, Wallet, X } from 'lucide-react'
import AuthPage from './auth/AuthPage'
import PlatformAdmin from './platform/PlatformAdmin'
import { useAuth } from './auth/AuthProvider'
import { TenantAdmin, TenantStorefront } from './tenant/TenantAdmin'
import { tenantSlugFromHostname } from './tenant/domains'
import { LiveHome, LiveOrders, LiveProductDetail, LiveProducts, LiveWallet } from './store/LiveStore'

function NotFound() {
  return <section className="placeholder"><h1>ไม่พบหน้านี้</h1><p>ตรวจสอบที่อยู่แล้วลองอีกครั้ง</p><Link className="button button-primary" to="/">กลับหน้าหลัก</Link></section>
}
const nav = [
  {to:'/',label:'หน้าหลัก'},
  {to:'/products',label:'สินค้า'},
  {to:'/orders',label:'ประวัติ'},
  {to:'/wallet',label:'กระเป๋าเงิน'},
  {to:'/admin',label:'จัดการร้าน'},
]

export default function App() {
  const [menu,setMenu] = useState(false)
  const {user,loading,signOut} = useAuth()
  const tenantSlug = tenantSlugFromHostname(window.location.hostname)
  // A tenant hostname renders only its scoped storefront, not the platform catalog.
  if (tenantSlug) return <div className="app-shell"><main><TenantStorefront overrideSlug={tenantSlug}/></main></div>
  return <div className="app-shell">
    <div className="announcement"><Sparkles size={14}/> OTPTHAI — เว็บไซต์สินค้าและระบบจัดการร้านค้า</div>
    <header className="site-header"><div className="header-inner">
      <Link to="/" className="brand" onClick={()=>setMenu(false)}><span className="brand-icon"><ShoppingBag size={24}/></span><span>MONTY<span>STOREE</span><small>OTPTHAI DIGITAL STORE</small></span></Link>
      <nav className={menu?'main-nav open':'main-nav'} aria-label="เมนูหลัก">{nav.map(item=><NavLink onClick={()=>setMenu(false)} key={item.to} to={item.to} end={item.to==='/'} className={({isActive})=>isActive?'nav-link selected':'nav-link'}>{item.label}</NavLink>)}</nav>
      <div className="header-actions"><Link className="wallet-chip" to="/wallet"><Wallet size={18}/> Wallet</Link><Link className="icon-button" to="/orders" aria-label="ประวัติคำสั่งซื้อ"><ShoppingCart size={21}/></Link>
        {!loading&&(user?<div className="account-actions"><Link className="admin-button" to="/account">{user.email?.split('@')[0]||'บัญชี'}</Link><button className="logout-button" onClick={()=>void signOut().catch(console.error)}>ออกจากระบบ</button></div>:<Link className="admin-button" to="/login">เข้าสู่ระบบ</Link>)}
        <button className="menu-button" onClick={()=>setMenu(x=>!x)} aria-label={menu?'ปิดเมนู':'เปิดเมนู'} aria-expanded={menu}>{menu?<X/>:<Menu/>}</button>
      </div>
    </div></header>
    <main><Routes>
      <Route path="/" element={<LiveHome/>}/>
      <Route path="/products" element={<LiveProducts/>}/>
      <Route path="/products/:id" element={<LiveProductDetail/>}/>
      <Route path="/login" element={<AuthPage mode="login"/>}/>
      <Route path="/register" element={<AuthPage mode="register"/>}/>
      <Route path="/forgot-password" element={<AuthPage mode="forgot"/>}/>
      <Route path="/reset-password" element={<AuthPage mode="reset"/>}/>
      <Route path="/account" element={user?<section className="placeholder"><div className="placeholder-icon"><BadgeCheck/></div><h1>บัญชีของฉัน</h1><p>เข้าสู่ระบบแล้ว: {user.email}</p><Link className="button button-primary" to="/admin">จัดการร้าน</Link></section>:<AuthPage mode="login"/>}/>
      <Route path="/wallet" element={<LiveWallet/>}/>
      <Route path="/orders" element={<LiveOrders/>}/>
      <Route path="/admin" element={<TenantAdmin/>}/>
      <Route path="/platform-admin" element={<PlatformAdmin/>}/>
      <Route path="/rent" element={<TenantAdmin/>}/>
      <Route path="/s/:slug" element={<TenantStorefront/>}/>
      <Route path="*" element={<NotFound/>}/>
    </Routes></main>
    <footer><div className="footer-content">
      <div><Link to="/" className="footer-brand">MONTYSTOREE<span> ✦</span></Link><p>OTPTHAI · ร้านค้าดิจิทัล</p></div>
      <div><strong>สำรวจ</strong><Link to="/products">สินค้าทั้งหมด</Link><Link to="/admin">จัดการร้าน</Link></div>
      <div><strong>บัญชีของฉัน</strong><Link to="/wallet">กระเป๋าเงิน</Link><Link to="/orders">ประวัติคำสั่งซื้อ</Link></div>
    </div><div className="footer-bottom"><span>© {new Date().getFullYear()} OTPTHAI</span><span>ราคาและรายการอ้างอิงข้อมูลจากฐานข้อมูลร้านค้า</span></div></footer>
  </div>
}
