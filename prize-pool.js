const { useState } = React;
const h = React.createElement;

const RAKE_RATE = 0.04;
const CAGNOTTE  = 2;

const cent   = v => Math.round(v * 100) / 100;
const round5 = v => Math.round((v - 5) / 10) * 10 + 5;
const ceil5  = v => Math.ceil((v - 5) / 10) * 10 + 5;
const T      = k => k * (k + 1) / 2;

function calcSpots(players) { return Math.max(1, Math.round(players * 0.12)); }

function genPayouts(players, netPP, spots, buyinTotal) {
  const pool = cent(players * netPP);
  const last = cent(buyinTotal * 2);
  if (!players||!netPP||!spots||!buyinTotal) return null;
  if (last>=pool||spots<1||spots>players) return null;
  if (spots===1) return [pool];
  if (spots===2) { const f=cent(pool-last); return f>last?[f,last]:null; }
  const target=pool/last;
  let lo=1.00001, hi=50;
  for (let i=0;i<300;i++) {
    const mid=(lo+hi)/2;
    const s=Array.from({length:spots},(_,k)=>Math.pow(mid,T(k))).reduce((a,b)=>a+b,0);
    if (!isFinite(s)||s>=target) hi=mid; else lo=mid;
  }
  const r=(lo+hi)/2;
  const raw=Array.from({length:spots},(_,k)=>last*Math.pow(r,T(k)));
  const desc=[...raw].reverse();
  const result=[...desc];
  for (let i=spots-2;i>=1;i--) result[i]=Math.max(round5(result[i]),ceil5(result[i+1]+1));
  result[spots-1]=last;
  const othersSum=cent(result.slice(1).reduce((a,b)=>a+b,0));
  result[0]=cent(pool-othersSum);
  if (spots===1) return result;
  return result[0]>result[1]?result:null;
}

function fmt(n) {
  const f=Number(n).toFixed(2), [int,dec]=f.split(".");
  const s=parseInt(int,10).toLocaleString("fr-FR");
  return dec==="00"?s+" €":s+","+dec+" €";
}
const ord = n => n+(n===1?"er":"ème");

const PrintIcon = () => h("svg",{viewBox:"0 0 24 24",xmlns:"http://www.w3.org/2000/svg"},
  h("path",{d:"M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z",stroke:"currentColor",strokeWidth:1.5,fill:"none",strokeLinecap:"round",strokeLinejoin:"round"})
);

