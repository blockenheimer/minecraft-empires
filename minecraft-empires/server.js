const http = require('http');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const express = require('express');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT || 3000);
const app = express();
app.use(express.json({limit:'2mb'}));
const PUBLIC_DIR = (() => {
  const candidates = [
    path.join(__dirname, 'public'),
    path.join(__dirname, 'minecraft-empires', 'public'),
    path.join(process.cwd(), 'public'),
    path.join(process.cwd(), 'minecraft-empires', 'public')
  ];
  return candidates.find(dir => fs.existsSync(path.join(dir, 'index.html'))) || candidates[0];
})();
app.use(express.static(PUBLIC_DIR));
app.get('/', (_req,res) => res.sendFile(path.join(PUBLIC_DIR,'index.html')));
app.get('/health', (_,res)=>res.json({ok:true}));
const server = http.createServer(app);
const wss = new WebSocketServer({server});

const NATIONS = ['RDPG','Latinus','DSPA','USRR','Finllandë','Yukiguni','Leasath','Lythuria','Orenbirsk','Azilus','Republic of Bananas','Vanilicia','Afrem','Cankultaän','Fundoshi','Vulpéria'];
const CATALOG = {
 'Infantaria':{hp:1,dmg:1,rangeVis:2,moveRange:6},'Tanque Pesado':{hp:75,dmg:45,rangeVis:2,moveRange:6},'Tanque Médio':{hp:60,dmg:45,rangeVis:2,moveRange:8},'Tanque Leve':{hp:40,dmg:25,rangeVis:2,moveRange:10},'Anti-Air':{hp:20,dmg:25,rangeVis:2,moveRange:8},'Caça-Tanque':{hp:50,dmg:65,rangeVis:2,moveRange:8},'Artilharia Móvel':{hp:30,dmg:50,rangeVis:4,moveRange:6},'Artilharia Pesada':{hp:60,dmg:60,rangeVis:4,moveRange:4},'Engenharia de Combate':{hp:40,dmg:0,rangeVis:2,moveRange:6},'Navio Pequeno (Patrulha)':{hp:100,dmg:30,rangeVis:3,moveRange:12},'Submarino':{hp:200,dmg:60,rangeVis:3,moveRange:10},'Battleship':{hp:1000,dmg:100,rangeVis:4,moveRange:8},'Porta-Aviões':{hp:1000,dmg:40,rangeVis:4,moveRange:8},'Navio Médio (Destroyer)':{hp:400,dmg:50,rangeVis:3,moveRange:10},'Fragata':{hp:400,dmg:50,rangeVis:3,moveRange:10},'Contra-Torpedeiro':{hp:400,dmg:50,rangeVis:3,moveRange:10},'Navio Carga/Transporte':{hp:200,dmg:10,rangeVis:2,moveRange:8},'Desembarque Médio':{hp:200,dmg:15,rangeVis:2,moveRange:6},'Desembarque Pequeno':{hp:100,dmg:10,rangeVis:2,moveRange:6},'Desembarque Grande':{hp:200,dmg:20,rangeVis:2,moveRange:4},'Avião Caça (Fighter)':{hp:40,dmg:45,rangeVis:5,airMaxTurns:4,moveRange:20},'Attacker Médio/Pequeno':{hp:45,dmg:55,rangeVis:4,airMaxTurns:5,moveRange:18},'Attacker Pequeno':{hp:45,dmg:55,rangeVis:4,airMaxTurns:5,moveRange:18},'Attacker Médio':{hp:45,dmg:55,rangeVis:4,airMaxTurns:5,moveRange:18},'Bombardeiro Médio':{hp:60,dmg:70,rangeVis:4,airMaxTurns:6,moveRange:16},'Bombardeiro Pequeno':{hp:60,dmg:70,rangeVis:4,airMaxTurns:6,moveRange:16},'Bombardeiro Grande':{hp:80,dmg:120,rangeVis:4,airMaxTurns:6,moveRange:14}
};

// Configuração de recrutamento usada exclusivamente na preparação inicial da guerra.
// `unitsPerConstructed` = quantas unidades uma construção/peça imputada representa; `manpowerPerUnit` = custo por unidade.
const RECRUITMENT_CATALOG = {
  'Infantaria':{unitsPerConstructed:1,manpowerPerUnit:1,group:'Infantaria',label:'Infantaria',moveRange:6},
  'Tanque Leve':{unitsPerConstructed:15,manpowerPerUnit:3,group:'Tanques',label:'Tanque Leve',moveRange:10},
  'Tanque Médio':{unitsPerConstructed:15,manpowerPerUnit:3,group:'Tanques',label:'Tanque Médio',moveRange:8},
  'Tanque Pesado':{unitsPerConstructed:10,manpowerPerUnit:3,group:'Tanques',label:'Tanque Pesado',moveRange:6},
  'Caça-Tanque':{unitsPerConstructed:10,manpowerPerUnit:3,group:'Tanques',label:'Caça-Tanque',moveRange:8},
  'Anti-Air':{unitsPerConstructed:15,manpowerPerUnit:2,group:'Tanques',label:'Anti-Aérea',moveRange:8},
  'Artilharia Móvel':{unitsPerConstructed:5,manpowerPerUnit:3,group:'Artilharia',label:'Artilharia Móvel',moveRange:6},
  'Artilharia Pesada':{unitsPerConstructed:1,manpowerPerUnit:10,group:'Artilharia',label:'Artilharia Pesada',moveRange:4},
  'Engenharia de Combate':{unitsPerConstructed:10,manpowerPerUnit:3,group:'Engenharia',label:'Engenharia de Combate',moveRange:6},
  'Navio Pequeno (Patrulha)':{unitsPerConstructed:15,manpowerPerUnit:10,group:'Navios',label:'Navio Pequeno (Patrulha)',moveRange:12},
  'Navio Médio (Destroyer)':{unitsPerConstructed:2,manpowerPerUnit:200,group:'Navios',label:'Navio Médio (Fragata/Destroyer)',legacy:true,moveRange:10},
  'Fragata':{unitsPerConstructed:2,manpowerPerUnit:200,group:'Navios',label:'Fragata',moveRange:10},
  'Contra-Torpedeiro':{unitsPerConstructed:2,manpowerPerUnit:200,group:'Navios',label:'Contra-Torpedeiro',moveRange:10},
  'Submarino':{unitsPerConstructed:5,manpowerPerUnit:50,group:'Navios',label:'Submarino',moveRange:10},
  'Porta-Aviões':{unitsPerConstructed:1,manpowerPerUnit:3000,group:'Navios',label:'Porta-Aviões',moveRange:8},
  'Battleship':{unitsPerConstructed:1,manpowerPerUnit:1500,group:'Navios',label:'Battleship',moveRange:8},
  'Navio Carga/Transporte':{unitsPerConstructed:2,manpowerPerUnit:250,group:'Navios',label:'Transporte/Carga',moveRange:8},
  'Desembarque Pequeno':{unitsPerConstructed:10,manpowerPerUnit:10,group:'Navios',label:'Desembarque Pequeno',moveRange:6},
  'Desembarque Médio':{unitsPerConstructed:5,manpowerPerUnit:50,group:'Navios',label:'Desembarque Médio',moveRange:6},
  'Desembarque Grande':{unitsPerConstructed:1,manpowerPerUnit:20,group:'Navios',label:'Desembarque Grande',moveRange:4},
  'Avião Caça (Fighter)':{unitsPerConstructed:15,manpowerPerUnit:1,group:'Aeronaves',label:'Avião Caça',moveRange:20},
  'Attacker Médio/Pequeno':{unitsPerConstructed:10,manpowerPerUnit:2,group:'Aeronaves',label:'Ataque Médio/Pequeno',legacy:true,moveRange:18},
  'Attacker Pequeno':{unitsPerConstructed:10,manpowerPerUnit:2,group:'Aeronaves',label:'Ataque Pequeno',moveRange:18},
  'Attacker Médio':{unitsPerConstructed:10,manpowerPerUnit:2,group:'Aeronaves',label:'Ataque Médio',moveRange:18},
  'Bombardeiro Médio':{unitsPerConstructed:5,manpowerPerUnit:4,group:'Aeronaves',label:'Bombardeiro Médio',legacy:true,moveRange:16},
  'Bombardeiro Pequeno':{unitsPerConstructed:5,manpowerPerUnit:4,group:'Aeronaves',label:'Bombardeiro Pequeno',moveRange:16},
  'Bombardeiro Grande':{unitsPerConstructed:2,manpowerPerUnit:12,group:'Aeronaves',label:'Bombardeiro Grande',moveRange:14}
};
const RECRUITMENT_LAWS = [
  {key:'desarmado',label:'Desarmado',rate:0.05,wartime:false},
  {key:'voluntario',label:'Voluntário',rate:0.10,wartime:false},
  {key:'limitado',label:'Limitado',rate:0.15,wartime:false},
  {key:'extensivo',label:'Extensivo',rate:0.25,wartime:true},
  {key:'obrigatorio',label:'Obrigatório',rate:0.40,wartime:true}
];
function defaultArmySetupForSide(side){
  const countries={};
  for(const nation of (side?.countries||[])){
    const units={};
    for(const type of Object.keys(RECRUITMENT_CATALOG)) units[type]=0;
    countries[nation]={villagers:50,lawRate:0.10,lawKey:'voluntario',manpower:5000,units};
  }
  return {confirmed:false,countries};
}
function normalizeArmySetupForSide(side,input){
  const base=defaultArmySetupForSide(side);
  const src=input&&typeof input==='object'?input:{};
  for(const nation of (side?.countries||[])){
    const raw=src.countries?.[nation]&&typeof src.countries[nation]==='object'?src.countries[nation]:{};
    const villagers=Math.max(0,Math.floor(Number(raw.villagers)||0));
    const law=RECRUITMENT_LAWS.find(x=>Math.abs(x.rate-Number(raw.lawRate||0.10))<1e-9)||RECRUITMENT_LAWS.find(x=>x.key===raw.lawKey)||RECRUITMENT_LAWS[1];
    const units={};
    let totalManpower=0,totalUnits=0,totalConstructed=0;
    for(const [type,def] of Object.entries(RECRUITMENT_CATALOG)){
      const b=Math.max(0,Math.floor(Number(raw.units?.[type])||0));
      units[type]=b;
      totalConstructed+=b;
      totalUnits+=b*def.unitsPerConstructed;
      totalManpower+=b*def.unitsPerConstructed*def.manpowerPerUnit;
    }
    const population=villagers*1000;
    const manpower=Math.round(population*law.rate);
    base.countries[nation]={villagers,lawRate:law.rate,lawKey:law.key,manpower,population,units,totalConstructed,totalUnits,totalManpower,remainingManpower:manpower-totalManpower};
  }
  base.confirmed=!!src.confirmed;
  return base;
}
function ensureArmySetup(r){
  r.armySetupBySide=r.armySetupBySide&&typeof r.armySetupBySide==='object'?r.armySetupBySide:{};
  for(const side of (r.sides||[])){
    r.armySetupBySide[side.id]=normalizeArmySetupForSide(side,r.armySetupBySide[side.id]);
  }
  return r.armySetupBySide;
}
function armySetupForSide(r,side){
  if(!side)return null;
  ensureArmySetup(r);
  return JSON.parse(JSON.stringify(r.armySetupBySide[side.id]||defaultArmySetupForSide(side)));
}
function armySetupWithinManpower(setup){
  for(const data of Object.values(setup?.countries||{})){
    if(Number(data.totalManpower||0)>Number(data.manpower||0)) return false;
  }
  return true;
}
function placementUsageByNation(units){
  const out={};
  for(const u of (Array.isArray(units)?units:[])){
    if(!u||!RECRUITMENT_CATALOG[u.type]||!u.nation)continue;
    const nation=String(u.nation),type=String(u.type),batch=String(u.armyBatchId||u.id);
    const n=out[nation]||(out[nation]={});
    const t=n[type]||(n[type]={batches:new Set(),quantity:0,batchQuantity:{}});
    t.batches.add(batch);
    const q=isLandingShipType(u.type)?1:Math.max(0,Math.floor(Number(u.quantity)||0));
    t.quantity+=q;
    t.batchQuantity[batch]=(t.batchQuantity[batch]||0)+q;
  }
  return out;
}
function validatePlacementAgainstArmySetup(r,units){
  ensureArmySetup(r);
  const usage=placementUsageByNation(units), errors=[];
  for(const u of (Array.isArray(units)?units:[])){
    if(u&&u.nation&&u.type&&!RECRUITMENT_CATALOG[u.type]){
      errors.push(`${u.nation}: tipo de tropa ${u.type} não está disponível na configuração de recrutamento.`);
    }
  }
  for(const side of (r.sides||[])){
    const setup=r.armySetupBySide?.[side.id];
    for(const nation of side.countries||[]){
      const data=setup?.countries?.[nation];
      if(!data)continue;
      let countryMp=0;
      for(const [type,def] of Object.entries(RECRUITMENT_CATALOG)){
        const row=data.units?.[type]||0;
        const u=usage[nation]?.[type];
        if(!u)continue;
        const allowedTotalUnits=row*def.unitsPerConstructed;
        if(u.quantity>allowedTotalUnits) errors.push(`${nation}: ${type} excede o total de ${allowedTotalUnits} unidades construídas disponíveis.`);
        countryMp+=u.quantity*def.manpowerPerUnit;
      }
      if(countryMp>Number(data.manpower||0)) errors.push(`${nation}: manpower insuficiente (${countryMp}/${Number(data.manpower||0)}).`);
    }
  }
  return {ok:errors.length===0,errors};
}
function liveUnitsForSide(r,side){
  const units=Array.isArray(r.fullState?.units)?r.fullState.units:[];
  return units.filter(u=>u && side.countries.includes(u.nation) && Number(u.hp)>0);
}
// Validação da reabertura/reconfiguração da planilha de recrutamento em pleno jogo:
// nunca permite reduzir villagers/construções já confirmadas ("sem deletar") e nunca
// permite que o novo limite fique abaixo do que já está fisicamente no mapa.
function validateArmySetupReconfigure(r,side,prevSetup,newSetup){
  const errors=[];
  const usage=placementUsageByNation(liveUnitsForSide(r,side));
  for(const nation of (side.countries||[])){
    const prevData=prevSetup?.countries?.[nation]||{villagers:0,units:{}};
    const newData=newSetup.countries?.[nation]||{villagers:0,units:{}};
    if(Number(newData.villagers||0)<Number(prevData.villagers||0)){
      errors.push(`${nation}: não é possível reduzir os villagers já configurados.`);
    }
    for(const [type,def] of Object.entries(RECRUITMENT_CATALOG)){
      const prevRow=Number(prevData.units?.[type]||0);
      const newRow=Number(newData.units?.[type]||0);
      if(newRow<prevRow){
        errors.push(`${nation}: não é possível reduzir ${def.label} já configurado.`);
        continue;
      }
      const allowedTotalUnits=newRow*def.unitsPerConstructed;
      const used=usage[nation]?.[type]?.quantity||0;
      if(used>allowedTotalUnits){
        errors.push(`${nation}: ${def.label} já no mapa (${used}) excede o novo limite (${allowedTotalUnits}).`);
      }
    }
  }
  if(!armySetupWithinManpower(newSetup)) errors.push('O manpower de um ou mais países foi ultrapassado pela nova configuração.');
  return {ok:errors.length===0,errors};
}

