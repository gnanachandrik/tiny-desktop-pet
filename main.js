const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage, safeStorage, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const ROOT = __dirname;
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
const isPrimaryInstance = app.requestSingleInstanceLock();
if (!isPrimaryInstance) app.quit();
const STORE = path.join(app.getPath('userData'), 'desktop-pet.json');
const DEFAULTS = {
  enabled: true, visitMinutes: 5, customVisitMinutes: 5, waterMinutes: 45, checkins: true,
  sound: false, animationSpeed: 1, petSize: 'medium', aiEnabled: false, launchAtLogin: false,
  alwaysOnTop: true, quietHoursEnabled: false, quietStart: '22:00', quietEnd: '08:00',
  pausedUntil: 0, lastVisit: 0, lastWater: 0, summonPosition: null
};
let settings = { ...DEFAULTS }, petWin, summonWin, settingsWin, chatWin, tray, visitTimer, waterTimer;
let secret = '';
function readSettings() {
  try { const raw = JSON.parse(fs.readFileSync(STORE, 'utf8')); settings = { ...DEFAULTS, ...raw }; if (raw.apiKeyEnc && safeStorage.isEncryptionAvailable()) secret = safeStorage.decryptString(Buffer.from(raw.apiKeyEnc, 'base64')); }
  catch { settings = { ...DEFAULTS }; }
  if (!settings.lastWater) settings.lastWater = Date.now();
}
function saveSettings() {
  const out = { ...settings }; delete out.apiKeyEnc;
  if (secret && safeStorage.isEncryptionAvailable()) out.apiKeyEnc = safeStorage.encryptString(secret).toString('base64');
  fs.mkdirSync(path.dirname(STORE), { recursive: true }); fs.writeFileSync(STORE, JSON.stringify(out, null, 2));
}
function bounds() { return screen.getPrimaryDisplay().workArea; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function petDims() { const scale = { small: .72, medium: 1, large: 1.28 }[settings.petSize] || 1; return { width: Math.round(300*scale), height: Math.round(330*scale) }; }
function createPet() {
  const a = bounds(), d = petDims();
  petWin = new BrowserWindow({ width:d.width, height:d.height, x:Math.round(a.x+a.width-d.width-55), y:Math.round(a.y+a.height-d.height+10), transparent:true, frame:false, resizable:false, movable:false, show:false, alwaysOnTop:settings.alwaysOnTop, skipTaskbar:true, hasShadow:false, webPreferences:{ preload:path.join(ROOT,'preload.js'), contextIsolation:true, nodeIntegration:false, sandbox:true } });
  petWin.setAlwaysOnTop(settings.alwaysOnTop, 'screen-saver'); petWin.loadFile(path.join(ROOT,'renderer/pet.html'));
  petWin.on('closed',()=>petWin=null);
}
function createSummon() {
  const a=bounds(), p=settings.summonPosition || {x:a.x+a.width-48,y:a.y+a.height*.55};
  summonWin = new BrowserWindow({width:48,height:48,x:clamp(p.x,a.x,a.x+a.width-48),y:clamp(p.y,a.y,a.y+a.height-48),transparent:true,frame:false,resizable:false,movable:true,alwaysOnTop:true,skipTaskbar:true,hasShadow:false,webPreferences:{preload:path.join(ROOT,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  summonWin.setAlwaysOnTop(true,'screen-saver'); summonWin.loadFile(path.join(ROOT,'renderer/summon.html'));
  summonWin.on('moved',()=>{ if(!summonWin)return; const [x,y]=summonWin.getPosition(); settings.summonPosition={x,y}; saveSettings(); });
  summonWin.on('closed',()=>summonWin=null);
}
function showPet(manual=true) {
  if (!petWin) createPet(); const a=bounds(), d=petDims();
  petWin.setSize(d.width,d.height); petWin.setAlwaysOnTop(settings.alwaysOnTop,'screen-saver');
  const [sx,sy]=petWin.getPosition(); const y=clamp(a.y+a.height-d.height+8,a.y,a.y+a.height-d.height);
  petWin.setPosition(clamp(sx,a.x,a.x+a.width-d.width),y); petWin.showInactive();
  petWin.webContents.send('pet:visit',{manual}); petWin.webContents.send('pet:settings',publicSettings());
  if (manual) petWin.webContents.send('pet:speak', { text: randomGreeting() });
}
function publicSettings(){const s={...settings,apiKeySet:!!secret}; delete s.apiKeyEnc; return s;}
function randomGreeting(){const arr=['Hi, how are you doing?','Hi, checking in.','Hi, need a break?','Hi, want some water?','Hi, quick stretch?','Hi, water check.','Hi, still doing okay?']; return arr[Math.floor(Math.random()*arr.length)];}
function inQuietHours(){ if(Date.now()<settings.pausedUntil)return true; if(!settings.quietHoursEnabled)return false; const now=new Date(), cur=now.getHours()*60+now.getMinutes(), parse=s=>{const [h,m]=s.split(':').map(Number);return h*60+m;}, start=parse(settings.quietStart), end=parse(settings.quietEnd); return start<=end ? cur>=start&&cur<end : cur>=start||cur<end; }
function schedule(){clearInterval(visitTimer);clearInterval(waterTimer); visitTimer=setInterval(()=>{if(settings.enabled&&settings.checkins&&!inQuietHours()&&petWin&&!petWin.isVisible())showPet(false);},Math.max(1,settings.visitMinutes)*60000); waterTimer=setInterval(()=>{if(settings.enabled&&!inQuietHours()&&settings.waterMinutes>0&&Date.now()-settings.lastWater>=settings.waterMinutes*60000){settings.lastWater=Date.now();saveSettings(); if(petWin){showPet(false);petWin.webContents.send('pet:speak',{text:'A little water break?'});}}},60000); }
function openSettings(){if(settingsWin){settingsWin.focus();return;}settingsWin=new BrowserWindow({width:520,height:720,title:'Pet Settings',autoHideMenuBar:true,resizable:true,webPreferences:{preload:path.join(ROOT,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});settingsWin.loadFile(path.join(ROOT,'renderer/settings.html'));settingsWin.on('closed',()=>settingsWin=null);}
function openChat(){if(chatWin){chatWin.focus();return;}const a=bounds();let x=a.x+a.width-390,y=a.y+a.height-500;if(petWin){const [px,py]=petWin.getPosition();x=clamp(px-100,a.x,a.x+a.width-360);y=clamp(py-300,a.y,a.y+a.height-460);}chatWin=new BrowserWindow({width:360,height:440,x,y,frame:false,transparent:false,resizable:false,alwaysOnTop:settings.alwaysOnTop,skipTaskbar:true,webPreferences:{preload:path.join(ROOT,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});chatWin.loadFile(path.join(ROOT,'renderer/chat.html'));chatWin.on('closed',()=>chatWin=null);}
function buildTray(){const img=nativeImage.createFromPath(path.join(ROOT,'assets','tray.png'));tray=new Tray(img.isEmpty()?nativeImage.createEmpty():img);tray.setToolTip('Tiny Desktop Pet');tray.setContextMenu(Menu.buildFromTemplate([{label:'Summon Pet',click:()=>showPet(true)},{label:'Chat',click:()=>openChat()},{label:'Settings',click:openSettings},{type:'separator'},{label:'Pause Pet',submenu:[{label:'Pause for 30 minutes',click:()=>pause(30)},{label:'Pause for 1 hour',click:()=>pause(60)},{label:'Pause until tomorrow',click:pauseUntilTomorrow},{label:'Resume',click:()=>{settings.pausedUntil=0;saveSettings();schedule();}}]},{type:'separator'},{label:'Quit',click:()=>app.quit()}]));tray.on('click',()=>showPet(true));}
function pause(minutes){settings.pausedUntil=Date.now()+minutes*60000;saveSettings();schedule();}
function pauseUntilTomorrow(){const d=new Date();d.setDate(d.getDate()+1);d.setHours(0,0,0,0);settings.pausedUntil=d.getTime();saveSettings();schedule();}
if (isPrimaryInstance) {
  app.on('second-instance', () => showPet(true));
  app.whenReady().then(()=>{readSettings();app.setLoginItemSettings({openAtLogin:!!settings.launchAtLogin});createPet();createSummon();buildTray();schedule();showPet(true);});
}
app.on('activate',()=>showPet(true)); app.on('window-all-closed',e=>e.preventDefault()); app.on('before-quit',()=>{clearInterval(visitTimer);clearInterval(waterTimer);});
ipcMain.handle('settings:get',()=>({...publicSettings(),personality:fs.readFileSync(path.join(ROOT,'config','personality.txt'),'utf8')}));
ipcMain.handle('settings:save',(_e,patch)=>{const allowed=['enabled','visitMinutes','customVisitMinutes','waterMinutes','checkins','sound','animationSpeed','petSize','aiEnabled','launchAtLogin','alwaysOnTop','quietHoursEnabled','quietStart','quietEnd'];for(const k of allowed)if(k in patch)settings[k]=patch[k];if('apiKey' in patch)secret=String(patch.apiKey||'').trim();saveSettings();app.setLoginItemSettings({openAtLogin:!!settings.launchAtLogin});if(petWin)petWin.setAlwaysOnTop(settings.alwaysOnTop,'screen-saver');schedule();if(!settings.enabled&&petWin)petWin.hide();return publicSettings();});
ipcMain.handle('pet:summon',()=>{showPet(true);return true;});ipcMain.handle('pet:chat',()=>{openChat();return true;});ipcMain.handle('pet:close',()=>{if(petWin)petWin.hide();return true;});ipcMain.handle('pet:position',(_e,x,y)=>{if(!petWin)return;const a=bounds(),d=petDims();petWin.setPosition(clamp(Math.round(x),a.x,a.x+a.width-d.width),clamp(Math.round(y),a.y,a.y+a.height-d.height));});
ipcMain.handle('pet:pause',(_e,mins)=>{if(mins==='tomorrow')pauseUntilTomorrow();else pause(mins);return true;});ipcMain.handle('pet:resume',()=>{settings.pausedUntil=0;saveSettings();schedule();return true;});ipcMain.handle('pet:bringback',()=>{if(petWin){petWin.setPosition(bounds().x+bounds().width-petWin.getSize()[0]-50,bounds().y+bounds().height-petWin.getSize()[1]+8);showPet(true);}else createPet();if(summonWin){const a=bounds();summonWin.setPosition(a.x+a.width-48,a.y+a.height*.55);}else createSummon();return true;});
ipcMain.handle('chat:send',async(_e,message)=>{const text=String(message||'').trim().slice(0,2000);if(!text)return '';if(settings.aiEnabled&&secret){try{const personality=fs.readFileSync(path.join(ROOT,'config','personality.txt'),'utf8');const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${secret}`},body:JSON.stringify({model:'gpt-4o-mini',messages:[{role:'system',content:personality},{role:'user',content:text}],max_tokens:120,temperature:.7})});if(!r.ok)throw new Error('API request failed');const data=await r.json();return data.choices?.[0]?.message?.content?.trim()||basicReply(text);}catch{return 'I couldn’t reach the AI just now, but I’m still here. Try me again in a moment.';}}return basicReply(text);});
function basicReply(raw){const s=raw.toLowerCase();if(/^(hi|hey|hello|hiya)\b/.test(s))return 'Hi there! I’m happy to keep you company. How’s your day going?';if(s.includes('nice to meet'))return 'Nice to meet you too! I’ll be your tiny desktop buddy.';if(s.includes('how are you'))return 'I’m doing well, thanks for asking! How are you holding up?';if(/tired|sleepy|exhausted/.test(s))return 'Sounds like you could use a little pause. Maybe stand up, stretch, or rest your eyes for a minute?';if(/water|thirst/.test(s))return 'Water check! Take a few sips if you can. 💧';if(/stress|stressed|anxious|overwhelm/.test(s))return 'That sounds like a lot. Try one slow breath, then pick just the next small step.';if(/break|stretch/.test(s))return 'A tiny break might help. Roll your shoulders and give your eyes a rest?';if(/thank/.test(s))return 'Anytime! That’s what little companions are for.';if(/sad|down|upset/.test(s))return 'I’m sorry it’s a rough moment. I can sit here with you while you take it one step at a time.';return 'I’m listening. Want to tell me a little more?';}
