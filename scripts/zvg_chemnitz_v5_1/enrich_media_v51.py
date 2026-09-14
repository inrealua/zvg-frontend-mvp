
from __future__ import annotations
import json, re, shutil, subprocess, sys, tempfile, io, time, html
from pathlib import Path
from urllib.parse import urljoin, unquote
import requests, certifi
from bs4 import BeautifulSoup
import pymupdf
from PIL import Image, ImageChops, ImageStat

ROOT=Path.cwd()
DATA=ROOT/'data'/'zvg-chemnitz-v5'/'chemnitz_39_v5.json'
MANIFEST=ROOT/'var'/'chemnitz_v5_media_manifest.json'
PUB_IMG=ROOT/'public'/'zvg-media'/'chemnitz-v5'
PUB_DOC=ROOT/'public'/'zvg-docs'/'chemnitz-v5'
DEBUG=ROOT/'var'/'zvg_chemnitz_v51_debug'
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/152 Safari/537.36 ZVG-DE/5.1'
S=requests.Session()
S.headers.update({
    'User-Agent':UA,
    'Accept-Language':'de-DE,de;q=0.9,en;q=0.7',
    'Accept':'text/html,application/xhtml+xml,application/pdf,image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
})
VERIFY=certifi.where()
CASE_RE=re.compile(r'(?<!\d)(\d{1,4})\s*K\s*(\d{1,4})\s*/\s*(\d{2,4})(?!\d)',re.I)

ZVGSCOUT_EXACT_IMAGE_FALLBACKS={
    # Confirmed exact case gallery from ZvgScout. These URLs are used only when HTML discovery fails.
    '0023K0093/2024':[
        'https://zvgscout.com/api/images/sachsen/0023K0093-2024-chemnitz/c0a1bda3-d790-44a3-bb0b-d54f3b298193.jpeg',
        'https://zvgscout.com/api/images/sachsen/0023K0093-2024-chemnitz/05b413ee-f4cf-48fd-ad96-0491db632c3b.jpeg',
        'https://zvgscout.com/api/images/sachsen/0023K0093-2024-chemnitz/af0c93e3-92a2-4200-b321-026fc80cd32d.jpeg',
        'https://zvgscout.com/api/images/sachsen/0023K0093-2024-chemnitz/ae0f67c7-382a-4349-900a-2c60b89ce752.jpeg',
        'https://zvgscout.com/api/images/sachsen/0023K0093-2024-chemnitz/37f5d3a0-3002-4067-8ae0-2af616dc6e21.jpeg',
        'https://zvgscout.com/api/images/sachsen/0023K0093-2024-chemnitz/0ea4ac3d-c1ab-4915-9036-b248238f3821.jpeg',
        'https://zvgscout.com/api/images/sachsen/0023K0093-2024-chemnitz/b152722c-1afe-41ef-9e32-f6386a42aa24.jpeg',
    ],
    '0015K0184/2024':[
        'https://zvgscout.com/api/images/sachsen/0015K0184-2024-chemnitz/b0518a9a-5f37-401c-ab87-0f417c6023c7.jpeg',
    ],
}

def slug(key): return re.sub(r'[^A-Za-z0-9_-]+','-',key).strip('-')
def compact_slug(key):
    m=CASE_RE.search(str(key or ''))
    if not m: return slug(key)
    a,b,y=m.groups()
    return f'{int(a):04d}K{int(b):04d}-{int(y) if len(y)==4 else 2000+int(y)}-chemnitz'
def canonical_case_parts(s):
    m=CASE_RE.search(str(s or ''))
    if not m: return None
    a,b,y=m.groups(); yi=int(y); yi=2000+yi if len(y)==2 else yi
    return (int(a),int(b),yi)
def same_case(text,key): return canonical_case_parts(text)==canonical_case_parts(key)

