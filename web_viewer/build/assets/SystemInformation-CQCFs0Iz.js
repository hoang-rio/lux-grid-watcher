import{j as s,u as x,r as d}from"./index-DtM7oy-u.js";import{G as r}from"./GeneralValue-CCCBHiDb.js";function m({label:l,pValue:a,vValue:c}){return s.jsxs("div",{className:"power-item row",children:[s.jsx("div",{className:"power-title flex-1",children:l}),s.jsxs("div",{className:"power-value flex-1",children:[s.jsx("strong",{children:a})," W"]}),c!==void 0?s.jsxs("div",{className:"power-value flex-1",children:[s.jsx("strong",{children:c})," V"]}):s.jsx("span",{className:"power-value flex-1"})]})}function u({inverterData:l,isSocketConnected:a}){const{t:c}=x();return s.jsxs("div",{className:"pv flex-1",children:[s.jsxs("div",{className:"icon col align-center",children:[s.jsxs("div",{className:"col align-center",children:[s.jsx(r,{className:"show-small",value:a?l.p_pv:0,unit:" W"}),s.jsx("img",{src:"/assets/icon_solor_yielding.png"})]}),s.jsx("div",{className:`y-arrow ${l.p_pv==0||!a?"none":""}`})]}),s.jsxs("div",{className:"pv-texts power flex-1",children:[s.jsx(m,{label:c("PV1"),pValue:a?l.p_pv_1:0,vValue:a?l.v_pv_1:0}),s.jsx(m,{label:c("PV2"),pValue:a?l.p_pv_2:0,vValue:a?l.v_pv_2:0}),s.jsx(m,{label:c("totalPV"),pValue:a?l.p_pv:0})]})]})}function j({inverterData:l,isSocketConnected:a}){return s.jsx("div",{className:"battery flex-1",children:s.jsxs("div",{className:"row align-center",children:[s.jsxs("div",{className:"battery-texts",children:[s.jsx(r,{value:a?l.p_discharge||l.p_charge:0,unit:" W"}),s.jsx(r,{value:a?l.soc:0,unit:"%"}),s.jsx(r,{value:a?l.v_bat:0,unit:" Vdc"})]}),s.jsxs("div",{className:"col align-center",children:[s.jsx(r,{className:"show-small",value:a?l.p_discharge||l.p_charge:0,unit:" W"}),s.jsx("img",{className:"battery-icon",src:`/assets/icon_battery_${a?Math.round(l.soc/2/10):0}_green.png`}),s.jsx(r,{className:"show-small",value:a?l.soc:0,unit:"%"}),s.jsx(r,{className:"show-small",value:a?l.v_bat:0,unit:" Vdc"})]}),s.jsx("div",{className:"arrows row",children:Array.from({length:2}).map((c,i)=>s.jsx("div",{className:`x-arrow ${a?l.p_discharge>0?"right":l.p_charge>0?"left":"none":"none"}`},"batter-arrow-"+i))})]})})}function o({inverterData:l,isSocketConnected:a}){return s.jsx("div",{className:"inverter flex-1",children:s.jsxs("div",{className:"row align-center",children:[s.jsx("img",{src:"/assets/inverter_off_grid_20231003.png"}),s.jsx("div",{className:"flex-1 arrows row justify-flex-end",children:Array.from({length:4}).map((c,i)=>s.jsx("div",{className:`x-arrow ${a?l.p_inv>0?"right":l.p_rec>0?"left":"none":"none"}`},"inverter-arrow-"+i))})]})})}function p({inverterData:l,isSocketConnected:a}){const c=d.useMemo(()=>{if(a){const i=(l.vacr||l.vacs||l.vact)/10;return i>300?0:i}return 0},[l.vacr,l.vacs,l.vact,a]);return s.jsxs("div",{className:"grid flex-1 row align-center justify-flex-end",children:[s.jsx("div",{className:"row arrows",children:Array.from({length:2}).map((i,e)=>s.jsx("div",{className:`x-arrow ${a?l.p_to_grid>0?"right":l.p_to_user>0?"left":"none":"none"}`},"grid-arrow-"+e))}),s.jsxs("div",{className:"col align-center",children:[s.jsx(r,{className:"show-small",value:a?l.p_to_user||l.p_to_grid:0,unit:" W"}),s.jsx("img",{src:"/assets/icon_grid.png"}),s.jsx(r,{className:"show-small",value:a?(l.vacr||l.vacs||l.vact)/10:0,unit:" Vac"}),s.jsx(r,{className:"show-small",value:a?l.fac/100:0,unit:" Hz"})]}),s.jsxs("div",{className:"grid-texts",children:[s.jsx(r,{value:a?l.p_to_user||l.p_to_grid:0,unit:" W"}),s.jsx(r,{value:c,unit:" Vac"}),s.jsx(r,{value:a?l.fac/100:0,unit:" Hz"})]})]})}function h({inverterData:l,isSocketConnected:a}){const{t:c}=x(),i=l.p_inv+l.p_to_user-l.p_rec;return s.jsx("div",{className:"consumption flex-1",children:s.jsxs("div",{className:"row",children:[s.jsxs("div",{className:"col align-center consumption-icon",children:[s.jsx("div",{className:"arrows col",children:Array.from({length:2}).map((e,n)=>s.jsx("div",{className:`y-arrow ${a&&i>0?"down":"none"}`},"comsumption-arrow-"+n))}),s.jsx("img",{src:"/assets/icon_consumption.png"}),s.jsx(r,{className:"show-small",value:a?i:0,unit:" W"})]}),s.jsxs("div",{className:"consumption-texts",children:[s.jsx(r,{value:a?i:0,unit:" W"}),s.jsx("div",{className:"description",children:c("consumptionPower")})]})]})})}function N({inverterData:l,isSocketConnected:a}){const{t:c}=x();return s.jsx("div",{className:"eps flex-1",children:s.jsxs("div",{className:"row",children:[s.jsxs("div",{className:"col align-center",children:[s.jsx("div",{className:`y-arrow ${a&&l.p_eps>0?"down":"none"}`}),s.jsx("img",{src:"/assets/icon_eps.png"}),l.p_eps===0?s.jsx("strong",{className:"show-small eps-status",children:c("eps.standby")}):s.jsx(r,{className:"show-small",value:a?l.p_eps:0,unit:" W"})]}),s.jsxs("div",{className:"eps-texts",children:[l.p_eps===0?s.jsx("strong",{className:"eps-status",children:c("eps.standby")}):s.jsx(r,{value:a?l.p_eps:0,unit:" W"}),s.jsx("div",{className:"description",children:c("eps.backupPower")})]})]})})}function f({inverterData:l,isSocketConnected:a,onReconnect:c}){const{t:i}=x();return s.jsxs("div",{className:"card system-information",children:[s.jsxs("div",{className:"system-title",children:[s.jsx("span",{className:"system-title-text",children:i("systemInformation")}),s.jsx("span",{children:l.deviceTime})]}),s.jsxs("div",{className:"system-graph",children:[s.jsxs("div",{className:"system-status row",children:[s.jsxs("div",{className:"system-status-display",title:l.status_text,children:[s.jsx("div",{className:`system-status-icon ${a?l.status!==0?"normal":"fault":"offline"}`}),s.jsx("div",{children:a?l.status!==0?i("normal"):i("fault"):i("offline")})]}),s.jsx("button",{className:"system-status-reconnect",onClick:c,title:i("reconnect"),disabled:a,children:i("reconnect")})]}),s.jsxs("div",{className:"row",children:[s.jsx("div",{className:"flex-1"}),s.jsx(u,{inverterData:l,isSocketConnected:a}),s.jsx("div",{className:"flex-1"})]}),s.jsxs("div",{className:"row",children:[s.jsx(j,{inverterData:l,isSocketConnected:a}),s.jsx(o,{inverterData:l,isSocketConnected:a}),s.jsx(p,{inverterData:l,isSocketConnected:a})]}),s.jsxs("div",{className:"row",children:[s.jsx("div",{className:"flex-1"}),s.jsx(N,{inverterData:l,isSocketConnected:a}),s.jsx(h,{inverterData:l,isSocketConnected:a})]})]})]})}export{f as default};