const LANDING_SHIP_CAPACITY = {'Desembarque Pequeno':1,'Desembarque Médio':5,'Desembarque Grande':10};
const LANDING_SHIP_TYPES = new Set(Object.keys(LANDING_SHIP_CAPACITY));
const GROUND_TYPES = new Set(['Infantaria','Tanque Pesado','Tanque Médio','Tanque Leve','Anti-Air','Caça-Tanque','Artilharia Móvel','Artilharia Pesada','Engenharia de Combate']);
const isLandingShipType=t=>LANDING_SHIP_TYPES.has(String(t||''));
const isGroundType=t=>GROUND_TYPES.has(String(t||''));
const landingShipCapacity=t=>LANDING_SHIP_CAPACITY[String(t||'')]||0;
const CHANNEL_DEFS = [
  {id:'canal-1', a:{x:1571,y:709}, b:{x:2065,y:650}, mode:'all'},
  {id:'canal-2', a:{x:1770,y:1192}, b:{x:2026,y:1261}, mode:'all'}
];
const CHANNEL_RADIUS = 14;
function defaultChannels(){return CHANNEL_DEFS.map(d=>({id:d.id,a:{...d.a},b:{...d.b},mode:'all'}));}
function normalizeChannels(input){
  const src=Array.isArray(input)?input:[]; const byId=new Map(src.filter(x=>x&&x.id).map(x=>[String(x.id),x]));
  return CHANNEL_DEFS.map(d=>{const x=byId.get(d.id)||{};return {id:d.id,a:{...d.a},b:{...d.b},mode:['all','allies','none'].includes(x.mode)?x.mode:'all'};});
}
function nearestChannelOwner(r, point){
  const owners=r.fullState?.territoryOwners||r.setupTerritoryOwners||{};
  let winner=null;
  const radii=[120,180,260,360,500,800];
  for(const radius of radii){
    const counts={},nearest={};
    for(const [key,owner] of Object.entries(owners)){
      if(!owner||!NATIONS.includes(owner)||!/^(\d+),(\d+)$/.test(key))continue;
      const [qx,qy]=key.split(',').map(Number); const d=Math.hypot(qx*20+10-point.x,qy*20+10-point.y);
      if(d>radius)continue; counts[owner]=(counts[owner]||0)+1; nearest[owner]=Math.min(nearest[owner]??Infinity,d);
    }
    const names=Object.keys(counts);
    if(names.length){
      winner=names[0];
      for(const n of names){ if(counts[n]>counts[winner] || (counts[n]===counts[winner]&&nearest[n]<nearest[winner])) winner=n; }
      return winner;
    }
  }
  return winner;
}
function channelOwner(r,ch){return nearestChannelOwner(r,ch.a);}
function channelOwnerSide(r,ch){const owner=channelOwner(r,ch);return owner?r.sides.find(s=>s.countries.includes(owner))||null:null;}
function channelAccessForSide(r,ch,side){if(!side)return false;const os=channelOwnerSide(r,ch);if(!os)return false;if(os.id===side.id)return true;if(ch.mode==='all')return true;if(ch.mode==='allies')return os.alliance===side.alliance;return false;}
function refreshChannelOwners(r){r.channels=normalizeChannels(r.channels);for(const ch of r.channels){ch.ownerCountry=channelOwner(r,ch)||null;ch.ownerSideId=channelOwnerSide(r,ch)?.id||null;}return r.channels;}
const AIRCRAFT_TYPES = new Set(['Avião Caça (Fighter)','Attacker Médio/Pequeno','Attacker Pequeno','Attacker Médio','Bombardeiro Médio','Bombardeiro Pequeno','Bombardeiro Grande']);
const NAVAL_TYPES = new Set(['Navio Pequeno (Patrulha)','Submarino','Battleship','Porta-Aviões','Navio Médio (Destroyer)','Fragata','Contra-Torpedeiro','Navio Carga/Transporte','Desembarque Médio','Desembarque Pequeno','Desembarque Grande']);
const ARMED_NAVAL_TYPES = new Set(['Navio Pequeno (Patrulha)','Submarino','Battleship','Porta-Aviões','Navio Médio (Destroyer)','Fragata','Contra-Torpedeiro']);
// Usado exclusivamente para decidir quando gerar uma previsão. Não altera o
// motor de combate existente.
const ATTACK_RANGE_GRID = {
  'Anti-Air':2, 'Artilharia Móvel':4, 'Artilharia Pesada':4,
  'Navio Pequeno (Patrulha)':2, 'Submarino':2, 'Battleship':3,
  'Porta-Aviões':3, 'Navio Médio (Destroyer)':2, 'Fragata':2, 'Contra-Torpedeiro':2, 'Navio Carga/Transporte':2,
  'Desembarque Médio':2, 'Desembarque Pequeno':2, 'Desembarque Grande':2,
  'Avião Caça (Fighter)':2, 'Attacker Médio/Pequeno':1, 'Attacker Pequeno':1, 'Attacker Médio':1,
  'Bombardeiro Médio':1, 'Bombardeiro Pequeno':1, 'Bombardeiro Grande':1
};
function serverUnitCategory(type){
  if(AIRCRAFT_TYPES.has(type)) return 'air';
  if(NAVAL_TYPES.has(type)) return 'naval';
  if(isGroundType(type)) return 'ground';
  return '';
}
function serverCanAttackUnit(attacker,target){
  if(!attacker||!target||Number(attacker.hp)<=0||Number(target.hp)<=0)return false;
  if(attacker.nation===target.nation)return false;
  // Battleship e Porta-Aviões participam do engajamento naval, mas não têm
  // capacidade de causar dano a submarinos.
  if(target.type==='Submarino' && (attacker.type==='Battleship'||attacker.type==='Porta-Aviões'))return false;
  const ac=serverUnitCategory(attacker.type), tc=serverUnitCategory(target.type);
  if(tc==='air'){
    if(attacker.type==='Anti-Air') return true;
    if(ac==='naval') return true;
    return ac==='air';
  }
  if(ac==='air') return tc==='naval'||tc==='ground';
  if(attacker.type==='Engenharia de Combate') return false;
  if(ac==='ground') return tc==='ground';
  if(ac==='naval') return ARMED_NAVAL_TYPES.has(attacker.type) && tc==='naval';
  return false;
}
function serverCanEngageEitherDirection(a,b){
  if(!a||!b||Number(a.hp)<=0||Number(b.hp)<=0)return false;
  const distance=Math.hypot(Number(a.x)-Number(b.x),Number(a.y)-Number(b.y));
  const rangeGrid=u=>{
    const explicit=Number(u?.attackRange);
    if(Number.isFinite(explicit)&&explicit>0)return explicit;
    return Number(ATTACK_RANGE_GRID[u?.type]||1);
  };
  return (serverCanAttackUnit(a,b)&&distance<=rangeGrid(a)*20) || (serverCanAttackUnit(b,a)&&distance<=rangeGrid(b)*20);
}
function serverUnitIsRetreatingFrom(r,enemy,side){
  if(!r||!enemy||!side||!enemy.retreatState?.enemyId)return false;
  const enemySide=sideFor(r,{sideId:side.id});
  if(!enemySide)return false;
  if(Number(enemy.retreatState.escapeRound)!==Number(r.round||1))return false;
  const target=r.fullState?.units?.find(u=>String(u.id)===String(enemy.retreatState.enemyId));
  return !!target && Number(target.hp)>0 && coalitionCountries(r,side).includes(target.nation);
}
function serverUnitRecognizedBySide(r,side,enemy){
  if(!side||!enemy||Number(enemy.hp)<=0)return false;
  const friendly=coalitionCountries(r,side);
  const stored=r.fullState?.reconIntel||{};
  if(friendly.some(n=>stored?.[n]?.[String(enemy.id)])) return true;
  return (r.fullState?.units||[]).some(observer=>{
    if(Number(observer.hp)<=0||observer.action!=='Reconhecimento'||!friendly.includes(observer.nation))return false;
    if(enemy.type==='Submarino'){
      const range=submarineDetectorRange(observer);
      return range>0 && Math.hypot(Number(observer.x)-Number(enemy.x),Number(observer.y)-Number(enemy.y))<=range*20;
    }
    const range=Number(CATALOG[observer.type]?.rangeVis||0)*20;
    return range>0 && Math.hypot(Number(observer.x)-Number(enemy.x),Number(observer.y)-Number(enemy.y))<=range;
  });
}
function predictionHash(...parts){
  const text=parts.map(v=>String(v??'')).join('|');
  let h=2166136261;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
  return (h>>>0)/4294967295;
}
function serverMovementPredictionForUnit(r,side,enemy){
  if(!side||!enemy||Number(enemy.hp)<=0)return null;
  if(!canSee(r,side,enemy))return null;
  const points=Array.isArray(enemy.movePath)?enemy.movePath:[];
  const target=points.find(pt=>Number(pt?.x)!==Number(enemy.x)||Number(pt?.y)!==Number(enemy.y)) ||
    (Number.isFinite(Number(enemy.targetX))&&Number.isFinite(Number(enemy.targetY))&&
      (Number(enemy.targetX)!==Number(enemy.x)||Number(enemy.targetY)!==Number(enemy.y))
      ? {x:Number(enemy.targetX),y:Number(enemy.targetY)} : null);
  if(!target)return null;
  const friendly=coalitionCountries(r,side);
  const engaged=(r.fullState?.units||[]).some(own=>{
    if(!own||Number(own.hp)<=0||String(own.id)===String(enemy.id)||!friendly.includes(own.nation))return false;
    // Uma tropa em retirada já está, por definição, saindo de um combate com
    // a unidade indicada em retreatState. Mantemos a previsão nesse momento
    // mesmo que o pequeno offset de combate coloque os ícones fora do limiar
    // geométrico exato do alcance de ataque.
    if(String(enemy.retreatState?.enemyId||'')===String(own.id) &&
       Number(enemy.retreatState?.escapeRound||0)===Number(r.round||1)) return true;
    return serverCanEngageEitherDirection(own,enemy);
  });
  if(!engaged)return null;
  const length=Math.hypot(Number(target.x)-Number(enemy.x),Number(target.y)-Number(enemy.y));
  if(!(length>0.5))return null;
  const precise=serverUnitRecognizedBySide(r,side,enemy);
  const sectorAngleDeg=precise?75:120;
  const halfAngle=sectorAngleDeg*Math.PI/180/2;
  const actualAngle=Math.atan2(Number(target.y)-Number(enemy.y),Number(target.x)-Number(enemy.x));
  const centerOffset=(predictionHash(enemy.id,r.round,side.id,target.x,target.y,'sector')*2-1)*halfAngle*0.70;
  return {id:String(enemy.id),nation:enemy.nation,type:enemy.type,x:Number(enemy.x),y:Number(enemy.y),radius:length,sectorAngleDeg,centerAngle:actualAngle+centerOffset,round:Number(r.round||1),recognized:precise};
}
function movementPredictionsForSide(r,side){
  const out={};
  if(!side)return out;
  for(const enemy of (r.fullState?.units||[])){
    if(!enemy||Number(enemy.hp)<=0||coalitionCountries(r,side).includes(enemy.nation))continue;
    const pred=serverMovementPredictionForUnit(r,side,enemy);
    if(pred)out[String(enemy.id)]=pred;
  }
  return out;
}
function refreshMovementPredictionCache(r){
  if(!r)return {};
  r.movementPredictionsBySide=r.movementPredictionsBySide&&typeof r.movementPredictionsBySide==='object'?r.movementPredictionsBySide:{};
  for(const side of (r.sides||[])) r.movementPredictionsBySide[String(side.id)]=movementPredictionsForSide(r,side);
  return r.movementPredictionsBySide;
}
function movementPredictionsForVisibleState(r,side){
  if(!r||!side)return {};
  const cache=r.movementPredictionsBySide;
  if(!cache||typeof cache!=='object'||!Object.prototype.hasOwnProperty.call(cache,String(side.id))) refreshMovementPredictionCache(r);
  // Recalcula sempre antes de publicar um state. Assim uma ordem recém
  // registrada, inclusive uma ordem de recuo, nunca depende de uma cópia
  // antiga do cache.
  const fresh=movementPredictionsForSide(r,side);
  r.movementPredictionsBySide[String(side.id)]=fresh;
  return fresh;
}
function broadcastMovementPredictions(r){
  if(!r)return;
  refreshMovementPredictionCache(r);
  for(const [ws,p] of peers){
    if(p.roomCode!==r.code)continue;
    const side=sideFor(r,p);
    if(side) send(ws,{type:'movement_predictions',round:Number(r.round||1),predictions:r.movementPredictionsBySide[String(side.id)]||{}});
  }
}
// Travessia de canal é bidirecional: A→B e B→A usam exatamente a mesma regra.
function channelTeleportTarget(r,u,targetX,targetY){
  if(!u||!CATALOG[u.type])return null; const navals=new Set(['Navio Pequeno (Patrulha)','Submarino','Battleship','Porta-Aviões','Navio Médio (Destroyer)','Fragata','Contra-Torpedeiro','Navio Carga/Transporte','Desembarque Médio','Desembarque Pequeno','Desembarque Grande']); if(!navals.has(u.type))return null;
  refreshChannelOwners(r); const side=r.sides.find(s=>s.countries.includes(u.nation));
  for(const ch of r.channels){
    if(!channelAccessForSide(r,ch,side))continue;
    if(Math.hypot(Number(u.x)-ch.a.x,Number(u.y)-ch.a.y)<=CHANNEL_RADIUS && Math.hypot(Number(targetX)-ch.b.x,Number(targetY)-ch.b.y)<=CHANNEL_RADIUS)return {...ch.b,channelId:ch.id};
    if(Math.hypot(Number(u.x)-ch.b.x,Number(u.y)-ch.b.y)<=CHANNEL_RADIUS && Math.hypot(Number(targetX)-ch.a.x,Number(targetY)-ch.a.y)<=CHANNEL_RADIUS)return {...ch.a,channelId:ch.id};
  }
  return null;
}
const rooms = new Map();
const CAMPAIGN_DIR = process.env.CAMPAIGN_DIR || path.join(__dirname,'data','campaigns');
fs.mkdirSync(CAMPAIGN_DIR,{recursive:true});
const campaignPath = c => path.join(CAMPAIGN_DIR, String(c).toUpperCase().replace(/[^A-Z0-9_-]/g,'' ) + '.json');
function serializeRoom(r){
  return {version:4, savedAt:Date.now(), room:{code:r.code,name:r.name,fog:true,round:r.round,status:r.status,sides:r.sides,fullState:r.fullState,setupTerritoryOwners:r.setupTerritoryOwners||{},createdAt:r.createdAt,hostToken:r.hostToken,isCampaign:!!r.isCampaign,resumeSavedStatus:r.resumeSavedStatus||r.status,resumePending:!!r.resumePending,orderDurationMs:r.orderDurationMs,ordersOpenAt:r.ordersOpenAt,ordersCloseAt:r.ordersCloseAt,executeAt:r.executeAt,ordersBySide:r.ordersBySide,placementReady:r.sides.map(s=>({id:s.id,ready:!!s.ready})),armySetupBySide:r.armySetupBySide||{},armySetupComplete:!!r.armySetupComplete,treaties:r.treaties||{telegrams:[],truce:null,peace:null,resumeReady:{}},warStats:r.warStats||{committedBySide:{},killedBySide:{},registeredUnits:{}},channels:normalizeChannels(r.channels)}};
}
function saveCampaign(r){
  try{
    fs.mkdirSync(CAMPAIGN_DIR,{recursive:true});
    if(r.isCampaign && !r.resumePending && r.status) r.resumeSavedStatus=String(r.status);
    const payload=serializeRoom(r);
    fs.writeFileSync(campaignPath(r.code),JSON.stringify(payload,null,2),'utf8');
    return true;
  }catch(e){console.error('campaign save:',e.message);return false;}
}
function normalizeLoadedRoom(r){
  r.round=Math.max(1,Number(r.round)||1);
  r.status=String(r.status||'lobby');
  r.setupTerritoryOwners=sanitizeTerritoryOwners(r.setupTerritoryOwners||r.fullState?.territoryOwners||{});
  r.fullState=r.fullState&&typeof r.fullState==='object'?r.fullState:{units:[],territoryOwners:r.setupTerritoryOwners,reconIntel:{},log:[]};
  r.fullState.units=(Array.isArray(r.fullState.units)?r.fullState.units:[]).map(normalizeUnitForServer).filter(Boolean);
  r.fullState.territoryOwners=sanitizeTerritoryOwners(r.fullState.territoryOwners||r.setupTerritoryOwners||{});
  r.fullState.reconIntel=r.fullState.reconIntel&&typeof r.fullState.reconIntel==='object'?r.fullState.reconIntel:{};
  r.fullState.log=Array.isArray(r.fullState.log)?r.fullState.log.slice(-160):[];
  r.channels=normalizeChannels(r.channels); refreshChannelOwners(r);
  r.treaties=r.treaties&&typeof r.treaties==='object'?r.treaties:{telegrams:[],truce:null,peace:null,resumeReady:{}};
  r.treaties.telegrams=Array.isArray(r.treaties.telegrams)?r.treaties.telegrams.slice(-100):[];
  r.treaties.truce=r.treaties.truce||null;r.treaties.peace=r.treaties.peace||null;r.treaties.resumeReady=r.treaties.resumeReady||{};
  r.warStats=r.warStats&&typeof r.warStats==='object'?r.warStats:{committedBySide:{},killedBySide:{},registeredUnits:{}};
  ensureWarStats(r);
  ensureArmySetup(r);
  r.armySetupComplete=!!(r.status==='placement' && (r.sides||[]).length===2 && r.sides.every(s=>!!r.armySetupBySide?.[s.id]?.confirmed));
  registerWarUnits(r,r.fullState.units);
}
function loadCampaigns(){
  for(const f of fs.readdirSync(CAMPAIGN_DIR)){
    if(!f.endsWith('.json'))continue;
    try{const d=JSON.parse(fs.readFileSync(path.join(CAMPAIGN_DIR,f),'utf8'));const r=d.room;if(!r?.code||!Array.isArray(r.sides))continue;
      normalizeLoadedRoom(r);
      r.timer=null;r.resolving=false;r.resolvingUntil=null;r.resolveRound=null;r.resolutionToken=null;r.resolutionResultReceived=false;r.awaitingNextRound=false;r.nextRoundReady={};r.placementCommitPending=false;r.placementUnitsBySide={};r.treaties.resumeReady=r.treaties.resumeReady||{};
      ensureArmySetup(r);
      r.isCampaign=true;
      r.resumeSavedStatus=String(r.resumeSavedStatus||r.status||'lobby');
      r.resumePending=true;
      r.hostConnected=false;r.hostAttached=false;r.resumeHydratingHost=false;r.sides.forEach(s=>{s.connected=false;s.ready=false;});
      r.treaties.resumeReady=r.treaties.resumeReady||{};
      r.nextRoundReady={}; r.awaitingNextRound=false; r.resolving=false; r.resolvingUntil=null; r.resolveRound=null; r.resolutionToken=null; r.resolutionResultReceived=false;
      if(r.timer)clearTimeout(r.timer); r.timer=null;
      if(r.resolveWatchdog)clearTimeout(r.resolveWatchdog); r.resolveWatchdog=null;
      if(r.status!=='finished') r.status='lobby';
      rooms.set(r.code,r);

    }catch(e){console.error('campaign load:',f,e.message);}
  }
}
function campaignList(){return [...rooms.values()].map(r=>{syncConnections(r);return {code:r.code,name:r.name,status:r.status,round:r.round,sides:r.sides.map(s=>({id:s.id,name:s.name,alliance:s.alliance,countries:s.countries,connected:!!s.connected})),orderDurationMs:r.orderDurationMs,ordersCloseAt:r.ordersCloseAt,territorySetupCount:Object.keys(r.setupTerritoryOwners||{}).length,savedStatus:r.resumeSavedStatus||r.status,savedAt:fs.existsSync(campaignPath(r.code))?fs.statSync(campaignPath(r.code)).mtimeMs:null};});
}
const peers = new Map();
const sha = s => crypto.createHash('sha256').update(String(s ?? '')).digest('hex');
const token = () => crypto.randomBytes(18).toString('hex');
const resolutionToken = () => crypto.randomBytes(10).toString('hex');

