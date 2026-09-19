/** EMVCo Thai PromptPay QR for a one-time wallet top-up. */
const field=(id:string,value:string)=>id+String(value.length).padStart(2,'0')+value
const crc16=(value:string)=>{
 let crc=0xffff
 for(const byte of new TextEncoder().encode(value)){
  crc^=byte<<8
  for(let i=0;i<8;i++)crc=(crc&0x8000)?((crc<<1)^0x1021)&0xffff:(crc<<1)&0xffff
 }
 return crc.toString(16).toUpperCase().padStart(4,'0')
}
export function promptpayPayload(target:string,amountBaht:number){
 const id=target.replace(/[^0-9]/g,'')
 if(!/^(?:[0-9]{10}|[0-9]{13})$/.test(id))throw new Error('เลข PromptPay ไม่ถูกต้อง')
 if(!Number.isFinite(amountBaht)||amountBaht<1||amountBaht>1000000)throw new Error('จำนวนเงินเติมไม่ถูกต้อง')
 const merchant=field('00','A000000677010111')+field(id.length===10?'01':'02',id.length===10?'0066'+id.slice(1):id)
 const base=field('00','01')+field('01','12')+field('29',merchant)+field('53','764')+field('54',amountBaht.toFixed(2))+field('58','TH')+'6304'
 return base+crc16(base)
}
