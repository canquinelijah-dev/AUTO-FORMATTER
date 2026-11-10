"use strict";
const $=s=>document.querySelector(s),W="http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const PRE={
thesis:{font:"Times New Roman",size:12,mt:1,mr:1,mb:1,ml:1.5,line:2,align:"both",pn:"center",head:"",foot:"",col:"555555"},
research:{font:"Times New Roman",size:12,mt:1,mr:1,mb:1,ml:1,line:2,align:"left",pn:"right",head:"",foot:"",col:"555555"},
program:{font:"Arial",size:11,mt:.75,mr:.75,mb:.75,ml:.75,line:1,align:"left",pn:"right",head:"",foot:"DCIT22 \u2013 Computer Programming 1",col:"2E7D32"},
lab:{font:"Arial",size:11,mt:1,mr:1,mb:1,ml:1,line:1.15,align:"left",pn:"center",head:"",foot:"",col:"555555"},
general:{font:"Calibri",size:12,mt:1,mr:1,mb:1,ml:1,line:1.15,align:"left",pn:"center",head:"",foot:"",col:"555555"}};
const DT={thesis:"Thesis / Capstone",research:"Research Paper",program:"Programming Assignment",lab:"Laboratory Report",general:"General Academic Paper"};
const SECS={thesis:"Typical parts you may include: chapters, section headings, tables/figures, references.",research:"Typical sections: Abstract, Keywords, Introduction, RRL, Methodology, Results, Discussion, Conclusion, Recommendations, References. Use Word Heading styles so they are detected.",program:"Code lines keep their indentation (Courier New). Header shows name, number, date, assignment.",lab:"Typical sections: Title, Objectives, Materials, Methodology, Observations, Results, Discussion, Conclusion, References.",general:"Fully manual configuration."};
const COLLEGES=["CAFENR","CAS","CCJ","CED","CEMDS","CEIT","CON","CVMBS","COM","CSPEAR","Other"];
const PAPER={a4:[11906,16838,"A4"],letter:[12240,15840,"letter"],legal:[12240,20160,"legal"]};
const CODEEXT=["java","py","c","cpp","js"],MAX=10*1024*1024;
let model=null,blobUrl=null,deadline=0,tick=null,gen=0;
const ids=["paper","font","size","line","align","pn","mt","mr","mb","ml","head","foot"];

COLLEGES.forEach(c=>$("#college").add(new Option(c)));
function fillTypes(){const cur=$("#dtype").value,c=$("#college").value,sel=$("#dtype");sel.replaceChildren();
 for(const k in DT){if(k==="program"&&!["CEIT","CAS","Other"].includes(c))continue;sel.add(new Option(DT[k],k));}
 if([...sel.options].some(o=>o.value===cur))sel.value=cur;loadPre();}
function loadPre(){const k=$("#dtype").value,p=PRE[k];ids.forEach(i=>{if(i in p)$("#"+i).value=p[i];});$("#secs").textContent=SECS[k];autoHead();render();}
function autoHead(){if($("#dtype").value!=="program")return;
 $("#head").value=[$("#name").value,$("#sno").value,$("#date").value,$("#ano").value&&"Assignment "+$("#ano").value].filter(Boolean).join(" | ");}
function cfg(){const k=$("#dtype").value,c={k,col:PRE[k].col};ids.forEach(i=>c[i]=$("#"+i).value);
 ["size","line","mt","mr","mb","ml"].forEach(i=>c[i]=parseFloat(c[i])||PRE[k][i]);return c;}
$("#college").onchange=fillTypes;
$("#dtype").onchange=loadPre;
$("#subject").oninput=$("#course").oninput=()=>{const t=$("#subject").value+$("#course").value;
 $("#hint").textContent=/program|DCIT|coding|java/i.test(t)&&$("#dtype").value!=="program"?"This looks like a programming subject; the Programming Assignment preset may fit.":"";};
