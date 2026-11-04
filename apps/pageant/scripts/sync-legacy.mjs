import fs from 'node:fs';import path from 'node:path';
const root=path.resolve('../..'),target=path.resolve('public');
for(const p of ['editorial','news/downloads','news/copy','news/articles-copy.zip','Fobi/records','media/fobi-trance-logo-90s-16x9.mp4','media/self-logo-animation-7s-16x9.mp4']){
 const source=path.join(root,'public',p);if(!fs.existsSync(source))continue;const dest=path.join(target,p);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.cpSync(source,dest,{recursive:true});
}
