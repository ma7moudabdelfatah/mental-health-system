const http=require('http'), fs=require('fs'), path=require('path');
const root=__dirname;
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json'};
http.createServer((req,res)=>{
  let p= req.url.split('?')[0];
  if(p==='/') p='/index.html';
  const fp= path.join(root, p);
  if(!fp.startsWith(root)) {res.writeHead(403); return res.end('forbidden')}
  fs.readFile(fp,(e,d)=>{
    if(e){ res.writeHead(404); return res.end('not found: '+p)}
    const ext=path.extname(fp);
    res.writeHead(200,{'Content-Type': mime[ext]||'text/plain'});
    res.end(d);
  });
}).listen(8000, ()=> console.log('Server running at http://localhost:8000'));