def req(url,timeout=50,referer=None):
    h={}
    if referer: h['Referer']=referer
    last=None
    for attempt in range(3):
        try:
            r=S.get(url,timeout=timeout,verify=VERIFY,allow_redirects=True,headers=h)
            r.raise_for_status()
            return r.content,r.url,r.headers.get('content-type','')
        except Exception as e:
            last=e; time.sleep(0.7*(attempt+1))
    curl=shutil.which('curl.exe') or shutil.which('curl')
    if curl:
        td=Path(tempfile.mkdtemp()); p=td/'x.bin'
        args=[curl,'-L','--fail','--silent','--show-error','--retry','2','--connect-timeout','20','--max-time','60','-A',UA]
        if referer: args += ['-e',referer]
        args += ['-o',str(p),url]
        cp=subprocess.run(args,capture_output=True,text=True)
        if cp.returncode==0 and p.exists() and p.stat().st_size:
            b=p.read_bytes(); shutil.rmtree(td,ignore_errors=True); return b,url,''
        shutil.rmtree(td,ignore_errors=True)
        last=RuntimeError(f'{last}; curl={cp.stderr.strip()}')
    raise last or RuntimeError('download failed')

def text_html(b): return b.decode('utf-8','ignore')
def pdf_ok(b,ct=''): return b.startswith(b'%PDF-') or 'application/pdf' in (ct or '').lower()

def crop_white(im):
    im=im.convert('RGB')
    bg=Image.new('RGB',im.size,(255,255,255))
    d=ImageChops.difference(im,bg).convert('L')
    bbox=d.point(lambda p:255 if p>12 else 0).getbbox()
    if bbox:
        l,t,r,b=bbox; pad=8
        im=im.crop((max(0,l-pad),max(0,t-pad),min(im.width,r+pad),min(im.height,b+pad)))
    return im

def dhash(im):
    x=im.convert('L').resize((9,8))
    px=list(x.get_flattened_data()) if hasattr(x,'get_flattened_data') else list(x.getdata())
    n=0
    for y in range(8):
        for xx in range(8): n=(n<<1)|(px[y*9+xx]>px[y*9+xx+1])
    return f'{n:016x}'

def load_seen(outdir):
    seen=set()
    if not outdir.exists(): return seen
    for p in outdir.glob('*.jpg'):
        try:
            with Image.open(p) as im: seen.add(dhash(im))
        except Exception: pass
    return seen

def save_image_bytes(b,path,seen,min_side=240):
    try:
        im=Image.open(io.BytesIO(b)); im.load()
    except Exception:
        return False,'decode_failed'
    w,h=im.size
    if min(w,h)<min_side or max(w,h)<500: return False,f'too_small_{w}x{h}'
    if max(w/h,h/w)>4.8: return False,f'extreme_aspect_{w}x{h}'
    im=crop_white(im)
    if min(im.size)<min_side-20: return False,'cropped_too_small'
    stat=ImageStat.Stat(im.resize((100,100)).convert('L'))
    if stat.mean[0]>248 and stat.stddev[0]<10: return False,'nearly_blank'
    hsh=dhash(im)
    if hsh in seen: return False,'duplicate'
    seen.add(hsh)
    path.parent.mkdir(parents=True,exist_ok=True)
    im.save(path,'JPEG',quality=91,optimize=True)
    return True,f'{w}x{h}'

def download_image(url,outdir,prefix,seen,source,referer=None,min_side=240):
    try:
        b,final,ct=req(url,timeout=45,referer=referer)
        p=outdir/f'{prefix}_{int(time.time()*1000)%100000000}_{len(list(outdir.glob(prefix+"*.jpg")))+1:02d}.jpg'
        ok,why=save_image_bytes(b,p,seen,min_side=min_side)
        if ok:
            return {'path':p,'source':source,'sourceUrl':final,'validation':why},None
        return None,{'url':url,'reason':why}
    except Exception as e:
        return None,{'url':url,'reason':str(e)[:300]}

