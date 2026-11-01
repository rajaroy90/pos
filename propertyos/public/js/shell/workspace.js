// Unified portfolio workspace. Uses the same permission-checked APIs as the role apps.
import { h } from '../core/h.js';
import { icon } from '../core/icons.js';
import { S, firstName, emit } from '../core/store.js';
import { dataOf } from '../core/data.js';
import { inr, curMonth, monthLabel, addMonth, initials } from '../core/format.js';
import { launch } from '../apps/registry.js';
import { api } from '../core/api.js';
import { openSheet, toast } from '../core/layers.js';
import { downloadFile, csvCell } from '../apps/common.js';
import { startDemo, openSignIn } from '../apps/auth.js';
import { openNotifications } from './panels.js';

const sample = { month: curMonth(), summary: { expected: 48500, collected: 14000, outstanding: 50500, overdue_count: 1 }, units: [
  { property_id: 'sample', property_name: 'Sunrise Heights', label: '101', tenant_name: 'Asha Verma', rent: 14000, paid: 14000, status: 'paid', claims: [], outstanding: 0 },
  { property_id: 'sample', property_name: 'Sunrise Heights', label: '102', tenant_name: 'Rohan Mehta', rent: 18500, paid: 0, status: 'due', claims: [], outstanding: 18500 },
  { property_id: 'sample', property_name: 'Sunrise Heights', label: '201', tenant_name: '', rent: 22000, paid: 0, status: 'vacant', claims: [], outstanding: 0 },
  { property_id: 'sample', property_name: 'Sunrise Heights', label: '202', tenant_name: 'Sana Khan', rent: 16000, paid: 0, status: 'partial', claims: [{ amount: 8000 }], outstanding: 32000 },
] };
let selected = ''; let query = ''; let tab = 'all';
const button = (label, action, cls = '', ic) => h('button', { type: 'button', class: cls, 'aria-label': label === '' ? (ic === 'bell' ? 'Notifications' : ic) : label === '↗' ? 'Open unit details' : undefined, onClick: action }, ic ? icon(ic, 18) : null, label);
const chip = (text, cls = '') => h('span', { class: `ws-chip ${cls}` }, text);
const panelTitle = (title, sub, action) => h('div', { class: 'ws-panel-title' }, h('div', null, h('h2', null, title), sub ? h('p', null, sub) : null), action);

