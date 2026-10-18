const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('petAPI', {
  getSettings:()=>ipcRenderer.invoke('settings:get'), saveSettings:v=>ipcRenderer.invoke('settings:save',v),
  summon:()=>ipcRenderer.invoke('pet:summon'), moveSummon:(x,y)=>ipcRenderer.invoke('summon:position',x,y), saveSummon:()=>ipcRenderer.invoke('summon:save'), openChat:x=>ipcRenderer.invoke('pet:chat',x), closePet:()=>ipcRenderer.invoke('pet:close'),
  setIgnore:v=>ipcRenderer.send('pet:ignore',v), hidden:()=>ipcRenderer.invoke('pet:hidden'), pause:m=>ipcRenderer.invoke('pet:pause',m), resume:()=>ipcRenderer.invoke('pet:resume'), bringBack:()=>ipcRenderer.invoke('pet:bringback'), sendChat:t=>ipcRenderer.invoke('chat:send',t),
  on:(channel,cb)=>{const allowed=['pet:visit','pet:leave','pet:settings'];if(allowed.includes(channel))ipcRenderer.on(channel,(_e,data)=>cb(data));}
});