def render_pdf_photos(b,outdir,prefix,seen,source,source_url):
    rows=[]
    try: doc=pymupdf.open(stream=b,filetype='pdf')
    except Exception: return rows
    for pi,page in enumerate(doc):
        imgs=page.get_images(full=True); zoom=2.0
        if not imgs: continue
        pix=page.get_pixmap(matrix=pymupdf.Matrix(zoom,zoom),alpha=False)
        pageim=Image.frombytes('RGB',[pix.width,pix.height],pix.samples)
        area=max(1,page.rect.width*page.rect.height)
        for xref,*_ in imgs:
            try: rects=page.get_image_rects(xref)
            except Exception: rects=[]
            for rect in rects:
                if rect.width*rect.height < area*.07 or rect.width<110 or rect.height<80: continue
                box=tuple(int(v*zoom) for v in (rect.x0,rect.y0,rect.x1,rect.y1))
                im=pageim.crop(box)
                bio=io.BytesIO(); im.save(bio,'JPEG',quality=93)
                p=outdir/f'{prefix}_{pi+1:02d}_{len(rows)+1:02d}.jpg'
                ok,why=save_image_bytes(bio.getvalue(),p,seen,min_side=220)
                if ok: rows.append({'path':p,'source':source,'sourceUrl':source_url,'validation':why})
    return rows

def zvgscout_detail_url(case_key):
    return f'https://zvgscout.com/sachsen/{compact_slug(case_key)}'

def zvgscout_image_urls(h,case_key,base):
    cs=compact_slug(case_key)
    out=[]
    soup=BeautifulSoup(h,'html.parser')
    for tag in soup.find_all(['img','source','a']):
        for attr in ('src','data-src','data-lazy-src','href'):
            u=tag.get(attr)
            if not u: continue
            u=html.unescape(u).replace('\\/','/')
            u=urljoin(base,u)
            if f'/api/images/sachsen/{cs}/' in u: out.append(u)
        for attr in ('srcset','data-srcset'):
            v=tag.get(attr)
            if not v: continue
            for part in v.split(','):
                u=part.strip().split()[0]
                u=urljoin(base,html.unescape(u).replace('\\/','/'))
                if f'/api/images/sachsen/{cs}/' in u: out.append(u)
    raw=html.unescape(h).replace('\\/','/')
    out+=re.findall(rf'https?://zvgscout\.com/api/images/sachsen/{re.escape(cs)}/[^"\'<>\s]+?\.(?:jpe?g|png|webp)',raw,re.I)
    out+=['https://zvgscout.com'+x for x in re.findall(rf'(?<!https://zvgscout\.com)(/api/images/sachsen/{re.escape(cs)}/[^"\'<>\s]+?\.(?:jpe?g|png|webp))',raw,re.I)]
    return list(dict.fromkeys(out))

def zvgscout_pdf_links(h,base):
    soup=BeautifulSoup(h,'html.parser'); out=[]
    for a in soup.find_all('a',href=True):
        label=' '.join(a.stripped_strings).strip()
        u=urljoin(base,html.unescape(a['href']).replace('\\/','/'))
        if 'firebasestorage.googleapis.com' in u and ('.pdf' in u.lower() or 'alt=media' in u.lower()):
            lo=label.lower()
            kind='OTHER'
            if 'bekanntmach' in lo: kind='BEKANNTMACHUNG'
            elif 'gutachten' in lo: kind='GUTACHTEN'
            elif 'expos' in lo: kind='EXPOSE'
            elif 'foto' in lo or 'photo' in lo: kind='FOTO'
            out.append((kind,u,label))
    return out

def append_doc_if_new(rec,b,kind,u,outdoc):
    if not pdf_ok(b): return None
    existing={(d.get('sourceUrl'),d.get('type')) for d in rec.get('documents',[])}
    if (u,kind) in existing: return None
    outdoc.mkdir(parents=True,exist_ok=True)
    idx=len(list(outdoc.glob('zvgscout_*.pdf')))+1
    p=outdoc/f'zvgscout_{kind.lower()}_{idx:02d}.pdf'
    p.write_bytes(b)
    rel='/'+str(p.relative_to(ROOT/'public')).replace('\\','/')
    row={'type':kind,'url':rel,'sourceUrl':u,'filename':p.name,'bytes':len(b),'source':'ZvgScout cache of court attachment'}
    rec.setdefault('documents',[]).append(row)
    rec['documentCount']=len(rec['documents'])
    return row