function sanitizeTerritoryOwners(input){
  const clean={};
  if(!input || typeof input!=='object') return clean;
  for(const [k,v] of Object.entries(input)){
    if(/^\d+,\d+$/.test(k) && (!v || NATIONS.includes(v))) clean[k]=v;
  }
  return clean;
}
function chooseTerritoryOwners(incoming, existing, fallback){
  const cleanFallback=sanitizeTerritoryOwners(fallback);
  const cleanExisting=sanitizeTerritoryOwners(existing);
  const cleanIncoming=sanitizeTerritoryOwners(incoming);
  const merged={...cleanFallback,...cleanExisting,...cleanIncoming};
  return merged;
}
function normalizeUnitForServer(u){
  if(!u || typeof u!=='object') return null;
  const c=CATALOG[u.type]||{hp:1,dmg:0,rangeVis:0};
  const rawQ=isLandingShipType(u.type)?1:Math.max(0,Math.floor(Number(u.quantity)||0));
  const rawInitialQ=isLandingShipType(u.type)?1:(Number.isFinite(Number(u.initialQuantity))?Math.max(0,Math.floor(Number(u.initialQuantity))):rawQ);
  const rawInitialMaxHp=Number(u.initialMaxHp)>0?Number(u.initialMaxHp):0;
  let currentHp=Number(u.currentHp);
  if(!Number.isFinite(currentHp)||currentHp<0)currentHp=rawQ*c.hp;

  // Estado autoritativo: quantity é derivada do HP atual. Assim um dano parcial
  // nunca transforma uma unidade viva em quantity=0 durante save/load ou rejoin.
  const inferredAliveQ=currentHp>0?Math.max(1,Math.ceil(currentHp/c.hp)):0;
  const inferredInitialQ=rawInitialMaxHp>0?Math.ceil(rawInitialMaxHp/c.hp):0;
  const initialQ=Math.max(rawInitialQ,inferredInitialQ,inferredAliveQ);
  const maxHp=Math.max(initialQ*c.hp,currentHp);
  const out={...u};
  out.initialQuantity=initialQ;
  out.initialMaxHp=maxHp;
  out.currentHp=Math.min(Math.max(0,currentHp),maxHp);
  if(out.currentHp>0){
    out.quantity=Math.max(1,Math.ceil(out.currentHp/c.hp));
    out.hp=out.quantity;
    out.maxHp=out.quantity;
  }else{
    out.currentHp=0;out.quantity=0;out.hp=0;out.maxHp=0;
  }
  out.dmg=c.dmg;
  out.rangeVis=c.rangeVis;
  if(c.airMaxTurns){out.airMaxTurns=c.airMaxTurns;out.airTurnCount=Math.max(0,Math.floor(Number(u.airTurnCount)||0));out.airRefueling=!!u.airRefueling;out.airFacilityId=u.airFacilityId||null;}else{delete out.airMaxTurns;delete out.airTurnCount;delete out.airRefueling;delete out.airFacilityId;}
  out.positionLocked=!!u.positionLocked;
  out.positionRound=Number.isFinite(Number(u.positionRound))?Number(u.positionRound):null;
  out.movePath=Array.isArray(u.movePath)?u.movePath.slice(0,32).map(pt=>{const x=Number(pt?.x),y=Number(pt?.y);return Number.isFinite(x)&&Number.isFinite(y)?{x:Math.max(0,Math.round(x)),y:Math.max(0,Math.round(y))}:null}).filter(Boolean):[];
  if(u.retreatState&&u.retreatState.enemyId!=null&&Number.isFinite(Number(u.retreatState.escapeRound))) out.retreatState={enemyId:String(u.retreatState.enemyId),escapeRound:Number(u.retreatState.escapeRound)}; else delete out.retreatState;
  if(u.pursuitState&&u.pursuitState.enemyId!=null&&Number.isFinite(Number(u.pursuitState.round))) out.pursuitState={enemyId:String(u.pursuitState.enemyId),round:Number(u.pursuitState.round)}; else delete out.pursuitState;
  if(isLandingShipType(out.type)){out.quantity=1;out.hp=1;out.maxHp=1;out.initialQuantity=1;out.initialMaxHp=c.hp;out.currentHp=Math.min(Math.max(0,out.currentHp),c.hp);out.carriedTroops=(Array.isArray(u.carriedTroops)?u.carriedTroops:[]).filter(t=>t&&isGroundType(t.type)&&Number(t.currentHp||0)>0).slice(0,landingShipCapacity(out.type)).map(t=>normalizeUnitForServer(t)).filter(Boolean);} else delete out.carriedTroops;
  return out;
}
const code = () => crypto.randomBytes(3).toString('hex').toUpperCase();
const MONTH = 30*24*60*60*1000;
function normalizeDuration(value, unit){
  const n=Math.max(1,Math.floor(Number(value)||0));
  const mult={ms:1,s:1000,m:60000,h:3600000,d:86400000,w:604800000,month:MONTH}[unit]||1000;
  return Math.min(n*mult, MONTH);
}
function cleanSides(input){
  return (Array.isArray(input)?input:[]).slice(0,8).map((s,i)=>({
    id:`S${i+1}`, name:String(s.name||`Lado ${i+1}`).slice(0,40),
    alliance:String(s.alliance||`A${i+1}`).slice(0,30),
    countries:[...new Set((Array.isArray(s.countries)?s.countries:[]).filter(n=>NATIONS.includes(n)))],
    passwordHash:sha(s.password||'')
  })).filter(s=>s.countries.length);
}
function syncConnections(r){
  const connectedIds=new Set();
  let actualHost=false;
  for(const p of peers.values()){
    if(p.roomCode===r.code && p.sideId) connectedIds.add(p.sideId);
    if(p.roomCode===r.code && p.role==='host') actualHost=true;
  }
  // S1 remains reserved for the creator even before the WebSocket finishes attaching.
  // Once attached, its live connection is authoritative.
  r.hostConnected=actualHost || (!r.hostAttached && r.hostConnected===true);
  for(const s of r.sides) s.connected=connectedIds.has(s.id);
  const s1=r.sides.find(s=>s.id==='S1'); if(s1) s1.connected=r.hostConnected;
  return connectedIds;
}
function tryResumeCampaign(r){
  if(!r?.isCampaign || !r.resumePending) return false;
  syncConnections(r);
  if(!(r.sides||[]).every(s=>s.connected)) return false;
  r.resumePending=false;
  const saved=String(r.resumeSavedStatus||'playing');
  if(saved==='truce'){
    r.status='truce';
    r.treaties.resumeReady={};
    persist(r); broadcast(r);
    return true;
  }
  if(saved==='placement'){
    r.status='placement'; r.sides.forEach(s=>s.ready=false); r.placementCommitPending=false; r.placementUnitsBySide={};
    persist(r); broadcast(r);
    return true;
  }
  if(saved==='finished'){
    r.status='finished'; persist(r); broadcast(r); return true;
  }
  // Campanha salva durante uma rodada ou na pausa: reabre uma nova janela de ordens
  // na mesma rodada, preservando tropas, territórios, intel e histórico já salvos.
  r.status='playing';
  startRound(r,false);
  return true;
}
function publicConfig(r){syncConnections(r);return {
  code:r.code,name:r.name,status:r.status,fog:true,round:r.round,
  orderDurationMs:r.orderDurationMs,ordersOpenAt:r.ordersOpenAt,ordersCloseAt:r.ordersCloseAt,executeAt:r.executeAt,resolving:!!r.resolving,resolvingUntil:r.resolvingUntil||null,awaitingNextRound:!!r.awaitingNextRound,nextRoundReady:r.sides.map(s=>({id:s.id,ready:!!(r.nextRoundReady&&r.nextRoundReady[s.id])})),placementReady:r.sides.map(s=>({id:s.id,ready:!!s.ready})),armySetupReady:r.sides.map(s=>({id:s.id,ready:!!r.armySetupBySide?.[s.id]?.confirmed})),armySetupComplete:!!r.armySetupComplete,territorySetupCount:Object.keys(r.setupTerritoryOwners||{}).length,warReport:r.fullState?.warReport||null,warStats:ensureWarStats(r),treaties:{telegrams:(r.treaties?.telegrams||[]).slice(-100),truce:r.treaties?.truce||null,peace:r.treaties?.peace||null,resumeReady:r.treaties?.resumeReady||{}},
  sides:r.sides.map(s=>({id:s.id,name:s.name,alliance:s.alliance,countries:s.countries,connected:!!s.connected,ready:!!s.ready})),channels:refreshChannelOwners(r).map(ch=>({...ch}))
};}
function sideFor(r, player){return r.sides.find(s=>s.id===player.sideId);}
function allianceFor(r, side){return side?.alliance || null;}
function allies(r, side){return r.sides.filter(s=>s.alliance===allianceFor(r,side));}
function coalitionCountries(r, side){return allies(r,side).flatMap(s=>s.countries);}
function submarineDetectorRange(u){
  if(!u || u.hp<=0) return 0;
  // Submarinos só são revelados por unidades com capacidade de detecção.
  // Destroyers usam seu alcance visual/sonar; patrulhas e aeronaves usam o
  // alcance efetivo de ataque, mantendo o comportamento especial pedido para
  // aeronaves: fighter NÃO detecta submarinos.
  if(['Navio Médio (Destroyer)','Fragata','Contra-Torpedeiro'].includes(u.type)) return 3;
  if(u.type==='Navio Pequeno (Patrulha)') return 2;
  if(['Attacker Médio/Pequeno','Attacker Pequeno','Attacker Médio'].includes(u.type)) return 1;
  if(['Bombardeiro Médio','Bombardeiro Pequeno','Bombardeiro Grande'].includes(u.type)) return 1;
  return 0;
}

function canDetectSubmarine(r, friendly, submarine){
  return (r.fullState?.units||[]).some(a=>{
    if(!friendly.includes(a.nation) || a.hp<=0 || a.type==='Submarino') return false;
    const range=submarineDetectorRange(a);
    return range>0 && Math.hypot(Number(a.x)-Number(submarine.x),Number(a.y)-Number(submarine.y))<=range*20;
  });
}