["name","sno","date","ano"].forEach(i=>$("#"+i).oninput=()=>{autoHead();render();});
ids.forEach(i=>$("#"+i).addEventListener("input",render));
document.addEventListener("pointermove",e=>{document.body.style.setProperty("--mx",e.clientX+"px");document.body.style.setProperty("--my",e.clientY+"px");});

function msg(t,c){const m=$("#msg");m.textContent=t;m.className=c||"";}
function warns(a){const u=$("#warn");u.replaceChildren();a.forEach(t=>{const l=document.createElement("li");l.textContent=t;u.append(l);});}

/* ---------- zip ---------- */
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(d){let c=~0;for(let i=0;i<d.length;i++)c=CRC[(c^d[i])&255]^(c>>>8);return ~c>>>0;}
async function inflate(u8){const ds=new DecompressionStream("deflate-raw"),w=ds.writable.getWriter();w.write(u8);w.close();
 const out=new Uint8Array(await new Response(ds.readable).arrayBuffer());if(out.length>30*1024*1024)throw new Error("Entry too large after decompression.");return out;}
function zipIndex(buf){const dv=new DataView(buf),u=new Uint8Array(buf);let e=-1;
 for(let i=buf.byteLength-22;i>=Math.max(0,buf.byteLength-65600);i--)if(dv.getUint32(i,true)===0x06054b50){e=i;break;}
 if(e<0)throw new Error("Not a valid ZIP/DOCX container.");
 const n=dv.getUint16(e+10,true);if(n>3000)throw new Error("Suspicious number of entries.");
 let p=dv.getUint32(e+16,true);const m={};
 for(let i=0;i<n;i++){if(dv.getUint32(p,true)!==0x02014b50)throw new Error("Corrupt ZIP directory.");
  const nl=dv.getUint16(p+28,true),el=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true);
  const name=new TextDecoder().decode(u.subarray(p+46,p+46+nl));
  m[name]={meth:dv.getUint16(p+10,true),cs:dv.getUint32(p+20,true),us:dv.getUint32(p+24,true),off:dv.getUint32(p+42,true)};p+=46+nl+el+cl;}
 return m;}
async function zipGet(buf,idx,name){const f=idx[name];if(!f)return null;const dv=new DataView(buf);
 if(dv.getUint32(f.off,true)!==0x04034b50)throw new Error("Corrupt entry "+name);
 const s=f.off+30+dv.getUint16(f.off+26,true)+dv.getUint16(f.off+28,true),d=new Uint8Array(buf,s,f.cs);
 if(f.us>30*1024*1024)throw new Error("Entry too large.");
 return f.meth===0?d:f.meth===8?await inflate(d):(()=>{throw new Error("Unsupported compression.");})();}
function zipWrite(files){const E=new TextEncoder(),parts=[],cen=[];let off=0;
 for(const f of files){const nb=E.encode(f.name),d=E.encode(f.data),c=crc32(d);
  const lh=new DataView(new ArrayBuffer(30));lh.setUint32(0,0x04034b50,true);lh.setUint16(4,20,true);lh.setUint16(10,0,true);lh.setUint16(12,33,true);
  lh.setUint32(14,c,true);lh.setUint32(18,d.length,true);lh.setUint32(22,d.length,true);lh.setUint16(26,nb.length,true);
  parts.push(lh.buffer,nb,d);
  const ch=new DataView(new ArrayBuffer(46));ch.setUint32(0,0x02014b50,true);ch.setUint16(4,20,true);ch.setUint16(6,20,true);ch.setUint16(14,33,true);
  ch.setUint32(16,c,true);ch.setUint32(20,d.length,true);ch.setUint32(24,d.length,true);ch.setUint16(28,nb.length,true);ch.setUint32(42,off,true);
  cen.push(ch.buffer,nb);off+=30+nb.length+d.length;}
 const cs=cen.reduce((a,b)=>a+(b.byteLength),0),ed=new DataView(new ArrayBuffer(22));
 ed.setUint32(0,0x06054b50,true);ed.setUint16(8,files.length,true);ed.setUint16(10,files.length,true);ed.setUint32(12,cs,true);ed.setUint32(16,off,true);
 return new Blob([...parts,...cen,ed.buffer],{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});}