function App() {
  const [sTotal,   setSTotal]   = useState("150");
  const [sPp,      setSPp]      = useState("125");
  const [sFrais,   setSFrais]   = useState("25");
  const [sPlayers, setSPlayers] = useState("77");
  const [manual,   setManual]   = useState(false);
  const [spots,    setSpots]    = useState(9);

  const total   = parseFloat(sTotal)    || 0;
  const pp      = parseFloat(sPp)       || 0;
  const frais   = parseFloat(sFrais)    || 0;
  const players = parseInt(sPlayers,10) || 0;

  const onBT  = () => setSTotal(v   => String(Math.max(0.01, parseFloat(v)||0.01)));
  const onBP  = () => setSPp(v      => String(Math.max(0.01, parseFloat(v)||0.01)));
  const onBF  = () => setSFrais(v   => String(Math.max(CAGNOTTE, parseFloat(v)||CAGNOTTE)));
  const onBPl = () => setSPlayers(v => String(Math.max(2, parseInt(v,10)||2)));

  const ok = total>0 && Math.abs(pp+frais-total)<0.001;

  const rake        = cent(pp*RAKE_RATE);
  const netPP       = cent(pp-rake);
  const fraisCasino = cent(frais-CAGNOTTE);
  const autoSpots   = players>0?calcSpots(players):1;
  const effSpots    = manual?spots:autoSpots;
  const poolTotal   = cent(players*netPP);
  const rakeTotal   = cent(players*rake);
  const cagTotal    = cent(players*CAGNOTTE);
  const payouts     = ok&&players>0?genPayouts(players,netPP,effSpots,total):null;
  const firstPct    = payouts?((payouts[0]/poolTotal)*100).toFixed(1)+" %":"—";
  const hasErr      = !ok&&sTotal&&sPp&&sFrais;

  const now = new Date().toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"});

  return h("div",{className:"app"},

    h("div",{className:"hdr"},
      h("div",{className:"hdr-logo"},"Casino Barrière · Bordeaux"),
      h("div",{className:"hdr-title"},"Prize Pool ",h("em",null,"Calculator")),
      h("div",{className:"hdr-sub"},"Gestion des tournois de poker")
    ),

    h("div",{className:"card"},
      h("div",{className:"sec"},"Structure du buy-in"),

      h("div",{className:"buyin-top"},
        h("div",{className:"ig",style:{width:"210px",alignItems:"center"}},
          h("div",{className:"il",style:{textAlign:"center"}},"Prix du tournoi"),
          h("div",{className:"iw"},
            h("span",{className:"ip"},"€"),
            h("input",{type:"number",value:sTotal,min:"0.01",step:"0.01",className:hasErr?"err":"",onChange:ev=>setSTotal(ev.target.value),onBlur:onBT})
          ),
          h("div",{className:"is",style:{textAlign:"center"}},"Buy-in affiché au joueur")
        )
      ),

      h("div",{className:"buyin-split"},
        h("div",{className:"buyin-arm"},
          h("div",{className:"buyin-arm-line"}),
          h("span",{className:"buyin-arm-sym"},"⌥")
        ),
        h("div",{className:"buyin-cols"},
          h("div",{className:"ig"},
            h("div",{className:"il"},"Part prize pool"),
            h("div",{className:"iw"},
              h("span",{className:"ip"},"€"),
              h("input",{type:"number",value:sPp,min:"0.01",step:"0.01",className:hasErr?"err":"",onChange:ev=>setSPp(ev.target.value),onBlur:onBP})
            ),
            h("div",{className:"is"},"Avant rake (4%)")
          ),
          h("div",{className:"ig"},
            h("div",{className:"il"},"Frais d'entrée"),
            h("div",{className:"iw"},
              h("span",{className:"ip"},"€"),
              h("input",{type:"number",value:sFrais,min:String(CAGNOTTE),step:"0.01",className:hasErr?"err":"",onChange:ev=>setSFrais(ev.target.value),onBlur:onBF})
            ),
            h("div",{className:"is"},"Dont "+CAGNOTTE+" € cagnotte fixe")
          )
        )
      ),

      hasErr?h("div",{className:"alert"},
        h("span",{className:"alert-ico"},"⚠"),
        h("span",{className:"alert-txt"},
          h("strong",null,"PP ("+fmt(pp)+") + Frais ("+fmt(frais)+") = "+fmt(cent(pp+frais))),
          " ≠ Prix total ("+fmt(total)+")."
        )
      ):null,

      h("div",{className:"div"}),
      h("div",{className:"sec"},"Décomposition par joueur"),

      h("div",{className:"bk-grid"},
        h("div",{className:"bk hi"},  h("div",{className:"bk-v"},fmt(netPP)),       h("div",{className:"bk-l"},"PP net / joueur")),
        h("div",{className:"bk warn"},h("div",{className:"bk-v"},fmt(rake)),         h("div",{className:"bk-l"},"Rake (4%)")),
        h("div",{className:"bk"},     h("div",{className:"bk-v"},fmt(fraisCasino)),  h("div",{className:"bk-l"},"Frais casino nets")),
        h("div",{className:"bk"},     h("div",{className:"bk-v"},fmt(CAGNOTTE)+" €"),h("div",{className:"bk-l"},"Cagnotte"))
      )
    ),

    h("div",{className:"card card-print"},
      h("div",{className:"sec"},"Tournoi"),

      h("div",{className:"print-header"},
        h("div",null,
          h("div",{className:"print-title"},"Casino Barrière Bordeaux — ",h("em",null,"Prize Pool")),
          h("div",{style:{fontSize:"13px",color:"#555",marginTop:"4px",fontFamily:"var(--f-ui)"}},
            players+" joueurs · Buy-in "+fmt(total)+" · "+effSpots+" places payées"
          )
        ),
        h("div",{className:"print-meta"},
          h("div",null,now),
          h("div",null,"Dernier : "+fmt(total*2)),
          h("div",null,"Prize pool net : "+fmt(poolTotal))
        )
      ),

      h("div",{className:"igrid"},
        h("div",{className:"ig"},
          h("div",{className:"il"},"Joueurs"),
          h("div",{className:"iw"},
            h("span",{className:"ip",style:{color:"var(--gold-dim)"}},"#"),
            h("input",{type:"number",value:sPlayers,min:"2",max:"9999",onChange:ev=>setSPlayers(ev.target.value),onBlur:onBPl})
          )
        ),
        h("div",{className:"ig",style:{opacity:.45}},
          h("div",{className:"il"},"Dernier payé"),
          h("div",{className:"iw"},
            h("span",{className:"ip"},"€"),
            h("input",{type:"number",value:total*2,disabled:true})
          ),
          h("div",{className:"is"},"= 2 × prix du tournoi")
        ),
        h("div",{className:"ig"},
          h("div",{className:"il"},"Places payées"),
          h("div",{className:"iw"},
            h("span",{className:"ip",style:{color:manual?"var(--gold)":"var(--text-muted)"}},"#"),
            h("input",{type:"number",value:effSpots,min:"1",max:String(players||9999),
              disabled:!manual,style:{opacity:manual?1:.5},
              onChange:ev=>{ let v=parseInt(ev.target.value,10)||1; v=Math.max(1,Math.min(players||9999,v)); setSpots(v); }
            })
          )
        )
      ),

      h("div",{className:"tog-row"},
        h("div",{className:"tog"+(manual?" on":""),onClick:()=>{ if(!manual)setSpots(autoSpots); setManual(m=>!m); }},
          h("div",{className:"tog-k"})
        ),
        h("span",{className:"tog-lbl"},
          manual?"Places : override manuel":"Places : auto — "+autoSpots+" (12% de "+players+" joueurs)"
        )
      ),

      h("div",{className:"sum-bar"},
        h("div",{className:"sum-i"},h("div",{className:"sum-v"},fmt(poolTotal)),h("div",{className:"sum-k"},"Prize pool net")),
        h("div",{className:"sum-i"},h("div",{className:"sum-v"},fmt(rakeTotal)),h("div",{className:"sum-k"},"Rake total")),
        h("div",{className:"sum-i"},h("div",{className:"sum-v"},fmt(cagTotal)),h("div",{className:"sum-k"},"Cagnotte totale")),
        h("div",{className:"sum-i"},h("div",{className:"sum-v"},payouts?fmt(payouts[0]):"—"),h("div",{className:"sum-k"},"1er · "+firstPct))
      ),

      h("div",{className:"table-hdr"},
        h("div",{className:"tdiv-line"}),
        payouts?h("button",{className:"btn-print",onClick:()=>window.print()},h(PrintIcon),"Imprimer le tableau"):null
      ),

      !ok
        ?h("div",{className:"errblk"},"Corrige la décomposition du buy-in.")
        :!payouts
          ?h("div",{className:"errblk"},"Configuration invalide.")
          :h("table",null,
              h("thead",null,
                h("tr",null,
                  h("th",null,"Place"),
                  h("th",null,"Gain"),
                  h("th",null,"Δ palier"),
                  h("th",null,"% pool"),
                  h("th",{className:"bcell"})
                )
              ),
              h("tbody",null,...payouts.map((amount,i)=>{
                const delta=i<payouts.length-1?"+"+ Math.round(amount-payouts[i+1]).toLocaleString("fr-FR")+" €":"—";
                return h("tr",{key:i,className:i===0?"r1":""},
                  h("td",null,h("span",{className:"badge"},i+1),h("span",{className:"plbl"},ord(i+1))),
                  h("td",null,h("span",{className:"amt"},fmt(amount))),
                  h("td",null,h("span",{className:"delta"},delta)),
                  h("td",null,h("span",{className:"pct"},((amount/poolTotal)*100).toFixed(1)+" %")),
                  h("td",{className:"bcell"},h("div",{className:"bbg"},h("div",{className:"bfill",style:{width:(amount/payouts[0]*100)+"%"}})))
                );
              }))
            ),

      h("div",{className:"fnote"},
        "Progression super-géométrique · Écarts croissants exponentiellement · 1er ≈ 35% · Dernier = 2× prix tournoi · 12% des joueurs · Rake 4% · Cagnotte 2€/joueur"
      )
    )
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(h(App));
