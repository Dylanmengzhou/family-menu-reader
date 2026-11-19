'use strict';
const statusLine = document.getElementById('status');
const frame = document.getElementById('menu');
const cache = new Map();
let archiveKey;

async function readEncrypted(path) {
  const response = await fetch(new URL(path, document.baseURI), {referrerPolicy:'no-referrer'});
  if (!response.ok) throw Error('HTTP ' + response.status);
  const bytes = new Uint8Array(await response.arrayBuffer());
  return crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.slice(0,12)}, archiveKey, bytes.subarray(12));
}
window.familyPhoto = function familyPhoto(path,mime) {
  if (!cache.has(path)) {
    const pending = readEncrypted(path).then(bytes=>URL.createObjectURL(new Blob([bytes],{type:mime})));
    cache.set(path,pending);
    pending.catch(()=>cache.delete(path));
  }
  return cache.get(path);
};

async function start() {
  const code = new URLSearchParams(location.hash.slice(1)).get('k');
  if (!code) {statusLine.textContent='请打开家人发来的完整链接。';return}
  try {
    const raw = atob(code.replaceAll('-','+').replaceAll('_','/'));
    archiveKey = await crypto.subtle.importKey('raw',Uint8Array.from(raw,c=>c.charCodeAt(0)), 'AES-GCM',false,['decrypt']);
    const bytes = await readEncrypted('catalog.bin');
    const unpacked = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const html = await new Response(unpacked).text();
    frame.onload = () => {frame.hidden=false;statusLine.hidden=true};
    frame.src=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));
  } catch {
    statusLine.textContent='打开失败。请用 Safari 重试，并确认链接完整。';
  }
}
start();
