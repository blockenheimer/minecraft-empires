from pathlib import Path
p=Path('/mnt/data/landing_work/public/index.html')
s=p.read_text()
# 1 constants after CHANNEL defs/natural area
needle="const CHANNEL_NATURAL = [\n 'Navio Pequeno (Patrulha)','Submarino','Battleship','Porta-Aviões',\n 'Navio Médio (Destroyer)','Navio Carga/Transporte','Desembarque Médio',\n 'Desembarque Pequeno','Desembarque Grande'\n];"
insert=needle+"\n        const LANDING_SHIP_CAPACITY = {\n            'Desembarque Pequeno': 1,\n            'Desembarque Médio': 5,\n            'Desembarque Grande': 10\n        };\n        const LANDING_SHIP_TYPES = Object.keys(LANDING_SHIP_CAPACITY);\n        function isLandingShip(unitOrType){ const t=typeof unitOrType==='string'?unitOrType:unitOrType?.type; return LANDING_SHIP_TYPES.includes(t); }\n        function landingShipCapacity(unitOrType){ const t=typeof unitOrType==='string'?unitOrType:unitOrType?.type; return LANDING_SHIP_CAPACITY[t]||0; }\n        function sanitizeCarriedTroopsLocal(ship){\n            const cap=landingShipCapacity(ship);\n            if(!cap){ delete ship.carriedTroops; return []; }\n            const raw=Array.isArray(ship.carriedTroops)?ship.carriedTroops:[];\n            ship.carriedTroops=raw.filter(t=>t&&isGroundUnit(t)&&Number(t.currentHp||0)>0).slice(0,cap).map(t=>JSON.parse(JSON.stringify(t)));\n            return ship.carriedTroops;\n        }\n        function getCarriedTroops(ship){ return sanitizeCarriedTroopsLocal(ship); }\n        function canEmbarkTroopInShip(ship,troop){\n            if(!ship||!troop||!isLandingShip(ship)||!isGroundUnit(troop)||!mpCanControl(troop)) return false;\n            if(String(ship.id)===String(troop.id)) return false;\n            const carried=getCarriedTroops(ship);\n            if(carried.length>=landingShipCapacity(ship)) return false;\n            const maxDist=Math.max(1,Number(ship.rangeVis)||1)*GRID_SIZE;\n            return Math.hypot(Number(ship.x)-Number(troop.x),Number(ship.y)-Number(troop.y))<=maxDist;\n        }\n        function getNearbyEmbarkableTroops(ship){\n            if(!isLandingShip(ship)) return [];\n            const carriedIds=new Set(getCarriedTroops(ship).map(t=>String(t.id)));\n            return units.filter(t=>t&&t.hp>0&&!carriedIds.has(String(t.id))&&isGroundUnit(t)&&mpCanControl(t)&&Math.hypot(Number(ship.x)-Number(t.x),Number(ship.y)-Number(t.y))<=Math.max(1,Number(ship.rangeVis)||1)*GRID_SIZE);\n        }"
if needle not in s: raise SystemExit('needle constants not found')
s=s.replace(needle,insert,1)
# 2 normalize function
old="""        function normalizeUnitHealthLocal(unit, resetInvalid = false) {\n            const item = TROOP_CATALOG.find(t => t.name === unit.type) || {hp:1,dmg:0,rangeVis:0};\n            const q = Math.max(0, Math.floor(Number(unit.quantity) || 0));\n            unit.quantity = q; unit.hp = q; unit.maxHp = q;\n"""
new="""        function normalizeUnitHealthLocal(unit, resetInvalid = false) {\n            const item = TROOP_CATALOG.find(t => t.name === unit.type) || {hp:1,dmg:0,rangeVis:0};\n            const q = isLandingShip(unit) ? 1 : Math.max(0, Math.floor(Number(unit.quantity) || 0));\n            unit.quantity = q; unit.hp = q; unit.maxHp = q;\n"""
if old not in s: raise SystemExit('normalize not found')
s=s.replace(old,new,1)
# add carried cleanup before return
old="""            unit.currentHp = Math.min(Math.max(0, Number(unit.currentHp)), maxHp);\n            unit.dmg = item.dmg; unit.rangeVis = item.rangeVis; unit.attackRange = Math.max(1, Number(item.attackRange) || 1);\n            return unit;\n        }"""
new="""            unit.currentHp = Math.min(Math.max(0, Number(unit.currentHp)), maxHp);\n            if(isLandingShip(unit)){ unit.quantity=1; unit.hp=1; unit.maxHp=1; unit.initialQuantity=1; unit.initialMaxHp=item.hp; if(!(Number(unit.currentHp)>0)||resetInvalid) unit.currentHp=item.hp; sanitizeCarriedTroopsLocal(unit); }\n            unit.dmg = item.dmg; unit.rangeVis = item.rangeVis; unit.attackRange = Math.max(1, Number(item.attackRange) || 1);\n            return unit;\n        }"""
if old not in s: raise SystemExit('normalize tail not found')
s=s.replace(old,new,1)
# 3 spawn quantity force and carried troops
s=s.replace("const quantity = 1;\n            const isNaval = catalogItem.cat === 'Navios';", "const quantity = isLandingShip(typeName) ? 1 : 1;\n            const isNaval = catalogItem.cat === 'Navios';",1)
s=s.replace("                currentHp: quantity * catalogItem.hp,\n                initialMaxHp: quantity * catalogItem.hp,", "                currentHp: quantity * catalogItem.hp,\n                initialMaxHp: quantity * catalogItem.hp,\n                carriedTroops: isLandingShip(typeName) ? [] : undefined,",1)
# 4 type/qty edits
old="""            const q = getUnitQuantity(selectedUnit);\n            selectedUnit.initialQuantity = q;\n            selectedUnit.initialMaxHp = q * catalogItem.hp;\n            selectedUnit.currentHp = q * catalogItem.hp;\n"""
new="""            if(isLandingShip(catalogItem.name) && getCarriedTroops(selectedUnit).length>0 && !isLandingShip(selectedUnit)) return;\n            const q = isLandingShip(catalogItem.name) ? 1 : getUnitQuantity(selectedUnit);\n            selectedUnit.quantity = q;\n            selectedUnit.initialQuantity = q;\n            selectedUnit.initialMaxHp = q * catalogItem.hp;\n            selectedUnit.currentHp = q * catalogItem.hp;\n            if(isLandingShip(catalogItem.name)) selectedUnit.carriedTroops=[];\n"""
# but condition nonsensical always false/true based selected type. replace with simpler
new="""            if(!isLandingShip(catalogItem.name) && isLandingShip(selectedUnit) && getCarriedTroops(selectedUnit).length>0) return;\n            const q = isLandingShip(catalogItem.name) ? 1 : getUnitQuantity(selectedUnit);\n            selectedUnit.quantity = q;\n            selectedUnit.initialQuantity = q;\n            selectedUnit.initialMaxHp = q * catalogItem.hp;\n            selectedUnit.currentHp = q * catalogItem.hp;\n            if(isLandingShip(catalogItem.name)) selectedUnit.carriedTroops=[];\n"""
if old not in s: raise SystemExit('edit type block not found')
s=s.replace(old,new,1)
# edit qty
old="""            qty = Math.max(0, qty);\n            const stats = getBattleStats(selectedUnit);\n            selectedUnit.quantity = qty;"""
new="""            qty = Math.max(0, qty);\n            if(isLandingShip(selectedUnit)) qty = 1;\n            const stats = getBattleStats(selectedUnit);\n            selectedUnit.quantity = qty;"""
if old not in s: raise SystemExit('edit qty not found')
s=s.replace(old,new,1)
# 5 add load functions before updateUnitDetail
needle="        function updateUnitDetail() {"
func=r'''        function embarkTroopOnSelectedShip(troopId){
            const ship=selectedUnit; const troop=units.find(u=>String(u.id)===String(troopId));
            if(!ship||!troop||!isLandingShip(ship)||!canEmbarkTroopInShip(ship,troop)) return false;
            const carried=getCarriedTroops(ship);
            carried.push(JSON.parse(JSON.stringify(troop)));
            ship.carriedTroops=carried.slice(0,landingShipCapacity(ship));
            units=units.filter(u=>String(u.id)!==String(troop.id));
            selectedUnits=selectedUnits.filter(u=>String(u.id)!==String(troop.id));
            selectedUnit=ship;
            normalizeUnitHealthLocal(ship);
            updateUnitDetail(); draw();
            if(MP?.role==='guest'&&MP.authenticated&&MP.ws?.readyState===1){MP.ws.send(JSON.stringify({type:'guest_command',command:{kind:'embark',shipId:ship.id,troopId:troop.id}}));}
            else if(MP?.role==='host'&&MP.authenticated) mpSendSnapshot();
            return true;
        }
        function disembarkTroopFromSelectedShip(index){
            const ship=selectedUnit; if(!ship||!isLandingShip(ship)) return false;
            const carried=getCarriedTroops(ship); const idx=Number(index); if(!Number.isInteger(idx)||idx<0||idx>=carried.length) return false;
            const troop=JSON.parse(JSON.stringify(carried[idx]));
            const x=Math.max(0,Math.min(MAP_WIDTH,Number(ship.x||0))), y=Math.max(0,Math.min(MAP_HEIGHT,Number(ship.y||0)));
            if(!isLandAt(x,y) && !(canCrossWaterWithEngineering(troop,x,y))) return false;
            troop.x=x; troop.y=y; troop.targetX=null; troop.targetY=null; troop.movePath=[]; troop.positionLocked=false; troop.positionRound=MP?.started?Number(MP.room?.round||1):null;
            ship.carriedTroops=carried.filter((_,i)=>i!==idx);
            units.push(troop); normalizeUnitHealthLocal(troop);
            updateUnitDetail(); draw();
            if(MP?.role==='guest'&&MP.authenticated&&MP.ws?.readyState===1){MP.ws.send(JSON.stringify({type:'disembark',shipId:ship.id,index:idx}));}
            else if(MP?.role==='host'&&MP.authenticated) mpSendSnapshot();
            return true;
        }
        function landingShipMenu(ship){
            if(!isLandingShip(ship)) return '';
            const carried=getCarriedTroops(ship), cap=landingShipCapacity(ship), nearby=getNearbyEmbarkableTroops(ship);
            const cargoHtml=carried.length?carried.map((t,i)=>`<div class="flex items-center justify-between gap-2 bg-slate-950 border border-slate-800 rounded px-2 py-1"><div class="text-xs text-slate-200">${t.symbol||'•'} ${t.type} <span class="text-slate-500">[${t.code||'?'}]</span></div><button type="button" onclick="disembarkTroopFromSelectedShip(${i})" class="text-[10px] text-amber-300 hover:text-white">RETIRAR</button></div>`).join(''):'<div class="text-[10px] text-slate-500 italic">Nenhuma tropa embarcada.</div>';
            const nearbyHtml=nearby.length?nearby.map(t=>`<button type="button" onclick="embarkTroopOnSelectedShip('${String(t.id)}')" class="w-full flex items-center justify-between gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded px-2 py-1 text-left"><span class="text-xs text-slate-200">${t.symbol||'•'} ${t.type} <span class="text-slate-500">[${t.code||'?'}]</span></span><span class="text-[10px] text-indigo-300">EMBARCAR</span></button>`).join(''):'<div class="text-[10px] text-slate-500 italic">Nenhuma tropa terrestre no alcance de visão.</div>';
            return `<div class="mt-3 p-2 bg-slate-900/80 border border-cyan-800/50 rounded"><div class="flex items-center justify-between"><div class="font-bold text-cyan-300 text-xs">🛥️ TROPAS A BORDO</div><div class="text-[10px] text-slate-400">${carried.length}/${cap}</div></div><div class="space-y-1 mt-2">${cargoHtml}</div><div class="border-t border-slate-800 mt-2 pt-2"><div class="font-bold text-slate-300 text-[10px] mb-1">TROPAS PRÓXIMAS</div><div class="space-y-1">${carried.length<cap?nearbyHtml:'<div class="text-[10px] text-amber-300">Capacidade máxima atingida.</div>'}</div></div><div class="text-[9px] text-slate-500 mt-2">Alcance de embarque: ${ship.rangeVis} quadrantes.</div></div>`;
        }

'''
if needle not in s: raise SystemExit('update detail needle')
s=s.replace(needle,func+needle,1)
# 6 append landing menu before closing detailBox template after mission section
    needle="""                </div>\n\n                <button onclick=\"deleteSelectedUnit()\"""
    rep="""                </div>\n                ${isLandingShip(selectedUnit) ? landingShipMenu(selectedUnit) : ''}\n\n                <button onclick=\"deleteSelectedUnit()\"""
