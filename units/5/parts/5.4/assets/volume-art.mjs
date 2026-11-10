import {gasVolume,thermometer} from './thermal-model.mjs';
const asset=name=>new URL(name,import.meta.url).href;

// Replace the photographed fixed meniscus with a continuous open capillary.
// Its displacement is deliberately magnified, while the flask remains full.
export function liquidVolumeArt(temp,bathTemp=temp,gradientId="volume-tube-glass"){
 const reference=260,change=thermometer(temp).height/thermometer(60).height*115,level=reference-change;
 return `<svg viewBox="0 0 1448 1086" data-level="${level.toFixed(3)}" aria-hidden="true"><defs><linearGradient id="${gradientId}"><stop stop-color="#a69584"/><stop offset=".25" stop-color="#fff5e4"/><stop offset=".8" stop-color="#d9c7b2"/><stop offset="1" stop-color="#907f70"/></linearGradient></defs>
 <rect x="469" y="12" width="35" height="418" fill="#e5d0b7"/><path d="M477 16V430M497 16V430" stroke="url(#${gradientId})" stroke-width="3"/><path d="M479 ${level.toFixed(1)}H495V430H479Z" fill="#64b6cb" fill-opacity=".92"/><path d="M479 ${level.toFixed(1)} Q487 ${(level+5).toFixed(1)} 495 ${level.toFixed(1)}" fill="none" stroke="#3d788a" stroke-width="2"/><path d="M477 16Q487 11 497 16" fill="none" stroke="#9a8774" stroke-width="2"/><path d="M505 ${reference}H590" stroke="#a15d2c" stroke-width="4" stroke-dasharray="9 6"/>
 <rect x="1088" y="315" width="174" height="75" rx="5" fill="#b7c4a6"/><text class="volume-screen-value" x="1175" y="366" fill="#243c28" text-anchor="middle" font-size="46" font-family="monospace" font-weight="700">${bathTemp.toFixed(1)}°C</text></svg>`;
}

// The same air quantity occupies a chamber bounded by the fixed sealed end
// and the moving gasket. The model uses an approximately constant pressure.
export function gasVolumeArt(temp,bathTemp=temp){
 const left=270,initial=790,piston=left+(initial-left)*gasVolume(temp)/100;
 return `<svg viewBox="0 0 1448 1086" data-piston-x="${piston.toFixed(3)}" aria-hidden="true">
 <image href="${asset('volume-syringe-barrel.webp')}" x="165" y="395" width="1050" height="350" preserveAspectRatio="none"/>
 <image href="${asset('volume-syringe-plunger.webp')}" x="${(piston-42).toFixed(1)}" y="395" width="550" height="350" preserveAspectRatio="none"/>
 <path d="M${initial} 448V682" stroke="#965326" stroke-width="4" stroke-dasharray="11 8"/>
 <image href="${asset('volume-thermometer.webp')}" x="930" y="35" width="400" height="438" preserveAspectRatio="none"/>
 <rect x="1020" y="127" width="140" height="71" rx="4" fill="#b5c4a7"/><text class="volume-screen-value" x="1090" y="175" text-anchor="middle" fill="#203a27" font-size="37" font-family="monospace" font-weight="700">${bathTemp.toFixed(1)}°C</text></svg>`;
}
