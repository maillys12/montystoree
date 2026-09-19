import { useState, type FormEvent } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, KeyRound, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthProvider'

type Mode = 'login' | 'register' | 'forgot' | 'reset'
const titles: Record<Mode, string> = {
  login: 'เข้าสู่ระบบ',
  register: 'สร้างบัญชีใหม่',
  forgot: 'ลืมรหัสผ่าน',
  reset: 'ตั้งรหัสผ่านใหม่',
}

export default function AuthPage({ mode }: { mode: Mode }) {
  const { user, loading } = useAuth()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const returnTo = params.get('next')?.startsWith('/') && !params.get('next')?.startsWith('//') ? params.get('next')! : '/'
  if (!loading && user && mode !== 'reset') return <Navigate to={returnTo} replace />

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    setError('')
    setMessage('')
    if ((mode === 'register' || mode === 'reset') && password.length < 8) {
      setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
      return
    }
    if ((mode === 'register' || mode === 'reset') && password !== confirm) {
      setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน')
      return
    }
    setPending(true)
    try {
      if (mode === 'login') {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (authError) throw authError
      } else if (mode === 'register') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { emailRedirectTo: window.location.origin + '/login' },
        })
        if (authError) throw authError
        setMessage(data.session ? 'สมัครสมาชิกสำเร็จ' : 'กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี แล้วกลับมาเข้าสู่ระบบ')
      } else if (mode === 'forgot') {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin + '/reset-password',
        })
        if (authError) throw authError
        setMessage('หากอีเมลนี้มีบัญชีอยู่ ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปให้')
      } else {
        const { error: authError } = await supabase.auth.updateUser({ password })
        if (authError) throw authError
        setMessage('ตั้งรหัสผ่านสำเร็จ สามารถกลับไปเข้าสู่ระบบได้แล้ว')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง')
    } finally {
      setPending(false)
    }
  }
  return <section className="auth-wrap"><div className="auth-panel">
    <Link to="/" className="auth-back"><ArrowLeft size={16}/> กลับหน้าหลัก</Link>
    <div className="auth-emblem">{mode==='forgot'||mode==='reset'?<KeyRound size={27}/>:<UserRound size={27}/>}</div>
    <span className="eyebrow blue">MONTYSTOREE ACCOUNT</span>
    <h1>{titles[mode]}</h1>
    <p className="muted">{mode==='login'?'ยินดีต้อนรับกลับมา เข้าสู่ระบบเพื่อจัดการบัญชีของคุณ':mode==='register'?'สมัครสมาชิกเพื่อเริ่มใช้งานร้านค้าดิจิทัล':mode==='forgot'?'กรอกอีเมลเพื่อรับลิงก์ตั้งรหัสผ่านใหม่':'กำหนดรหัสผ่านใหม่สำหรับบัญชีของคุณ'}</p>
    <form onSubmit={submit} className="auth-form">
      {mode !== 'reset' && <label>อีเมล<div className="auth-input"><Mail size={18}/><input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com"/></div></label>}
      {mode !== 'forgot' && <label>{mode==='reset'?'รหัสผ่านใหม่':'รหัสผ่าน'}<div className="auth-input"><LockKeyhole size={18}/><input type="password" autoComplete={mode==='login'?'current-password':'new-password'} required minLength={mode==='login'?1:8} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/></div></label>}
      {(mode === 'register' || mode === 'reset') && <label>ยืนยันรหัสผ่าน<div className="auth-input"><LockKeyhole size={18}/><input type="password" autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="••••••••"/></div></label>}
      {error && <p role="alert" className="auth-error">{error}</p>}
      {message && <p role="status" className="auth-success"><CheckCircle2 size={17}/>{message}</p>}
      <button disabled={pending} className="button button-primary button-wide" type="submit">{pending?'กำลังดำเนินการ...':titles[mode]}</button>
    </form>
    <div className="auth-links">{mode==='login'?<><Link to="/forgot-password">ลืมรหัสผ่าน?</Link><p>ยังไม่มีบัญชี? <Link to="/register">สมัครสมาชิก</Link></p></>:<p><Link to="/login">กลับไปเข้าสู่ระบบ</Link></p>}</div>
  </div></section>
}
