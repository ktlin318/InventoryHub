import { useEffect, useMemo, useState } from "react";

export type Status = "草稿" | "待確認" | "生效" | "部分提領" | "已結清" | "已取消";
export type OutboundStatus = "草稿" | "待覆核" | "已生效" | "已取消";
export type UserRole = "寄庫人員" | "覆核主管" | "系統管理員";
export type Permission = "建立寄庫單" | "調整寄庫量" | "覆核寄庫單" | "建立出庫單" | "調整出庫單" | "覆核出庫單" | "取消沖銷出庫單" | "列印出庫單" | "管理人員權限";
export type User = { id:string;name:string;employeeNo:string;email:string;role:UserRole;active:boolean;permissions:Permission[] };
export type Customer = { id:string;code:string;name:string;type:"公司"|"個人";phone:string };
export type Product = { id:string;code:string;name:string;spec:string;unit:string };
export type Warehouse = { id:string;code:string;name:string };
export type OrderLine = { id:string;productId:string;orderedQty:number;deliveredQty:number;unitPrice:number;discount:number };
export type Order = { id:string;no:string;customerId:string;date:string;source:"正式訂單"|"人工建立";lines:OrderLine[] };
export type ConsignmentLine = { id:string;productId:string;warehouseId:string;qty:number;remainingQty:number;averagePrice:number };
export type AuditEvent = { id:string;action:string;actorId:string;actorName:string;at:string;note:string };
export type Consignment = { id:string;no:string;orderId?:string;source:"訂單"|"人工建立";customerId:string;deadline:string;note:string;status:Status;createdBy:string;createdByName:string;createdAt:string;approvedBy?:string;approvedByName?:string;approvedAt?:string;lines:ConsignmentLine[];audits:AuditEvent[] };
export type OutboundAllocation = { consignmentId:string;consignmentNo:string;consignmentLineId:string;productId:string;warehouseId:string;qty:number;averagePrice:number };
export type OutboundLine = { id:string;productId:string;warehouseId:string;qty:number;allocations:OutboundAllocation[] };
export type Outbound = { id:string;no:string;customerId:string;plannedDate:string;actualDate:string;receiver:string;phone:string;vehicleNo:string;note:string;status:OutboundStatus;createdBy:string;createdByName:string;createdAt:string;approvedBy?:string;approvedByName?:string;approvedAt?:string;lines:OutboundLine[];audits:AuditEvent[] };
export type Store = { users:User[];customers:Customer[];products:Product[];warehouses:Warehouse[];orders:Order[];consignments:Consignment[];outbounds:Outbound[] };