if needle not in s: raise SystemExit('detail insertion not found')
s=s.replace(needle,rep,1)
# 7 multi qty/type functions enforce landing
s=s.replace("let qty = Math.max(0, Math.floor(Number(value) || 0));\n            const stats = getBattleStats(u);", "let qty = Math.max(0, Math.floor(Number(value) || 0));\n            if(isLandingShip(u)) qty=1;\n            const stats = getBattleStats(u);",1)
old="""            u.type=item.name; u.symbol=item.symbol; u.dmg=item.dmg; u.rangeVis=item.rangeVis; u.attackRange=Math.max(1, Number(item.attackRange)||1);\n            const q=getUnitQuantity(u); u.initialQuantity=q; u.initialMaxHp=q*item.hp; u.currentHp=q*item.hp;"""
new="""            if(!isLandingShip(item.name) && isLandingShip(u) && getCarriedTroops(u).length>0) return;\n            u.type=item.name; u.symbol=item.symbol; u.dmg=item.dmg; u.rangeVis=item.rangeVis; u.attackRange=Math.max(1, Number(item.attackRange)||1);\n            const q=isLandingShip(item.name)?1:getUnitQuantity(u); u.quantity=q; u.initialQuantity=q; u.initialMaxHp=q*item.hp; u.currentHp=q*item.hp; if(isLandingShip(item.name))u.carriedTroops=[];"""
if old not in s: raise SystemExit('multi type block')
s=s.replace(old,new,1)
# 8 visual cargo in drawUnit after drawNatoIcon
needle="            drawNatoIcon(ctx, unit);\n"
insert="""            drawNatoIcon(ctx, unit);\n\n            // Mini-ícones das tropas embarcadas em navios de desembarque.\n            if (isLandingShip(unit)) {\n                const cargo = getCarriedTroops(unit);\n                cargo.forEach((t, i) => {\n                    const col = i < 5 ? i : i - 5;\n                    const row = i < 5 ? 0 : 1;\n                    const mx = 18 + col * 7;\n                    const my = -7 + row * 7;\n                    ctx.save();\n                    ctx.fillStyle='rgba(2,6,23,.88)'; ctx.strokeStyle='rgba(148,163,184,.65)'; ctx.lineWidth=.7/scale;\n                    ctx.fillRect(mx-3.1,my-3.1,6.2,6.2); ctx.strokeRect(mx-3.1,my-3.1,6.2,6.2);\n                    ctx.font=`${Math.max(4.5,5.5/Math.max(.8,scale))}px 'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif`;\n                    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.fillText(t.symbol||'•',mx,my);\n                    ctx.restore();\n                });\n            }\n"""
if needle not in s: raise SystemExit('draw icon needle')
s=s.replace(needle,insert,1)
# 9 mp remote command add embark/disembark before edit
needle="""}else if(c.kind==='edit'){const u=units.find(x=>String(x.id)===String(c.id));"""
rep="""}else if(c.kind==='embark'){const ship=units.find(x=>String(x.id)===String(c.shipId));const troop=units.find(x=>String(x.id)===String(c.troopId));if(ship&&troop&&side.countries.includes(ship.nation)&&side.countries.includes(troop.nation)&&canEmbarkTroopInShip(ship,troop)){ship.carriedTroops=(getCarriedTroops(ship).concat([JSON.parse(JSON.stringify(troop))])).slice(0,landingShipCapacity(ship));units=units.filter(x=>String(x.id)!==String(troop.id));selectedUnits=selectedUnits.filter(x=>String(x.id)!==String(troop.id));selectedUnit=ship;normalizeUnitHealthLocal(ship);updateUnitDetail();draw()}}else if(c.kind==='disembark'){const ship=units.find(x=>String(x.id)===String(c.shipId));const idx=Number(c.index);if(ship&&side.countries.includes(ship.nation)&&isLandingShip(ship)){const carried=getCarriedTroops(ship);if(Number.isInteger(idx)&&idx>=0&&idx<carried.length){const troop=JSON.parse(JSON.stringify(carried[idx]));troop.x=ship.x;troop.y=ship.y;troop.targetX=null;troop.targetY=null;troop.movePath=[];troop.positionLocked=false;troop.positionRound=Number(MP.room?.round||1);ship.carriedTroops=carried.filter((_,i)=>i!==idx);units.push(troop);normalizeUnitHealthLocal(troop);updateUnitDetail();draw()}}}else if(c.kind==='edit'){const u=units.find(x=>String(x.id)===String(c.id));"""
if needle not in s: raise SystemExit('remote edit needle')
s=s.replace(needle,rep,1)
# 10 mp wrappers for qty/type don't matter guest load functions need send. Add server command in generic function okay.
p.write_text(s)

