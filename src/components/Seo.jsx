import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { metadata,publicRoutes } from '../lib/site-meta.js'
export default function Seo() {
  const {pathname}=useLocation()
  useEffect(()=>{
    const meta=metadata[pathname] || (pathname.startsWith('/templates/')?metadata['/templates']:metadata['/']);document.title=meta.title
    const set=(selector,attribute,value)=>{let element=document.head.querySelector(selector);if(element)element.setAttribute(attribute,value)}
    set('meta[name="description"]','content',meta.description);set('meta[property="og:title"]','content',meta.title);set('meta[property="og:description"]','content',meta.description);set('meta[name="twitter:title"]','content',meta.title);set('meta[name="twitter:description"]','content',meta.description)
    const site=import.meta.env.VITE_SITE_URL?.replace(/\/$/,'')
    set('meta[name="robots"]','content',site && publicRoutes.includes(pathname)?'index, follow':'noindex, nofollow')
    if(site){let link=document.querySelector('link[rel="canonical"]');if(!link){link=document.createElement('link');link.rel='canonical';document.head.append(link)}link.href=site+pathname;set('meta[property="og:url"]','content',site+pathname)}
    window.scrollTo(0,0)
  },[pathname])
  return null
}