export function renderWorkspace() {
  const preview = !S.me;
  const d = preview ? sample : dataOf('rent');
  if (d && selected && !d.units.some(u => u.property_id === selected)) selected = '';
  const units = (d?.units || []).filter(u => !selected || u.property_id === selected);
  const occupied = units.filter(u => u.status !== 'vacant');
  const expected = occupied.filter(u => u.status !== 'na').reduce((n,u) => n + (u.expected ?? u.rent), 0);
  const collected = units.reduce((n,u) => n + u.paid, 0);
  const outstanding = units.reduce((n,u) => n + u.outstanding, 0);
  const claims = units.reduce((n,u) => n + u.claims.length, 0) + (selected ? d?.summary.other_claims_by_property?.[selected] || 0 : d?.summary.other_claims || 0);
  const repairs = preview ? [{ title: 'AC is not cooling', urgency: 'urgent', status: 'assigned' }] : (dataOf('tickets')?.tickets || []).filter(t => !['closed','resolved'].includes(t.status) && (!selected || t.property_id === selected));
  const rate = expected ? Math.round(collected / expected * 100) : 0;
  const occupancy = units.length ? Math.round(occupied.length / units.length * 100) : 0;
  const go = async (id, params = {}) => {
    try { if (preview) await startDemo('landlord'); await launch(id, params); } catch(e) { toast(e.message, 'bad'); }
  };
  const home = h('div', { class: 'workspace' });
  const refresh = () => home.replaceWith(renderWorkspace().home);
  const nav = (label, ic, id) => button(label, () => go(id), 'ws-nav', ic);
  const sidebar = h('aside', { class: 'ws-sidebar' },
    h('a', { class: 'ws-brand', href: '/' }, h('span', { class: 'ws-logo' }, icon('building', 23)), 'Property', h('strong', null, 'OS'), h('sup', null, 'ONE')),
    h('div', { class: 'ws-workspace-label' }, h('span', { class: 'ws-avatar' }, 'M'), h('div', null, h('b', null, 'My workspace'), h('small', null, preview || S.me?.user.is_demo ? 'Demo portfolio' : 'Personal portfolio')), icon('down', 14)),
    h('small', { class: 'ws-nav-label' }, 'WORKSPACE'),
    button('Overview', refresh, 'ws-nav active', 'home'), nav('Properties & units', 'building', 'properties'), nav('Tenants & leases', 'key', 'properties'), nav('Rent & payments', 'rent', 'rent'), nav('Repairs', 'wrench', 'repairs'), nav('Visitors & gate', 'shield', 'visitors'),
    h('small', { class: 'ws-nav-label' }, 'FINANCE'),
    button('Collection reports', () => reports(), 'ws-nav', 'receipt'), nav('Receipts & reminders', 'chat', 'rent'),
    h('div', { class: 'ws-sidebar-bottom' }, h('div', { class: 'ws-tip' }, chip('ONE CONNECTED WORKSPACE'), h('b', null, 'Less admin. More living.'), h('p', null, 'Your properties, people and payments. Finally together.')), nav('Settings', 'sliders', 'settings'),
      button(preview ? 'Sign in to your account' : S.me.user.name, () => preview ? openSignIn() : go('settings'), 'ws-profile', 'user')));
  const propertySelect = h('select', { 'aria-label': 'Filter property', onChange: e => { selected = e.target.value; refresh(); } }, h('option', { value: '' }, 'All properties'), [...new Map((d?.units || []).map(u => [u.property_id,u.property_name]))].map(([id,name]) => h('option', { value:id, selected: selected === id }, name)));
  const roleSelect = (preview || S.me?.user.is_demo) ? h('select', { 'aria-label': preview ? 'Start demo as' : 'Demo role', onChange: async e => { try { if (preview) await startDemo(e.target.value); else { await api.post('/demo/switch', {role:e.target.value}); emit('demo-switch'); } } catch(err) { toast(err.message,'bad'); } } }, ['landlord','tenant','guard'].map(role=>h('option',{value:role,selected:role===(preview ? 'landlord' : S.role)},role==='guard'?'Gate staff':role[0].toUpperCase()+role.slice(1)))) : null;
  const header = h('header', { class: 'ws-topbar' }, h('div', null, h('span', { class: 'ws-breadcrumb' }, 'Workspace'), h('span', null, ' / '), h('b', null, 'Overview')), h('div', { class:'ws-top-actions' }, roleSelect, chip(preview ? '●  Example workspace' : S.online ? '●  Connected' : '●  Offline', 'green'), button('', () => preview ? go('rent') : openNotifications(), 'ws-icon-button', 'bell'), button(preview ? 'MK' : initials(S.me.user.name), () => preview ? openSignIn() : go('settings'), 'ws-avatar')));
  const content = h('main', { class: 'ws-content' });
  const title = h('div', { class: 'ws-title' }, h('div', null, h('div', { class: 'ws-eyebrow' }, 'YOUR PORTFOLIO, AT A GLANCE'), h('h1', null, `A little clarity. A lot of possibility.`), h('p', null, `Welcome${preview ? '' : ' back'}, ${preview ? 'Meera' : firstName(S.me.user.name)}. Here’s what’s happening across your properties.`)), button('Add property', () => go('properties', { add:true }), 'ws-primary', 'plus'));
  const toolbar = h('div', { class: 'ws-toolbar' }, h('div', null, propertySelect, chip(`${units.length} units`, 'plain')), h('div', null, icon('calendar', 16), monthLabel(d?.month || curMonth(), true), button('Export report', () => {
    if (!d) return toast('Rent data is still loading. Try again shortly.');
    const rows = [['Property','Unit','Tenant','Monthly rent (INR)','Collected (INR)','Outstanding (INR)','Status'], ...units.map(u => [u.property_name,u.label,u.tenant_name,u.rent,u.paid,u.outstanding,u.status])];
    downloadFile(`propertyos-${d.month}.csv`, rows.map(r => r.map(v => csvCell(typeof v === 'string' && /^[\t\r\n]|^\s*[=+@\-＝＋－＠]/.test(v) ? "'"+v : v)).join(',')).join('\n'));
  }, 'ws-button', 'download')));
  const metric = (label, value, foot, ic, cls) => h('article', { class: 'ws-metric' }, h('div', { class:'ws-metric-label' }, label, h('span', { class:`ws-metric-icon ${cls}` }, icon(ic,18))), h('strong', null, d ? value : '—'), h('p', null, foot));
  const metrics = h('section', { class: 'ws-metrics' }, metric('Rent collected', inr(collected), `${rate}% of ${inr(expected)} expected`, 'rent','green'), metric('Outstanding rent', inr(outstanding), 'Across current and earlier months', 'clock','amber'), metric('Occupancy', `${occupancy}%`, `${occupied.length} occupied · ${units.length - occupied.length} vacant`, 'building','purple'), metric('Open repairs', String(repairs.length), `${repairs.filter(r => r.urgency === 'urgent').length} urgent · ready for your attention`, 'wrench','blue'));
  const chart = h('div', { class: 'ws-chart' });
  const chartPanel = h('section', { class: 'ws-panel ws-chart-panel' }, panelTitle('Current tenancy collections', 'Last 6 months · excludes former residents and vacant units', button('View report ↗', reports, 'ws-text-button')), h('div', { class:'ws-chart-legend' }, chip('● Collected','green'), chip('● Expected','plain')), chart);
  async function drawChart() {
    try {
      const months = Array.from({length:6}, (_,i) => addMonth(d?.month || curMonth(), i-5));
      const data = preview ? months.map((month,i) => ({month, units:[], summary:{expected:[48500,48500,48500,48500,48500,48500][i],collected:[30000,48500,48500,32500,32500,14000][i]}})) : await Promise.all(months.map(m => api.get(`/rent?month=${m}`)));
      if (!chart.isConnected) return;
      const totals = data.map(x => selected && !preview ? { expected:x.units.filter(u=>u.property_id===selected && !['vacant','na'].includes(u.status)).reduce((a,u)=>a+(u.expected ?? u.rent),0), collected:x.units.filter(u=>u.property_id===selected).reduce((a,u)=>a+u.paid,0) } : x.summary);
      const max = Math.max(1,...totals.map(x=>Math.max(x.expected,x.collected)));
      chart.replaceChildren(h('div',{class:'ws-yaxis'},[inr(max),inr(max/2),'₹0'].map(x=>h('span',null,x))),h('div',{class:'ws-bars'},totals.map((s,i)=>h('div',{class:'ws-bar-group'},h('div',{class:'ws-bar-track',title:`${monthLabel(months[i])}: ${inr(s.collected)} collected / ${inr(s.expected)} expected`}, h('div',{class:'ws-bar expected',style:{height:`${s.expected/max*100}%`}}),h('div',{class:'ws-bar collected',style:{height:`${s.collected/max*100}%`}})),h('span',null,monthLabel(months[i]).split(' ')[0])))));
    } catch { chart.replaceChildren(h('p',null,'History is unavailable. Reopen Overview to retry.')); }
  }
  function reports() {
    openSheet({title:'Collection report',build:()=>h('div',{class:'stack'},h('p',null,`${monthLabel(d?.month || curMonth(),true)} · ${selected ? units[0]?.property_name || 'Selected property' : 'All properties'}`),h('h2',null,`${rate}% collected`),h('p',null,`${inr(collected)} received against ${inr(expected)} expected this month.`),h('p',null,`${inr(outstanding)} remains outstanding across all periods. Pending claims are excluded until confirmed.`),h('p',null,`${units.length-occupied.length} vacant units represent ${inr(units.filter(u=>u.status==='vacant').reduce((n,u)=>n+u.rent,0))} in potential monthly rent.`),button('Open rent ledger →',()=>go('rent'),'ws-primary'))});
  }
  const attention = h('section',{class:'ws-panel ws-attention'},panelTitle('Needs attention', 'Small actions. A smoother day.',chip(String(claims+repairs.length+(units.length-occupied.length)),'amber')),
    button(h('div',null,h('b',null,`${claims} payment${claims===1?'':'s'} to confirm`),h('small',null,'Review claims before issuing receipts')),()=>go('rent'),'ws-attention-row','receipt'),
    button(h('div',null,h('b',null,`${repairs.length} open repair${repairs.length===1?'':'s'}`),h('small',null,repairs[0]?.title || 'Everything is running smoothly')),()=>go('repairs'),'ws-attention-row','wrench'),
    button(h('div',null,h('b',null,`${units.length-occupied.length} vacant unit${units.length-occupied.length===1?'':'s'}`),h('small',null,'Make room for your next resident')),()=>go('properties'),'ws-attention-row','key'),h('div',{class:'ws-insight'},icon('sparkles',19),h('p',null,h('b',null,'A clearer next step'),outstanding ? ` Review ${inr(outstanding)} in unpaid rent before planning your next expense.` : ' Your rent ledger is clear. Keep an eye on upcoming payments.')));
  const list = h('div');
  function drawRows() {
    const rows = units.filter(u => (tab==='all'||(tab==='unpaid' && (u.outstanding > 0 || !['paid','vacant','na'].includes(u.status))) || (tab==='vacant' && u.status==='vacant')) && `${u.tenant_name} ${u.label} ${u.property_name}`.toLowerCase().includes(query.toLowerCase()));
    list.replaceChildren(h('div',{class:'ws-table-wrap'},h('table', {class:'ws-table'},h('thead',null,h('tr',null,['Tenant / unit','Property','Monthly rent','Collected','Status',''].map(x=>h('th',null,x)))),h('tbody',null,rows.map(u=>h('tr',null,h('td',null,h('div',{class:'ws-person'},h('span',{class:`ws-avatar ${u.status==='vacant'?'vacant':''}`},u.tenant_name?initials(u.tenant_name):icon('key',16)),h('div',null,h('b',null,u.tenant_name || 'Ready for a new resident'),h('small',null,`Unit ${u.label}`)))),h('td',null,u.property_name),h('td',null,inr(u.rent)),h('td',null,inr(u.paid)),h('td',null,chip(u.claims.length?'Confirmation pending':u.status.replace(/^./,c=>c.toUpperCase()),u.status==='paid'?'green':u.status==='vacant'?'plain':'amber')),h('td',null,button('↗',()=>go(u.status==='vacant'?'properties':'rent'),'ws-icon-button'))))))),rows.length?'':h('p',{class:'ws-empty'},d?'No units match this view.':'Loading your portfolio…'));
  }
  const tabs = h('div',{class:'ws-tabs'});
  function drawTabs() { tabs.replaceChildren(...[['all','All units'],['unpaid','Unpaid'],['vacant','Vacant']].map(([id,label])=>button(label,()=>{tab=id;drawTabs();drawRows();},tab===id?'active':''))); }
  const search = h('input',{type:'search',placeholder:'Search tenants or units…','aria-label':'Search tenants or units',value:query,onInput:e=>{query=e.target.value;drawRows();}});
  const tablePanel = h('section',{class:'ws-panel ws-tenants'},panelTitle('Your people. Your places.', 'Every home, with the details that matter.',button('Manage properties ↗',()=>go('properties'),'ws-text-button')),h('div',{class:'ws-table-tools'},tabs,h('label',{class:'ws-search'},icon('search',16),search)),list);
  const banner = h('div',{class:'ws-banner'},h('div',null,chip('PROPERTYOS ONE'),h('h2',null,'Good spaces. Great experiences.'),h('p',null,'From the first rent payment to the last visitor of the day.')),button(preview?'Explore live demo →':'Open visitor passes →',()=>go('visitors'),'ws-button'));
  content.append(title,preview?h('div',{class:'ws-demo-note'},'You’re viewing illustrative data. ',button('Start an interactive demo →',async()=>{try{await startDemo('landlord');}catch(e){toast(e.message,'bad');}},'ws-text-button')):'',toolbar,metrics,h('div',{class:'ws-middle'},chartPanel,attention),tablePanel,banner,h('footer',null,'Built around your properties. Designed around you.',h('span',null,'PropertyOS One · Rent goes directly to the landlord')));
  home.append(sidebar,h('div',{class:'ws-main'},header,content));
  drawTabs();drawRows();setTimeout(drawChart,0);
  return {home,dock:h('div',{class:'ws-no-dock'})};
}
