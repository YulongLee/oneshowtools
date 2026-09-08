const {app,BrowserWindow,session}=require('electron');
const isDev=process.env.NODE_ENV==='development';
function createWindow(){const win=new BrowserWindow({width:1440,height:900,minWidth:1024,minHeight:700,show:false,backgroundColor:'#f6f8fc',webPreferences:{contextIsolation:true,sandbox:true}});win.once('ready-to-show',()=>win.show());win.loadURL(isDev?'http://127.0.0.1:5173/':'https://oneshowtools.com/');}
app.whenReady().then(()=>{session.defaultSession.setPermissionRequestHandler((_w,_p,cb)=>cb(false));createWindow();app.on('activate',()=>{if(!BrowserWindow.getAllWindows().length)createWindow();});});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