export const rolePermissions:Record<UserRole,Permission[]>={
  "寄庫人員":["建立寄庫單","建立出庫單","列印出庫單"],
  "覆核主管":["建立寄庫單","調整寄庫量","覆核寄庫單","建立出庫單","調整出庫單","覆核出庫單","列印出庫單"],
  "系統管理員":["建立寄庫單","調整寄庫量","覆核寄庫單","建立出庫單","調整出庫單","覆核出庫單","取消沖銷出庫單","列印出庫單","管理人員權限"],
};
export const initialUsers:User[]=[
  {id:"u-operator",name:"王小明",employeeNo:"EMP-0018",email:"operator@inventoryhub.local",role:"寄庫人員",active:true,permissions:rolePermissions["寄庫人員"]},
  {id:"u-supervisor",name:"林主管",employeeNo:"EMP-0003",email:"supervisor@inventoryhub.local",role:"覆核主管",active:true,permissions:rolePermissions["覆核主管"]},
  {id:"u-admin",name:"陳管理員",employeeNo:"EMP-0001",email:"admin@inventoryhub.local",role:"系統管理員",active:true,permissions:rolePermissions["系統管理員"]},
];
const now="2026-07-19T09:00:00+08:00";
const initialStore:Store={
  users:initialUsers,
  customers:[{id:"c-1",code:"CUS-0001",name:"沐光設計有限公司",type:"公司",phone:"02-2718-6620"},{id:"c-2",code:"CUS-0002",name:"陳美華",type:"個人",phone:"0912-660-318"},{id:"c-3",code:"CUS-0003",name:"日禾餐飲股份有限公司",type:"公司",phone:"04-2328-1508"}],
  products:[{id:"p-1",code:"PRD-0182",name:"壓克力展示架",spec:"A4 直式／透明",unit:"件"},{id:"p-2",code:"PRD-0246",name:"不鏽鋼保溫瓶",spec:"500ml／霧黑",unit:"件"},{id:"p-3",code:"PRD-0311",name:"客製托盤",spec:"30×20cm／霧銀",unit:"件"}],
  warehouses:[{id:"w-1",code:"WH-TPE",name:"台北倉"},{id:"w-2",code:"WH-TXG",name:"台中倉"},{id:"w-3",code:"WH-KHH",name:"高雄倉"}],
  orders:[
    {id:"o-1",no:"SO-202607-1048",customerId:"c-1",date:"2026-07-12",source:"正式訂單",lines:[{id:"ol-1",productId:"p-1",orderedQty:200,deliveredQty:80,unitPrice:320,discount:6400},{id:"ol-2",productId:"p-2",orderedQty:100,deliveredQty:40,unitPrice:680,discount:6800}]},
    {id:"o-2",no:"SO-202607-1052",customerId:"c-2",date:"2026-07-14",source:"正式訂單",lines:[{id:"ol-3",productId:"p-2",orderedQty:60,deliveredQty:12,unitPrice:720,discount:3600}]},
    {id:"o-3",no:"SO-202607-0981",customerId:"c-3",date:"2026-07-05",source:"正式訂單",lines:[{id:"ol-4",productId:"p-3",orderedQty:400,deliveredQty:80,unitPrice:260,discount:10400}]},
  ],
  consignments:[
    {id:"cs-1",no:"CS-20260718-001",orderId:"o-1",source:"訂單",customerId:"c-1",deadline:"2026-10-31",note:"客戶預計分兩次提領",status:"待確認",createdBy:"u-operator",createdByName:"王小明",createdAt:now,lines:[{id:"cl-1",productId:"p-1",warehouseId:"w-1",qty:120,remainingQty:120,averagePrice:288},{id:"cl-2",productId:"p-2",warehouseId:"w-1",qty:60,remainingQty:60,averagePrice:612}],audits:[{id:"a-1",action:"建立草稿",actorId:"u-operator",actorName:"王小明",at:now,note:"建立寄庫單"},{id:"a-2",action:"送出覆核",actorId:"u-operator",actorName:"王小明",at:now,note:"等待另一位人員確認"}]},
    {id:"cs-2",no:"CS-20260717-009",orderId:"o-3",source:"訂單",customerId:"c-3",deadline:"2026-09-30",note:"分批取貨",status:"生效",createdBy:"u-operator",createdByName:"王小明",createdAt:"2026-07-17T17:46:00+08:00",approvedBy:"u-supervisor",approvedByName:"林主管",approvedAt:"2026-07-18T09:10:00+08:00",lines:[{id:"cl-3",productId:"p-3",warehouseId:"w-2",qty:320,remainingQty:320,averagePrice:234}],audits:[{id:"a-3",action:"建立草稿",actorId:"u-operator",actorName:"王小明",at:"2026-07-17T17:46:00+08:00",note:"建立寄庫單"},{id:"a-4",action:"覆核生效",actorId:"u-supervisor",actorName:"林主管",at:"2026-07-18T09:10:00+08:00",note:"確認資料與數量無誤"}]},
  ],
  outbounds:[],
};
const storageKey="inventoryhub-mvp-v2";
const makeId=(prefix:string)=>`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
export const formatTime=(value:string)=>new Intl.DateTimeFormat("zh-TW",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Taipei"}).format(new Date(value));
export const averagePrice=(line:OrderLine)=>Math.round(((line.unitPrice*line.orderedQty-line.discount)/line.orderedQty)*100)/100;

function fifoAllocations(store:Store,customerId:string,productId:string,warehouseId:string,qty:number){
  let need=qty;const allocations:OutboundAllocation[]=[];
  const batches=store.consignments.filter(c=>c.customerId===customerId&&["生效","部分提領"].includes(c.status)).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
  for(const c of batches){for(const line of c.lines.filter(l=>l.productId===productId&&l.warehouseId===warehouseId&&l.remainingQty>0)){const take=Math.min(need,line.remainingQty);if(take>0)allocations.push({consignmentId:c.id,consignmentNo:c.no,consignmentLineId:line.id,productId,warehouseId,qty:take,averagePrice:line.averagePrice});need-=take;if(need===0)return allocations;}}
  if(need>0)throw new Error("出庫數量超過寄庫餘量");return allocations;
}

export function useInventoryStore(){
  const [store,setStore]=useState<Store>(()=>{if(typeof window==="undefined")return initialStore;const saved=window.localStorage.getItem(storageKey);if(!saved)return initialStore;const parsed=JSON.parse(saved) as Partial<Store>;return{...initialStore,...parsed,users:parsed.users?.length?parsed.users:initialUsers,outbounds:parsed.outbounds??[]};});
  useEffect(()=>{window.localStorage.setItem(storageKey,JSON.stringify(store));},[store]);
  const actions=useMemo(()=>({
    addCustomer(input:Omit<Customer,"id"|"code">){setStore(s=>({...s,customers:[...s.customers,{...input,id:makeId("c"),code:`CUS-${String(s.customers.length+1).padStart(4,"0")}` }]}));},
    addProduct(input:Omit<Product,"id"|"code">){setStore(s=>({...s,products:[...s.products,{...input,id:makeId("p"),code:`PRD-${String(404+s.products.length).padStart(4,"0")}` }]}));},
    addOrder(input:Omit<Order,"id">){setStore(s=>({...s,orders:[...s.orders,{...input,id:makeId("o") }]}));},
    addUser(input:Omit<User,"id">){setStore(s=>({...s,users:[...s.users,{...input,id:makeId("u") }]}));},
    updateUser(id:string,changes:Partial<Omit<User,"id">>){setStore(s=>({...s,users:s.users.map(x=>x.id===id?{...x,...changes}:x)}));},
    saveConsignment(input:Omit<Consignment,"id"|"no"|"createdAt"|"audits">,submit:boolean,user:User){setStore(s=>{const at=new Date().toISOString();const item:Consignment={...input,id:makeId("cs"),no:`CS-${new Date().toISOString().slice(0,10).replaceAll("-","")}-${String(s.consignments.length+1).padStart(3,"0")}`,status:submit?"待確認":"草稿",createdAt:at,audits:[{id:makeId("a"),action:"建立草稿",actorId:user.id,actorName:user.name,at,note:input.source==="人工建立"?"人工建立寄庫單":"由訂單建立寄庫單"},...(submit?[{id:makeId("a"),action:"送出覆核",actorId:user.id,actorName:user.name,at,note:"等待覆核"}]:[])]};return{...s,consignments:[item,...s.consignments]};});},
    approveConsignment(id:string,user:User){setStore(s=>({...s,consignments:s.consignments.map(x=>x.id!==id?x:{...x,status:"生效",approvedBy:user.id,approvedByName:user.name,approvedAt:new Date().toISOString(),audits:[...x.audits,{id:makeId("a"),action:"覆核生效",actorId:user.id,actorName:user.name,at:new Date().toISOString(),note:"寄庫餘量開始生效"}]})}));},
    returnConsignment(id:string,user:User){setStore(s=>({...s,consignments:s.consignments.map(x=>x.id!==id?x:{...x,status:"草稿",audits:[...x.audits,{id:makeId("a"),action:"退回修改",actorId:user.id,actorName:user.name,at:new Date().toISOString(),note:"請修正後重新送出"}]})}));},
    saveOutbound(input:Omit<Outbound,"id"|"no"|"createdAt"|"audits"|"lines">&{lines:{productId:string;warehouseId:string;qty:number}[]},submit:boolean,user:User){setStore(s=>{const at=new Date().toISOString();const lines:OutboundLine[]=input.lines.map(l=>({...l,id:makeId("outl"),allocations:fifoAllocations(s,input.customerId,l.productId,l.warehouseId,l.qty)}));const item:Outbound={...input,lines,id:makeId("out"),no:`OUT-${new Date().toISOString().slice(0,10).replaceAll("-","")}-${String(s.outbounds.length+1).padStart(3,"0")}`,status:submit?"待覆核":"草稿",createdAt:at,audits:[{id:makeId("a"),action:"建立出庫單",actorId:user.id,actorName:user.name,at,note:"系統已完成 FIFO 預分攤"},...(submit?[{id:makeId("a"),action:"送出覆核",actorId:user.id,actorName:user.name,at,note:"待覆核後正式扣除寄庫量"}]:[])]};return{...s,outbounds:[item,...s.outbounds]};});},
    approveOutbound(id:string,user:User){setStore(s=>{const outbound=s.outbounds.find(x=>x.id===id);if(!outbound||outbound.status!=="待覆核")return s;const allocations=outbound.lines.flatMap(l=>l.allocations);const consignments=s.consignments.map(c=>{const lines=c.lines.map(l=>{const take=allocations.filter(a=>a.consignmentLineId===l.id).reduce((n,a)=>n+a.qty,0);return take?{...l,remainingQty:l.remainingQty-take}:l;});const remaining=lines.reduce((n,l)=>n+l.remainingQty,0);return allocations.some(a=>a.consignmentId===c.id)?{...c,lines,status:(remaining===0?"已結清":"部分提領") as Status,audits:[...c.audits,{id:makeId("a"),action:"客戶提領",actorId:user.id,actorName:user.name,at:new Date().toISOString(),note:`由 ${outbound.no} FIFO 扣除`}]}:c;});return{...s,consignments,outbounds:s.outbounds.map(x=>x.id!==id?x:{...x,status:"已生效",approvedBy:user.id,approvedByName:user.name,approvedAt:new Date().toISOString(),actualDate:x.actualDate||new Date().toISOString().slice(0,10),audits:[...x.audits,{id:makeId("a"),action:"覆核出庫",actorId:user.id,actorName:user.name,at:new Date().toISOString(),note:"已正式扣除寄庫餘量"}]})};});},
    returnOutbound(id:string,user:User){setStore(s=>({...s,outbounds:s.outbounds.map(x=>x.id!==id?x:{...x,status:"草稿",audits:[...x.audits,{id:makeId("a"),action:"退回修改",actorId:user.id,actorName:user.name,at:new Date().toISOString(),note:"請修正後重新送出"}]})}));},
    reverseOutbound(id:string,user:User){setStore(s=>{const outbound=s.outbounds.find(x=>x.id===id);if(!outbound||outbound.status!=="已生效")return s;const allocations=outbound.lines.flatMap(l=>l.allocations);const consignments=s.consignments.map(c=>{const lines=c.lines.map(l=>{const restore=allocations.filter(a=>a.consignmentLineId===l.id).reduce((n,a)=>n+a.qty,0);return restore?{...l,remainingQty:l.remainingQty+restore}:l;});return allocations.some(a=>a.consignmentId===c.id)?{...c,lines,status:"生效" as Status,audits:[...c.audits,{id:makeId("a"),action:"出庫沖銷",actorId:user.id,actorName:user.name,at:new Date().toISOString(),note:`沖銷 ${outbound.no}，恢復寄庫量`}]}:c;});return{...s,consignments,outbounds:s.outbounds.map(x=>x.id!==id?x:{...x,status:"已取消",audits:[...x.audits,{id:makeId("a"),action:"取消沖銷",actorId:user.id,actorName:user.name,at:new Date().toISOString(),note:"寄庫餘量已恢復"}]})};});},
    reset(){setStore(initialStore);},
  }),[]);
  return{store,actions};
}
