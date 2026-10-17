const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('petAPI', {
  getSettings:()=>ipcRenderer.invoke('settings:get'), saveSettings:v=>ipcRenderer.invoke('settings:save',v),
  summon:()=>ipcRenderer.invoke('pet:summon'), openChat:()=>ipcRenderer.invoke('pet:chat'), closePet:()=>ipcRenderer.invoke('pet:close'),
  movePet:(x,y)=>ipcRenderer.invoke('pet:position',x,y), pause:m=>ipcRenderer.invoke('pet:pause',m), resume:()=>ipcRenderer.invoke('pet:resume'), bringBack:()=>ipcRenderer.invoke('pet:bringback'), sendChat:t=>ipcRenderer.invoke('chat:send',t),
  on:(channel,cb)=>{const allowed=['pet:visit','pet:speak','pet:settings'];if(allowed.includes(channel))ipcRenderer.on(channel,(_e,data)=>cb(data));}
});
