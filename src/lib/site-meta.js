import {templateCatalog} from './templateCatalog.js';
export const metadata = {
  '/': { title:'Buildora — AI Website Builder | Founded by Farhan Balouch', description:'Turn ideas into editable websites with Buildora. Explore an AI-assisted workspace, code editor and live preview. Founded by Farhan Balouch.' },
  '/guide': { title:'Getting started with Buildora | Setup & Help', description:'Start Buildora, create an account, save projects and connect free AI models or local Ollama. A practical setup guide.' },
  '/privacy': { title:'How Buildora handles your data', description:'Understand where Buildora stores account information, project files and prompts, and when data is sent to AI providers.' },
  '/login': { title:'Sign in to Buildora', description:'Sign in to your Buildora workspace.' },
  '/signup': { title:'Create your Buildora account', description:'Create an account to save your Buildora projects.' },
  '/recover': { title:'Recover your Buildora account', description:'Recover access to your Buildora account.' },
  '/reset-password': { title:'Update your Buildora password', description:'Set a new password for your Buildora account.' },
  '/builder': { title:'Workspace | Buildora', description:'Your Buildora coding workspace.' }
}
export function structuredData(siteUrl = '') {
  const root=siteUrl.replace(/\/$/,'')
  return {'@context':'https://schema.org','@graph':[
    {'@type':'Person','@id':'https://farhanbalouch.com/#person',name:'Farhan Balouch',url:'https://farhanbalouch.com/',sameAs:['https://farhanbalouch.com/'],jobTitle:'Founder and creator of Buildora'},
    {'@type':'Organization','@id':root+'/#organization',name:'Buildora',...(root?{url:root}:{}),founder:{'@id':'https://farhanbalouch.com/#person'}},
    {'@type':'WebSite',name:'Buildora',...(root?{url:root}:{}),publisher:{'@id':root+'/#organization'}},
    {'@type':'SoftwareApplication',name:'Buildora',applicationCategory:'DeveloperApplication',operatingSystem:'Web browser',description:metadata['/'].description,creator:{'@id':'https://farhanbalouch.com/#person'}}
  ]}
}
Object.assign(metadata,{
 '/templates':{title:'Website templates | Buildora AI Coding Studio',description:'Browse free editable website templates for portfolios, businesses, cafes and more. Preview source and make it yours in Buildora.'},
 '/projects':{title:'Your projects | Buildora',description:'Manage your private Buildora projects.'},
 '/features':{title:'Features | Buildora',description:'Explore guest building, your own AI models, source editing and project integrations.'},
 '/about':{title:'About Buildora | Founder Farhan Balouch',description:'Meet the idea behind Buildora, founded by Farhan Balouch.'},
 '/pricing':{title:'Pricing & external services | Buildora',description:'Understand what is included and how AI, hosting and runtime costs work.'},
 '/terms':{title:'Terms of use | Buildora',description:'Terms for using Buildora and third-party integrations.'},
 '/cookies':{title:'Cookie & storage policy | Buildora',description:'How essential sessions, workspace storage and preferences work.'},
 '/acceptable-use':{title:'Acceptable use | Buildora',description:'Guidelines for responsible use of Buildora.'},
 '/security':{title:'Security & trust | Buildora',description:'Account protection, API key handling and deployment responsibilities.'},
 '/contact':{title:'Help & contact | Buildora',description:'Find setup help and the Buildora project issue tracker.'},
 '/brand':{title:'Buildora brand kit | Logos & themes',description:'Download Buildora SVG marks, wordmarks and stacked logo variants.'},
 '/settings':{title:'Settings | Buildora',description:'Choose your AI provider, model and website theme.'},
 '/connections':{title:'Connections | Buildora',description:'Connect your project with GitHub, Supabase and VS Code.'}
});
for(const item of templateCatalog)metadata['/templates/'+item.id]={title:`${item.name} template | Buildora`,description:item.description};
metadata['/builder/work']={title:'Online Code Editor & Live Frontend Preview | Buildora',description:'Edit HTML, CSS, JavaScript, React, Vue and TypeScript in Buildora. Import source files, preview your frontend and export your work. Created by Farhan Balouch.'};
export const publicRoutes=Object.keys(metadata).filter(route=>!['/login','/signup','/recover','/reset-password','/builder','/settings','/connections','/projects'].includes(route));
