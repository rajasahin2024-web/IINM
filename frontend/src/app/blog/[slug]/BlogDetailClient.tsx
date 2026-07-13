"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:2007/api";

interface C { id:number; name:string; content:string; parent_id:number|null; created_at:string; replies:C[]; }

interface BlogDetailClientProps { slug: string; }

const fmt=(iso?:string|null)=>{if(!iso)return"";const d=new Date(iso);return d.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});};
const A=({n,s=40}:{n:string;s?:number})=><div style={{width:s,height:s,borderRadius:"50%",background:"#0a1628",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:s>36?16:12,fontWeight:700,flexShrink:0}}>{(n||"A").charAt(0).toUpperCase()}</div>;
const Sk=({h,w="100%",mb=0,d="0s"}:{h:number;w?:string;mb?:number;d?:string})=><div style={{height:h,width:w,background:"#e2e8f0",borderRadius:h>30?8:6,marginBottom:mb,animation:`blog-skeleton-pulse 1.6s ease-in-out infinite`,animationDelay:d}}/>;
const In=({p,v,onChange,t="text",r=1}:{p:string;v:string;onChange:(v:string)=>void;t?:string;r?:number})=>{
  const base={width:"100%",padding:"12px 16px",borderRadius:10,border:"1px solid #e2e8f0",fontSize:14,outline:"none",fontFamily:"inherit",marginBottom:10};
  return t==="textarea"?<textarea placeholder={p} value={v} onChange={e=>onChange(e.target.value)} rows={r} style={{...base as any,resize:"vertical",marginBottom:12}}/>:
  <input type={t} placeholder={p} value={v} onChange={e=>onChange(e.target.value)} style={base as any}/>;
};

