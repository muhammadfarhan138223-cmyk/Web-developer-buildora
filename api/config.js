import { publicConfig } from '../server/config.js';
export default function handler(req,res) {res.setHeader('Cache-Control','no-store');return res.status(200).json({ok:true,...publicConfig()});}