def scrape_zvgscout(r,outimg,outdoc,seen,rec):
    key=r['caseKey']; url=zvgscout_detail_url(key)
    meta={'status':'NOT_FOUND','expected':0,'url':url,'downloaded':0,'pdfsAdded':0,'rejects':[]}
    detail_h=None; detail_final=url
    try:
        b,detail_final,ct=req(url); h=text_html(b); txt=BeautifulSoup(h,'html.parser').get_text(' ',strip=True)
        if same_case(txt,key) and 'Objekt nicht länger verfügbar' not in txt:
            detail_h=h
            m=re.search(r'(\d{1,3})\s+Bilder',txt,re.I)
            meta['expected']=int(m.group(1)) if m else 0
            meta['status']='MATCHED'
    except Exception as e:
        meta['detailError']=str(e)[:260]

    urls=[]
    if detail_h:
        urls += zvgscout_image_urls(detail_h,key,detail_final)
        for kind,pdfurl,label in zvgscout_pdf_links(detail_h,detail_final):
            try:
                bb,ff,cct=req(pdfurl,referer=detail_final)
                if not pdf_ok(bb,cct):
                    meta['rejects'].append({'url':pdfurl,'reason':f'not_pdf {cct} {len(bb)}'}); continue
                added=append_doc_if_new(rec,bb,kind,pdfurl,outdoc)
                if added: meta['pdfsAdded']+=1
                if kind in ('FOTO','EXPOSE','GUTACHTEN'):
                    for row in render_pdf_photos(bb,outimg,'zvgscout_pdf',seen,'ZvgScout court PDF',pdfurl):
                        rec.setdefault('_newPhotos',[]).append(row)
            except Exception as e:
                meta['rejects'].append({'url':pdfurl,'reason':str(e)[:260]})

    # Current list pages remain useful even when the detail is already archived/unavailable.
    if not urls:
        for pg in range(1,9):
            listurl=f'https://zvgscout.com/zwangsversteigerungen/b_land_14/sachsen?page={pg}'
            try:
                bb,ff,cct=req(listurl); hh=text_html(bb)
                found=zvgscout_image_urls(hh,key,ff)
                if found:
                    urls+=found
                    meta['status']='LIST_IMAGE'
                    meta['listUrl']=ff
                    break
            except Exception as e:
                if pg==1: meta['listError']=str(e)[:220]

    # Add exact-case fallbacks confirmed during package QA. They are harmless duplicates when HTML discovery already found them.
    urls += ZVGSCOUT_EXACT_IMAGE_FALLBACKS.get(key,[])
    for u in list(dict.fromkeys(urls))[:30]:
        row,rej=download_image(u,outimg,'zvgscout',seen,'ZvgScout · exact object image',referer=detail_final,min_side=220)
        if row: rec.setdefault('_newPhotos',[]).append(row)
        elif rej: meta['rejects'].append(rej)
    meta['downloaded']=len([x for x in rec.get('_newPhotos',[]) if x.get('source','').startswith('ZvgScout')])
    return meta

def decode_embedded_urls(raw):
    candidates=set()
    txt=html.unescape(raw).replace('\\/','/')
    for u in re.findall(r'https?://[^\s"\'<>]+',txt,re.I):
        if 'nvmlkpgoscbdvgxduupu.supabase.co' in u: candidates.add(u.rstrip('),;'))
    for enc in re.findall(r'https?%3A%2F%2F[^"\'<>\s&]+',raw,re.I):
        try:
            u=unquote(unquote(enc))
            if 'nvmlkpgoscbdvgxduupu.supabase.co' in u: candidates.add(u)
        except Exception: pass
    return list(candidates)

