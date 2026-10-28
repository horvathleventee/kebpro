const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
function certificate(){
 const dir=path.resolve(__dirname,'../../.local-tests/tls');fs.mkdirSync(dir,{recursive:true});
 const key=path.join(dir,'localhost.key'),cert=path.join(dir,'localhost.crt');
 if(!fs.existsSync(key)||!fs.existsSync(cert)){
  const candidates=[process.env.PORTAL_TEST_OPENSSL,'C:/Program Files/Git/usr/bin/openssl.exe','openssl'].filter(Boolean);
  let openssl;for(const command of candidates){try{execFileSync(command,['version'],{stdio:'ignore'});openssl=command;break;}catch{}}
  if(!openssl)throw Error('OpenSSL required; set PORTAL_TEST_OPENSSL to its executable path.');
  execFileSync(openssl,['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','30','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1','-addext','basicConstraints=critical,CA:TRUE'],{stdio:'ignore'});
  fs.chmodSync(key,0o600);
 }
 return {key:fs.readFileSync(key),cert:fs.readFileSync(cert)};
}
module.exports={certificate};
