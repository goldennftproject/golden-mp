'use strict';
const {simulate}=require('./simular-progresion-larga');const fs=require('node:fs');
const profile={name:'Free irregular',visits:4,spacing:4,minutes:20,miss:.25};
const results=[];
for(const seed of [11,29,47]){const r=simulate(profile,{days:180,seed});results.push(r);console.log(JSON.stringify({completed:r.profile,seed,days:r.days,level:r.final.level,expansions:r.final.expansions,plata:r.final.plata}));}
const stress=simulate({name:'Free regular · presión x10',visits:4,spacing:4,minutes:20},{days:120,pressure:10});results.push(stress);console.log(JSON.stringify({completed:stress.profile,days:stress.days,level:stress.final.level,expansions:stress.final.expansions,plata:stress.final.plata}));
fs.writeFileSync('docs/balance/progresion-larga-estres-20261028.json',JSON.stringify({modelVersion:3,results},null,2)+'\n');