function canSee(r, side, u){
  if(!side) return false;
  // Membros da mesma aliança são SEMPRE visíveis entre si, independentemente
  // da distância, da fase (lobby/posicionamento/batalha) ou do fog of war.
  const friendly=coalitionCountries(r,side);
  if(friendly.includes(u.nation)) return true;
  if(!r.fog) return true;
  if(u.type==='Submarino') return canDetectSubmarine(r,friendly,u);
  // A capacidade de visão pertence à unidade que está observando (a),
  // não ao alvo (u). Isso mantém o servidor consistente com o cálculo do cliente.
  return (r.fullState?.units||[]).some(a=>{
    if(!friendly.includes(a.nation) || Number(a.hp)<=0) return false;
    const range=(CATALOG[a.type]||{}).rangeVis||0;
    return Math.hypot(Number(a.x)-Number(u.x),Number(a.y)-Number(u.y))<=range*20;
  });
}
function filteredUnits(r, side){
  return (r.fullState?.units||[]).filter(u=>canSee(r,side,u)).map(u=>({...u}));
}
function rebuildReconIntel(r){
  const out={};
  for(const s of r.sides){for(const n of s.countries)out[n]={};}
  const all=r.fullState?.units||[];
  for(const scout of all){
    if(scout.action!=='Reconhecimento'||Number(scout.hp||0)<=0)continue;
    const scoutSide=r.sides.find(s=>s.countries.includes(scout.nation));
    if(!scoutSide)continue;
    const friendly=new Set(coalitionCountries(r,scoutSide));
    const range=(CATALOG[scout.type]||{}).rangeVis||0;
    const rangePx=range*20;
    for(const enemy of all){
      if(enemy.hp<=0||friendly.has(enemy.nation))continue;
      if(enemy.type==='Submarino'){
        const detectorRange=submarineDetectorRange(scout);
        if(!(detectorRange>0) || Math.hypot(Number(enemy.x)-Number(scout.x),Number(enemy.y)-Number(scout.y))>detectorRange*20) continue;
      } else if(Math.hypot(Number(enemy.x)-Number(scout.x),Number(enemy.y)-Number(scout.y))>rangePx){
        continue;
      }
        if(!out[scout.nation])out[scout.nation]={};
        out[scout.nation][String(enemy.id)]={id:enemy.id,nation:enemy.nation,type:enemy.type,symbol:enemy.symbol,code:enemy.code||'',x:enemy.x,y:enemy.y,quantity:Number(enemy.quantity)||0,hp:Number(enemy.currentHp ?? enemy.hp ?? 0),maxHp:Number(enemy.initialMaxHp||enemy.maxHp||enemy.hp||0),spottedAt:Date.now()};
      }
    }
  return out;
}
function filteredIntel(r,side){
  const out={};
  for(const n of coalitionCountries(r,side)) Object.assign(out,r.fullState?.reconIntel?.[n]||{});
  return out;
}
function filteredLog(r,side){
  const friendly=new Set(coalitionCountries(r,side||{}));
  const log=r.fullState?.log||[];
  return Array.isArray(log)?log.map(html=>{
    if(typeof html!=='string'||!html.includes(' moveu ')) return html;
    const m=html.match(/<b>\s*([^<]+?)\s*<\/b>\s+moveu\b/);
    if(!m||friendly.has(m[1].trim())) return html;
    return html
      .replace(/\s+para\s+\([^)]*\)/,' para (LOCALIZAÇÃO CENSURADA)')
      .replace(/\s+até o local de encontro\s+\([^)]*\)/,' até o local de encontro (LOCALIZAÇÃO CENSURADA)');
  }):[];
}
function registerSameRoundRetreatPair(r,fleeing){
  if(!r||!fleeing||Number(fleeing.hp)<=0||String(fleeing.action||'')!=='Fuga') return null;
  r.retreatPairs=r.retreatPairs||{};
  const round=Number(r.round||1);
  const existing=r.retreatPairs[String(fleeing.id)];
  let enemy=null;
  if(existing&&Number(existing.round)===round){
    enemy=(r.fullState?.units||[]).find(u=>u&&Number(u.hp)>0&&String(u.id)===String(existing.enemyId))||null;
    if(enemy && !serverCanEngageEitherDirection(fleeing,enemy)) enemy=null;
  }
  if(!enemy){
    const enemies=serverCombatEnemiesForUnit(r,fleeing);
    enemies.sort((a,b)=>Math.hypot(Number(fleeing.x)-Number(a.x),Number(fleeing.y)-Number(a.y))-Math.hypot(Number(fleeing.x)-Number(b.x),Number(fleeing.y)-Number(b.y)));
    enemy=enemies[0]||null;
  }
  if(!enemy){delete r.retreatPairs[String(fleeing.id)];return null;}
  r.retreatPairs[String(fleeing.id)]={enemyId:String(enemy.id),round};
  return r.retreatPairs[String(fleeing.id)];
}
function cleanupSameRoundRetreatPairs(r){
  if(!r)return;
  r.retreatPairs=r.retreatPairs||{};
  const round=Number(r.round||1),all=Array.isArray(r.fullState?.units)?r.fullState.units:[];
  for(const [fleeId,pair] of Object.entries(r.retreatPairs)){
    const fleeing=all.find(u=>String(u.id)===String(fleeId));
    const enemy=pair&&all.find(u=>String(u.id)===String(pair.enemyId));
    if(Number(pair?.round)!==round || !fleeing || !enemy || Number(fleeing.hp)<=0 || Number(enemy.hp)<=0 || String(fleeing.action||'')!=='Fuga' || !serverCanEngageEitherDirection(fleeing,enemy)) delete r.retreatPairs[fleeId];
  }
}
function retreatOpportunitiesForSide(r,side){
  const out={};
  if(!r||!side)return out;
  const friendly=new Set(coalitionCountries(r,side));
  const all=Array.isArray(r.fullState?.units)?r.fullState.units:[];
  const round=Number(r.round||1);
  cleanupSameRoundRetreatPairs(r);

  // O par é registrado no instante em que FUGA é escolhida e pertence somente
  // à rodada atual. Isso torna a oportunidade independente de snapshots/race conditions.
  for(const [fleeId,pair] of Object.entries(r.retreatPairs||{})){
    if(Number(pair?.round)!==round)continue;
    const fleeing=all.find(u=>String(u.id)===String(fleeId));
    const pursuer=all.find(u=>u&&Number(u.hp)>0&&String(u.id)===String(pair.enemyId)&&friendly.has(u.nation));
    if(!fleeing||Number(fleeing.hp)<=0||String(fleeing.action||'')!=='Fuga'||!pursuer)continue;
    if(!serverCanEngageEitherDirection(pursuer,fleeing))continue;
    out[String(pursuer.id)]={enemyId:String(fleeing.id),x:Number(fleeing.x),y:Number(fleeing.y),round};
  }

  // Fallback para estados antigos/saves criados antes do registro explícito.
  for(const fleeing of all){
    if(!fleeing||Number(fleeing.hp)<=0||String(fleeing.action||'')!=='Fuga')continue;
    const state=fleeing.retreatState;
    if(!state||Number(state.escapeRound)!==round||state.enemyId==null)continue;
    const pursuer=all.find(u=>u&&Number(u.hp)>0&&String(u.id)===String(state.enemyId)&&friendly.has(u.nation));
    if(!pursuer||!serverCanEngageEitherDirection(pursuer,fleeing))continue;
    out[String(pursuer.id)]={enemyId:String(fleeing.id),x:Number(fleeing.x),y:Number(fleeing.y),round};
  }
  return out;
}
function syncSameRoundRetreatStates(r){
  if(!r||!r.fullState||!Array.isArray(r.fullState.units))return;
  const round=Number(r.round||1),all=r.fullState.units;
  r.retreatPairs=r.retreatPairs||{};
  for(const u of all){
    if(!u||Number(u.hp)<=0){delete u.retreatState;delete u.pursuitState;continue;}

    if(String(u.action||'')==='Fuga'){
      const pair=registerSameRoundRetreatPair(r,u);
      if(pair) u.retreatState={enemyId:String(pair.enemyId),escapeRound:round};
      else delete u.retreatState;
    }else if(u.retreatState && Number(u.retreatState.escapeRound)<=round){
      delete u.retreatState;
      delete r.retreatPairs[String(u.id)];
    }

    if(String(u.action||'')!=='Perseguição') delete u.pursuitState;
    else {
      const ps=u.pursuitState;
      const target=ps&&Number(ps.round)===round?all.find(enemy=>String(enemy.id)===String(ps.enemyId)&&Number(enemy.hp)>0&&String(enemy.action||'')==='Fuga'):null;
      if(!target) delete u.pursuitState;
    }
  }
  cleanupSameRoundRetreatPairs(r);
}
function cloneAuthoritativeState(r){
  const fs=r.fullState||{};
  return {
    units:Array.isArray(fs.units)?fs.units.map(normalizeUnitForServer).filter(Boolean):[],
    territoryOwners:sanitizeTerritoryOwners(fs.territoryOwners||r.setupTerritoryOwners||{}),
    reconIntel:fs.reconIntel&&typeof fs.reconIntel==='object'?JSON.parse(JSON.stringify(fs.reconIntel)):{},
    log:Array.isArray(fs.log)?fs.log.slice(-160):[],
    warReport:fs.warReport||null,
    round:Number(r.round||fs.round||1)
  };
}
function authoritativeResumeState(r,p){
  if(!r?.isCampaign || p?.role!=='host' || !r.resumeHydratingHost) return null;
  return cloneAuthoritativeState(r);
}
function visibleState(r,p){
  const side=sideFor(r,p); const fs=r.fullState||{};
  // O Host precisa do estado completo para executar a resolução. O convidado
  // recebe apenas unidades visíveis e nunca recebe destino/caminho exatos de
  // tropas inimigas; para elas, a única informação de movimento é a previsão
  // calculada autoritativamente pelo servidor.
  const rawUnits=p?.role==='host'
    ? (Array.isArray(fs.units)?fs.units:[]).map(u=>({...u}))
    : filteredUnits(r,side).map(u=>{
        const out={...u};
        if(!side?.countries?.includes(out.nation)){
          delete out.movePath;
          out.targetX=null;
          out.targetY=null;
          delete out.retreatState;
        }
        return out;
      });
  const movementPredictions=movementPredictionsForVisibleState(r,side);
  // Ordens exatas são uma informação de simulação do Host e não são publicadas
  // no state do convidado.
  const movementOrders={};
  if(p?.role==='host'){
    rawUnits.forEach(u=>{
      if(!u||Number(u.hp)<=0||side?.countries?.includes(u.nation))return;
      const hasPath=Array.isArray(u.movePath)&&u.movePath.some(pt=>Number(pt?.x)!==Number(u.x)||Number(pt?.y)!==Number(u.y));
      const hasTarget=Number.isFinite(Number(u.targetX))&&Number.isFinite(Number(u.targetY))&&(Number(u.targetX)!==Number(u.x)||Number(u.targetY)!==Number(u.y));
      if(hasPath||hasTarget) movementOrders[String(u.id)]={action:u.action||'Mover',targetX:u.targetX,targetY:u.targetY,movePath:Array.isArray(u.movePath)?u.movePath.map(pt=>({...pt})):[]};
    });
  }
  return {type:'state',config:publicConfig(r),sideId:p.sideId||null,countries:side?.countries||[],alliedCountries:coalitionCountries(r,side||{}),units:rawUnits,movementOrders,movementPredictions,retreatOpportunities:retreatOpportunitiesForSide(r,side),territoryOwners:fs.territoryOwners||r.setupTerritoryOwners||{},reconIntel:filteredIntel(r,side),log:filteredLog(r,side),fog:true,round:r.round,treaties:{telegrams:(r.treaties?.telegrams||[]).slice(-100),truce:r.treaties?.truce||null,peace:r.treaties?.peace||null,resumeReady:r.treaties?.resumeReady||{}},warReport:fs.warReport||null,channels:refreshChannelOwners(r).map(ch=>({...ch})),armySetup:armySetupForSide(r,side),orders:r.ordersBySide?.[p.sideId]||{},authoritativeFullState:authoritativeResumeState(r,p)};
}
function send(ws,obj){if(ws.readyState===1)ws.send(JSON.stringify(obj));}
function broadcast(r){for(const [ws,p] of peers){if(p.roomCode===r.code)send(ws,visibleState(r,p));}}
function toHost(r,msg){for(const [ws,p] of peers){if(p.roomCode===r.code&&p.role==='host'){send(ws,msg);return true;}}return false;}
function persist(r){saveCampaign(r);}
function startRound(r, advance=false){
  const now=Date.now();
  r.status='playing';
  if(advance) r.round=Math.max(1,Number(r.round||1)+1); else r.round=Math.max(1,Number(r.round||1));
  r.ordersBySide={};
  for(const s of r.sides) r.ordersBySide[s.id]={count:0,lastAt:null};
  r.ordersOpenAt=now; r.ordersCloseAt=now+r.orderDurationMs; r.executeAt=r.ordersCloseAt;
  // Nova rodada: estados de fuga/perseguição pertencem exclusivamente à rodada
  // anterior e não podem criar uma nova oportunidade sem uma nova ordem de FUGA.
  r.retreatPairs={};
  if(Array.isArray(r.fullState?.units)){
    r.fullState.units.forEach(u=>{
      const hp=Number(u.currentHp ?? u.hp ?? 0);
      if(hp>0){
        u.positionLocked=false;
        u.positionRound=r.round;
        // FUGA/PERSEGUIÇÃO pertence somente à rodada em que foi escolhida.
        // Depois da resolução, uma nova rodada começa sempre sem herdar a
        // missão especial anterior; isso evita que um novo engajamento continue
        // automaticamente como perseguição/fuga.
        if(u.action==='Fuga'||u.action==='Perseguição') u.action='Guardar';
        delete u.retreatState;
        delete u.pursuitState;
      }
    });
  }
  r.resolving=false; r.resolveRound=null; r.resolvingUntil=null; r.resolveStartedAt=null; r.resolveWatchdog=null;
  r.awaitingNextRound=false; r.nextRoundReady={};
  refreshMovementPredictionCache(r);
  broadcast(r);
  broadcastMovementPredictions(r);
  persist(r); scheduleResolution(r);
}
loadCampaigns();

function scheduleResolution(r){
  if(r.timer)clearTimeout(r.timer);
  r.timer=null;
  if(r.status!=='playing'||!r.executeAt||r.resolving||r.awaitingNextRound)return;
  const delay=Math.max(0,r.executeAt-Date.now());
  r.timer=setTimeout(()=>{
    r.timer=null;
    if(!rooms.has(r.code)||r.status!=='playing'||r.resolving)return;
    const round=Number(r.round);
    const deadline=Number(r.executeAt);
    r.resolving=true;
    r.resolveRound=round;
    r.resolutionToken=resolutionToken();
    r.resolutionResultReceived=false;
    r.resolveStartedAt=Date.now();
    r.resolvingUntil=r.resolveStartedAt+2000;
    broadcast(r);
    persist(r);
    r.timer=setTimeout(()=>{
      r.timer=null;
      if(!rooms.has(r.code)||r.status!=='playing'||!r.resolving||Number(r.resolveRound)!==round)return;
      const hostPeer=[...peers.entries()].find(([sock,p])=>p.roomCode===r.code&&p.role==='host');
      if(hostPeer){
        const [hostWs,hostPlayer]=hostPeer;
        send(hostWs,{type:'remote_resolve',round,deadline,processMs:2000,resolutionToken:r.resolutionToken,state:visibleState(r,hostPlayer)});
      } else {
        r.status='paused';
        r.resolving=false;r.resolveRound=null;r.resolutionToken=null;r.resolutionResultReceived=false;
        r.resolvingUntil=null;r.resolveStartedAt=null;
        r.executeAt=null;r.ordersOpenAt=null;r.ordersCloseAt=null;
        broadcast(r);persist(r);return;
      }
      r.resolveWatchdog=setTimeout(()=>{
        if(!rooms.has(r.code)||r.status!=='playing'||!r.resolving||Number(r.resolveRound)!==round)return;
        r.status='paused';
        r.resolving=false;r.resolveRound=null;r.resolutionToken=null;r.resolutionResultReceived=false;
        r.resolvingUntil=null;r.resolveStartedAt=null;r.executeAt=null;r.ordersOpenAt=null;r.ordersCloseAt=null;
        broadcast(r);persist(r);
      },15000);
    },2000);
  },delay);
}

