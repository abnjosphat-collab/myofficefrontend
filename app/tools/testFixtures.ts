import type { Activity, Tool } from './prototype';
const base={make:'Makita',department:'Engineering',section:'Mechanical',location:'Main workshop',condition:'Good'};
export const TEST_TOOLS:Tool[]=[
 {id:'ENG-CD-01',name:'Cordless drill',serial:'DR-1',category:'Power tools',kind:'cordless-drill',status:'available',...base},
 {id:'ENG-AG-02',name:'Angle grinder',serial:'DEMO-MK5030',category:'Power tools',kind:'angle-grinder',status:'issued',holder:'Alex Morgan · EMP-014',due:'25 Sep, 16:00',...base},
 {id:'ENG-RH-03',name:'Rotary hammer',serial:'RH-3',category:'Power tools',kind:'rotary-hammer',status:'available',...base},
 {id:'ENG-TW-04',name:'Torque wrench',serial:'TW-4',category:'Hand tools',kind:'torque-wrench',status:'overdue',holder:'Jordan Ellis · EMP-028',due:'20 Sep, 16:00',...base},
 {id:'ENG-SS-05',name:'Socket wrench set',serial:'SS-5',category:'Hand tools',kind:'socket-set',status:'issued',holder:'Sam Taylor · EMP-036',due:'26 Sep, 16:00',...base},
 {id:'ENG-DM-06',name:'Digital multimeter',serial:'DM-6',category:'Test & measure',kind:'digital-multimeter',status:'available',...base},
 {id:'ENG-CM-07',name:'Clamp meter',serial:'CM-7',category:'Test & measure',kind:'clamp-meter',status:'available',...base},
 {id:'ENG-WL-08',name:'Work lamp',serial:'WL-8',category:'Lighting',kind:'work-lamp',status:'available',...base},
 {id:'ENG-IW-09',name:'Inverter welder',serial:'IW-9',category:'Welding',kind:'inverter-welder',status:'attention',...base},
];
export const TEST_ACTIVITY:Activity[]=[{id:'a1',toolId:'ENG-AG-02',title:'Angle grinder issued',detail:'Alex Morgan · EMP-014',time:'Now'}];