export default function BlogDetailClient({ slug }: BlogDetailClientProps){
  const [data,setData]=useState<any>(null);const [load,setLoad]=useState(true);
  const [comments,setComments]=useState<C[]>([]);const [ratings,setRatings]=useState<any>(null);const [related,setRelated]=useState<any[]>([]);
  const [name,setName]=useState("");const [email,setEmail]=useState("");const [body,setBody]=useState("");const [replyTo,setReplyTo]=useState<number|null>(null);
  const [rVal,setRVal]=useState(0);const [rHover,setRHover]=useState(0);const [rName,setRName]=useState("");const [rReview,setRReview]=useState("");
  const [toast,setToast]=useState<{msg:string;type:string}|null>(null);

  useEffect(()=>{if(!slug)return;fetch(`${API}/blogs/slug/${slug}`).then(r=>r.json()).then(d=>{if(d.detail){window.location.href="/";return;}setData(d);setLoad(false);fetch(`${API}/blogs/${d.post.id}/comments`).then(r=>r.json()).then(c=>setComments(c.items||[]));fetch(`${API}/blogs/${d.post.id}/ratings`).then(r=>r.json()).then(rt=>setRatings(rt));fetch(`${API}/blogs?status=published&category_id=${d.post.category_id}&limit=4`).then(r=>r.json()).then(rel=>setRelated((rel.items||[]).filter((p:any)=>p.id!==d.post.id).slice(0,3)));}).catch(()=>{setLoad(false);window.location.href="/";});},[slug]);

  const T=(msg:string,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};

  const postCmt=async(parentId:number|null=null)=>{if(!data)return;if(!name.trim()||!body.trim()){T("Please fill name and comment.","error");return;}const res=await fetch(`${API}/blogs/${data.post.id}/comments`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:name.trim(),email:email.trim()||null,content:body.trim(),parent_id:parentId})});if(res.ok){setBody("");setReplyTo(null);T("Comment posted!");const c=await fetch(`${API}/blogs/${data.post.id}/comments`).then(r=>r.json());setComments(c.items||[]);}else T("Failed to post comment.","error");};
  const postRate=async()=>{if(!data||rVal<1){T("Select a star rating.","error");return;}const res=await fetch(`${API}/blogs/${data.post.id}/ratings`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:rName.trim()||null,rating:rVal,review:rReview.trim()||null})});if(res.ok){const rt=await res.json();setRatings((p:any)=>({...p,average:rt.average,count:rt.count}));setRVal(0);setRReview("");setRName("");T("Thank you!");}else T("Failed.","error");};
  const react=async(type:string)=>{if(!data)return;const res=await fetch(`${API}/blogs/${data.post.id}/reactions`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reaction_type:type})});if(res.ok){const d2=await res.json();setData((p:any)=>p?{...p,reactions:d2.breakdown}:null);}};

  if(load)return<div style={{minHeight:"100vh",background:"#fff"}}><PublicNavbar/><div style={{maxWidth:1200,margin:"0 auto",padding:"120px 24px 60px"}}><Sk h={520} mb={32}/><Sk h={36} w="70%" mb={16} d="0.1s"/><Sk h={18} w="40%" mb={40} d="0.2s"/><Sk h={14} w="100%" mb={10} d="0.3s"/><Sk h={14} w="96%" mb={10} d="0.35s"/><Sk h={14} w="92%" mb={10} d="0.4s"/></div></div>;
  if(!data)return null;

  const post=data.post;const author=data.author;const avg=data.rating.average;
  const reacts=[{k:"clap",l:"Clap",i:"👏"},{k:"like",l:"Like",i:"👍"},{k:"love",l:"Love",i:"❤️"},{k:"fire",l:"Fire",i:"🔥"},{k:"rocket",l:"Rocket",i:"🚀"}];
  const S=({f,s=20}:{f:boolean;s?:number})=><svg width={s} height={s} viewBox="0 0 24 24" fill={f?"#f59e0b":"#e2e8f0"}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
  const btn={background:"#0a1628",color:"#fff",fontSize:14,fontWeight:700,padding:"12px 28px",borderRadius:999,border:"none",cursor:"pointer",transition:"all 0.2s ease"};

  return(
    <div style={{minHeight:"100vh",background:"#f8fafc",fontFamily:"'Inter','Segoe UI',system-ui,sans-serif"}}>
      <PublicNavbar/>
      {toast&&<div style={{position:"fixed",top:90,right:20,zIndex:9999,background:toast.type==="success"?"#0a1628":"#e63946",color:"#fff",padding:"12px 20px",borderRadius:10,fontSize:14,fontWeight:700,boxShadow:"0 8px 24px rgba(0,0,0,0.2)",animation:"toastSlideDown 0.3s ease"}}>{toast.msg}</div>}

      {/* HERO */}
      <div className="blog-hero" style={{position:"relative",width:"100%",height:"clamp(360px,50vw,560px)",overflow:"hidden",background:"#0a1628"}}>
        {post.featured_image?(
          <img src={post.featured_image} alt={post.title} style={{width:"100%",height:"100%",objectFit:"cover",opacity:0.3}}/>
        ):null}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom, rgba(10,22,40,0.7) 0%, rgba(10,22,40,0.88) 50%, rgba(10,22,40,0.97) 100%)"}}/>
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",justifyContent:"flex-end",padding:"0 24px clamp(32px,6vw,64px)",maxWidth:900,margin:"0 auto",width:"100%",boxSizing:"border-box"}}>
          {post.category_name&&<span style={{alignSelf:"flex-start",background:"#e63946",color:"#fff",fontSize:11,fontWeight:700,padding:"4px 12px",borderRadius:999,textTransform:"uppercase",letterSpacing:0.5,marginBottom:14,boxShadow:"0 2px 8px rgba(0,0,0,0.2)"}}>{post.category_name}</span>}
          <h1 style={{fontSize:"clamp(24px,4.5vw,44px)",fontWeight:800,color:"#fff",lineHeight:1.15,marginBottom:16,letterSpacing:-0.6,textShadow:"0 2px 12px rgba(0,0,0,0.4)"}}>{post.title}</h1>
          <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:"8px 20px",marginBottom:4}}>
            <span style={{fontSize:13,color:"rgba(255,255,255,0.85)",display:"flex",alignItems:"center",gap:6}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/></svg>
              {fmt(post.published_at)}
            </span>
            <span style={{fontSize:13,color:"rgba(255,255,255,0.85)",display:"flex",alignItems:"center",gap:6}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
              {post.reading_time||1} min read
            </span>
            <span style={{fontSize:13,color:"rgba(255,255,255,0.85)",display:"flex",alignItems:"center",gap:6}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
              {post.views||0} views
            </span>
            <span style={{fontSize:13,color:"rgba(255,255,255,0.85)",display:"flex",alignItems:"center",gap:6}}>
              <A n={author?.name||"A"} s={22}/>
              {author?.name||"Team IINM"}
            </span>
          </div>
        </div>
      </div>

      {/* TWO COLUMN */}
      <div className="blog-layout" style={{maxWidth:1200,margin:"0 auto",padding:"40px 24px 60px",display:"grid",gridTemplateColumns:"1fr 340px",gap:40}}>
        {/* LEFT */}
        <div>
          <article className="blog-content" dangerouslySetInnerHTML={{__html:post.content||""}} style={{marginBottom:32}}/>

          {post.tags&&<div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:32}}>{post.tags.split(",").map((t:string)=><span key={t} style={{background:"rgba(10,22,40,0.05)",color:"#475569",fontSize:13,fontWeight:600,padding:"6px 14px",borderRadius:999,border:"1px solid rgba(10,22,40,0.08)"}}>#{t.trim()}</span>)}</div>}

          <div style={{display:"flex",gap:16,alignItems:"center",padding:20,borderRadius:14,background:"#fff",border:"1px solid #e2e8f0",marginBottom:32,boxShadow:"0 2px 8px rgba(10,22,40,0.04)"}}>
            {author?.profile_image?<img src={author.profile_image} alt={author.name} style={{width:60,height:60,borderRadius:"50%",objectFit:"cover",border:"2px solid #e2e8f0",flexShrink:0}}/>:<A n={author?.name||"A"} s={60}/>}
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:16,fontWeight:700,color:"#0a1628",marginBottom:4}}>{author?.name||"Team IINM"}</div>
              <div style={{fontSize:13,color:"#64748b",lineHeight:1.5}}>{author?.bio||"Passionate educator and tech writer sharing insights on AI, programming, and the future of learning."}</div>
              <div style={{fontSize:12,color:"#e63946",fontWeight:700,marginTop:6}}>{author?.post_count||0} Published Articles</div>
            </div>
          </div>

          {related.length>0&&<div style={{marginBottom:32}}>
            <h3 style={{fontSize:20,fontWeight:800,color:"#0a1628",marginBottom:16}}>Related Articles</h3>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:16}}>
              {related.map((p:any)=>(<Link key={p.id} href={`/blog/${p.slug}`} style={{textDecoration:"none",color:"inherit"}}>
                <article style={{borderRadius:12,overflow:"hidden",border:"1px solid #e2e8f0",background:"#fff",boxShadow:"0 2px 8px rgba(10,22,40,0.04)",transition:"transform 0.25s ease,box-shadow 0.25s ease"}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow="0 10px 24px rgba(10,22,40,0.08)";}} onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 2px 8px rgba(10,22,40,0.04)";}}>
                  <div style={{height:120,background:p.featured_image?"none":"#f1f5f9",overflow:"hidden"}}>
                    {p.featured_image?<img src={p.featured_image} alt={p.title} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:24,opacity:0.12}}>📝</span></div>}
                  </div>
                  <div style={{padding:14}}>
                    <h4 style={{fontSize:14,fontWeight:700,color:"#0a1628",lineHeight:1.35,marginBottom:6,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{p.title}</h4>
                    <div style={{fontSize:11,color:"#94a3b8"}}>{fmt(p.published_at)} · {p.reading_time||1} min</div>
                  </div>
                </article>
              </Link>))}
            </div>
          </div>}
        </div>

        {/* RIGHT SIDEBAR */}
        <div style={{position:"sticky",top:100,alignSelf:"start",display:"flex",flexDirection:"column",gap:24}}>

          <div style={{padding:20,borderRadius:14,background:"#fff",border:"1px solid #e2e8f0",boxShadow:"0 2px 8px rgba(10,22,40,0.04)"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#0a1628",marginBottom:12}}>Reactions</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {reacts.map(r=>(<button key={r.k} onClick={()=>react(r.k)} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:999,border:"1px solid #e2e8f0",background:"#f8fafc",cursor:"pointer",fontSize:13,fontWeight:600,color:"#334155",transition:"all 0.2s ease"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="#e63946";e.currentTarget.style.color="#e63946";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#e2e8f0";e.currentTarget.style.color="#334155";}}><span style={{fontSize:16}}>{r.i}</span><span>{r.l}</span>{data.reactions[r.k]?<span style={{background:"#0a1628",color:"#fff",fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:999}}>{data.reactions[r.k]}</span>:null}</button>))}
            </div>
          </div>

          <div style={{padding:20,borderRadius:14,background:"#fff",border:"1px solid #e2e8f0",boxShadow:"0 2px 8px rgba(10,22,40,0.04)"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#0a1628",marginBottom:10}}>Ratings & Reviews</div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <span style={{fontSize:32,fontWeight:800,color:"#0a1628",lineHeight:1}}>{avg.toFixed(1)}</span>
              <div><div style={{display:"flex",gap:2}}>{[1,2,3,4,5].map(s=><S key={s} f={s<=Math.round(avg)}/>)}</div><div style={{fontSize:12,color:"#64748b",marginTop:2}}>{data.rating.count} rating{data.rating.count!==1?"s":""}</div></div>
            </div>
            <div style={{marginBottom:14}}>
              {[5,4,3,2,1].map(star=>{const count=data.rating.distribution[star]||0;const barPct=data.rating.count?(count/data.rating.count)*100:0;return(
                <div key={star} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <span style={{fontSize:11,fontWeight:600,color:"#475569",width:12,textAlign:"right"}}>{star}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="#f59e0b"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  <div style={{flex:1,height:6,background:"#f1f5f9",borderRadius:3,overflow:"hidden"}}><div style={{width:`${barPct}%`,height:"100%",background:"#f59e0b",borderRadius:3,transition:"width 0.5s ease"}}/></div>
                </div>
              );})}
            </div>
            {ratings?.items?.length>0&&<div style={{marginBottom:14,paddingBottom:12,borderBottom:"1px solid #f1f5f9"}}>
              {ratings.items.slice(0,2).map((r:any)=>(
                <div key={r.id} style={{marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                    <A n={r.name||"U"} s={24}/>
                    <span style={{fontSize:12,fontWeight:700,color:"#0a1628"}}>{r.name||"User"}</span>
                    <div style={{display:"flex",gap:1}}>{[1,2,3,4,5].map((s:number)=><svg key={s} width="10" height="10" viewBox="0 0 24 24" fill={s<=r.rating?"#f59e0b":"#e2e8f0"}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>)}</div>
                  </div>
                  {r.review&&<p style={{fontSize:12,color:"#475569",lineHeight:1.5,margin:0}}>{r.review}</p>}
                </div>
              ))}
            </div>}
            <div style={{fontSize:13,fontWeight:700,color:"#0a1628",marginBottom:8}}>Rate this article</div>
            <div style={{display:"flex",gap:4,marginBottom:10}}>
              {[1,2,3,4,5].map(s=>(<button key={s} onMouseEnter={()=>setRHover(s)} onMouseLeave={()=>setRHover(0)} onClick={()=>setRVal(s)} style={{background:"none",border:"none",cursor:"pointer",padding:0}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill={s<=(rHover||rVal)?"#f59e0b":"#e2e8f0"} style={{transition:"fill 0.15s ease"}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </button>))}
            </div>
            <In p="Your name" v={rName} onChange={setRName}/>
            <In p="Review (optional)" v={rReview} onChange={setRReview} t="textarea" r={2}/>
            <button onClick={postRate} style={{...btn,padding:"10px 20px",fontSize:13}} onMouseEnter={e=>e.currentTarget.style.background="#e63946"} onMouseLeave={e=>e.currentTarget.style.background="#0a1628"}>Submit Rating</button>
          </div>

          <div style={{padding:20,borderRadius:14,background:"#fff",border:"1px solid #e2e8f0",boxShadow:"0 2px 8px rgba(10,22,40,0.04)"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#0a1628",marginBottom:10}}>Comments ({data.comment_count})</div>
            {comments.length===0&&<p style={{fontSize:13,color:"#94a3b8",marginBottom:12}}>No comments yet.</p>}
            <div style={{marginBottom:14,maxHeight:320,overflowY:"auto"}}>
              {comments.map(c=>(
                <div key={c.id} style={{padding:"10px 0",borderBottom:"1px solid #f1f5f9"}}>
                  <div style={{display:"flex",gap:8}}>
                    <A n={c.name} s={28}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}><span style={{fontSize:12,fontWeight:700,color:"#0a1628"}}>{c.name}</span><span style={{fontSize:10,color:"#94a3b8"}}>{fmt(c.created_at)}</span></div>
                      <p style={{fontSize:13,color:"#475569",lineHeight:1.5,margin:0}}>{c.content}</p>
                      <button onClick={()=>setReplyTo(replyTo===c.id?null:c.id)} style={{background:"none",border:"none",color:"#e63946",fontSize:11,fontWeight:600,cursor:"pointer",padding:0,marginTop:4}}>{replyTo===c.id?"Cancel":"Reply"}</button>
                      {replyTo===c.id&&<div style={{marginTop:8,padding:12,background:"#f8fafc",borderRadius:10}}>
                        <In p="Your name" v={name} onChange={setName}/>
                        <In p="Write reply..." v={body} onChange={setBody} t="textarea" r={2}/>
                        <button onClick={()=>postCmt(c.id)} style={{background:"#0a1628",color:"#fff",fontSize:12,fontWeight:700,padding:"8px 16px",borderRadius:999,border:"none",cursor:"pointer"}}>Post Reply</button>
                      </div>}
                      {c.replies?.length>0&&<div style={{marginTop:8,paddingLeft:10,borderLeft:"2px solid #f1f5f9"}}>{c.replies.map((rep:any)=>(
                        <div key={rep.id} style={{padding:"6px 0"}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}><A n={rep.name} s={22}/><span style={{fontSize:12,fontWeight:700,color:"#0a1628"}}>{rep.name}</span><span style={{fontSize:10,color:"#94a3b8"}}>{fmt(rep.created_at)}</span></div>
                          <p style={{fontSize:12,color:"#475569",lineHeight:1.5,margin:0}}>{rep.content}</p>
                        </div>
                      ))}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{padding:12,borderRadius:10,background:"#f8fafc",border:"1px solid #f1f5f9"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#0a1628",marginBottom:8}}>Leave a comment</div>
              <In p="Name *" v={name} onChange={setName}/>
              <In p="Email (optional)" v={email} onChange={setEmail} t="email"/>
              <In p="Your thoughts..." v={body} onChange={setBody} t="textarea" r={3}/>
              <button onClick={()=>postCmt(null)} style={{...btn,padding:"10px 20px",fontSize:13}} onMouseEnter={e=>e.currentTarget.style.background="#e63946"} onMouseLeave={e=>e.currentTarget.style.background="#0a1628"}>Post</button>
            </div>
          </div>
        </div>
      </div>

      <PublicFooter/>

      <style>{`
        @keyframes toastSlideDown { from { transform: translateY(-110%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .blog-content { font-size: 17px; line-height: 1.8; color: #334155; }
        .blog-content h1,.blog-content h2,.blog-content h3,.blog-content h4 { color: #0a1628; font-weight: 800; margin-top: 32px; margin-bottom: 16px; line-height: 1.3; }
        .blog-content h2 { font-size: 28px; } .blog-content h3 { font-size: 22px; }
        .blog-content p { margin-bottom: 20px; }
        .blog-content ul,.blog-content ol { margin-bottom: 20px; padding-left: 24px; }
        .blog-content li { margin-bottom: 8px; }
        .blog-content blockquote { border-left: 4px solid #e63946; padding: 16px 20px; margin: 24px 0; background: #f8fafc; border-radius: 0 10px 10px 0; font-style: italic; color: #475569; }
        .blog-content img { max-width: 100%; border-radius: 12px; margin: 20px 0; }
        .blog-content a { color: #e63946; text-decoration: none; font-weight: 600; }
        .blog-content a:hover { text-decoration: underline; }
        .blog-content pre { background: #0a1628; color: #e2e8f0; padding: 16px; border-radius: 10px; overflow-x: auto; font-size: 14px; margin: 20px 0; }
        .blog-content code { background: rgba(10,22,40,0.06); padding: 2px 6px; border-radius: 4px; font-size: 14px; color: #e63946; }
        .blog-content pre code { background: none; color: inherit; padding: 0; }
        .blog-content table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .blog-content th,.blog-content td { border: 1px solid #e2e8f0; padding: 10px 14px; text-align: left; }
        .blog-content th { background: #f8fafc; font-weight: 700; color: #0a1628; }
        @media(max-width:980px){ .blog-content h2 { font-size: 22px; } .blog-content h3 { font-size: 18px; } .blog-content { font-size: 15px; }
          .blog-layout { grid-template-columns: 1fr !important; gap: 32px !important; }
          .blog-hero { height: clamp(300px,60vw,420px) !important; }
        }
      `}</style>
    </div>
  );
}
