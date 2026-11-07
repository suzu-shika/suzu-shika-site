import sanitize from 'sanitize-html';
import {Parser} from 'htmlparser2';
const classes={card:['top-works-card-list','top-works-card-item'],green:['c-list-green-line','c-list-green-line-item'],quote:['works-voice-list','works-voice-item']};
export function richHtml(html,variant='green') {
 if(!classes[variant]) throw Error('Unknown rich HTML variant');
 const tags=['ul','li','p','strong','em','br',...(variant==='card'?[]:['a'])];
 let depth=0;
 const parser=new Parser({onopentag(tag){if(!tags.includes(tag))throw Error('Unsupported rich HTML tag: '+tag);if(tag==='ul'&&++depth>1)throw Error('Nested lists unsupported');},onclosetag(tag){if(tag==='ul')depth--;}});
 parser.write(html||'');parser.end();
 return sanitize(html||'',{allowedTags:tags,allowedAttributes:{ul:['class'],li:['class'],a:['href']},allowedSchemes:['http','https'],allowProtocolRelative:false,
 transformTags:{ul:()=>({tagName:'ul',attribs:{class:classes[variant][0]}}),li:()=>({tagName:'li',attribs:{class:classes[variant][1]}}),a:(tag,attrs)=>({tagName:tag,attribs:{href:/^(https?:\/\/|\/(?!\/))/.test(attrs.href||'')&&!/[\\\s]/.test(attrs.href)?attrs.href:''}})}});
}
