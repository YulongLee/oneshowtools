export {};
declare global { interface Window { fortuneCat: {
  session(): Promise<any>; login(value:{email:string;password:string}):Promise<any>; logout():Promise<any>;
  getConfig():Promise<any>; saveConfig(value:any):Promise<any>; openControl():Promise<void>; hide():Promise<void>; quit():Promise<void>;
  setAlwaysOnTop(value:boolean):Promise<void>; setLaunchAtLogin(value:boolean):Promise<void>;
  onConfig(handler:(value:any)=>void):()=>void; onSession(handler:(value:any)=>void):()=>void;
} } }
