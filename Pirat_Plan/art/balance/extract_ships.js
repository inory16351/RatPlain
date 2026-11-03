const fs=require('fs');const t=fs.readFileSync(process.argv[2],'utf8').split(/\r?\n/);
const uni=s=>s.replace(/\\u([0-9A-F]{4})/gi,(_,h)=>String.fromCharCode(parseInt(h,16))).replace(/^"|"$/g,'');
let i=t.findIndex(l=>l==='  ships:'),end=t.findIndex(l=>l==='  uniques:');const ships=[];let cur,mode;
for(let j=i+1;j<end;j++){const l=t[j];let m;
 if(m=l.match(/^  - id: (\S+)/)){cur={id:m[1],add:{},mul:{}};ships.push(cur);mode=null;continue}
 if(m=l.match(/^    (name|kind|tier|line|req|costPlank|costCoin|len): ?(.*)$/)){cur[m[1]]=uni(m[2]);continue}
 if(m=l.match(/^    (add|mul|slots):/)){mode=m[1];if(mode==='slots')cur.slots=[];continue}
 if(m=l.match(/^    (gearNormal|gearGood|sprite|desc)/)){mode=null;continue}
 if(mode==='slots'&&(m=l.match(/^    - (\S+)/))){cur.slots.push(m[1]);continue}
 if((mode==='add'||mode==='mul')&&(m=l.match(/stat: (\S+)/))){const v=t[j+1].match(/value: (\S+)/)[1];cur[mode][m[1]]=+v;j++;}
}
fs.writeFileSync(process.argv[3],JSON.stringify(ships,null,0));
for(const s of ships)console.log(s.id,s.name,s.tier,s.line||'-',s.costPlank,s.costCoin,JSON.stringify(s.add),JSON.stringify(s.mul),s.slots.join('/'));
