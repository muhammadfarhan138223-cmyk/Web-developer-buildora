import React from 'react';
import { renderToString } from 'react-dom/server';
import {Routes,Route} from 'react-router-dom';
import { StaticRouter } from 'react-router-dom/server';
import Landing from './pages/Landing.jsx';
import Info from './pages/Info.jsx';
import ContentPage from './pages/ContentPage.jsx';
import Templates from './pages/Templates.jsx';
import Pricing from './pages/Pricing.jsx';
export function render(route) { return renderToString(<StaticRouter location={route}>{route === '/' ? <Landing/> : route.startsWith('/templates')?<Routes><Route path='/templates' element={<Templates/>}/><Route path='/templates/:id' element={<Templates/>}/></Routes> : route==='/pricing'?<Pricing/> : ['/guide','/privacy'].includes(route)? <Info/> : <ContentPage/>}</StaticRouter>); }