/* ---------- parsing ---------- */
const kids=(n,t)=>[...n.children].filter(c=>c.localName===t);
const first=(n,t)=>n.getElementsByTagNameNS(W,t)[0];
const MONO=/courier|consolas|mono|menlo/i;
function parseP(p){const st=first(p,"pStyle")?.getAttributeNS(W,"val")||"";const runs=[];let mono=true,any=false;
 for(const r of p.getElementsByTagNameNS(W,"r")){let t="";
  for(const c of r.children){if(c.localName==="t")t+=c.textContent;else if(c.localName==="tab")t+="\t";else if(c.localName==="br"||c.localName==="cr")t+="\n";}
  if(!t)continue;const pr=kids(r,"rPr")[0],on=n=>{const e=pr&&first(pr,n);return !!e&&e.getAttributeNS(W,"val")!=="0"&&e.getAttributeNS(W,"val")!=="false";};
  const ft=pr&&first(pr,"rFonts")?.getAttributeNS(W,"ascii")||"";any=true;if(!MONO.test(ft))mono=false;runs.push({t,b:on("b"),i:on("i")});}
 const text=runs.map(r=>r.t).join("");let type="p";
 if(/^Heading1$|^Title$/i.test(st))type="h1";else if(/^Heading[2-9]$/i.test(st))type="h2";else if(any&&mono&&text.trim())type="code";
 return{type,runs};}
async function readDocx(buf){const idx=zipIndex(buf);
 if(!idx["[Content_Types].xml"]||!idx["word/document.xml"])throw new Error("Missing required DOCX parts.");
 const xml=new TextDecoder().decode(await zipGet(buf,idx,"word/document.xml")),d=new DOMParser().parseFromString(xml,"application/xml");
 if(d.getElementsByTagName("parsererror").length)throw new Error("document.xml is malformed.");
 const body=first(d,"body");if(!body)throw new Error("No document body.");const items=[],w=[];let skipped=0;
 for(const c of body.children){if(c.localName==="p")items.push(parseP(c));
  else if(c.localName==="tbl"){const rows=kids(c,"tr").map(tr=>kids(tr,"tc").map(tc=>kids(tc,"p").map(p=>parseP(p).runs.map(r=>r.t).join("")).join("\n")));items.push({type:"table",rows});}
  else if(c.localName!=="sectPr")skipped++;}
 const cnt=t=>d.getElementsByTagNameNS(W,t).length;
 if(cnt("drawing")+cnt("pict"))w.push(cnt("drawing")+cnt("pict")+" image/drawing object(s) found: NOT carried into the output.");
 if(skipped)w.push(skipped+" block(s) of unsupported content (e.g. content controls) were skipped.");
 if(cnt("footnoteReference")||cnt("endnoteReference"))w.push("Footnotes/endnotes are not carried over.");
 if(cnt("oMath")||cnt("txbxContent"))w.push("Equations or text boxes are not carried over.");
 if(cnt("numPr"))w.push("List numbering/bullets are not reproduced (text is kept).");
 if(idx["word/header1.xml"]||idx["word/footer1.xml"])w.push("Existing headers/footers are replaced by the ones configured here.");
 return{items,w};}
function readText(t,ext,code){const items=[];
 if(code){t.replace(/\r\n?/g,"\n").replace(/\n$/,"").split("\n").forEach(l=>items.push({type:"code",runs:[{t:l.replace(/\t/g,"    "),b:0,i:0}]}));}
 else t.replace(/\r\n?/g,"\n").split(/\n\s*\n/).filter(s=>s.trim()).forEach(s=>items.push({type:"p",runs:[{t:s.trim(),b:0,i:0}]}));
 return{items,w:ext==="md"?["Markdown symbols are kept as plain text (not converted)."]:[]};}

