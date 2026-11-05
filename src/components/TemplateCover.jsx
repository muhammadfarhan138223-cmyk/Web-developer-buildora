import React from 'react';
import {Lock} from 'lucide-react';
export default function TemplateCover({item}){return <div className={'template-cover '+item.style} style={{'--cover-accent':item.color}}><div className="mini-nav"><strong>{item.name}</strong><span>Home　About　Contact</span></div><div className="mini-layout"><div><small>MADE TO BE YOURS</small><h3>{item.headline}</h3><span className="mini-button">Explore ↗</span></div><div className="mini-orb"/></div>{item.locked&&<div className="template-lock"><Lock size={24}/><span>In development</span></div>}</div>}
