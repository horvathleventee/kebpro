const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
function decodeBackup(text){
 const file=JSON.parse(text);
 if(file.version!==1||typeof file.body!=='string'||crypto.createHash('sha256').update(file.body).digest('hex')!==file.sha256)throw Error('Invalid backup checksum');
 const state=JSON.parse(file.body);
 for(const key of ['users','partners','routes','responses','sessions','subscriptions','outbox'])if(!Array.isArray(state[key]))throw Error('Invalid backup structure');
 return state;
}
async function backup(store,directory,{now=new Date(),keep=5}={}){
 if(!Number.isInteger(keep)||keep<1)throw Error('Invalid backup retention');
 await fs.mkdir(directory,{recursive:true,mode:0o700});
 const body=JSON.stringify(await store.read());
 const data=JSON.stringify({version:1,createdAt:now.toISOString(),sha256:crypto.createHash('sha256').update(body).digest('hex'),body});
 const file=path.join(directory,'portal-'+now.toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID()+'.json');
 const temp=file+'.tmp';
 try{await fs.writeFile(temp,data,{flag:'wx',mode:0o600});decodeBackup(await fs.readFile(temp,'utf8'));await fs.rename(temp,file);}catch(error){await fs.rm(temp,{force:true});throw error;}
 const entries=(await fs.readdir(directory)).filter(n=>/^portal-\d{4}-\d{2}-\d{2}T[\dTZ-]+-[a-f0-9-]+\.json$/.test(n)).sort().reverse();
 for(const old of entries.slice(keep))await fs.unlink(path.join(directory,old));
 return {file,at:now.toISOString()};
}
module.exports={backup,decodeBackup};
