"use strict";(()=>{function k(){let s=localStorage.getItem("mims_user_id");if(s)return s;let a="u_"+Math.random().toString(36).substring(2,15)+Math.random().toString(36).substring(2,15);return localStorage.setItem("mims_user_id",a),a}var T=function(){let s={serverUrl:"",userId:"",platform:"web",country:""},a=new Map,l=new Map,c=new Map,g=new Map;function p(e){s={...s,...e,userId:e.userId||k()},s.country||w()}function w(){let e=Intl.DateTimeFormat().resolvedOptions().timeZone,t={"Asia/Singapore":"sg","Asia/Kuala_Lumpur":"my","Asia/Manila":"ph","Asia/Jakarta":"id","Asia/Bangkok":"th","Asia/Ho_Chi_Minh":"vn"};s.country=t[e]||"unknown"}function v(e,t){a.set(e,{...t,elementId:t.elementId||e})}function y(e,t){l.set(e,t)}function M(){l.clear()}async function u(){if(!s.serverUrl){console.error("MIMSAds: Server URL not configured. Call MIMSAds.init() first.");return}if(a.size===0){console.warn("MIMSAds: No slots defined. Call MIMSAds.defineSlot() first.");return}try{let e=Array.from(a.entries()).map(([i,n])=>{if(!n.width&&!n.height){let h=document.getElementById(n.elementId||i),C=h?h.offsetWidth:window.innerWidth;return{id:i,width:0,height:0,max_width:C,ad_unit:n.adUnit||""}}return{id:i,width:n.width||0,height:n.height||0,ad_unit:n.adUnit||""}}),t={};l.forEach((i,n)=>{t[n]=i});let r=await fetch(`${s.serverUrl}/v1/ads`,{method:"POST",headers:{"Content-Type":"application/json","X-User-ID":s.userId||""},body:JSON.stringify({slots:e,targeting:t,user_id:s.userId,platform:s.platform,country:s.country})});if(!r.ok)throw new Error(`HTTP ${r.status}`);let o=await r.json();if(o.ads&&Array.isArray(o.ads))for(let i of o.ads)I(i)}catch(e){console.error("MIMSAds: Failed to fetch ads",e)}}function I(e){let t=a.get(e.slot_id);if(!t)return;let r=document.getElementById(t.elementId||e.slot_id);if(!r){console.warn(`MIMSAds: Container element not found for slot ${e.slot_id}`);return}c.set(e.slot_id,e);let o=!t.width&&!t.height,i=document.createElement("div");i.id=`mims-ad-${e.slot_id}`,o?i.style.cssText=`
        max-width: 100%;
        position: relative;
        overflow: hidden;
      `:i.style.cssText=`
        width: ${e.width}px;
        height: ${e.height}px;
        position: relative;
        overflow: hidden;
      `;let n=document.createElement("a");n.href=e.tracking.click,n.target="_blank",n.rel="noopener noreferrer",n.style.display="block";let d=document.createElement("img");d.src=e.image_url,d.alt="Advertisement",o?d.style.cssText=`
        max-width: 100%;
        height: auto;
        display: block;
        border: none;
      `:d.style.cssText=`
        width: ${e.width}px;
        height: ${e.height}px;
        display: block;
        border: none;
      `,n.appendChild(d),i.appendChild(n),r.innerHTML="",r.appendChild(i),f(e.tracking.impression),b(e,i)}function f(e){let t=new Image(1,1);t.src=e}function b(e,t){let r=null,o=!1,i=new IntersectionObserver(n=>{for(let d of n)d.intersectionRatio>=.5?!r&&!o&&(r=window.setTimeout(()=>{o||(o=!0,f(e.tracking.viewable))},1e3)):r&&(clearTimeout(r),r=null)},{threshold:[0,.5,1]});i.observe(t),g.set(e.slot_id,i)}function m(){g.forEach(e=>{e.disconnect()}),g.clear(),c.forEach((e,t)=>{let r=a.get(t);if(r){let o=document.getElementById(r.elementId||t);o&&(o.innerHTML="")}}),c.clear()}async function _(){m(),await u()}function A(){return{...s}}function S(){return s.userId||""}return{init:p,defineSlot:v,setTargeting:y,clearTargeting:M,display:u,refresh:_,destroyAll:m,getConfig:A,getUserId:S}}();window.MIMSAds=T;})();