/* ---------- upload ---------- */
$("#file").onchange=async e=>{const f=e.target.files[0];if(!f)return;cleanup(true);const my=++gen;
 try{const ext=(f.name.split(".").pop()||"").toLowerCase();
  if(!["docx","doc","pdf","txt","md","java","py","c","cpp","js"].includes(ext))throw new Error("Unsupported file type.");
  if(f.size===0)throw new Error("File is empty.");if(f.size>MAX)throw new Error("File exceeds the 10 MB limit.");
  const buf=await f.arrayBuffer(),h=new Uint8Array(buf,0,Math.min(8,buf.byteLength));
  const isPK=h[0]===0x50&&h[1]===0x4B&&h[2]===3&&h[3]===4,isPDF=h[0]===0x25&&h[1]===0x50&&h[2]===0x44&&h[3]===0x46,isOLE=h[0]===0xD0&&h[1]===0xCF&&h[2]===0x11&&h[3]===0xE0;
  if(isPDF||ext==="pdf")throw new Error("PDF cannot be reliably converted to an editable, formatted document with browser-native JavaScript alone (no paragraph structure, fonts or layout to rebuild). Alternative: open it in Word/Google Docs, save as DOCX, and upload that.");
  if(isOLE||ext==="doc")throw new Error("Legacy .DOC is a binary format that is not practical to parse without a library. Alternative: open it in Word and Save As .docx.");
  let r;if(ext==="docx"){if(!isPK)throw new Error("File signature does not match a DOCX file.");r=await readDocx(buf);}
  else{if(isPK||isPDF||isOLE)throw new Error("File content does not match its extension.");
   if(new Uint8Array(buf,0,Math.min(4096,buf.byteLength)).includes(0))throw new Error("File looks binary, not text.");
   let t;try{t=new TextDecoder("utf-8",{fatal:true}).decode(buf);}catch{throw new Error("Text is not valid UTF-8.");}
   r=readText(t,ext,CODEEXT.includes(ext)||$("#dtype").value==="program");}
  if(my!==gen)return;if(!r.items.length)throw new Error("No readable content found.");
  model=r.items;warns(r.w);msg("Loaded "+model.length+" block(s) from "+f.name.replace(/[<>]/g,"")+". Processed locally.","ok");
  deadline=Date.now()+600000;clearInterval(tick);tick=setInterval(upd,250);upd();render();
 }catch(err){cleanup(true);msg(err.message||"Could not read file.","err");$("#file").value="";}};
