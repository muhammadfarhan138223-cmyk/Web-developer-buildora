# Naya builder aur model selection

1. ZIP ko naye folder mein extract karein; purane folder ki .buildora database ko delete na karein.
2. Node.js 24+ install honay ke baad START-BUILDORA.cmd chalayein. Port busy ho to purana Buildora terminal band karke dobara chalayein.
3. Settings mein provider choose karein aur apni API key paste karein. Models automatic load honge. Search/pricing filter se choose karke Save settings dabayein.
4. API key is tab mein rehti hai; refresh par dobara paste karni hogi. Model/theme preferences remembered hain. Free label provider ki reported token pricing hai; quota/access provider control karta hai.
5. Builder mein Start with React studio choose karein (pehle current work save/export kar lein). Is mein components, CSS animation, navigation aur appearance settings hain.
6. Apni website ka business, pages, colors aur features prompt mein likhein. AI changes review karke Apply karein; React/Node project ke liye Run use karein. Browser runtime unavailable ho to ZIP export karke locally npm install aur npm run dev karein.
7. Auth/database wali app ke liye required provider configuration alag karni hogi. Included React studio sirf front-end starter hai; Buildora ka apna account/project backend pehle se included hai.

# Buildora — setup aur handover

Original ZIP ka backup rakhein. Updated ZIP ka poora Buildora folder nayi directory mein extract karein aur VS Code mein open karein. Purani files ke saath mix karna zaroori nahi.

## 1. App chalayein

Node.js **24 ya newer** install karein. Project folder ke terminal mein:

```sh
npm install
npm run build
npm start
```

Browser mein http://127.0.0.1:3000 kholein. **Terminal khula rakhein**. Server band hone par browser backend tak nahi pohanch sakta aur fetch error aata hai. Sirf Live Server/static preview use karne se login aur AI endpoints nahi chalenge. Development ke liye `npm run dev` use karein; uska address aam tor par http://127.0.0.1:5173 hai.

Exact tested dependencies ke liye npm install ke bajaye pnpm 11 ka `pnpm install --frozen-lockfile` use kar sakte hain. Build command ke baad `npm test` checks chalata hai.

## 2. Real account banayein — koi key nahi chahiye

Create account kholein, email identifier aur kam se kam 10-character password dein. Screen par aane wala **recovery code** safe jagah save karein. Local backend email verification ya password-reset email nahi bhejta. Password bhoolne par recovery code se password reset hota hai, purane sessions revoke hote hain aur naya code milta hai.

Workspace mein Save se files aur conversation account mein save hote hain. Projects se open ya delete karein. Account settings se Sign out karein. Sign out current browser workspace reset karta hai; saved projects server par rehte hain.

Database `.buildora/buildora.sqlite` mein hai. Update karte waqt is folder ko preserve karein; server band karke iska private backup lein. ZIP delivery mein aapka data, test accounts ya secrets shamil nahi hain. Local accounts isi server ke hain, automatic cloud sync nahi.

## 3. Settings page se API key dalein

1. Website ke header mein **Settings** kholein.
2. Apni company/provider choose karein.
3. Us provider ki API key paste karein.
4. **Test & load models** dabayein.
5. Model ID choose karein aur **Back to building** kholein.

Key tab memory mein rehti hai; refresh ya logout ke baad dobara deni hogi. Apni key se guest generation allowed hai. Save/export ya GitHub publish ke waqt account banana hoga. Apni selected paid model ka kharcha provider account par aa sakta hai; server free-only setting apni BYOK selection par apply nahi hoti.

OpenAI-compatible custom providers ke liye server owner ko AI_ALLOWED_HOSTS mein exact trusted hostname approve karna hoga.

**Connections** page mein GitHub token, repo owner/name aur branch dal kar explicit commit kar sakte hain. Token ko sirf required repository ka Contents read/write access dein. Supabase starter apne project URL aur public publishable key se create hota hai; schema aur social providers dashboard mein enable karein. VS Code web link ya export/extract/Open Folder workflow available hai.

## Server-default free AI (optional)

`.env.example` ki copy `.env` banaein. Secrets sirf server ki `.env` mein rakhein, browser source ya GitHub mein nahi.