function serverCurrentRound(r){return Number(r?.round||1);}
function serverCombatEnemiesForUnit(r,u){
  if(!r||!u||Number(u.hp)<=0)return [];
  const ownerSide=r.sides.find(s=>Array.isArray(s.countries)&&s.countries.includes(u.nation));
  const friendly=new Set(ownerSide?coalitionCountries(r,ownerSide):[u.nation]);
  return (r.fullState?.units||[]).filter(other=>{
    if(!other||String(other.id)===String(u.id)||Number(other.hp)<=0)return false;
    if(friendly.has(other.nation))return false;
    return serverCanEngageEitherDirection(u,other);
  });
}
function serverRetreatStateActive(r,u){
  return !!(u?.retreatState && Number(u.retreatState.escapeRound)===serverCurrentRound(r));
}
function serverHasPursuitOpportunity(r,side,u){
  if(!r||!side||!u)return false;
  const opp=retreatOpportunitiesForSide(r,side)[String(u.id)];
  return !!opp;
}
function serverMovementRangeQuadrants(u){
  const def=CATALOG?.[String(u?.type)];
  const value=Number(u?.moveRange ?? def?.moveRange);
  return Number.isFinite(value) && value>0 ? value : Infinity;
}
function serverMovementRouteLengthQuadrants(u,points){
  if(!u||!Array.isArray(points)||!points.length)return 0;
  let cx=Number(u.x||0), cy=Number(u.y||0), total=0;
  for(const pt of points){
    const x=Number(pt?.x), y=Number(pt?.y);
    if(!Number.isFinite(x)||!Number.isFinite(y)) return Infinity;
    total += Math.hypot(x-cx,y-cy)/20;
    cx=x; cy=y;
  }
  return total;
}
function serverMovementRouteWithinLimit(u,points){
  return serverMovementRouteLengthQuadrants(u,points) <= serverMovementRangeQuadrants(u)+1e-9;
}
function validateOrder(r,sideId,c){
  const side=r.sides.find(s=>s.id===sideId); if(!side||!c||c.kind!=='order')return false;
  const u=(r.fullState?.units||[]).find(x=>String(x.id)===String(c.id));
  const allowed=['Guardar','Mover','Ataque','Reconhecimento','Fuga','Perseguição'];
  if(!u||!side.countries.includes(u.nation)||!allowed.includes(c.action))return false;
  const inCombat=serverCombatEnemiesForUnit(r,u).length>0;
  const escapeWindow=serverRetreatStateActive(r,u);
  if((inCombat||escapeWindow) && !['Guardar','Fuga','Perseguição'].includes(c.action)) return false;
  if(c.action==='Fuga' && !inCombat && !escapeWindow) return false;
  if(c.action==='Perseguição' && !serverHasPursuitOpportunity(r,side,u)) return false;
  if(c.movePath!==undefined){
    if(!Array.isArray(c.movePath)||c.movePath.length>32)return false;
    if(c.movePath.some(pt=>!pt||!Number.isFinite(Number(pt.x))||!Number.isFinite(Number(pt.y))))return false;
  }
  const route=Array.isArray(c.movePath)&&c.movePath.length ? c.movePath : (Number.isFinite(Number(c.targetX))&&Number.isFinite(Number(c.targetY)) ? [{x:Number(c.targetX),y:Number(c.targetY)}] : []);
  if(route.length && !serverMovementRouteWithinLimit(u,route))return false;
  return true;
}
app.get('/api/campaigns',(req,res)=>res.json({campaigns:campaignList()}));
app.get('/api/campaigns/:code',(req,res)=>{const c=String(req.params.code).toUpperCase();const r=rooms.get(c);if(!r)return res.status(404).json({error:'Campanha não encontrada.'});saveCampaign(r);res.json(serializeRoom(r));});
app.post('/api/campaigns/import',(req,res)=>{try{const d=req.body?.campaign||req.body;const r=d?.room;if(!r?.code||!Array.isArray(r.sides)||r.sides.length<2)return res.status(400).json({error:'Arquivo de campanha inválido.'});let c=String(r.code).toUpperCase();if(rooms.has(c)){let i=2,base=c;while(rooms.has(c))c=base+'-'+i++;r.code=c;}r.fog=true;r.isCampaign=true;ensureArmySetup(r);r.resumeSavedStatus=String(r.status||'playing');r.resumePending=true;r.timer=null;r.resolving=false;r.resolvingUntil=null;r.resolveRound=null;r.resolutionToken=null;r.resolutionResultReceived=false;r.awaitingNextRound=false;r.nextRoundReady={};r.placementCommitPending=false;r.placementUnitsBySide={};r.setupTerritoryOwners=r.setupTerritoryOwners||{};r.treaties=r.treaties||{telegrams:[],truce:null,peace:null,resumeReady:{}};r.warStats=r.warStats||{committedBySide:{},killedBySide:{},registeredUnits:{}};ensureWarStats(r);r.hostConnected=false;r.hostAttached=false;r.resumeHydratingHost=false;r.sides.forEach(s=>{s.connected=false;s.ready=false;});if(r.status!=='finished')r.status='lobby';rooms.set(c,r);saveCampaign(r);res.json({ok:true,config:publicConfig(r),hostToken:r.hostToken});}catch(e){res.status(400).json({error:'Não foi possível importar a campanha.'});}});
app.delete('/api/campaigns/:code',(req,res)=>{const c=String(req.params.code).toUpperCase();const r=rooms.get(c);if(!r)return res.status(404).json({error:'Campanha não encontrada.'});if(r.timer)clearTimeout(r.timer);if(r.resolveWatchdog)clearTimeout(r.resolveWatchdog);rooms.delete(c);try{fs.unlinkSync(campaignPath(c));}catch{};for(const [ws,p] of peers){if(p.roomCode===c){send(ws,{type:'error',message:'A campanha foi excluída.'});try{ws.close();}catch{}}}res.json({ok:true});});
app.post('/api/campaigns/:code/save',(req,res)=>{const c=String(req.params.code).toUpperCase();const r=rooms.get(c);if(!r)return res.status(404).json({error:'Campanha não encontrada.'});if(String(req.body?.token||'')!==String(r.hostToken||''))return res.status(403).json({error:'Apenas o anfitrião pode salvar a campanha.'});const snap=req.body?.snapshot;if(snap&&Array.isArray(snap.units)){r.fullState={...(r.fullState||{}),units:snap.units.map(normalizeUnitForServer).filter(Boolean),territoryOwners:sanitizeTerritoryOwners(snap.territoryOwners||r.setupTerritoryOwners||{}),reconIntel:snap.reconIntel&&typeof snap.reconIntel==='object'?snap.reconIntel:{},log:Array.isArray(snap.log)?snap.log.slice(-160):[]};r.setupTerritoryOwners=chooseTerritoryOwners(r.fullState?.territoryOwners,r.setupTerritoryOwners,{});r.fullState.round=r.round;registerWarUnits(r,r.fullState.units);}const ok=saveCampaign(r);if(!ok)return res.status(500).json({error:'Não foi possível gravar a campanha no disco.'});res.json({ok:true,savedAt:Date.now(),code:c});});

app.get('/api/campaigns/:code/export',(req,res)=>{const c=String(req.params.code).toUpperCase();const r=rooms.get(c);if(!r)return res.status(404).json({error:'Campanha não encontrada.'});const data=JSON.stringify(serializeRoom(r),null,2);res.setHeader('Content-Type','application/json');res.setHeader('Content-Disposition',`attachment; filename="${c}.krieg.json"`);res.send(data);});

app.post('/api/rooms',(req,res)=>{
  const sides=cleanSides(req.body?.sides);
  if(sides.length<2)return res.status(400).json({error:'Configure pelo menos 2 lados.'});
  const used=new Set(); for(const s of sides)for(const n of s.countries){if(used.has(n))return res.status(400).json({error:`O país ${n} está em mais de um lado.`});used.add(n);}
  const duration=normalizeDuration(req.body?.orderDuration,req.body?.orderUnit);
  let c; do c=code(); while(rooms.has(c));
  const hostToken=token();
  const setupTerritoryOwners=sanitizeTerritoryOwners(req.body?.territoryOwners);
  const r={code:c,name:String(req.body?.name||'Minecraft Empires').slice(0,60),fog:true,round:1,status:'lobby',sides,fullState:null,setupTerritoryOwners,hostConnected:true,hostAttached:false,resumeHydratingHost:false,createdAt:Date.now(),hostToken,orderDurationMs:duration,ordersOpenAt:null,ordersCloseAt:null,executeAt:null,resolvingUntil:null,resolveRound:null,placementCommitPending:false,resolutionToken:null,resolutionResultReceived:false,awaitingNextRound:false,nextRoundReady:{},placementUnitsBySide:{},armySetupBySide:{},armySetupComplete:false,ordersBySide:{},retreatPairs:{},treaties:{telegrams:[],truce:null,peace:null,resumeReady:{}},warStats:{committedBySide:{},killedBySide:{},registeredUnits:{}},channels:defaultChannels(),
    // Toda sala já é salva automaticamente em disco (persist->saveCampaign) e
    // já aparece na tela "CAMPANHAS". Sem isCampaign=true aqui, o handshake
    // campaign_join (usado por "RETOMAR CAMPANHA") rejeitava a reconexão de
    // qualquer lado com "Campanha não encontrada ou indisponível.", mesmo com
    // a sala existindo e a partida em andamento. Isso reproduzia exatamente o
    // bug relatado ao Lado 1 sair e tentar reentrar.
    isCampaign:true};
  const s1=r.sides.find(s=>s.id==='S1');if(s1)s1.connected=true;
  ensureArmySetup(r);
  rooms.set(c,r);res.json({code:c,hostToken,config:publicConfig(r)});
});
app.post('/api/rooms/:code/start',(req,res)=>{
  const r=rooms.get(String(req.params.code).toUpperCase());
  if(!r)return res.status(404).json({error:'Sala não encontrada.'});
  if(String(req.body?.token||'')!==String(r.hostToken||''))return res.status(403).json({error:'Token do anfitrião inválido.'});
  const s1=r.sides.find(s=>s.id==='S1');
  if(!s1)return res.status(400).json({error:'O Lado 1 do anfitrião não existe.'});
  syncConnections(r);
  const s2=r.sides.filter(s=>s.id!=='S1');
  if(r.status==='playing'||r.status==='placement'){
    const fake={roomCode:r.code,sideId:'S1',role:'host'};
    return res.json({ok:true,state:visibleState(r,fake)});
  }
  if(r.status!=='lobby')return res.status(409).json({error:'A sala não está no lobby.'});
  if(!r.hostConnected)return res.status(409).json({error:'O anfitrião não está conectado.'});
  if(r.sides.length!==2 || !s2[0]?.connected)return res.status(409).json({error:'O Lado 2 ainda não está conectado.'});
  // A versão enviada pelo anfitrião é a autoridade para o mapa inicial.
  const incomingTerritories=sanitizeTerritoryOwners(req.body?.territoryOwners);
  if(Object.keys(incomingTerritories).length) r.setupTerritoryOwners=incomingTerritories;
  r.status='placement';
  r.resolutionToken=null; r.resolutionResultReceived=false;
  r.awaitingNextRound=false; r.nextRoundReady={};
  r.placementCommitPending=false;
  r.sides.forEach(x=>x.ready=false);
  if(!r.fullState)r.fullState={units:[],territoryOwners:r.setupTerritoryOwners||{},reconIntel:{},log:[]};
  r.placementUnitsBySide={};
  r.armySetupComplete=false;
  ensureArmySetup(r);
  for(const side of r.sides){r.armySetupBySide[side.id].confirmed=false;}
  (r.fullState.units||[]).forEach(u=>{u.positionLocked=false;u.positionRound=null;});
  persist(r);
  broadcast(r);
  const fake={roomCode:r.code,sideId:'S1',role:'host'};
  res.json({ok:true,state:visibleState(r,fake)});
});
app.get('/api/rooms/:code/status',(req,res)=>{
  const r=rooms.get(String(req.params.code).toUpperCase());
  if(!r)return res.status(404).json({error:'Sala não encontrada.'});
  syncConnections(r);
  res.set('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');
  const statusSideId=String(req.query?.sideId||'');
  const statusSide=statusSideId?r.sides.find(s=>s.id===statusSideId):null;
  const statusRetreatOpportunities=statusSide?retreatOpportunitiesForSide(r,statusSide):{};
  res.json({code:r.code,name:r.name,status:r.status,round:r.round,orderDurationMs:r.orderDurationMs,ordersOpenAt:r.ordersOpenAt,ordersCloseAt:r.ordersCloseAt,executeAt:r.executeAt,resolving:!!r.resolving,resolvingUntil:r.resolvingUntil||null,placementReady:r.sides.map(s=>({id:s.id,ready:!!s.ready})),armySetupReady:r.sides.map(s=>({id:s.id,ready:!!r.armySetupBySide?.[s.id]?.confirmed})),armySetupComplete:!!r.armySetupComplete,warReport:r.fullState?.warReport||null,treaties:{telegrams:(r.treaties?.telegrams||[]).slice(-100),truce:r.treaties?.truce||null,peace:r.treaties?.peace||null,resumeReady:r.treaties?.resumeReady||{}},retreatOpportunities:statusRetreatOpportunities,channels:refreshChannelOwners(r).map(ch=>({...ch})),sides:r.sides.map(s=>({id:s.id,name:s.name,alliance:s.alliance,countries:s.countries,connected:!!s.connected,ready:!!s.ready}))});
});
app.get('/api/rooms/:code',(req,res)=>{const r=rooms.get(String(req.params.code).toUpperCase());if(!r)return res.status(404).json({error:'Sala não encontrada.'});syncConnections(r);res.json(publicConfig(r));});

