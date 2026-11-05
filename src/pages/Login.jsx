import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowUpRight, ArrowLeft, Eye, EyeOff, Lock, Loader2 } from 'lucide-react'
import { Brand,SiteHeader,SiteFooter } from '../components/SiteLayout.jsx'
import { signIn, signUp, recoverAccount, updatePassword, signInWithProvider } from '../lib/auth.js'
import { useStore } from '../store.js'
import {usePreferences} from '../lib/preferences.js'
import { getBackendConfig } from '../lib/backend.js'
export default function Login() {
  const prefs=usePreferences(),theme=prefs.theme;
  const location=useLocation(),navigate=useNavigate(),mode=location.pathname.slice(1),signup=mode==='signup',recover=mode==='recover',reset=mode==='reset-password'
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[code,setCode]=useState(''),[visible,setVisible]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState(''),[recovery,setRecovery]=useState('')
  const nextParam=new URLSearchParams(location.search).get('next'),next=['/builder','/connections','/settings','/projects'].includes(nextParam)?nextParam:'/builder';
  const authLoading=useStore(s=>s.authLoading),backendError=useStore(s=>s.backendError),local=getBackendConfig()?.authProvider==='local'
  async function submit(e) {
    e.preventDefault();setBusy(true);setError('');setSuccess('')
    try {
      const result=reset?await updatePassword(password):recover?await recoverAccount(email,code,password):signup?await signUp(email,password):await signIn(email,password)
      if(result.error)throw result.error
      if(result.data?.recoveryCode){setRecovery(result.data.recoveryCode);return}
      if(recover){setSuccess('If this account exists, check your email for a reset link.');return}
      if(signup && !result.data?.session){setSuccess('Check your email to confirm your account, then sign in.');return}
      navigate(next,{replace:true})
    }catch(e){setError(e.message || 'Unable to sign in. Please try again.')}finally{setBusy(false)}
  }
  return <div data-site-theme={theme} data-appearance={prefs.appearance} className="marketing auth-shell"><SiteHeader/><div className="auth-page"><div className="auth-story"><Brand/><div><div className="section-kicker">YOUR NEXT CHAPTER STARTS HERE</div><h1>A little curiosity.<br/><em>A lot of possibility.</em></h1><p>A home for your ideas, your files<br/>and whatever you make next.</p><div className="auth-art"><span>create<span>↗</span></span><div className="auth-art-ring"/></div></div><small>Buildora · Founded by Farhan Balouch</small></div><main className="auth-main" id="main"><Link to="/" className="auth-back"><ArrowLeft size={15}/>Back to Buildora</Link><div className="auth-form-wrap"><span className="auth-icon"><Lock size={20}/></span><h2>{recovery?'Keep this somewhere safe.':signup?'Make room for your ideas.':recover?'Let’s get you back in.':reset?'A fresh start.':'Welcome back.'}</h2><p>{recovery?'This recovery code is shown once. You will need it if you forget your password.':signup?'Create an account. Start making something yours.':recover?(local?'Use the recovery code saved when you created your account.':'We’ll send a password reset link to your email.'):reset?'Choose a strong new password.':'Your next idea is right where you left it.'}</p>
    {backendError&&<div role="alert" className="auth-error">{backendError}<button onClick={()=>window.location.reload()}>Reconnect</button></div>}
    {recovery?<div className="recovery-panel"><code>{recovery}</code><p>{recover?'Your old code and previous sessions have been revoked. Save this new code.':'Account created. Your password is hashed and your session uses an HttpOnly cookie.'}</p><Link className="site-button" to={recover?'/login':next}>{recover?'Sign in':'Open workspace'}<ArrowUpRight size={16}/></Link></div>:<form onSubmit={submit}>
      {!reset&&<label htmlFor="email">Email address<input id="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>}
      {recover&&local&&<label htmlFor="recovery">Recovery code<input id="recovery" autoComplete="off" required value={code} maxLength={64} onChange={e=>setCode(e.target.value)}/></label>}
      {(!recover||local)&&<label htmlFor="password">{recover||reset?'New password':'Password'}<div className="password-input"><input id="password" type={visible?'text':'password'} autoComplete={signup||recover||reset?'new-password':'current-password'} minLength={signup||recover||reset?10:1} maxLength={128} required value={password} onChange={e=>setPassword(e.target.value)} placeholder={signup?'At least 10 characters':'Your password'}/><button type="button" aria-label={visible?'Hide password':'Show password'} onClick={()=>setVisible(v=>!v)}>{visible?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>}
      {!signup&&!recover&&!reset&&<Link className="forgot-link" to="/recover">Forgot your password?</Link>}
      {error&&<div className="auth-error" role="alert">{error}</div>}{success&&<div className="auth-success" role="status">{success}</div>}
      <button className="site-button" disabled={busy||authLoading||!!backendError}>{busy?<Loader2 className="spin" size={17}/>:<>{signup?'Create account':recover?'Recover account':reset?'Update password':'Sign in'}<ArrowUpRight size={17}/></>}</button>
    </form>}
    {!recovery&&!recover&&!reset&&<div className="social-login">{["google","github","facebook"].map(provider=><button key={provider} type="button" onClick={async()=>{if(local){setError("Social sign-in needs the site owner to connect Supabase and enable this provider. Email/password works now.");return}try{const result=await signInWithProvider(provider);if(result.error)setError(result.error.message)}catch(e){setError(e.message||'Unable to connect to this login provider.')}}}>Continue with {provider[0].toUpperCase()+provider.slice(1)}</button>)}{local&&<small>Social providers await site-owner setup.</small>}</div>}
    {!recovery&&<><p className="auth-switch">{signup?'Already have an account?':'New to Buildora?'} <Link to={(signup?'/login':'/signup')+'?next='+encodeURIComponent(next)}>{signup?'Sign in':'Create an account'}</Link></p><div className="auth-divider"><span>OR KEEP EXPLORING</span></div><Link className="guest-link" to="/builder">Try the editor without signing in<ArrowUpRight size={15}/></Link></>}
    <p className="auth-storage-note">{local?'Accounts and projects are stored on this Buildora server. Email is an account identifier; local mode does not send verification emails.':'Use your Nexus AI email and password here. Both sites share one Supabase account; your Buildora projects stay separate.'} <Link to="/privacy">How your data is handled</Link></p></div><div className="auth-bottom"><span>Make something worth opening.</span><Link to="/guide">Need a hand? ↗</Link></div></main></div><SiteFooter/></div>
}