Option A: [OpenRouter](https://openrouter.ai/settings/keys) par apni key banayein aur yeh values set karein:

```dotenv
AUTH_PROVIDER=local
AI_FREE_ONLY=true
OPENROUTER_API_KEY=apni_asli_key_yahan
```

Placeholder ko apni key se replace karein. Sign in karke generation use karein. Default routing `openrouter/free` ya `:free` models tak limited hai; paid fallback blocked hai. Free provider ki availability aur quotas apply hoti hain; unlimited usage guarantee nahi. [Official free-model guide](https://openrouter.ai/docs/guides/routing/model-variants/free).

Option B: [Ollama](https://ollama.com) install karein, apne computer ki memory ke mutabiq coding model download karein, phir:

```dotenv
OLLAMA_MODEL=installed_model_ka_exact_name
OLLAMA_BASE_URL=http://127.0.0.1:11434
```

Is option mein provider key nahi chahiye, lekin model aapko install/run karna hai. Buildora model download nahi karta. Har environment change ke baad server restart karein. AI output pehle Review mein aata hai; Apply ke baad files badalti hain. Browser Stop provider-side cancellation ki guarantee nahi.

## 4. Preview

HTML/CSS/JS static preview edits ke saath update hota hai. Full-stack starter ke liye blank chat mein Try a full-stack starter aur phir Run project choose karein. Runtime package.json ka dev ya start script chalata hai. Changes ke baad Stop/Run karein.

Current Chrome/Edge, internet aur required isolation headers chahiye. Runtime 45 seconds mein connect na ho to actionable error dikhata hai. WebContainer boot is environment mein complete verify nahi hua. Starter ka real Node HTTP notes API separately test hua hai. Export karke project apne local Node environment mein bhi chala sakte hain. Notes starter ka data temporary preview disk mein hai; durable business data ke liye apna database chahiye.

WebContainer commercial usage ki vendor licensing [official page](https://webcontainers.io/enterprise) par check karein. Issued browser integration key ho to VITE_WEBCONTAINER_API_KEY set karein. Is delivery ko har external service ki free commercial license na samjhein. Python/Docker/remote Linux containers supported nahi hain.

## 5. Domain aur SEO

Landing page, header/footer, founder section aur structured data mein **Farhan Balouch** founder hain. Public pages build ke waqt HTML mein render hoti hain, isliye sirf client JavaScript par dependent nahi.

Abhi domain nahi hai, isliye fake canonical URL use nahi hua aur indexing disabled hai. Real domain milne par `.env` mein SITE_URL aur VITE_SITE_URL dono apne HTTPS origin par set karein, phir `npm run build`. Isse canonical, social URL, robots aur sitemap activate honge. Search ranking/indexing ki guarantee nahi.

## 6. Hosting aur optional Supabase

Default local backend ko persistent Node host aur persistent data disk chahiye. Public host par HTTPS, COOKIE_SECURE=true, HOST=0.0.0.0 aur host ka PORT configure karein. Database backup aur monitoring operator ki zimmedari hai. Static hosting par backend nahi chalega; Vercel local SQLite accounts ke liye suitable nahi.

Supabase choose karna ho to AUTH_PROVIDER=supabase, SUPABASE_URL aur SUPABASE_PUBLISHABLE_KEY set karein. Service-role/secret key kabhi public-key field mein na daalein. Supplied migrations date order mein apply karein aur authenticated role ko projects/conversations ke SELECT, INSERT, UPDATE, DELETE grants verify karein. Auth redirect allowlist mein apna site origin, /login aur /reset-password add karein. Local aur Supabase accounts separate hain; automatic migration nahi. Supabase mode live account ke saath test nahi hua.

## 7. Scope

Real local accounts, project storage, editor aur static preview implemented/tested hain. AI live response bina key/model verify nahi hua. Browser Node runtime external dependency hai. Billing, teams, remote containers, automatic generated-app deployment, GitHub sync aur full Bolt/Replit parity implemented nahi. Public multi-user launch se pehle load/security review aur shared rate limits zaroori hain. Current limits: 400 files, 3 MB workspace, 50 saved projects per local account.