function treatySidePayload(r, sideId){
  const s=r.sides.find(x=>x.id===sideId); return s?{id:s.id,name:s.name}:null;
}
function treatyText(v,max=6000){return String(v??'').trim().slice(0,max);}
function ensureWarStats(r){
  const blank={committedBySide:{},killedBySide:{},registeredUnits:{}};
  r.warStats=r.warStats||blank;
  r.warStats.committedBySide=r.warStats.committedBySide||{};
  r.warStats.killedBySide=r.warStats.killedBySide||{};
  r.warStats.registeredUnits=r.warStats.registeredUnits||{};
  for(const side of (r.sides||[])){
    if(!Number.isFinite(Number(r.warStats.committedBySide[side.id])))r.warStats.committedBySide[side.id]=0;
    if(!Number.isFinite(Number(r.warStats.killedBySide[side.id])))r.warStats.killedBySide[side.id]=0;
  }
  return r.warStats;
}
function sideIdForNation(r,nation){const s=(r.sides||[]).find(x=>Array.isArray(x.countries)&&x.countries.includes(nation));return s?.id||null;}
function registerWarUnits(r, units){
  const st=ensureWarStats(r);
  for(const u of (Array.isArray(units)?units:[])){
    if(u?.pendingRegistration)continue;
    const id=String(u.id||''); if(!id)continue;
    const sid=sideIdForNation(r,u.nation); if(!sid)continue;
    const qty=Math.max(0,Math.floor(Number(u.initialQuantity ?? u.quantity)||0));
    const prev=st.registeredUnits[id];
    if(prev==null){st.registeredUnits[id]={sideId:sid,initialQuantity:qty};st.committedBySide[sid]=(Number(st.committedBySide[sid])||0)+qty;}
    else if(qty>Number(prev.initialQuantity||0)){const delta=qty-Number(prev.initialQuantity||0);prev.initialQuantity=qty;st.committedBySide[sid]=(Number(st.committedBySide[sid])||0)+delta;}
  }
}
function recordWarCasualties(r, beforeUnits, afterUnits){
  const st=ensureWarStats(r);
  const after=new Map((Array.isArray(afterUnits)?afterUnits:[]).map(u=>[String(u.id),u]));
  for(const old of (Array.isArray(beforeUnits)?beforeUnits:[])){
    const id=String(old?.id||''); if(!id)continue;
    const sid=sideIdForNation(r,old.nation); if(!sid)continue;
    const beforeQty=Math.max(0,Math.floor(Number(old.quantity)||0));
    const now=after.get(id);
    const afterQty=now?Math.max(0,Math.floor(Number(now.quantity)||0)):0;
    const lost=Math.max(0,beforeQty-afterQty);
    if(lost>0)st.killedBySide[sid]=(Number(st.killedBySide[sid])||0)+lost;
  }
}
function warReport(r){
  const fs=r.fullState||{}; const units=Array.isArray(fs.units)?fs.units:[]; const st=ensureWarStats(r); registerWarUnits(r,units);
  const committedTotal=Object.values(st.committedBySide).reduce((a,v)=>a+(Number(v)||0),0);
  const killedTotal=Object.values(st.killedBySide).reduce((a,v)=>a+(Number(v)||0),0);
  const survivors={}; r.sides.forEach(s=>{survivors[s.id]={side:s.name,countries:s.countries,units:units.filter(u=>s.countries.includes(u.nation)&&Number(u.quantity)>0).length};});
  const sides=r.sides.map(s=>({id:s.id,name:s.name,alliance:s.alliance,countries:s.countries,soldiersInvolved:Number(st.committedBySide[s.id]||0),soldiersKilled:Number(st.killedBySide[s.id]||0)}));
  return {createdAt:Date.now(),round:Number(r.round||1),status:'finished',sides,territories:{},survivors,telegrams:(r.treaties?.telegrams||[]).length,soldiersInvolved:committedTotal,soldiersKilled:killedTotal,text:`RELATÓRIO FINAL DA GUERRA\nRodadas encerradas: ${Number(r.round||1)}\nSoldados envolvidos: ${committedTotal}\nSoldados mortos: ${killedTotal}\nTelegramas trocados: ${(r.treaties?.telegrams||[]).length}.`};
}
function clearRoundTimers(r){if(r.timer)clearTimeout(r.timer);if(r.resolveWatchdog)clearTimeout(r.resolveWatchdog);r.timer=null;r.resolveWatchdog=null;r.resolving=false;r.resolveRound=null;r.resolutionToken=null;r.resolutionResultReceived=false;r.resolvingUntil=null;r.resolveStartedAt=null;r.executeAt=null;r.ordersOpenAt=null;r.ordersCloseAt=null;}

