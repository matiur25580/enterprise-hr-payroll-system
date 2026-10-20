import { useEffect, useState } from "react";
export default function OtpPopup({ email, onVerify, onCancel }){
  const [code,setCode]=useState("");
  const [sec,setSec]=useState(300);
  const [err,setErr]=useState("");
  const [sending,setSending]=useState(false);
  useEffect(()=>{
    if(sec<=0) return;
    const t=setInterval(()=>setSec(s=>s-1),1000);
    return ()=>clearInterval(t);
  },[sec]);
  const mm=String(Math.floor(sec/60)).padStart(2,"0");
  const ss=String(sec%60).padStart(2,"0");
  async function resend(){
    setSending(true); setErr("");
    try{
      const r=await fetch("/api/auth/send-otp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})});
      if(!r.ok) throw new Error();
      setSec(300); setCode("");
    }catch{ setErr("Failed to resend. Try again."); }
    setSending(false);
  }
  async function submit(){
    setErr("");
    try{
      const r=await fetch("/api/auth/verify-otp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email, otp:code})});
      const j=await r.json();
      if(!r.ok) throw new Error(j.error||"invalid credentials/OTP");
      onVerify();
    }catch(e){ setErr(e.message); }
  }
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
      <div style={{background:"#141b2d",padding:28,borderRadius:16,width:"90%",maxWidth:380,color:"#fff"}}>
        <h2>Verify your OTP</h2>
        <p style={{color:"#aaa"}}>Enter the 6-digit code sent to your email.</p>
        <p style={{color:"#aaa",fontSize:13}}>{email}</p>
        <input value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))}
          placeholder="6-digit verification code"
          style={{width:"100%",padding:12,marginTop:12,borderRadius:8,border:"1px solid #333",background:"#0f1530",color:"#fff",fontSize:18,textAlign:"center",letterSpacing:4}} />
        {sec>0 ? <p style={{marginTop:10,color:"#aaa"}}>Resend in {mm}:{ss}</p> :
          <button onClick={resend} disabled={sending} style={{marginTop:10,background:"transparent",border:"none",color:"#4f6df5",cursor:"pointer",fontSize:15}}>
            {sending?"Sending...":"Resend OTP"}</button>}
        {err && <p style={{color:"#ff7b7b",marginTop:8}}>{err}</p>}
        <button onClick={submit} style={{width:"100%",marginTop:14,padding:13,borderRadius:10,border:"none",background:"#4f6df5",color:"#fff",fontSize:16}}>Registration</button>
        <button onClick={onCancel} style={{width:"100%",marginTop:8,background:"transparent",border:"none",color:"#4f6df5"}}>Cancel</button>
      </div>
    </div>
  );
}
