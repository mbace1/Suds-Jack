// Suds Game Core — low-overhead telemetry/replay primitives.
export class Telemetry {
  constructor(name,{limit=1024}={}){this.name=name;this.limit=limit;this.events=[];this.frame=0;this.started=performance.now();}
  tick(n=1){this.frame+=n;}
  mark(type,data={}){const e={frame:this.frame,t:+(performance.now()-this.started).toFixed(2),type,...data};this.events.push(e);if(this.events.length>this.limit)this.events.shift();return e;}
  count(type){return this.events.reduce((n,e)=>n+(e.type===type),0);}
  recent(n=32){return this.events.slice(-n);}
  export(){return {schema:1,name:this.name,frames:this.frame,events:this.events.slice()};}
}

export class InputTape {
  constructor(){this.frames=[];this.playhead=0;}
  record(frame,input){this.frames.push({frame,input:structuredClone(input)});}
  reset(){this.playhead=0;}
  next(){return this.frames[this.playhead++]?.input ?? null;}
  get done(){return this.playhead>=this.frames.length;}
  export(){return JSON.stringify({schema:1,frames:this.frames});}
  static import(text){const data=JSON.parse(text),t=new InputTape();if(data.schema!==1)throw Error('Unsupported tape schema');t.frames=data.frames;t.reset();return t;}
}

export function invariant(ok,message,telemetry=null,data={}){
  if(ok)return true;
  telemetry?.mark('invariant-failed',{message,...data});
  throw new Error(message);
}