def enrich_vp(rec,r,outimg,seen):
    src=(rec.get('sources') or {}).get('versteigerungspilot') or {}
    page=src.get('url')
    if not page: return src
    try:
        b,ff,ct=req(page); h=text_html(b)
    except Exception as e:
        src['v51Error']=str(e)[:260]; return src
    urls=decode_embedded_urls(h)
    kept=0; rejects=[]
    for u in urls[:40]:
        row,rej=download_image(u,outimg,'vp51',seen,'Versteigerungspilot · exact object gallery',referer=ff,min_side=220)
        if row:
            rec.setdefault('_newPhotos',[]).append(row); kept+=1
        elif rej: rejects.append(rej)
    src['v51Candidates']=len(urls); src['v51Downloaded']=kept
    src.setdefault('rejects',[])
    src['rejects']=(src['rejects']+rejects)[:30]
    return src

def is24_variants(url):
    u=html.unescape(url).replace('\\/','/')
    m=re.match(r'(https?://pictures\.immobilienscout24\.de/listings/[^?\s"\'<>]+?\.jpg)',u,re.I)
    if not m: return [u]
    base=m.group(1)
    return [
        base+'/ORIG/resize/1600x1200%3E/format/jpg/quality/95',
        base+'/ORIG/resize/1200x1200%3E/format/jpg/quality/90',
        base+'/ORIG/legacy_thumbnail/1024x768/format/jpg/quality/90',
        base,
        u
    ]

def enrich_waldheim_is24(rec,r,outimg,seen):
    if r['caseKey']!='0015K0184/2024': return (rec.get('sources') or {}).get('waldheimSecondary') or {}
    url='https://www.immobilienscout24.de/expose/170313359'
    src=(rec.get('sources') or {}).get('waldheimSecondary') or {'url':url}
    try:
        b,ff,ct=req(url); h=text_html(b)
    except Exception as e:
        src['v51Error']=str(e)[:260]; return src
    raw=html.unescape(h).replace('\\/','/')
    urls=re.findall(r'https?://pictures\.immobilienscout24\.de/listings/[^\s"\'<>]+?\.jpg(?:/[^\s"\'<>]*)?',raw,re.I)
    # Also parse obj_picture JSON value, which is reliably present even when the gallery is JS-driven.
    for m in re.finditer(r'"obj_picture"\s*:\s*"([^"]+)"',h,re.I):
        urls.append(html.unescape(m.group(1)).replace('\\/','/'))
    variants=[]
    for u in urls:
        variants.extend(is24_variants(u))
    kept=0; rejects=[]
    for u in list(dict.fromkeys(variants))[:60]:
        row,rej=download_image(u,outimg,'waldheim51',seen,'ImmobilienScout24 · exact secondary listing',referer=ff,min_side=220)
        if row:
            rec.setdefault('_newPhotos',[]).append(row); kept+=1
            if kept>=8: break
        elif rej: rejects.append(rej)
    src['v51Candidates']=len(variants); src['v51Downloaded']=kept
    src['expected']=max(int(src.get('expected') or 0),3)
    src.setdefault('rejects',[]); src['rejects']=(src['rejects']+rejects)[:40]
    return src

def finalize_record(rec,r):
    existing=rec.get('images',[])
    rows=[]
    # keep existing V5 images first; new exact-source enrichment follows.
    for im in existing:
        rows.append(dict(im))
    for row in rec.pop('_newPhotos',[]):
        p=row['path']
        rel='/'+str(p.relative_to(ROOT/'public')).replace('\\','/')
        rows.append({
            'url':rel,
            'alt':f"{r['propertyType']} {r['address']} – Objektfoto {len(rows)+1}",
            'isMain':False,
            'sortOrder':len(rows),
            'source':row['source'],
            'sourceUrl':row['sourceUrl']
        })
    # Make ZvgScout/official-derived image the hero when an existing record had no images.
    if rows:
        for i,x in enumerate(rows):
            x['sortOrder']=i; x['isMain']=i==0
    rec['images']=rows
    rec['imageCount']=len(rows)
    rec['documentCount']=len(rec.get('documents',[]))
    return rec

