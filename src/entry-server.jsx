import React from 'react';
import { renderToString } from 'react-dom/server';
import {Routes,Route} from 'react-router-dom';
import { StaticRouter } from 'react-router-dom/server';
import Landing from './pages/Landing.jsx';
import Info from './pages/Info.jsx';
import ContentPage from './pages/ContentPage.jsx';
import Templates from './pages/Templates.jsx';
import Pricing from './pages/Pricing.jsx';
export function render(route) { return renderToString(<StaticRouter location={route}>{route === '/builder/work' ? <main style={{maxWidth:800,margin:'60px auto',padding:24,fontFamily:'system-ui'}}><a href='/'>Buildora</a><h1>Online code editor and live frontend preview</h1><p>Buildora is a browser workspace for editing HTML, CSS, JavaScript, React, Vue and TypeScript. Paste code, import source files or folders, and see your frontend preview.</p><h2>Your code, your workspace</h2><p>Use project files, mobile previews, ZIP import and export, and an optional AI conversation with your own provider key. Backend languages and unsupported frameworks require compiled browser output.</p><p>The interactive editor opens when JavaScript loads. Your saved projects and conversations are never included in this public page.</p><nav><a href='/builder/chat'>Chat with Buildora</a> · <a href='/guide'>Read the guide</a> · <a href='/templates'>Browse templates</a></nav><p>Created by <a href='https://farhanbalouch.com/'>Farhan Balouch</a>.</p></main> : route === '/' ? <Landing/> : route.startsWith('/templates')?<Routes><Route path='/templates' element={<Templates/>}/><Route path='/templates/:id' element={<Templates/>}/></Routes> : route==='/pricing'?<Pricing/> : ['/guide','/privacy'].includes(route)? <Info/> : <ContentPage/>}</StaticRouter>); }