wss.on('connection',(ws)=>{
  const player={roomCode:null,sideId:null,role:'guest'};
  ws.isAlive=true;
  ws.on('pong',()=>{ws.isAlive=true;});
  peers.set(ws,player); send(ws,{type:'hello'});
  ws.on('message',(raw)=>{
    let m;try{m=JSON.parse(raw.toString())}catch{return send(ws,{type:'error',message:'Mensagem inválida.'});}
    if(m.type==='host_attach'){
      const r=rooms.get(String(m.code||'').toUpperCase());
      if(!r)return send(ws,{type:'error',message:'Sala não encontrada.'});
      if(m.token!==r.hostToken)return send(ws,{type:'error',message:'Token do anfitrião inválido.'});
      if(String(m.sideId||'')!=='S1')return send(ws,{type:'error',message:'O anfitrião deve obrigatoriamente ocupar o Lado 1.'});
      const anotherHost=[...peers.entries()].some(([other,op])=>other!==ws&&op.roomCode===r.code&&op.role==='host');
      if(anotherHost)return send(ws,{type:'error',message:'Já existe um anfitrião conectado nesta batalha.'});
      player.roomCode=r.code;player.sideId='S1';player.role='host';r.hostAttached=true;r.hostConnected=true;if(r.isCampaign) r.resumeHydratingHost=true;
      const s=r.sides.find(x=>x.id==='S1');if(s)s.connected=true;
      if(r.status==='playing'){if(r.executeAt&&Date.now()>=r.executeAt)send(ws,{type:'remote_resolve',round:r.round,deadline:r.executeAt});else scheduleResolution(r);}
      send(ws,{type:'joined',state:visibleState(r,player)});broadcast(r);return;
    }
    if(m.type==='campaign_join'){
      const r=rooms.get(String(m.code||'').toUpperCase());
      if(!r||!r.isCampaign)return send(ws,{type:'error',message:'Campanha não encontrada ou indisponível.'});
      const side=r.sides.find(s=>s.id===m.sideId);
      if(!side)return send(ws,{type:'error',message:'Lado inválido.'});
      if(String(m.password||'')==='' || sha(m.password||'')!==side.passwordHash)return send(ws,{type:'error',message:'Senha incorreta.'});
      if(side.id==='S1'){
        for(const [oldSock,op] of peers){
          if(oldSock!==ws && op.roomCode===r.code && op.sideId==='S1'){try{send(oldSock,{type:'replaced_connection',message:'Reconexão do Lado 1 efetuada por outra sessão.'});oldSock.close();}catch{}}
        }
      }else{
        const existing=[...peers.entries()].some(([sock,p])=>sock!==ws&&p.roomCode===r.code&&p.sideId===side.id);
        if(existing)return send(ws,{type:'error',message:'Este lado já está conectado.'});
      }
      player.roomCode=r.code;player.sideId=side.id;player.role=side.id==='S1'?'host':'guest';side.connected=true;
      if(player.role==='host'){r.hostAttached=true;r.hostConnected=true;if(r.isCampaign) r.resumeHydratingHost=true;}
      if(r.resumePending)r.resumeLastJoinAt=Date.now();
      tryResumeCampaign(r);
      send(ws,{type:'campaign_joined',state:visibleState(r,player)});
      broadcast(r);
      return;
    }
    if(m.type==='join'){
      const r=rooms.get(String(m.code||'').toUpperCase());if(!r)return send(ws,{type:'error',message:'Sala não encontrada.'});
      const side=r.sides.find(s=>s.id===m.sideId);if(!side)return send(ws,{type:'error',message:'Lado inválido.'});
      if(String(m.password||'')==='' || sha(m.password||'')!==side.passwordHash)return send(ws,{type:'error',message:'Senha incorreta.'});
      const existing=[...peers.entries()].filter(([sock,p])=>sock!==ws&&p.roomCode===r.code&&p.sideId===side.id);
      if(existing.length && !(r.isCampaign && side.id==='S1')) return send(ws,{type:'error',message:'Este lado já está conectado.'});
      if(side.id==='S1'&&!r.isCampaign)return send(ws,{type:'error',message:'O Lado 1 é reservado ao anfitrião que criou a batalha.'});
      if(r.isCampaign && side.id==='S1' && existing.length){
        for(const [oldSock] of existing){try{send(oldSock,{type:'replaced_connection',message:'Reconexão do anfitrião efetuada por outra sessão.'});oldSock.close();}catch{}}
      }
      if(r.isCampaign && r.resumePending) r.resumeLastJoinAt=Date.now();
      if(r.status==='finished')return send(ws,{type:'error',message:'A partida já terminou.'});
      player.roomCode=r.code;player.sideId=side.id;player.role=side.id==='S1'?'host':'guest';side.connected=true;
      if(player.role==='host'){r.hostAttached=true;r.hostConnected=true;if(r.isCampaign) r.resumeHydratingHost=true;}
      if(r.isCampaign) tryResumeCampaign(r);
      send(ws,{type:'joined',state:visibleState(r,player)});broadcast(r);return;
    }
    if(m.type==='client_heartbeat'){
      try{send(ws,{type:'server_heartbeat',t:Date.now(),echo:m.t||null});}catch{}
      return;
    }
    if(!player.roomCode)return send(ws,{type:'error',message:'Entre em uma sala primeiro.'});
    const r=rooms.get(player.roomCode);if(!r)return;
    if(m.type==='host_territory_setup'&&player.role==='host'){
      if(r.status==='playing')return send(ws,{type:'error',message:'A partida já começou; a configuração inicial de territórios está bloqueada.'});
      r.setupTerritoryOwners=sanitizeTerritoryOwners(m.territoryOwners);
      persist(r);broadcast(r);return;
    }
    if(m.type==='host_refresh'&&player.role==='host'){
      syncConnections(r);
      broadcast(r);
      send(ws,{type:'refresh_ok',state:visibleState(r,player)});
      return;
    }
    if(m.type==='host_start'&&player.role==='host'){
      syncConnections(r);
      if(r.status==='playing'){send(ws,{type:'game_started',state:visibleState(r,player)});return;}
      if(r.status==='placement'){send(ws,{type:'placement_started',state:visibleState(r,player)});return;}
      if(r.status!=='lobby')return send(ws,{type:'error',message:'A sala não está disponível para iniciar agora.'});
      if(!r.hostConnected)return send(ws,{type:'error',message:'O anfitrião não está conectado.'});
      const connectedSides=r.sides.filter(s=>s.connected);
      if(connectedSides.length<2)return send(ws,{type:'error',message:`É necessário 2 lados conectados. Atualmente: ${connectedSides.length}.`});
      r.status='placement'; r.placementCommitPending=false; r.sides.forEach(s=>s.ready=false);
      if(!r.fullState)r.fullState={units:[],territoryOwners:r.setupTerritoryOwners||{},reconIntel:{},log:[]};
  r.placementUnitsBySide={};
  ensureArmySetup(r);
  for(const side of r.sides){r.armySetupBySide[side.id].confirmed=false;}
  (r.fullState.units||[]).forEach(u=>{u.positionLocked=false;u.positionRound=null;});
      persist(r);broadcast(r);
      for(const [sock,p] of peers){if(p.roomCode===r.code)send(sock,{type:'placement_started',state:visibleState(r,p)});}
      return;
    }
    if(m.type==='army_setup_confirm'){
      if(r.status!=='placement')return send(ws,{type:'error',message:'A preparação do exército não está ativa.'});
      const side=sideFor(r,player); if(!side)return send(ws,{type:'error',message:'Lado inválido.'});
      if(r.armySetupBySide?.[side.id]?.confirmed)return send(ws,{type:'error',message:'A preparação deste lado já foi confirmada.'});
      // A configuração só chega ao servidor neste momento. Durante a edição ela
      // permanece exclusivamente local, como uma confirmação de próxima rodada.
      const setup=normalizeArmySetupForSide(side,m.setup||{});
      if(!armySetupWithinManpower(setup)) return send(ws,{type:'error',message:'O manpower de um ou mais países foi ultrapassado.'});
      setup.confirmed=true;r.armySetupBySide=r.armySetupBySide||{};r.armySetupBySide[side.id]=setup;
      r.armySetupComplete=!!(r.sides.length===2 && r.sides.every(s=>!!r.armySetupBySide?.[s.id]?.confirmed && !!s.connected));
      persist(r);broadcast(r);
      if(r.armySetupComplete){
        for(const [sock,p] of peers){if(p.roomCode===r.code)send(sock,{type:'army_setup_complete',round:r.round,state:visibleState(r,p)});}
      }else{
        send(ws,{type:'army_setup_confirmed',state:visibleState(r,player)});
      }
      return;
    }
    if(m.type==='room_sync_request'){
      syncConnections(r);
      send(ws,{type:'room_sync',state:visibleState(r,player)});
      return;
    }
    if(m.type==='placement_ready'&&player.role==='guest'){
      if(r.status!=='placement')return send(ws,{type:'error',message:'A fase de posicionamento não está ativa.'});
      const side=sideFor(r,player);if(!side)return send(ws,{type:'error',message:'Lado inválido.'});
      const submitted=Array.isArray(m.units)?m.units.map(normalizeUnitForServer).filter(Boolean):[];
      const placementCheck=validatePlacementAgainstArmySetup(r,submitted.filter(u=>side.countries.includes(u.nation)));
      if(!placementCheck.ok)return send(ws,{type:'error',message:'Posicionamento inválido: '+placementCheck.errors.slice(0,3).join(' ')});
      side.ready=true;
      r.placementUnitsBySide[side.id]=submitted.filter(u=>side.countries.includes(u.nation)).map(u=>({...u,positionLocked:true,positionRound:null}));
      syncConnections(r);broadcast(r);
      if(r.sides.length===2&&r.sides.every(s=>s.connected&&s.ready)&&!r.placementCommitPending){
        r.placementCommitPending=true;
        if(!toHost(r,{type:'placement_commit',round:r.round,unitsBySide:r.placementUnitsBySide}))r.placementCommitPending=false;
      }
      return;
    }
    if(m.type==='host_placement_ready'&&player.role==='host'){
      if(r.status!=='placement')return send(ws,{type:'error',message:'A fase de posicionamento não está ativa.'});
      const side=r.sides.find(s=>s.id==='S1');if(!side)return;
      const submitted=Array.isArray(m.units)?m.units.map(normalizeUnitForServer).filter(Boolean):[];
      const placementCheck=validatePlacementAgainstArmySetup(r,submitted.filter(u=>side.countries.includes(u.nation)));
      if(!placementCheck.ok)return send(ws,{type:'error',message:'Posicionamento inválido: '+placementCheck.errors.slice(0,3).join(' ')});
      side.ready=true;
      r.placementUnitsBySide[side.id]=submitted.filter(u=>side.countries.includes(u.nation)).map(u=>({...u,positionLocked:true,positionRound:null}));
      syncConnections(r);broadcast(r);
      if(r.sides.length===2&&r.sides.every(s=>s.connected&&s.ready)&&!r.placementCommitPending){
        r.placementCommitPending=true;
        if(!toHost(r,{type:'placement_commit',round:r.round,unitsBySide:r.placementUnitsBySide}))r.placementCommitPending=false;
      }
      return;
    }
    if(m.type==='host_placement_done'&&player.role==='host'){
      if(r.status!=='placement'||!r.placementCommitPending)return;
      const placementUnits=Array.isArray(m.units)?m.units.map(normalizeUnitForServer).filter(Boolean):[];
      const placementCheck=validatePlacementAgainstArmySetup(r,placementUnits);
      if(!placementCheck.ok)return send(ws,{type:'error',message:'Posicionamento inválido: '+placementCheck.errors.slice(0,3).join(' ')});
      r.fullState={units:placementUnits,territoryOwners:chooseTerritoryOwners(m.territoryOwners,r.fullState?.territoryOwners,r.setupTerritoryOwners),reconIntel:{},log:Array.isArray(m.log)?m.log.slice(-160):[]};
      r.fullState.units.forEach(u=>{u.positionLocked=true;u.positionRound=null;});
      registerWarUnits(r,r.fullState.units);
      // A posição final confirmada é a posição oficial da unidade.
      // O Scout só atualiza a inteligência durante o processamento da rodada.
      r.placementCommitPending=false;r.sides.forEach(s=>s.ready=false);
      r.placementUnitsBySide={};
      startRound(r);
      for(const [sock,p] of peers){if(p.roomCode===r.code)send(sock,{type:'game_started',state:visibleState(r,p)});}
      return;
    }
    if(m.type==='host_resume_ack'&&player.role==='host'&&r.isCampaign){
      // O host só pode voltar a publicar snapshots depois de provar que aplicou o
      // estado autoritativo recebido no rejoin. Isso impede um snapshot local zerado
      // e antigo de sobrescrever a campanha imediatamente após a reconexão.
      r.resumeHydratingHost=false;
      persist(r);
      send(ws,{type:'host_resume_ack_ok'});
      broadcast(r);
      return;
    }
    if(m.type==='host_snapshot'&&player.role==='host'){
      // Durante a resolução somente host_resolve_done pode substituir o estado.
      // Snapshots atrasados não podem sobrescrever o resultado de uma rodada.
      // Enquanto aguarda a confirmação dos lados, o resultado da rodada também fica congelado.
      if(r.resolving||r.awaitingNextRound||r.resumeHydratingHost) return;
      const incomingUnits=Array.isArray(m.units)?m.units.map(normalizeUnitForServer).filter(Boolean):[];
      const hostSide=r.sides.find(s=>s.id==='S1');
      const hostCountries=new Set(hostSide?.countries||[]);
      const previousUnits=Array.isArray(r.fullState?.units)?r.fullState.units:[];
      const incomingIds=new Set(incomingUnits.map(u=>String(u.id)));
      // O host recebe uma visão limitada pelo Fog of War. Portanto, uma unidade do
      // outro lado que não aparece no snapshot NÃO significa que ela foi removida.
      // Mantemos essas unidades no estado autoritativo para que ordens do S2, saves
      // e a próxima rodada nunca encontrem uma unidade "sumida".
      const hiddenOpponentUnits=previousUnits.filter(u=>!hostCountries.has(u.nation)&&!incomingIds.has(String(u.id))&&Number(u.currentHp ?? u.hp ?? 0)>0);
      const mergedUnits=incomingUnits.concat(hiddenOpponentUnits);
      r.fullState={units:mergedUnits,territoryOwners:chooseTerritoryOwners(m.territoryOwners,r.fullState?.territoryOwners,r.setupTerritoryOwners),reconIntel:m.reconIntel||{},log:Array.isArray(m.log)?m.log.slice(-160):[]};
      syncSameRoundRetreatStates(r);
      registerWarUnits(r,mergedUnits);
      refreshMovementPredictionCache(r);
      broadcast(r); broadcastMovementPredictions(r); persist(r);
      return;
    }
    if(m.type==='host_resolve_done'&&player.role==='host'){
      if(r.status!=='playing'||!r.resolving) return;
      if(Number(m.round)!==Number(r.resolveRound)||String(m.resolutionToken||'')!==String(r.resolutionToken||'')) return;
      if(r.resolutionResultReceived)return;
      r.resolutionResultReceived=true;
      const resolvedUnits=Array.isArray(m.units)?m.units.map(normalizeUnitForServer).filter(Boolean):[];
      const hostSide=r.sides.find(s=>s.id==='S1');
      const hostCountries=new Set(hostSide?.countries||[]);
      const resolvedIds=new Set(resolvedUnits.map(u=>String(u.id)));
      // IDs que o host CONFIRMOU como destruídos nesta resolução (viu a unidade,
      // calculou o combate, e ela morreu). Isso é diferente de uma unidade que
      // simplesmente está fora do alcance de visão do host — as duas situações
      // produzem a mesma ausência em resolvedIds, então sem essa lista explícita
      // o servidor não tinha como distingui-las e acabava "ressuscitando" tropas
      // do outro lado que na verdade morreram, causando dessincronização entre
      // os lados (um via a tropa morta, o outro continuava podendo movê-la).
      const destroyedIds=new Set(Array.isArray(m.destroyedIds)?m.destroyedIds.map(String):[]);
      const previousUnits=Array.isArray(r.fullState?.units)?r.fullState.units:[];
      // O host trabalha com uma visão limitada pelo Fog of War. Qualquer inimigo ausente
      // do snapshot do host que NÃO foi confirmado como destruído continua apenas fora
      // de vista. Preserve sua última versão autoritativa para impedir desaparecimentos
      // silenciosos após uma resolução — mas nunca reviva quem o host confirmou morto.
      const hiddenUnits=previousUnits.filter(u=>!hostCountries.has(u.nation)&&!resolvedIds.has(String(u.id))&&!destroyedIds.has(String(u.id))&&Number(u.currentHp ?? u.hp ?? 0)>0);
      const finalUnits=resolvedUnits.concat(hiddenUnits);
      recordWarCasualties(r,previousUnits,finalUnits);
      registerWarUnits(r,finalUnits);
      r.fullState={units:finalUnits,territoryOwners:chooseTerritoryOwners(m.territoryOwners,r.fullState?.territoryOwners,r.setupTerritoryOwners),reconIntel:m.reconIntel||{},log:Array.isArray(m.log)?m.log.slice(-160):[]};
      // Se a retirada realmente saiu do alcance de combate, encerra também a
      // missão especial no estado autoritativo. Assim um reencontro posterior
      // não herda uma perseguição antiga; o novo combate poderá iniciar um novo
      // ciclo FUGA/PERSEGUIÇÃO normalmente.
      const finalUnitsById=new Map(r.fullState.units.map(u=>[String(u.id),u]));
      for(const [fleeId,pair] of Object.entries(r.retreatPairs||{})){
        const fleeing=finalUnitsById.get(String(fleeId));
        const pursuer=finalUnitsById.get(String(pair?.enemyId||''));
        if(!fleeing||!pursuer||Number(fleeing.hp)<=0||Number(pursuer.hp)<=0||!serverCanEngageEitherDirection(fleeing,pursuer)){
          if(fleeing?.action==='Fuga') fleeing.action='Guardar';
          if(pursuer?.action==='Perseguição') pursuer.action='Guardar';
        }
      }
      r.fullState.units.forEach(u=>{delete u.retreatState;delete u.pursuitState;});
      r.retreatPairs={};
      refreshMovementPredictionCache(r);
      if(r.resolveWatchdog)clearTimeout(r.resolveWatchdog);
      r.resolveWatchdog=null;
      r.resolving=false;
      r.resolvingUntil=null;
      r.resolveRound=null;
      r.resolveStartedAt=null;
      r.resolutionToken=null;
      r.resolutionResultReceived=false;
      r.awaitingNextRound=true;
      r.nextRoundReady={};
      for(const [ws,p] of peers){
        if(p.roomCode===r.code) send(ws,{type:'round_resolved',round:r.round,state:visibleState(r,p)});
      }
      broadcast(r);
      broadcastMovementPredictions(r);
      persist(r);
      return;
    }
    if(m.type==='confirm_next_round'){
      if(r.status!=='playing'||!r.awaitingNextRound)return;
      if(r.treaties?.truce||r.treaties?.peace)return send(ws,{type:'error',message:'Há um documento diplomático aguardando decisão. Abra TRATADOS para aceitar ou recusar.'});
      const side=sideFor(r,player); if(!side)return;
      r.nextRoundReady=r.nextRoundReady||{};
      if(r.nextRoundReady[side.id])return;
      r.nextRoundReady[side.id]=true;

      const allConfirmed=r.sides.length===2 && r.sides.every(s=>!!r.nextRoundReady[s.id] && !!s.connected);
      if(allConfirmed){
        // A transição para a nova rodada é atômica: não fazemos um broadcast
        // intermediário com awaitingNextRound=true depois que o segundo lado confirmou.
        r.awaitingNextRound=false;
        r.nextRoundReady={};
        startRound(r,true);
        for(const [sock,p] of peers){
          if(p.roomCode===r.code){
            send(sock,{type:'next_round_started',round:r.round,state:visibleState(r,p)});
          }
        }
      }else{
        // Apenas o primeiro clique precisa ser refletido na UI.
        broadcast(r);
        persist(r);
      }
      return;
    }
    // Reconfiguração no intervalo entre rodadas: adicionar mais países a um lado
    // e/ou reabrir a planilha de recrutamento para acrescentar tropas/manpower,
    // sempre sem apagar o que já foi configurado e respeitando o que já está no mapa.
    if(m.type==='reconfig_add_country'){
      if(r.status!=='playing')return send(ws,{type:'error',message:'Só é possível reconfigurar durante uma partida em andamento.'});
      if(!r.awaitingNextRound)return send(ws,{type:'error',message:'A reconfiguração só está disponível no intervalo entre rodadas.'});
      if(r.treaties?.truce||r.treaties?.peace)return send(ws,{type:'error',message:'Há um documento diplomático aguardando decisão. Abra TRATADOS para aceitar ou recusar.'});
      const side=sideFor(r,player); if(!side)return send(ws,{type:'error',message:'Lado inválido.'});
      const nation=String(m.nation||'').trim();
      if(!nation||!NATIONS.includes(nation))return send(ws,{type:'error',message:'País inválido.'});
      const owned=r.sides.some(s=>Array.isArray(s.countries)&&s.countries.includes(nation));
      if(owned)return send(ws,{type:'error',message:'Esse país já pertence a um dos lados.'});
      side.countries=[...(side.countries||[]),nation];
      ensureArmySetup(r);
      persist(r);broadcast(r);
      return;
    }
    if(m.type==='reconfig_remove_country'){
      if(r.status!=='playing')return send(ws,{type:'error',message:'Só é possível reconfigurar durante uma partida em andamento.'});
      if(!r.awaitingNextRound)return send(ws,{type:'error',message:'A reconfiguração só está disponível no intervalo entre rodadas.'});
      if(r.treaties?.truce||r.treaties?.peace)return send(ws,{type:'error',message:'Há um documento diplomático aguardando decisão. Abra TRATADOS para aceitar ou recusar.'});
      const side=sideFor(r,player); if(!side)return send(ws,{type:'error',message:'Lado inválido.'});
      const nation=String(m.nation||'').trim();
      if(!nation||!(side.countries||[]).includes(nation))return send(ws,{type:'error',message:'Esse país não pertence ao seu lado.'});
      if((side.countries||[]).length<=1)return send(ws,{type:'error',message:'Não é possível remover o único país do seu lado.'});
      const hasUnits=(r.fullState?.units||[]).some(u=>String(u.nation)===nation&&Number(u.currentHp??u.hp??0)>0);
      if(hasUnits)return send(ws,{type:'error',message:`${nation} ainda tem tropas no mapa. Retire ou dissolva essas forças antes de remover o país.`});
      side.countries=side.countries.filter(n=>n!==nation);
      if(r.armySetupBySide?.[side.id]?.countries)delete r.armySetupBySide[side.id].countries[nation];
      persist(r);broadcast(r);
      return;
    }
    if(m.type==='army_setup_reopen'){
      if(r.status!=='playing')return send(ws,{type:'error',message:'Só é possível reconfigurar durante uma partida em andamento.'});
      if(!r.awaitingNextRound)return send(ws,{type:'error',message:'A reabertura da planilha só está disponível no intervalo entre rodadas.'});
      if(r.treaties?.truce||r.treaties?.peace)return send(ws,{type:'error',message:'Há um documento diplomático aguardando decisão. Abra TRATADOS para aceitar ou recusar.'});
      const side=sideFor(r,player); if(!side)return send(ws,{type:'error',message:'Lado inválido.'});
      ensureArmySetup(r);
      r.armySetupBySide[side.id].confirmed=false;
      persist(r);broadcast(r);
      return;
    }
    if(m.type==='army_setup_reconfigure_confirm'){
      if(r.status!=='playing')return send(ws,{type:'error',message:'Só é possível reconfigurar durante uma partida em andamento.'});
      if(!r.awaitingNextRound)return send(ws,{type:'error',message:'A reconfiguração só está disponível no intervalo entre rodadas.'});
      if(r.treaties?.truce||r.treaties?.peace)return send(ws,{type:'error',message:'Há um documento diplomático aguardando decisão. Abra TRATADOS para aceitar ou recusar.'});
      const side=sideFor(r,player); if(!side)return send(ws,{type:'error',message:'Lado inválido.'});
      ensureArmySetup(r);
      const prevSetup=r.armySetupBySide[side.id];
      const newSetup=normalizeArmySetupForSide(side,m.setup||{});
      const check=validateArmySetupReconfigure(r,side,prevSetup,newSetup);
      if(!check.ok)return send(ws,{type:'error',message:check.errors.slice(0,4).join(' ')});
      newSetup.confirmed=true;
      r.armySetupBySide[side.id]=newSetup;
      persist(r);broadcast(r);
      send(ws,{type:'army_setup_reconfigure_done',state:visibleState(r,player)});
      return;
    }
    if(m.type==='guest_command'&&player.role==='guest'){
      if(r.status!=='playing'&&r.status!=='placement')return send(ws,{type:'error',message:'A partida ainda não começou.'});
      const c=m.command;
      if(c?.kind==='order'){
        if(r.status!=='playing')return send(ws,{type:'error',message:'As ordens só começam após os dois lados confirmarem o posicionamento.'});
        if(Date.now()>r.ordersCloseAt)return send(ws,{type:'error',message:'A janela de ordens desta rodada já fechou.'});
        const side=sideFor(r,player);
        const u=(r.fullState?.units||[]).find(x=>String(x.id)===String(c.id));
        if(!side||!u||!side.countries.includes(u.nation))return send(ws,{type:'error',message:'Ordem inválida ou unidade não pertence ao seu lado.'});
        if(!validateOrder(r,player.sideId,c))return send(ws,{type:'error',message:'Essa tropa está em combate: use FUGA ou uma ação de perseguição compatível.'});
        // O servidor registra a ordem imediatamente no estado autoritativo e também
        // a encaminha ao host para manter a simulação local sincronizada. O snapshot
        // posterior do host nunca apaga unidades do outro lado.
        u.action=String(c.action||'Nenhuma');
        if(String(c.action||'')==='Fuga') registerSameRoundRetreatPair(r,u);
        else if(String(c.action||'')!=='Perseguição') delete r.retreatPairs?.[String(u.id)];
        u.movePath=Array.isArray(c.movePath)?c.movePath.slice(0,32).map(pt=>{const x=Number(pt?.x),y=Number(pt?.y);return Number.isFinite(x)&&Number.isFinite(y)?{x:Math.max(0,Math.round(x)),y:Math.max(0,Math.round(y))}:null}).filter(Boolean):[];
        const last=u.movePath.length?u.movePath[u.movePath.length-1]:null;
        u.targetX=last?Number(last.x):(c.targetX!=null&&Number.isFinite(Number(c.targetX))?Number(c.targetX):null);
        u.targetY=last?Number(last.y):(c.targetY!=null&&Number.isFinite(Number(c.targetY))?Number(c.targetY):null);
        if(String(c.action||'')==='Perseguição'){
          const opp=retreatOpportunitiesForSide(r,side)[String(u.id)];
          u.pursuitState=opp?{enemyId:String(opp.enemyId),round:Number(r.round||1)}:null;
        }else{
          delete u.pursuitState;
        }
        syncSameRoundRetreatStates(r);
        toHost(r,{type:'remote_command',fromSideId:player.sideId,command:{...c,movePath:u.movePath,targetX:u.targetX,targetY:u.targetY,pursuitEnemyId:u.pursuitState?.enemyId||null}});
        const o=r.ordersBySide[player.sideId]||(r.ordersBySide[player.sideId]={count:0,lastAt:null});o.count++;o.lastAt=Date.now();refreshMovementPredictionCache(r);persist(r);broadcast(r);broadcastMovementPredictions(r);return;
      }
      if(c?.kind==='spawn'){if(r.status==='playing'&&Date.now()>r.ordersCloseAt)return send(ws,{type:'error',message:'Janela fechada.'});if(!c.nation||!sideFor(r,player)?.countries?.includes(c.nation))return send(ws,{type:'error',message:'País inválido para este lado.'});toHost(r,{type:'remote_command',fromSideId:player.sideId,command:{...c,clientId:String(c.clientId||'')}});return;}
      if(c?.kind==='spawn_confirm'){
        if(r.status!=='playing')return send(ws,{type:'error',message:'A confirmação de posicionamento só ocorre durante a batalha.'});
        if(Date.now()>Number(r.ordersCloseAt||0))return send(ws,{type:'error',message:'A janela de posicionamento desta rodada já fechou.'});
        const side=sideFor(r,player), incoming=c.unit&&typeof c.unit==='object'?normalizeUnitForServer(c.unit):null;
        if(!side||!incoming||!side.countries.includes(incoming.nation))return send(ws,{type:'error',message:'Unidade inválida ou não pertence ao seu lado.'});
        incoming.positionLocked=true; incoming.positionRound=null;
        toHost(r,{type:'remote_command',fromSideId:player.sideId,command:{kind:'spawn_confirm',unit:incoming,clientId:String(c.clientId||incoming.id||'')}});
        return;
      }
      if(c?.kind==='position_confirm'){
        if(r.status!=='placement' && r.status!=='playing')return send(ws,{type:'error',message:'O posicionamento não está ativo.'});
        const side=sideFor(r,player); if(!side)return send(ws,{type:'error',message:'Lado inválido.'});
        const ids=Array.isArray(c.ids)?c.ids.map(String):[];
        const own=(r.fullState?.units||[]).filter(u=>side.countries.includes(u.nation));
        const validIds=new Set(ids);
        if(!ids.length && own.some(u=>!u.positionLocked)) return send(ws,{type:'error',message:'Nenhuma unidade foi confirmada.'});
        for(const u of own){
          if(validIds.has(String(u.id))){
            u.positionLocked=true;
            u.positionRound=null;
          }
        }
        toHost(r,{type:'remote_command',fromSideId:player.sideId,command:{kind:'position_confirm',ids}});
        return;
      }
      if(c?.kind==='position'){
        const side=sideFor(r,player),u=(r.fullState?.units||[]).find(x=>String(x.id)===String(c.id));
        if(!side||!u||!side.countries.includes(u.nation))return send(ws,{type:'error',message:'Unidade inválida ou não pertence ao seu lado.'});
        const x=Number(c.x),y=Number(c.y);
        if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>1600||y>900)return send(ws,{type:'error',message:'Posição inválida.'});
        const allowedInPlacement=r.status==='placement';
        const allowedNewRound=r.status==='playing' && !u.positionLocked && Number(u.positionRound)===Number(r.round) && Date.now()<=Number(r.ordersCloseAt||0);
        if(!allowedInPlacement&&!allowedNewRound)return send(ws,{type:'error',message:'O posicionamento desta unidade já está bloqueado.'});
        toHost(r,{type:'remote_command',fromSideId:player.sideId,command:{kind:'position',id:c.id,x,y}});return;
      }
      if(c?.kind==='embark'){
        const side=sideFor(r,player),ship=(r.fullState?.units||[]).find(x=>String(x.id)===String(c.shipId)),troop=(r.fullState?.units||[]).find(x=>String(x.id)===String(c.troopId));
        if(!side||!ship||!troop||!side.countries.includes(ship.nation)||!side.countries.includes(troop.nation)||!isLandingShipType(ship.type)||!isGroundType(troop.type))return send(ws,{type:'error',message:'Embarque inválido.'});
        const cargo=Array.isArray(ship.carriedTroops)?ship.carriedTroops:[];if(cargo.length>=landingShipCapacity(ship.type))return send(ws,{type:'error',message:'Capacidade do navio atingida.'});if(Math.hypot(Number(ship.x)-Number(troop.x),Number(ship.y)-Number(troop.y))>Math.max(1,Number(ship.rangeVis)||1)*20)return send(ws,{type:'error',message:'Tropa fora do alcance.'});if(cargo.some(t=>String(t.id)===String(troop.id)))return send(ws,{type:'error',message:'Tropa já embarcada.'});toHost(r,{type:'remote_command',fromSideId:player.sideId,command:{kind:'embark',shipId:String(ship.id),troopId:String(troop.id)}});return;
      }
      if(c?.kind==='disembark'){
        const side=sideFor(r,player),ship=(r.fullState?.units||[]).find(x=>String(x.id)===String(c.shipId)),idx=Number(c.index);if(!side||!ship||!side.countries.includes(ship.nation)||!isLandingShipType(ship.type))return send(ws,{type:'error',message:'Desembarque inválido.'});const cargo=Array.isArray(ship.carriedTroops)?ship.carriedTroops:[];if(!Number.isInteger(idx)||idx<0||idx>=cargo.length)return send(ws,{type:'error',message:'Tropa inválida.'});toHost(r,{type:'remote_command',fromSideId:player.sideId,command:{kind:'disembark',shipId:String(ship.id),index:idx}});return;
      }
      if(c?.kind==='edit'){if(r.status==='playing'&&Date.now()>r.ordersCloseAt)return send(ws,{type:'error',message:'Janela fechada.'});const side=sideFor(r,player);const u=(r.fullState?.units||[]).find(x=>String(x.id)===String(c.id));if(!side||!u||!side.countries.includes(u.nation))return send(ws,{type:'error',message:'Unidade inválida ou não pertence ao seu lado.'});if(c.field==='qty'){const q=Math.max(0,Math.floor(Number(c.value)||0));if(q>100000000)return send(ws,{type:'error',message:'Quantidade inválida.'});}if(c.field==='type'&&!CATALOG[c.value])return send(ws,{type:'error',message:'Tipo de tropa inválido.'});toHost(r,{type:'remote_command',fromSideId:player.sideId,command:c});return;}
    }
    if(m.type==='channel_set'){
      r.channels=normalizeChannels(r.channels);
      refreshChannelOwners(r);
      const ch=r.channels.find(x=>x.id===String(m.channelId||''));
      if(!ch)return send(ws,{type:'error',message:'Canal inválido.'});
      const side=sideFor(r,player), ownerCountry=ch.ownerCountry||channelOwner(r,ch);
      if(!side||!ownerCountry||String(m.nation||'')!==String(ownerCountry)||!side.countries.includes(String(m.nation||'')))return send(ws,{type:'error',message:'Somente o país dono do canal pode alterá-lo.'});
      if(!['all','allies','none'].includes(m.mode))return send(ws,{type:'error',message:'Abertura de canal inválida.'});
      ch.mode=m.mode;
      persist(r);
      broadcast(r);
      return;
    }
    if(m.type==='treaty_telegram'){
      if(r.status!=='playing'||r.resolving)return send(ws,{type:'error',message:'Telegramas só podem ser enviados durante as ordens ou na pausa entre rodadas.'});
      const side=sideFor(r,player),to=String(m.toSideId||''); if(!side)return;
      const target=r.sides.find(s=>s.id===to); if(!target||target.id===side.id)return send(ws,{type:'error',message:'Destinatário inválido.'});
      const body=treatyText(m.message); if(!body)return send(ws,{type:'error',message:'Escreva uma mensagem.'});
      const rec={id:token(),fromSideId:side.id,fromSideName:side.name,toSideId:target.id,toSideName:target.name,message:body,createdAt:Date.now()};
      r.treaties=r.treaties||{telegrams:[],truce:null,peace:null,resumeReady:{}};r.treaties.telegrams=(r.treaties.telegrams||[]).concat(rec).slice(-100);
      persist(r);broadcast(r);return;
    }
    if(m.type==='treaty_truce_propose'){
      if(r.status!=='playing'||!r.awaitingNextRound)return send(ws,{type:'error',message:'A trégua só pode ser proposta ao final da rodada.'});
      const side=sideFor(r,player),body=treatyText(m.text,8000);if(!side||!body)return send(ws,{type:'error',message:'Texto da trégua inválido.'});
      r.treaties=r.treaties||{telegrams:[],truce:null,peace:null,resumeReady:{}};
      if(r.treaties.truce)return send(ws,{type:'error',message:'Já existe uma proposta de trégua.'});
      r.treaties.truce={id:token(),proposedBy:side.id,proposedByName:side.name,text:body,createdAt:Date.now(),acceptedBy:{[side.id]:true}};
      persist(r);broadcast(r);return;
    }
    if(m.type==='treaty_truce_accept'){
      if(r.status!=='playing'||r.resolving||!r.awaitingNextRound)return;
      const side=sideFor(r,player),t=r.treaties?.truce;if(!side||!t)return send(ws,{type:'error',message:'Nenhuma proposta de trégua ativa.'});
      t.acceptedBy=t.acceptedBy||{};t.acceptedBy[side.id]=true;
      const both=r.sides.length===2&&r.sides.every(s=>!!t.acceptedBy[s.id]);
      if(both){clearRoundTimers(r);r.status='truce';r.awaitingNextRound=false;r.nextRoundReady={};r.treaties.resumeReady={};persist(r);broadcast(r);for(const [sock,p] of peers){if(p.roomCode===r.code)send(sock,{type:'truce_started',round:r.round,state:visibleState(r,p)});}}
      else{persist(r);broadcast(r);}return;
    }
    if(m.type==='treaty_peace_propose'){
      if(r.status!=='playing'||!r.awaitingNextRound)return send(ws,{type:'error',message:'O tratado de paz só pode ser proposto ao final da rodada.'});
      const side=sideFor(r,player),body=treatyText(m.text,8000);if(!side||!body)return send(ws,{type:'error',message:'Texto do tratado inválido.'});
      r.treaties=r.treaties||{telegrams:[],truce:null,peace:null,resumeReady:{}};
      if(r.treaties.peace)return send(ws,{type:'error',message:'Já existe uma proposta de paz.'});
      r.treaties.peace={id:token(),proposedBy:side.id,proposedByName:side.name,text:body,createdAt:Date.now(),acceptedBy:{[side.id]:true}};
      persist(r);broadcast(r);return;
    }
    if(m.type==='treaty_peace_accept'){
      if(r.status!=='playing'||r.resolving||!r.awaitingNextRound)return;
      const side=sideFor(r,player),t=r.treaties?.peace;if(!side||!t)return send(ws,{type:'error',message:'Nenhuma proposta de paz ativa.'});
      t.acceptedBy=t.acceptedBy||{};t.acceptedBy[side.id]=true;
      const both=r.sides.length===2&&r.sides.every(s=>!!t.acceptedBy[s.id]);
      if(both){clearRoundTimers(r);r.status='finished';r.awaitingNextRound=false;r.nextRoundReady={};r.fullState={...(r.fullState||{}),warReport:warReport(r)};persist(r);broadcast(r);for(const [sock,p] of peers){if(p.roomCode===r.code)send(sock,{type:'peace_concluded',round:r.round,report:r.fullState.warReport,state:visibleState(r,p)});}}
      else{persist(r);broadcast(r);}return;
    }
    if(m.type==='treaty_truce_reject'||m.type==='treaty_peace_reject'){
      if(r.status!=='playing'||r.resolving||!r.awaitingNextRound)return;
      const side=sideFor(r,player);const key=m.type==='treaty_truce_reject'?'truce':'peace';const t=r.treaties?.[key];
      if(!side||!t)return send(ws,{type:'error',message:'Nenhuma proposta ativa para recusar.'});
      if(t.proposedBy===side.id)return send(ws,{type:'error',message:'O autor da proposta não pode recusá-la como destinatário.'});
      r.treaties[key]=null;persist(r);broadcast(r);return;
    }
    if(m.type==='resume_truce'){
      if(r.status!=='truce')return;
      const side=sideFor(r,player);if(!side)return; r.treaties=r.treaties||{telegrams:[],truce:null,peace:null,resumeReady:{}};r.treaties.resumeReady=r.treaties.resumeReady||{};r.treaties.resumeReady[side.id]=true;
      const both=r.sides.length===2&&r.sides.every(s=>!!r.treaties.resumeReady[s.id]&&!!s.connected);
      if(both){
        r.treaties.resumeReady={};
        r.treaties.truce=null;
        r.nextRoundReady={};
        r.awaitingNextRound=false;
        r.resolving=false;
        r.resolvingUntil=null;
        r.resolveRound=null;
        r.resolutionToken=null;
        r.resolutionResultReceived=false;
        r.status='playing';
        startRound(r,true);
        persist(r);
        for(const [sock,p] of peers){if(p.roomCode===r.code)send(sock,{type:'truce_resumed',round:r.round,state:visibleState(r,p)});}
      }
      else{persist(r);broadcast(r);}return;
    }
        if(m.type==='host_event'&&player.role==='host'){r.status=m.status||r.status;if(m.log)r.fullState={...(r.fullState||{}),log:m.log};if(m.round)r.round=Number(m.round);broadcast(r);persist(r);return;}
    if(m.type==='host_new_round'&&player.role==='host'){if(r.status==='lobby')startRound(r);return;}
  });
  ws.on('close',()=>{
    const p=peers.get(ws);
    peers.delete(ws);
    if(!p?.roomCode)return;
    const r=rooms.get(p.roomCode);
    if(!r)return;
    if(p.role==='host'){
      const anotherHost=[...peers.values()].some(op=>op.roomCode===r.code&&op.role==='host');
      if(!anotherHost){
        r.hostConnected=false;
        r.hostAttached=true;
        const s1=r.sides.find(x=>x.id==='S1'); if(s1)s1.connected=false;
        if(r.timer)clearTimeout(r.timer);
        if(r.resolveWatchdog)clearTimeout(r.resolveWatchdog);
        persist(r);
        if(r.status==='playing')scheduleResolution(r);
      }
    }else{
      const anotherSide=[...peers.values()].some(op=>op.roomCode===r.code&&op.sideId===p.sideId);
      const s=r.sides.find(x=>x.id===p.sideId);
      if(s&&!anotherSide)s.connected=false;
    }
    syncConnections(r);
    broadcast(r);
  });
});

// Heartbeat do WebSocket: evita conexões ociosas por longos períodos e detecta
// conexões mortas sem depender de o jogador clicar/mover o mapa.
setInterval(()=>{
  for(const [ws,p] of peers){
    if(ws.readyState!==1) continue;
    if(ws.isAlive===false){ try{ws.terminate();}catch{}; continue; }
    ws.isAlive=false;
    try{ ws.ping(); }catch{}
  }
},25000);

setInterval(()=>{for(const r of rooms.values())persist(r);},15000);

setInterval(()=>{const cutoff=Date.now()-24*60*60*1000;for(const [c,r] of rooms)if(r.createdAt<cutoff&&!r.hostConnected)rooms.delete(c);},30*60*1000);
server.listen(PORT,()=>console.log(`Kriegspiel multiplayer on http://localhost:${PORT}`));