function upd(){const s=Math.max(0,Math.ceil((deadline-Date.now())/1000));
 $("#timer").textContent=String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");if(!s){cleanup();msg("Session expired. References, previews and download links were cleared. Please upload again.","err");}}
function cleanup(quiet){gen++;model=null;clearInterval(tick);tick=null;if(blobUrl){URL.revokeObjectURL(blobUrl);blobUrl=null;}
 $("#page").replaceChildren();$("#dl").disabled=$("#pr").disabled=true;$("#file").value="";warns([]);$("#timer").textContent="\u2013";
 const o=document.getElementById("pst");if(o)o.remove();if(!quiet)msg("");}

/* ---------- preview ---------- */
function render(){const pg=$("#page");pg.replaceChildren();if(!model)return;const c=cfg(),fs=c.size+"pt";
 const [pw]=PAPER[c.paper];pg.style.width=(pw/1440)+"in";pg.style.fontFamily=c.font+",sans-serif";pg.style.fontSize=fs;pg.style.lineHeight=c.line;pg.style.textAlign=c.align==="both"?"justify":c.align;
 pg.style.padding=`${c.mt}in ${c.mr}in ${c.mb}in ${c.ml}in`;
 if(c.head){const h=document.createElement("div");h.className="hf";h.textContent=c.head;h.style.color="#"+c.col;pg.append(h);}
 for(const it of model){let e;
  if(it.type==="table"){e=document.createElement("table");it.rows.forEach(r=>{const tr=e.insertRow();r.forEach(t=>{const td=tr.insertCell();td.textContent=t;td.style.whiteSpace="pre-wrap";});});}
  else{e=document.createElement(it.type==="code"?"pre":"p");
   if(it.type==="code"){e.style.fontFamily="'Courier New',monospace";e.style.lineHeight="1";e.style.textAlign="left";}
   if(it.type==="h1"||it.type==="h2"){e.style.fontWeight="700";e.style.fontSize=(c.size+(it.type==="h1"?2:1))+"pt";if(it.type==="h1"&&c.k==="thesis")e.style.textAlign="center";}
   it.runs.forEach(r=>{const s=document.createElement("span");s.textContent=r.t;s.style.whiteSpace="pre-wrap";if(r.b)s.style.fontWeight="700";if(r.i)s.style.fontStyle="italic";e.append(s);});}
  pg.append(e);}
 const f=document.createElement("div");f.className="ft";const a=document.createElement("span"),b=document.createElement("span");a.textContent=c.foot;a.style.color="#"+c.col;b.textContent=c.pn==="none"?"":"Page #";
 f.style.justifyContent=c.pn==="center"?"space-around":"space-between";f.append(a,b);pg.append(f);
 $("#dl").disabled=$("#pr").disabled=false;setPrint(c);}
function setPrint(c){let s=document.getElementById("pst");if(!s){s=document.createElement("style");s.id="pst";document.head.append(s);}
 const q=t=>JSON.stringify(t||"").replace(/[\r\n]/g," "),pos=c.pn==="center"?"@bottom-center":"@bottom-right",col="color:#"+c.col+";font:9pt "+JSON.stringify(c.font);
 s.textContent=`@page{size:${PAPER[c.paper][2]};margin:${c.mt}in ${c.mr}in ${c.mb}in ${c.ml}in;${c.head?"@top-left{content:"+q(c.head)+";"+col+"}":""}${c.foot?"@bottom-left{content:"+q(c.foot)+";"+col+"}":""}${c.pn!=="none"?pos+"{content:counter(page);"+col+"}":""}}`;}
$("#pr").onclick=()=>{if(model)window.print();};

/* ---------- docx output ---------- */
const clean=s=>String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g,"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
function runX(t,o){const f=o.font;let x="";
 const rp=`<w:rPr><w:rFonts w:ascii="${f}" w:hAnsi="${f}" w:cs="${f}"/>${o.b?"<w:b/>":""}${o.i?"<w:i/>":""}${o.col?`<w:color w:val="${o.col}"/>`:""}<w:sz w:val="${Math.round(o.sz*2)}"/></w:rPr>`;
 for(const part of String(t).split(/(\n|\t)/)){if(part==="\n")x+=`<w:r>${rp}<w:br/></w:r>`;else if(part==="\t")x+=`<w:r>${rp}<w:tab/></w:r>`;else if(part)x+=`<w:r>${rp}<w:t xml:space="preserve">${clean(part)}</w:t></w:r>`;}
 return x;}
function paraX(it,c){const sp=Math.round(c.line*240);let jc=c.align,sz=c.size,font=c.font,b=0,extra="";
 if(it.type==="code"){jc="left";font="Courier New";return`<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="left"/></w:pPr>${it.runs.map(r=>runX(r.t,{font,sz})).join("")}</w:p>`;}
 if(it.type==="h1"||it.type==="h2"){b=1;sz=c.size+(it.type==="h1"?2:1);extra="<w:keepNext/>";if(it.type==="h1"&&c.k==="thesis")jc="center";else jc="left";}
 return`<w:p><w:pPr>${extra}<w:spacing w:before="${b?240:0}" w:after="${b?120:Math.min(160,sp/2)}" w:line="${sp}" w:lineRule="auto"/><w:jc w:val="${jc}"/></w:pPr>${it.runs.map(r=>runX(r.t,{font,sz,b:b||r.b,i:r.i})).join("")}</w:p>`;}
function tblX(it,c){const B=["top","left","bottom","right","insideH","insideV"].map(s=>`<w:${s} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`).join("");
 return`<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${B}</w:tblBorders></w:tblPr>`+it.rows.map(r=>"<w:tr>"+r.map(t=>`<w:tc><w:tcPr/><w:p><w:pPr><w:spacing w:after="0"/></w:pPr>${runX(t,{font:c.font,sz:c.size})}</w:p></w:tc>`).join("")+"</w:tr>").join("")+"</w:tbl><w:p/>";}
function buildDocx(){const c=cfg(),[pw,ph]=PAPER[c.paper],tw=x=>Math.round(x*1440),NS=`xmlns:w="${W}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"`,H='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
 const body=model.map(it=>it.type==="table"?tblX(it,c):paraX(it,c)).join("");
 const sect=`<w:sectPr><w:headerReference w:type="default" r:id="rId1"/><w:footerReference w:type="default" r:id="rId2"/><w:pgSz w:w="${pw}" w:h="${ph}"/><w:pgMar w:top="${tw(c.mt)}" w:right="${tw(c.mr)}" w:bottom="${tw(c.mb)}" w:left="${tw(c.ml)}" w:header="360" w:footer="360" w:gutter="0"/></w:sectPr>`;
 const o={font:c.font,sz:9,col:c.col},hp=c.head?`<w:p>${runX(c.head,o)}</w:p>`:"<w:p/>";
 const fld=r=>`<w:p><w:pPr><w:jc w:val="${r}"/></w:pPr><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>${runX("1",o)}<w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>`;
 const fp=(c.foot?`<w:p>${runX(c.foot,o)}</w:p>`:"")+(c.pn!=="none"?fld(c.pn):"")||"<w:p/>";
 const R="http://schemas.openxmlformats.org/officeDocument/2006/relationships",CT="application/vnd.openxmlformats-officedocument.wordprocessingml.";
 return zipWrite([
 {name:"[Content_Types].xml",data:H+`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="${CT}document.main+xml"/><Override PartName="/word/header1.xml" ContentType="${CT}header+xml"/><Override PartName="/word/footer1.xml" ContentType="${CT}footer+xml"/></Types>`},
 {name:"_rels/.rels",data:H+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="word/document.xml"/></Relationships>`},
 {name:"word/_rels/document.xml.rels",data:H+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/header" Target="header1.xml"/><Relationship Id="rId2" Type="${R}/footer" Target="footer1.xml"/></Relationships>`},
 {name:"word/document.xml",data:H+`<w:document ${NS}><w:body>${body}${sect}</w:body></w:document>`},
 {name:"word/header1.xml",data:H+`<w:hdr ${NS}>${hp}</w:hdr>`},
 {name:"word/footer1.xml",data:H+`<w:ftr ${NS}>${fp}</w:ftr>`}]);}
$("#dl").onclick=()=>{if(!model)return;try{if(blobUrl)URL.revokeObjectURL(blobUrl);blobUrl=URL.createObjectURL(buildDocx());
 const a=document.createElement("a");a.href=blobUrl;a.download="formatted-"+DT[$("#dtype").value].replace(/\W+/g,"-").toLowerCase()+".docx";document.body.append(a);a.click();a.remove();
 msg("Downloaded. Cleanup will still run when the timer ends; your downloaded copy stays on your device.","ok");}catch(e){msg("Could not build the file: "+e.message,"err");}};
window.addEventListener("pagehide",()=>cleanup(true));
fillTypes();