# server patch
p=Path('/mnt/data/landing_work/server.js'); ss=p.read_text()
# constants after catalog
needle="const CATALOG = {"
# insert helpers after catalog object closing easier at CHANNEL_DEFS
needle2="};\nconst CHANNEL_DEFS = ["
insert2="""};\nconst LANDING_SHIP_CAPACITY = {'Desembarque Pequeno':1,'Desembarque Médio':5,'Desembarque Grande':10};\nconst LANDING_SHIP_TYPES = new Set(Object.keys(LANDING_SHIP_CAPACITY));\nconst GROUND_TYPES = new Set(['Infantaria','Tanque Pesado','Tanque Médio','Tanque Leve','Anti-Air','Caça-Tanque','Artilharia Móvel','Artilharia Pesada','Engenharia de Combate']);\nconst isLandingShipType=t=>LANDING_SHIP_TYPES.has(String(t||''));\nconst isGroundType=t=>GROUND_TYPES.has(String(t||''));\nconst landingShipCapacity=t=>LANDING_SHIP_CAPACITY[String(t||'')]||0;\n"""
if needle2 not in ss: raise SystemExit('server catalog needle')
ss=ss.replace(needle2,insert2+"const CHANNEL_DEFS = [",1)
# normalize qty and cargo at beginning
old="""  const rawQ=Math.max(0,Math.floor(Number(u.quantity)||0));\n  const rawInitialQ=Number.isFinite(Number(u.initialQuantity))?Math.max(0,Math.floor(Number(u.initialQuantity))):rawQ;"""
new="""  const rawQ=isLandingShipType(u.type)?1:Math.max(0,Math.floor(Number(u.quantity)||0));\n  const rawInitialQ=isLandingShipType(u.type)?1:(Number.isFinite(Number(u.initialQuantity))?Math.max(0,Math.floor(Number(u.initialQuantity))):rawQ);"""
if old not in ss: raise SystemExit('server normalize q')
ss=ss.replace(old,new,1)
# after movePath line add cargo sanitization
needle="""  out.movePath=Array.isArray(u.movePath)?u.movePath.slice(0,32).map(pt=>{const x=Number(pt?.x),y=Number(pt?.y);return Number.isFinite(x)&&Number.isFinite(y)?{x:Math.max(0,Math.round(x)),y:Math.max(0,Math.round(y))}:null}).filter(Boolean):[];\n  return out;"""
rep="""  out.movePath=Array.isArray(u.movePath)?u.movePath.slice(0,32).map(pt=>{const x=Number(pt?.x),y=Number(pt?.y);return Number.isFinite(x)&&Number.isFinite(y)?{x:Math.max(0,Math.round(x)),y:Math.max(0,Math.round(y))}:null}).filter(Boolean):[];\n  if(isLandingShipType(out.type)){ out.quantity=1; out.hp=1; out.maxHp=1; out.initialQuantity=1; out.initialMaxHp=c.hp; out.currentHp=Math.min(Math.max(0,out.currentHp),c.hp); out.carriedTroops=(Array.isArray(u.carriedTroops)?u.carriedTroops:[]).filter(t=>t&&isGroundType(t.type)&&Number(t.currentHp||0)>0).slice(0,landingShipCapacity(out.type)).map(t=>normalizeUnitForServer(t)).filter(Boolean); } else delete out.carriedTroops;\n  return out;"""
if needle not in ss: raise SystemExit('server cargo')
ss=ss.replace(needle,rep,1)
# add guest command branches before edit
needle="""      if(c?.kind==='edit'){if(r.status==='playing'&&Date.now()>r.ordersCloseAt)return send(ws,{type:'error',message:'Janela fechada.'});"""
branch=r'''      if(c?.kind==='embark'){
        const side=sideFor(r,player), ship=(r.fullState?.units||[]).find(x=>String(x.id)===String(c.shipId)), troop=(r.fullState?.units||[]).find(x=>String(x.id)===String(c.troopId));
        if(!side||!ship||!troop||!side.countries.includes(ship.nation)||!side.countries.includes(troop.nation)||!isLandingShipType(ship.type)||!isGroundType(troop.type))return send(ws,{type:'error',message:'Embarque inválido.'});
        const cap=landingShipCapacity(ship.type), cargo=Array.isArray(ship.carriedTroops)?ship.carriedTroops:[];
        if(cargo.length>=cap)return send(ws,{type:'error',message:'Capacidade do navio atingida.'});
        if(Math.hypot(Number(ship.x)-Number(troop.x),Number(ship.y)-Number(troop.y))>Math.max(1,Number(ship.rangeVis)||1)*20)return send(ws,{type:'error',message:'A tropa está fora do alcance de embarque.'});
        if(cargo.some(t=>String(t.id)===String(troop.id)))return send(ws,{type:'error',message:'Tropa já embarcada.'});
        toHost(r,{type:'remote_command',fromSideId:player.sideId,command:{kind:'embark',shipId:String(ship.id),troopId:String(troop.id)}}); return;
      }
      if(c?.kind==='disembark'){
        const side=sideFor(r,player), ship=(r.fullState?.units||[]).find(x=>String(x.id)===String(c.shipId)), idx=Number(c.index);
        if(!side||!ship||!side.countries.includes(ship.nation)||!isLandingShipType(ship.type))return send(ws,{type:'error',message:'Desembarque inválido.'});
        const cargo=Array.isArray(ship.carriedTroops)?ship.carriedTroops:[];
        if(!Number.isInteger(idx)||idx<0||idx>=cargo.length)return send(ws,{type:'error',message:'Tropa embarcada inválida.'});
        toHost(r,{type:'remote_command',fromSideId:player.sideId,command:{kind:'disembark',shipId:String(ship.id),index:idx}}); return;
      }
'''+needle
if needle not in ss: raise SystemExit('guest edit needle')
ss=ss.replace(needle,branch,1)
p.write_text(ss)
