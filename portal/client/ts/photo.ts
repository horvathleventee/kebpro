export async function compressComplaintPhoto(file: File | null): Promise<string | null>{
 if(!file||!file.size)return null;
 if(!file.type.startsWith('image/')||file.size>20*1024*1024)throw Error('Válassz egy legfeljebb 20 MB-os képet.');
 const url=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result as string);reader.onerror=()=>reject(new Error('A képet nem sikerült beolvasni.'));reader.readAsDataURL(file);}),img=new Image();
  await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=()=>reject(new Error('A kép nem nyitható meg. Próbálj másik képet.'));img.src=url;});
  const scale=Math.min(1,1280/Math.max(img.naturalWidth,img.naturalHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('A képet nem sikerült előkészíteni.');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
  for(const quality of [.78,.65,.5,.35]){const blob=await new Promise<Blob | null>(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));if(blob?.type==='image/jpeg'&&blob.size<=300000){return await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result as string);reader.onerror=()=>reject(new Error('A képet nem sikerült beolvasni.'));reader.readAsDataURL(blob);});}}
  throw Error('A képet nem sikerült eléggé tömöríteni. Próbálj másik képet.');
}