def make_preview(manifest):
    p=ROOT/'var'/'chemnitz_v5_1_media_preview.html'; blocks=[]
    for key,x in manifest['records'].items():
        imgs=''.join(f"<figure><img src='../public{im['url']}'><figcaption>{html.escape(im.get('source',''))}</figcaption></figure>" for im in x['images']) or '<p class=none>No verified photo available.</p>'
        blocks.append(f"<section><h2>{html.escape(key)} — {html.escape(x['address'])}</h2><p>Images: {len(x['images'])} · Docs: {len(x['documents'])}</p><div class=grid>{imgs}</div></section>")
    page="""<!doctype html><meta charset=utf-8><title>Chemnitz V5.1 media preview</title><style>body{font-family:Arial;margin:24px;background:#f4f5f7;color:#111}section{background:white;border:1px solid #ddd;border-radius:12px;padding:16px;margin:18px 0}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}figure{margin:0}img{width:100%;height:170px;object-fit:cover;border-radius:8px;border:1px solid #ddd}figcaption{font-size:11px;color:#555;margin-top:4px}.none{color:#777}</style>"""+''.join(blocks)
    p.write_text(page,encoding='utf-8'); return p

def main():
    if not DATA.exists():
        print(f'[ERROR] Missing V5 data: {DATA}')
        sys.exit(2)
    if not MANIFEST.exists():
        print(f'[ERROR] Missing V5 manifest: {MANIFEST}. Run CHEMNITZ_V5_PREPARE_VERIFY_IMPORT.cmd once first.')
        sys.exit(2)
    data=json.loads(DATA.read_text(encoding='utf-8'))
    manifest=json.loads(MANIFEST.read_text(encoding='utf-8'))
    DEBUG.mkdir(parents=True,exist_ok=True)
    total_added=0
    for idx,r in enumerate(data['records'],1):
        key=r['caseKey']; rec=manifest['records'].setdefault(key,{'address':r['address'],'images':[],'documents':[],'sources':{}})
        outimg=PUB_IMG/slug(key); outdoc=PUB_DOC/slug(key)
        outimg.mkdir(parents=True,exist_ok=True); outdoc.mkdir(parents=True,exist_ok=True)
        seen=load_seen(outimg)
        before=len(rec.get('images',[]))
        zmeta=scrape_zvgscout(r,outimg,outdoc,seen,rec)
        rec.setdefault('sources',{})['zvgscout']=zmeta
        rec['sources']['versteigerungspilot']=enrich_vp(rec,r,outimg,seen)
        rec['sources']['waldheimSecondary']=enrich_waldheim_is24(rec,r,outimg,seen)
        rec=finalize_record(rec,r)
        manifest['records'][key]=rec
        added=rec['imageCount']-before; total_added+=max(0,added)
        print(f"[V5.1] {idx:02d}/39 {key}: images {before}->{rec['imageCount']} docs={rec['documentCount']} ZvgScout={zmeta.get('expected',0)}/{zmeta.get('downloaded',0)} VP+={rec['sources']['versteigerungspilot'].get('v51Downloaded',0)} IS24+={rec['sources']['waldheimSecondary'].get('v51Downloaded',0)}")
    vals=list(manifest['records'].values())
    manifest['version']='5.1'
    manifest['generatedAt']=time.strftime('%Y-%m-%dT%H:%M:%S')
    manifest['summary']={
        'records':len(vals),
        'images':sum(x.get('imageCount',0) for x in vals),
        'documents':sum(x.get('documentCount',0) for x in vals),
        'recordsWithImages':sum(1 for x in vals if x.get('imageCount',0)>0),
        'recordsWithDocuments':sum(1 for x in vals if x.get('documentCount',0)>0),
        'imagesAddedByV51':total_added,
    }
    MANIFEST.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    prev=make_preview(manifest)
    print('[V5.1] summary',manifest['summary'])
    print('[V5.1] manifest:',MANIFEST)
    print('[V5.1] preview:',prev)

if __name__=='__main__':
    main()
