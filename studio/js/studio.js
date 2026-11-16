/* ALZ Technology Studio - Finance Systems Lab demos.
   DEMONSTRATION PROTOTYPES with synthetic data. Any "AI" output is simulated with transparent rules.
   Plain JS, no dependencies, nothing leaves the browser. */
(function(){
'use strict';
const $ = (s, r=document) => r.querySelector(s);
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => (n < 0 ? '-' : '') + Math.abs(n).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2});
const pill = (t, k) => `<span class="pill pill--${k}">${esc(t)}</span>`;
const stat = (n, label, k='') => `<div class="stat ${k?'stat--'+k:''}"><b>${n}</b><span>${esc(label)}</span></div>`;
const table = (heads, rows, cls='') => `<div class="tbl-wrap"><table class="tbl ${cls}"><thead><tr>${heads.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('') || `<tr><td colspan="${heads.length}">None</td></tr>`}</tbody></table></div>`;

/* ---------- CSV ---------- */
function parseCSV(text){
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++){
    const c = text[i];
    if (q){ if (c === '"'){ if (text[i+1] === '"'){ f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ','){ row.push(f); f = ''; }
    else if (c === '\n' || c === '\r'){ if (c === '\r' && text[i+1] === '\n') i++; row.push(f); f = ''; if (row.some(x => x.trim() !== '')) rows.push(row); row = []; }
    else f += c;
  }
  row.push(f); if (row.some(x => x.trim() !== '')) rows.push(row);
  if (!rows.length) return [];
  const head = rows.shift().map(h => h.trim().toLowerCase());
  return rows.map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
}

/* =====================================================================
   DEMO 1 - RECONCILIATION
   ===================================================================== */
const BANK_CSV = `date,description,reference,amount
01/11/2026,RECEIPT ACME TRADING SDN BHD,INV-00101,"MYR 12,500.00"
02/11/2026,PAYMENT NORTHWIND SUPPLIES,PO-4501,"(3,200.00)"
03/11/2026,RECEIPT BLUEWAVE LOGISTICS,INV 00102,"8,750.00"
05/11/2026,PAYMENT KL OFFICE RENT NOV,PO-4502,"-15,000.00"
06/11/2026,RECEIPT ORION TECH,inv-103,"MYR 4,980.00"
07/11/2026,MONTHLY ACCOUNT FEE,,-45.00
08/11/2026,PAYMENT CLOUDHOST,PO-4503,"-2,150.00"
08/11/2026,PAYMENT CLOUDHOST,PO-4503,"-2,150.00"
10/11/2026,RECEIPT SUNRISE RETAIL,INV-00104,"6,300.00"
12/11/2026,CASH DEPOSIT,,"1,000.00"
14/11/2026,PAYROLL BATCH 11A,PAY-1101,"-48,200.00"
15/11/2026,RECEIPT GLOBEX PTE LTD,INV-00105,"9,412.50"
18/11/2026,TRAVEL CLAIMS BATCH,EXP-221,-640.00
20/11/2026,INTEREST CREDIT,,12.35
22/11/2026,RECEIPT ACME TRADING SDN BHD,INV-00106,"7,200.00"`;

const LEDGER_CSV = `posting_date,doc_no,reference,description,amount,currency
2026-11-01,JE-5001,INV101,Customer receipt Acme Trading,12500.00,MYR
2026-11-02,JE-5002,PO4501,Supplier payment Northwind,-3200.00,MYR
2026-11-03,JE-5003,INV-102,Customer receipt Bluewave,8705.00,MYR
2026-11-04,JE-5004,PO-4502,Office rent November,-15000.00,MYR
2026-11-06,JE-5005,INV-103,Customer receipt Orion Tech,5000.00,MYR
2026-11-08,JE-5006,PO-4503,Cloud hosting,-2150.00,MYR
2026-11-09,JE-5007,PO-4504,Supplier payment Delta Print,-1875.00,MYR
2026-11-10,JE-5008,INV-104,Customer receipt Sunrise Retail,6300.00,MYR
2026-11-11,JE-5009,,Deposit Lim Holdings,1000.00,MYR
2026-11-14,JE-5010,PAY-1101,Payroll November batch A,-48200.00,MYR
2026-11-15,JE-5011,INV-105,Customer receipt Globex,2000.00,USD
2026-11-17,JE-5012,EXP-221,Travel claims,-640.00,MYR
2026-11-17,JE-5013,EXP-221,Travel claims,-640.00,MYR
2026-11-22,JE-5014,INV-106,Customer receipt Acme Trading,7200.00,MYR
2026-11-28,JE-5015,INV-107,Customer receipt Meridian Foods,3300.00,MYR`;

const PERIOD_END = '2026-11-30', BANK_CCY = 'MYR';

function normDate(s){
  s = (s || '').trim(); let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  if ((m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/))) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`; // DD/MM/YYYY
  return null;
}
function normAmount(s){
  s = (s || '').trim(); const ccy = (s.match(/\b([A-Z]{3})\b/) || [])[1] || null;
  let neg = /^\(.*\)$/.test(s.replace(/[A-Z]{3}\s*/,'').trim()) || /-/.test(s);
  const n = parseFloat(s.replace(/[^0-9.]/g,''));
  return { value: isNaN(n) ? null : (neg ? -n : n), ccy };
}
function normRef(s){
  const r = (s || '').toUpperCase().replace(/[^A-Z0-9]/g,'');
  if (!r) return '';
  const m = r.match(/^([A-Z]+)0*(\d+)$/);
  return m ? m[1] + m[2] : r;
}
const days = (a, b) => Math.abs((new Date(a) - new Date(b)) / 864e5);

function reconcile(bankText, ledgerText){
  const errors = [];
  const bank = parseCSV(bankText).map((r, i) => {
    const a = normAmount(r.amount);
    const o = { side:'bank', line:i+2, raw:r, date:normDate(r.date), ref:normRef(r.reference), rawRef:r.reference, desc:r.description, amount:a.value, ccy:a.ccy || BANK_CCY };
    if (!o.date || o.amount == null) errors.push(`Bank line ${o.line}: could not read date or amount`);
    return o;
  });
  const ledger = parseCSV(ledgerText).map((r, i) => {
    const a = normAmount(r.amount);
    const o = { side:'ledger', line:i+2, raw:r, date:normDate(r.posting_date), ref:normRef(r.reference), rawRef:r.reference, doc:r.doc_no, desc:r.description, amount:a.value, ccy:(r.currency || a.ccy || BANK_CCY).toUpperCase() };
    if (!o.date || o.amount == null) errors.push(`Ledger line ${o.line}: could not read date or amount`);
    return o;
  });
  const okB = bank.filter(b => b.date && b.amount != null), okL = ledger.filter(l => l.date && l.amount != null);
  const ex = [], matched = [];
  // 1. duplicates within each side
  const dupScan = list => { const seen = new Map(); list.forEach(x => { const k = [x.date, x.ref, x.amount, (x.desc||'').toUpperCase()].join('|'); if (seen.has(k)){ x.dup = seen.get(k); } else seen.set(k, x); }); };
  dupScan(okB); dupScan(okL);
  okB.filter(x => x.dup).forEach(x => ex.push({ type:'Duplicate (bank)', k:'bad', bank:x, ledger:null, diff:x.amount, cat:'Possible duplicate payment or bank posting', act:`Same date, reference and amount as bank line ${x.dup.line}. Confirm with the bank and the payee; recover funds if paid twice.` }));
  okL.filter(x => x.dup).forEach(x => ex.push({ type:'Duplicate (ledger)', k:'bad', bank:null, ledger:x, diff:-x.amount, cat:'Possible duplicate journal posting', act:`Same date, reference and amount as ${x.dup.doc}. Check source documents; reverse one entry with approval if confirmed.` }));
  const B = okB.filter(x => !x.dup), L = okL.filter(x => !x.dup);
  // 2. match on reference
  B.forEach(b => {
    if (!b.ref) return;
    const l = L.find(l => !l.used && l.ref === b.ref); if (!l) return;
    b.used = l.used = true;
    if (l.ccy !== b.ccy){
      ex.push({ type:'Currency mismatch', k:'warn', bank:b, ledger:l, diff:null, cat:'Foreign currency item: check FX rate and conversion', act:`Ledger booked ${l.ccy} ${fmt(l.amount)}; bank received ${b.ccy} ${fmt(b.amount)}. Confirm the rate used and post any FX difference with approval.` });
    } else if (Math.abs(b.amount - l.amount) > 0.005){
      const d = +(b.amount - l.amount).toFixed(2);
      const transposed = String(Math.abs(b.amount)).split('').sort().join('') === String(Math.abs(l.amount)).split('').sort().join('');
      const cat = transposed ? 'Possible keying error (transposed digits)' : (Math.abs(d) <= 50 && l.amount > 0 && d < 0 ? 'Bank charge deducted from receipt' : 'Amount difference: investigate');
      ex.push({ type:'Amount mismatch', k:'warn', bank:b, ledger:l, diff:d, cat, act: transposed ? 'Compare with the remittance advice and correct the side that was keyed wrongly.' : 'Agree the difference to the remittance or bank advice; record the charge or chase the shortfall.' });
    } else {
      matched.push({ b, l, basis:'Reference + amount', note: days(b.date, l.date) > 3 ? `Timing: ${days(b.date,l.date)} days apart` : (days(b.date,l.date) ? `${days(b.date,l.date)} day(s) apart` : '') });
    }
  });
  // 3. fallback: exact amount within 3 days, at least one side without reference -> needs review
  B.filter(b => !b.used).forEach(b => {
    const l = L.find(l => !l.used && (!l.ref || !b.ref) && l.ccy === b.ccy && Math.abs(l.amount - b.amount) < 0.005 && days(l.date, b.date) <= 3);
    if (!l) return; b.used = l.used = true;
    ex.push({ type:'Matched on amount + date', k:'info', bank:b, ledger:l, diff:0, cat:'Probable match, no reference: needs human review', act:'Confirm with the deposit slip or remittance, then clear. Ask the payer to quote a reference next time.' });
  });
  // 4. leftovers
  B.filter(b => !b.used).forEach(b => {
    const d = (b.desc || '').toUpperCase();
    const cat = /FEE|CHARGE|CHG/.test(d) ? 'Unrecorded bank charge' : /INTEREST/.test(d) ? 'Unrecorded interest income' : b.amount > 0 ? 'Unidentified receipt' : 'Unrecorded payment';
    ex.push({ type:'Missing in ledger', k:'bad', bank:b, ledger:null, diff:b.amount, cat, act: /charge|interest/i.test(cat) ? 'Prepare a journal with the bank advice as evidence; second person approves.' : 'Identify the counterparty before posting; park in suspense only with approval.' });
  });
  L.filter(l => !l.used).forEach(l => {
    const late = days(l.date, PERIOD_END) <= 5;
    ex.push({ type:'Missing in bank', k:'bad', bank:null, ledger:l, diff:-l.amount, cat: late ? (l.amount > 0 ? 'Deposit in transit (timing)' : 'Outstanding payment (timing)') : 'Uncleared item older than 5 days', act: late ? 'Expect it on next period\'s statement; confirm it clears.' : 'Check with the payee or customer and the bank; consider whether the entry is valid.' });
  });
  const netB = okB.reduce((s, x) => s + (x.ccy === BANK_CCY ? x.amount : 0), 0);
  const netL = okL.reduce((s, x) => s + (x.ccy === BANK_CCY ? x.amount : 0), 0);
  return { bank, ledger, matched, ex, errors, netB, netL };
}

function renderRecon(r){
  const c = t => r.ex.filter(e => e.type.startsWith(t)).length;
  const order = {bad:0, warn:1, info:2};
  const exRows = r.ex.slice().sort((a,b) => order[a.k]-order[b.k]).map((e, i) => `<tr>
    <td>${i+1}</td><td>${pill(e.type, e.k)}</td>
    <td>${e.bank ? `${esc(e.bank.date)}<br><span class="muted">${esc(e.bank.rawRef || 'no ref')} · ${esc(e.bank.desc)}</span>` : '<span class="muted">not on statement</span>'}</td>
    <td class="num">${e.bank ? esc(e.bank.ccy)+' '+fmt(e.bank.amount) : ''}</td>
    <td>${e.ledger ? `${esc(e.ledger.date)} · ${esc(e.ledger.doc)}<br><span class="muted">${esc(e.ledger.rawRef || 'no ref')} · ${esc(e.ledger.desc)}</span>` : '<span class="muted">not in ledger</span>'}</td>
    <td class="num">${e.ledger ? esc(e.ledger.ccy)+' '+fmt(e.ledger.amount) : ''}</td>
    <td class="num">${e.diff == null ? 'n/a' : fmt(e.diff)}</td>
    <td><b>${esc(e.cat)}</b><br><span class="muted">${esc(e.act)}</span></td></tr>`);
  const mRows = r.matched.map(m => `<tr><td>${esc(m.b.date)}</td><td>${esc(m.b.rawRef)} → ${esc(m.b.ref)}</td><td>${esc(m.l.doc)} · ${esc(m.l.rawRef)}</td><td class="num">${fmt(m.b.amount)}</td><td>${esc(m.basis)}</td><td>${esc(m.note)}</td></tr>`);
  const nRows = r.bank.map(b => `<tr><td>Bank ${b.line}</td><td>${esc(b.raw.date)} → ${esc(b.date||'?')}</td><td>${esc(b.raw.reference||'(blank)')} → ${esc(b.ref||'(blank)')}</td><td>${esc(b.raw.amount)} → ${b.amount==null?'?':fmt(b.amount)}</td></tr>`)
    .concat(r.ledger.map(l => `<tr><td>Ledger ${l.line}</td><td>${esc(l.raw.posting_date)} → ${esc(l.date||'?')}</td><td>${esc(l.raw.reference||'(blank)')} → ${esc(l.ref||'(blank)')}</td><td>${esc(l.raw.amount)} ${esc(l.ccy)} → ${l.amount==null?'?':fmt(l.amount)}</td></tr>`));
  return `${r.errors.length ? `<p class="callout callout--warn">${r.errors.map(esc).join('<br>')}</p>` : ''}
  <div class="summary">
    ${stat(r.matched.length, 'Matched', 'ok')}${stat(c('Matched on'), 'Probable match, review', 'warn')}
    ${stat(c('Amount')+c('Currency'), 'Amount / currency mismatch', 'warn')}${stat(c('Missing in ledger'), 'On bank, missing in ledger', 'bad')}
    ${stat(c('Missing in bank'), 'In ledger, missing on bank', 'bad')}${stat(c('Duplicate'), 'Possible duplicates', 'bad')}
  </div>
  <p class="muted">Lines read: ${r.bank.length} bank, ${r.ledger.length} ledger. Net movement (MYR items): bank ${fmt(r.netB)}, ledger ${fmt(r.netL)}, difference ${fmt(r.netB - r.netL)}, explained by the exceptions below.</p>
  <h4>Exceptions requiring investigation (${r.ex.length})</h4>
  ${table(['#','Type','Bank line','Bank amount','Ledger entry','Ledger amount','Difference','Suggested category and action'], exRows, 'tbl--ex')}
  <details class="sop"><summary>Matched items (${r.matched.length})</summary>${table(['Bank date','Bank ref → normalised','Ledger doc · ref','Amount','Basis','Note'], mRows)}</details>
  <details class="sop"><summary>Normalisation log (raw → normalised)</summary>${table(['Line','Date','Reference','Amount'], nRows)}</details>
  <div class="review" id="recon-review"><label style="display:flex;gap:10px;align-items:center"><input type="checkbox" id="recon-signoff"> <span><b>Human review step:</b> I have reviewed every exception. Suggested categories are not posted automatically.</span></label><span id="recon-signoff-msg" class="muted"></span></div>`;
}

function initRecon(){
  const b = $('#bank-csv'), l = $('#ledger-csv'), out = $('#recon-out');
  if (!b) return;
  const load = () => { b.value = BANK_CSV; l.value = LEDGER_CSV; out.innerHTML = ''; };
  load();
  $('#recon-load').addEventListener('click', load);
  $('#recon-run').addEventListener('click', () => {
    out.innerHTML = renderRecon(reconcile(b.value, l.value));
    $('#recon-signoff').addEventListener('change', e => {
      $('#recon-signoff-msg').textContent = e.target.checked ? `Review recorded ${new Date().toLocaleString('en-GB')} (demo only, stored nowhere). Next: owner assigned per exception, controller sign-off.` : '';
    });
  });
}

/* =====================================================================
   DEMO 2 - TICKET TRIAGE (simulated, rule-based)
   ===================================================================== */
const CATS = [
  { id:'access', name:'Access & security / segregation of duties', group:'Finance systems security administration', base:3,
    kws:['security role','security group','role','access','permission','provision','segregation','sod','conflict','unable to submit','unable to approve','locked out','unable to log','cannot log','approve its','approve their own','create a supplier and approve'],
    steps:['Confirm the user, the exact task they tried and the error message (screenshot and time).','Review the user\'s role or security group assignments before and after the change, and the audit history: who changed it, when and under which request.','Compare the new role with the role design: does it include the permission this task needs?','Check segregation-of-duties rules: would restoring the permission let one person both create and approve the same transaction?','If the access is valid, raise it through the access request process with manager and role-owner approval. Do not grant access directly from the ticket.','Confirm the fix with the user and attach approvals and evidence to the ticket for audit.'],
    esc:['L1 finance systems support','L2 security / access administrator','Role owner or finance controller (approval)','Internal audit or compliance if an SoD conflict is confirmed'] },
  { id:'integration', name:'Integration or interface failure', group:'Finance systems integration support', base:2,
    kws:['integration','interface','import','export','feed','file format','file','api','sync','job failed','failed','error','connector','bank statement','nightly','batch job'],
    steps:['Identify the interface, the run time and the exact error from the integration or job log.','Check the source file or message: format, record count and totals against what was expected.','Check for a partial load so a rerun does not post records twice.','Fix the cause (mapping, file format, credentials or source data) with the owning team.','Rerun or reprocess, then reconcile counts and totals between source and target.','Tell downstream users (for example treasury or AP) when data is complete again.'],
    esc:['L1 finance systems support','Integration / IT support','Source system owner, bank or vendor support','Finance manager if cash position or close is affected'] },
  { id:'masterdata', name:'Master data', group:'Master data governance', base:3,
    kws:['vendor','supplier','customer','bank account','bank details','cost center','cost centre','account code','duplicate','master data','tax id','address','two supplier records','merge'],
    steps:['Identify the records involved and compare their fields and change history.','List open and recent transactions linked to each record, especially payments.','Put payments to the affected records on hold until reviewed.','Verify bank details independently (callback to a known contact), never from the request itself.','Merge or inactivate records under the data governance process, with approval.','Add a preventive check (duplicate rule or approval step) and record the outcome.'],
    esc:['Master data team','AP or AR lead','Finance controller','Fraud / compliance if bank details changed unexpectedly'] },
  { id:'close', name:'Period close and accounting', group:'General ledger / close team', base:2,
    kws:['month-end','month end','period close','period','close','accrual','journal','posting','reconcil','open period','close deadline','ledger','closing'],
    steps:['Confirm the company, the period, the close task and the deadline.','Check the period status and the close calendar.','Check whether posting is blocked by period status, validation rules or a pending approval.','Agree with the close owner whether to reopen the period or post in the next one (approval required).','Post or reprocess, then confirm balances and reconciliations are updated.','Update the close checklist and note the issue for the close retrospective.'],
    esc:['L1 finance systems support','GL accountant or close lead','Finance controller','CFO office only if the close deadline is at risk'] },
  { id:'reporting', name:'Reporting', group:'Finance reporting support', base:4,
    kws:['report','dashboard','extract','figures','numbers do not match','totals'],
    steps:['Confirm the report, the filters used and the expected result.','Check data refresh time and source data completeness.','Compare report totals against the ledger or source system.','Fix filters, definitions or source data, then re-run and confirm with the user.'],
    esc:['L1 finance systems support','Reporting / BI team','Report owner'] },
];
const IMPACT = [
  ['unable to','user is blocked from doing their work'],['cannot','user is blocked from doing their work'],['blocked','user is blocked from doing their work'],
  ['payroll','payroll impact'],['payment run','payment run impact'],['paid to both','money may be paid incorrectly'],['paying both','money may be paid incorrectly'],['paid twice','money may be paid incorrectly'],
  ['month-end','close timeline impact'],['month end','close timeline impact'],['deadline','deadline at risk'],['tomorrow','deadline at risk'],['today','time-critical'],
  ['all users','many users affected'],['everyone','many users affected'],['cash position','cash visibility affected'],['auditor','audit exposure'],['segregation','control risk'],['sod','control risk'],['create a supplier and approve','control risk']
];
const PRI = {1:'P1 · Critical',2:'P2 · High',3:'P3 · Medium',4:'P4 · Low'};
const SLA = {1:'Respond within 1 hour',2:'Respond within 4 hours',3:'Respond within 1 business day',4:'Respond within 3 business days'};
const SAMPLES = [
  ['Journal entry blocked','A finance user is unable to submit a journal entry after their security role was changed.'],
  ['Access / SoD','An AP clerk was given the supplier maintenance role on top of invoice approver, so they can now create a supplier and approve its invoices.'],
  ['Integration failure','The nightly bank statement import failed with "file format invalid" and today\'s cash position is empty.'],
  ['Master data','There are two supplier records for Northwind Supplies Sdn Bhd with different bank accounts, and invoices are being paid to both.'],
  ['Period close','Month-end close: the October period is still open for the Malaysia company and the accruals journal cannot be posted before the close deadline tomorrow.'],
];
const hasKw = (t, k) => k.length <= 3 ? new RegExp('\\b' + k + '\\b').test(t) : t.includes(k);
function triage(text){
  const t = ' ' + text.toLowerCase().replace(/\s+/g,' ') + ' ';
  const scored = CATS.map(c => { const hits = c.kws.filter(k => hasKw(t, k)); return { c, hits, score: hits.reduce((s,k) => s + (k.includes(' ') ? 2 : 1), 0) }; }).sort((a,b) => b.score - a.score);
  const top = scored[0].score ? scored[0] : null, second = scored[1] && scored[1].score ? scored[1] : null;
  if (!top) return null;
  const imp = []; IMPACT.forEach(([k, why]) => { if (hasKw(t, k) && !imp.some(x => x.why === why)) imp.push({ k, why }); });
  let p = top.c.base - imp.length; if (p < 1) p = 1;
  const sod = top.c.id === 'access' && /segregation|\bsod\b|create .* and approve|approve its/.test(t);
  if (sod && p > 2) p = 2;
  const conf = Math.min(95, 50 + top.score * 8 - (second ? second.score * 4 : 0));
  return { top, second, imp, p, sod, conf: Math.max(35, conf) };
}
function renderTriage(r, text){
  if (!r) return `<p class="callout callout--warn">No rule matched. In a real service desk this ticket would go to manual triage by L1 support.</p>`;
  const c = r.top.c;
  return `<p class="muted"><span class="badge badge--sim">Simulated AI output · rule-based</span> Generated by keyword rules in this page, not by an AI model.</p>
  <div class="kv">
    <div><h5>Classification</h5><p><b>${esc(c.name)}</b>${r.second ? `<br><span class="muted">Also relevant: ${esc(r.second.c.name)}</span>` : ''}</p></div>
    <div><h5>Suggested priority</h5><p>${pill(PRI[r.p], r.p <= 2 ? 'bad' : r.p === 3 ? 'warn' : 'info')} <span class="muted">${esc(SLA[r.p])} (illustrative SLA)</span></p></div>
    <div><h5>Why (matched rules)</h5><p>Keywords: ${r.top.hits.map(h => `<code>${esc(h)}</code>`).join(', ')}<br>Impact: ${r.imp.length ? r.imp.map(i => esc(i.why)).join('; ') : 'none detected, base priority kept'}<br><span class="muted">Rule confidence (simulated): ${r.conf}%</span></p></div>
    <div><h5>Assign to</h5><p>${esc(c.group)}</p>${r.sod ? `<p style="margin-top:6px">${pill('SoD / audit flag','bad')} Possible segregation-of-duties conflict: remove the conflicting access first, then review transactions made with it.</p>` : ''}</div>
    <div class="wide"><h5>Investigation steps</h5><ol>${c.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>
    <div class="wide"><h5>Escalation path</h5><p>${c.esc.map((s,i) => `<b>${i+1}.</b> ${esc(s)}`).join(' &nbsp;→&nbsp; ')}</p></div>
  </div>
  <p class="muted" style="margin-top:12px">Human in the loop: the analyst confirms or overrides the classification and priority before the ticket is routed.</p>`;
}
function initTriage(){
  const ta = $('#ticket'), out = $('#triage-out'), box = $('#ticket-samples');
  if (!ta) return;
  box.innerHTML = SAMPLES.map((s, i) => `<button type="button" class="chipbtn" data-i="${i}" aria-pressed="${i===0}">${esc(s[0])}</button>`).join('');
  box.addEventListener('click', e => { const btn = e.target.closest('button'); if (!btn) return; ta.value = SAMPLES[+btn.dataset.i][1]; box.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === btn)); out.innerHTML = renderTriage(triage(ta.value), ta.value); });
  $('#triage-run').addEventListener('click', () => { out.innerHTML = renderTriage(triage(ta.value), ta.value); });
}

/* =====================================================================
   DEMO 3 - MASTER DATA VALIDATION
   ===================================================================== */
const MDM_A = {
  vendors:[
    {id:'V1001',name:'Northwind Supplies Sdn Bhd',tax_id:'C2584563202',country:'MY',currency:'MYR',bank_account:'5140-1122-3344',status:'Active'},
    {id:'V1002',name:'Delta Print Services',tax_id:'C1029384756',country:'MY',currency:'MYR',bank_account:'5140-9988-7766',status:'Active'},
    {id:'V1003',name:'CloudHost Pte Ltd',tax_id:'201912345K',country:'SG',currency:'SGD',bank_account:'SG-000-123456',status:'Active'},
    {id:'V1004',name:'Harbour Freight Ltd',tax_id:'12345678',country:'HK',currency:'HKD',bank_account:'HK-004-556677',status:'Active'},
    {id:'V1005',name:'Orchid Office Furniture',tax_id:'C5566778899',country:'MY',currency:'MYR',bank_account:'5140-4455-6677',status:'Active'}
  ],
  customers:[
    {id:'C2001',name:'Acme Trading Sdn Bhd',tax_id:'C3344556677',country:'MY',currency:'MYR',email:'ap@acme.example'},
    {id:'C2002',name:'Globex Pte Ltd',tax_id:'200812345M',country:'SG',currency:'SGD',email:'finance@globex.example'},
    {id:'C2003',name:'Sunrise Retail',tax_id:'C7788990011',country:'MY',currency:'MYR',email:'accounts@sunrise.example'}
  ],
  account_codes:[
    {code:'1000',name:'Cash at bank - MYR',type:'Asset',status:'Active'},
    {code:'2000',name:'Accounts payable',type:'Liability',status:'Active'},
    {code:'6100',name:'Office rent',type:'Expense',status:'Active'},
    {code:'6150',name:'Printing (legacy)',type:'Expense',status:'Inactive'},
    {code:'6200',name:'Cloud hosting',type:'Expense',status:'Active'}
  ]
};
const MDM_B = {
  vendors:[
    {id:'V1001',name:'Northwind Supplies Sdn Bhd',tax_id:'C2584563202',country:'MY',currency:'MYR',bank_account:'5140-1122-3344',status:'Active'},
    {id:'V1002',name:'Delta Print Services',tax_id:'C1029384756',country:'MY',currency:'MYR',bank_account:'5140-0000-1111',status:'Active'},
    {id:'V1003',name:'CloudHost Pte Ltd',tax_id:'201912345',country:'SG',currency:'SGD',bank_account:'SG-000-123456',status:'Active'},
    {id:'V1004',name:'Harbour Freight Ltd',tax_id:'12345678',country:'HK',currency:'USD',bank_account:'HK-004-556677',status:'Active'},
    {id:'V1006',name:'Northwind Supplies Sdn. Bhd.',tax_id:'C2584563202',country:'MY',currency:'MYR',bank_account:'7620-5566-1188',status:'Active'},
    {id:'V1007',name:'Kemuning Catering',tax_id:'',country:'MY',currency:'RM',bank_account:'',status:'Active'}
  ],
  customers:[
    {id:'C2001',name:'Acme Trading Sdn Bhd',tax_id:'C3344556677',country:'MY',currency:'MYR',email:'ap@acme.example'},
    {id:'C2002',name:'Globex Pte Ltd',tax_id:'200812345M',country:'SG',currency:'SGD',email:'finance@globex.example'},
    {id:'C2003',name:'Sunrise Retail',tax_id:'C77889900',country:'MY',currency:'MYR',email:'accounts@sunrise.example'},
    {id:'C2004',name:'ACME Tradng SDN BHD',tax_id:'C3344556677',country:'MY',currency:'MYR',email:'finance@acme.example'},
    {id:'C2005',name:'Meridian Foods',tax_id:'C9988776655',country:'MY',currency:'',email:'ar@meridian.example'}
  ],
  account_codes:[
    {code:'1000',name:'Cash at bank - MYR',type:'Asset',status:'Active'},
    {code:'2000',name:'Accounts payable',type:'Liability',status:'Active'},
    {code:'6100',name:'Office rent',type:'Expense',status:'Active'},
    {code:'6150',name:'Printing (legacy)',type:'Expense',status:'Inactive'},
    {code:'6200',name:'Cloud hosting',type:'Expense',status:'Active'},
    {code:'6300',name:'Marketing',type:'',status:'Active'}
  ],
  transactions:[
    {doc:'AP-9001',vendor_id:'V1002',account_code:'6150',amount:1875.00,currency:'MYR'},
    {doc:'AP-9002',vendor_id:'V1003',account_code:'6200',amount:2150.00,currency:'MYR'},
    {doc:'AP-9003',vendor_id:'V1099',account_code:'6100',amount:15000.00,currency:'MYR'},
    {doc:'AP-9004',vendor_id:'V1001',account_code:'6400',amount:3200.00,currency:'MYR'}
  ]
};
const REQ = { vendors:['id','name','tax_id','country','currency','bank_account'], customers:['id','name','tax_id','country','currency'], account_codes:['code','name','type','status'] };
const TAX = { MY:/^C\d{10}$/, SG:/^\d{9}[A-Z]$/, HK:/^\d{8}$/ };
const CCY_OK = ['MYR','SGD','HKD','USD'], CCY_BY_COUNTRY = { MY:'MYR', SG:'SGD', HK:'HKD', US:'USD' };
const SUFFIX = /\b(sdn|bhd|berhad|pte|ltd|limited|inc|llc|co|company|corp)\b/g;
const normName = s => (s||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(SUFFIX,' ').replace(/\s+/g,' ').trim();
function similarity(a, b){
  if (a === b) return 1; const m = a.length, n = b.length; if (!m || !n) return 0;
  let prev = Array.from({length:n+1}, (_, j) => j);
  for (let i = 1; i <= m; i++){ const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j]+1, cur[j-1]+1, prev[j-1] + (a[i-1] === b[j-1] ? 0 : 1)); prev = cur; }
  return 1 - prev[n] / Math.max(m, n);
}
function validateMDM(A, B){
  const issues = [];
  const add = (sev, ds, ent, rec, field, issue, act) => issues.push({ sev, ds, ent, rec, field, issue, act });
  const ENT = { vendors:'Vendor', customers:'Customer', account_codes:'Account code' };
  [['A',A],['B',B]].forEach(([ds, D]) => {
    Object.keys(REQ).forEach(ent => {
      const list = D[ent] || [];
      list.forEach(r => {
        const id = r.id || r.code || '(no id)';
        REQ[ent].forEach(f => { if (r[f] == null || String(r[f]).trim() === '') add('Error', ds, ENT[ent], id, f, 'Required field is missing', 'Complete from source documents before load'); });
        if (ent !== 'account_codes'){
          if (r.tax_id && TAX[r.country] && !TAX[r.country].test(r.tax_id)) add('Error', ds, ENT[ent], id, 'tax_id', `Tax ID "${r.tax_id}" does not match the ${r.country} format`, 'Confirm the registration number with the counterparty');
          if (r.currency && !CCY_OK.includes(r.currency)) add('Error', ds, ENT[ent], id, 'currency', `"${r.currency}" is not a valid ISO currency code in use`, 'Map to the ISO code (for example RM → MYR)');
          else if (r.currency && CCY_BY_COUNTRY[r.country] && CCY_BY_COUNTRY[r.country] !== r.currency) add('Warning', ds, ENT[ent], id, 'currency', `Currency ${r.currency} differs from the usual ${CCY_BY_COUNTRY[r.country]} for ${r.country}`, 'Verify the agreed billing currency');
        }
      });
      if (ent === 'account_codes') return;
      for (let i = 0; i < list.length; i++) for (let j = i+1; j < list.length; j++){
        const a = list[i], b = list[j], na = normName(a.name), nb = normName(b.name), sim = similarity(na, nb);
        const why = [];
        if (a.tax_id && a.tax_id === b.tax_id) why.push('same tax ID');
        if (na && na === nb) why.push('same name after removing punctuation and suffixes'); else if (sim >= 0.85) why.push(`names ${Math.round(sim*100)}% similar`);
        if (why.length) add('Error', ds, ENT[ent], `${a.id} / ${b.id}`, 'name, tax_id', `Possible duplicate: "${a.name}" vs "${b.name}" (${why.join(', ')})${ent==='vendors' && a.bank_account !== b.bank_account ? '; bank accounts differ' : ''}`, 'Hold payments, confirm the surviving record, merge or inactivate the other with approval');
      }
    });
  });
  // transactions in B
  const acc = Object.fromEntries((B.account_codes||[]).map(a => [a.code, a])), ven = Object.fromEntries((B.vendors||[]).map(v => [v.id, v]));
  (B.transactions||[]).forEach(t => {
    const a = acc[t.account_code], v = ven[t.vendor_id];
    if (!a) add('Error','B','Transaction',t.doc,'account_code',`Account code ${t.account_code} does not exist`,'Map to a valid account code');
    else if (a.status !== 'Active') add('Error','B','Transaction',t.doc,'account_code',`Posts to inactive account ${a.code} (${a.name})`,'Remap to the active replacement account');
    if (!v) add('Error','B','Transaction',t.doc,'vendor_id',`Vendor ${t.vendor_id} not found in the load file`,'Load the vendor first or correct the reference');
    else if (v.currency && t.currency !== v.currency) add('Warning','B','Transaction',t.doc,'currency',`Transaction in ${t.currency} but vendor ${v.id} is set up in ${v.currency}`,'Confirm the invoice currency');
  });
  // cross-file comparison
  ['vendors','customers','account_codes'].forEach(ent => {
    const key = ent === 'account_codes' ? 'code' : 'id';
    const bMap = Object.fromEntries((B[ent]||[]).map(r => [r[key], r]));
    (A[ent]||[]).forEach(r => {
      const t = bMap[r[key]];
      if (!t){ add('Error','A → B',ENT[ent],r[key],'(record)','In the legacy extract but missing from the load file','Confirm whether it was excluded on purpose (inactive) or dropped'); return; }
      if (ent === 'vendors' && r.bank_account !== t.bank_account) add('Error','A → B',ENT[ent],r[key],'bank_account',`Bank account changed from ${r.bank_account} to ${t.bank_account || '(blank)'}`,'Verify by callback to a known contact before go-live; record approval');
      ['name','tax_id','currency','status'].forEach(f => { if (r[f] != null && t[f] != null && r[f] !== t[f] && !(ent==='vendors' && f==='bank_account')) add('Warning','A → B',ENT[ent],r[key],f,`Value changed: "${r[f]}" → "${t[f] || '(blank)'}"`,'Check the change is intended and approved'); });
    });
  });
  const count = Object.keys(REQ).reduce((s, e) => s + (A[e]||[]).length + (B[e]||[]).length, 0) + (B.transactions||[]).length;
  return { issues, count };
}
function renderMDM(r){
  const n = s => r.issues.filter(i => i.sev === s).length;
  const dup = r.issues.filter(i => i.issue.startsWith('Possible duplicate')).length;
  const miss = r.issues.filter(i => i.issue.startsWith('Required')).length;
  const missing = r.issues.filter(i => i.issue.includes('missing from the load file')).length;
  const bank = r.issues.filter(i => i.field === 'bank_account' && i.issue.startsWith('Bank account changed')).length;
  const rows = r.issues.slice().sort((a,b) => (a.sev === b.sev ? 0 : a.sev === 'Error' ? -1 : 1)).map(i => `<tr><td>${pill(i.sev, i.sev === 'Error' ? 'bad' : 'warn')}</td><td>${esc(i.ds)}</td><td>${esc(i.ent)}</td><td>${esc(i.rec)}</td><td><code>${esc(i.field)}</code></td><td>${esc(i.issue)}</td><td class="muted">${esc(i.act)}</td></tr>`);
  return `<div class="summary">${stat(r.count,'Records checked')}${stat(n('Error'),'Errors','bad')}${stat(n('Warning'),'Warnings','warn')}${stat(dup,'Possible duplicates','bad')}${stat(miss,'Missing required fields','bad')}${stat(missing + bank,'Missing in load / bank changes','warn')}</div>
  ${table(['Severity','Dataset','Entity','Record','Field','Issue','Suggested action'], rows)}
  <p class="muted">Errors block the load until fixed. Warnings need a data owner to confirm. A data owner signs off the final issue log before migration.</p>`;
}
function initMDM(){
  const a = $('#mdm-a'), b = $('#mdm-b'), out = $('#mdm-out');
  if (!a) return;
  const load = () => { a.value = JSON.stringify(MDM_A, null, 2); b.value = JSON.stringify(MDM_B, null, 2); out.innerHTML = ''; };
  load();
  $('#mdm-load').addEventListener('click', load);
  $('#mdm-run').addEventListener('click', () => {
    let A, B;
    try { A = JSON.parse(a.value); B = JSON.parse(b.value); }
    catch (e){ out.innerHTML = `<p class="callout callout--warn">The JSON could not be read: ${esc(e.message)}. Use "Reload sample data" to start again.</p>`; return; }
    out.innerHTML = renderMDM(validateMDM(A, B));
  });
}

/* =====================================================================
   DEMO 4 - RESEARCH FRAMEWORK
   ===================================================================== */
const ASSETS = {
  XRP:{ name:'XRP', network:'XRP Ledger (XRPL)', since:'2012', cg:'ripple', cmc:'xrp', site:['https://xrpl.org/','xrpl.org (XRPL docs)'], explorer:['https://livenet.xrpl.org/','XRPL Explorer'],
    use:['Fast, low-cost payments and transfers','Native decentralised exchange and automated market maker on the ledger','Issued tokens, including stablecoins, and escrow features'],
    maturity:'Running since 2012 on its own consensus protocol (no mining). Open-source, with an active developer community and the XRPL Foundation alongside Ripple.',
    adoption:['Number of active accounts and transactions (explorer)','Payment and liquidity partners announced officially','Stablecoins and tokens issued on XRPL'],
    risks:['A large share of XRP supply has been held by Ripple, partly in escrow: check current escrow and release data','US regulatory history (SEC v. Ripple): check the current status from primary sources','Price volatility and competition from other payment networks'] },
  BTC:{ name:'Bitcoin', network:'Bitcoin', since:'2009', cg:'bitcoin', cmc:'bitcoin', site:['https://bitcoin.org/','bitcoin.org'], explorer:['https://mempool.space/','mempool.space'],
    use:['Peer-to-peer digital money and store of value','Settlement layer for second-layer networks such as Lightning','Reserve asset for some institutions and funds'],
    maturity:'The first and longest-running blockchain (2009), proof of work, with a conservative upgrade process.',
    adoption:['Hash rate and transaction activity (explorer)','Regulated investment products and institutional holdings (check official filings)','Lightning network capacity'],
    risks:['High price volatility','Energy use and changing regulation in some countries','Self-custody mistakes and exchange risk for holders'] },
  ETH:{ name:'Ethereum', network:'Ethereum', since:'2015', cg:'ethereum', cmc:'ethereum', site:['https://ethereum.org/','ethereum.org'], explorer:['https://etherscan.io/','Etherscan'],
    use:['Smart contracts and decentralised applications','Base layer for stablecoins, DeFi and tokenisation','Settlement for layer-2 rollup networks'],
    maturity:'Live since 2015 and moved from proof of work to proof of stake in 2022 ("The Merge"). Large developer ecosystem and multiple client teams.',
    adoption:['Active addresses, transactions and fees (explorer)','Stablecoin supply and DeFi value locked (check a data provider)','Layer-2 activity'],
    risks:['Smart contract bugs and exploits in applications built on it','Fee spikes and fragmentation across layer-2 networks','Price volatility and regulatory uncertainty'] },
  SOL:{ name:'Solana', network:'Solana', since:'2020', cg:'solana', cmc:'solana', site:['https://solana.com/','solana.com'], explorer:['https://explorer.solana.com/','Solana Explorer'],
    use:['High-throughput applications, payments and trading','DeFi, NFTs and consumer apps','Stablecoin transfers'],
    maturity:'Mainnet beta since 2020; proof of stake with Proof of History for ordering. Fast-growing ecosystem; history of network outages in earlier years.',
    adoption:['Transactions and active wallets (explorer)','Stablecoin supply on Solana','Developer and application activity (official ecosystem reports)'],
    risks:['Past network outages: check current reliability','Higher validator hardware requirements and staking concentration','Price volatility and fast-moving, speculative app ecosystem'] },
  XLM:{ name:'Stellar Lumens', network:'Stellar', since:'2014', cg:'stellar', cmc:'stellar', site:['https://stellar.org/','stellar.org'], explorer:['https://stellar.expert/','StellarExpert'],
    use:['Cross-border payments and remittances through "anchors"','Issuing tokens and stablecoins','Smart contracts through Soroban'],
    maturity:'Live since 2014 on the Stellar Consensus Protocol, supported by the non-profit Stellar Development Foundation (SDF).',
    adoption:['Payment volume and active accounts (explorer)','Anchors and stablecoin issuers on Stellar (official directory)','Soroban contract activity'],
    risks:['Adoption depends on anchors and partners: check current activity','A share of supply held by SDF: check its published distribution','Competition from other payment networks and price volatility'] }
};
function renderResearch(sym){
  const a = ASSETS[sym]; if (!a) return '';
  const cg = `https://www.coingecko.com/en/coins/${a.cg}`, cmc = `https://coinmarketcap.com/currencies/${a.cmc}/`;
  const link = (u, t) => `<a href="${u}" target="_blank" rel="noopener">${esc(t)}<span class="sr-only"> (opens in a new tab)</span></a>`;
  const md = `# Research summary: ${a.name} (${sym})\nDate checked: ____\n\n## Client objective\n- ____\n\n## Use cases\n${a.use.map(u=>'- '+u).join('\n')}\n\n## Market data (checked live)\n- Market cap: ____ (source: CoinGecko / CoinMarketCap)\n- 24h trading volume: ____\n\n## Ecosystem maturity\n- ${a.maturity}\n\n## Adoption evidence\n${a.adoption.map(u=>'- ____ ('+u+')').join('\n')}\n\n## Risks and limitations\n${a.risks.map(u=>'- '+u).join('\n')}\n\n## Sources verified\n- Official: ${a.site[0]}\n- Explorer: ${a.explorer[0]}\n- Market data: ${cg}\n\nNot financial advice. The client makes their own decision.`;
  return `<h4>${esc(a.name)} (${esc(sym)}) · ${esc(a.network)}, live since ${esc(a.since)}</h4>
  <div class="kv">
    <div><h5>1 · Real-world use cases</h5><ul>${a.use.map(u=>`<li>${esc(u)}</li>`).join('')}</ul></div>
    <div><h5>2 · Market capitalisation</h5><p>${pill('Check live source','info')} Not stored on this page.<br>${link(cg,'CoinGecko')} · ${link(cmc,'CoinMarketCap')}</p></div>
    <div><h5>3 · Trading volume (24h)</h5><p>${pill('Check live source','info')} Compare at least two providers; look for wash trading on small venues.<br>${link(cg,'CoinGecko')} · ${link(cmc,'CoinMarketCap')}</p></div>
    <div><h5>4 · Ecosystem maturity</h5><p>${esc(a.maturity)}</p></div>
    <div><h5>5 · Adoption: evidence to collect</h5><ul>${a.adoption.map(u=>`<li>${esc(u)}</li>`).join('')}</ul></div>
    <div><h5>6 · Risks and limitations</h5><ul>${a.risks.map(u=>`<li>${esc(u)}</li>`).join('')}</ul></div>
    <div class="wide"><h5>7 · Source verification</h5><ul><li>Official: ${link(a.site[0], a.site[1])}</li><li>On-chain data: ${link(a.explorer[0], a.explorer[1])}</li><li>Market data: ${link(cg,'CoinGecko')}, ${link(cmc,'CoinMarketCap')}</li><li>Rule: every AI-organised point is checked against at least one primary source before it goes in a client summary.</li></ul></div>
  </div>
  <details class="sop"><summary>Research summary template (copy into a doc)</summary><pre class="out" id="research-md">${esc(md)}</pre></details>
  <p class="muted">Background notes are general and qualitative, current as written; always confirm against the official sources above.</p>`;
}
function initResearch(){
  const sel = $('#asset'), out = $('#research-out');
  if (!sel) return;
  const run = () => { out.innerHTML = renderResearch(sel.value); };
  $('#research-run').addEventListener('click', run);
  sel.addEventListener('change', run);
}

document.addEventListener('DOMContentLoaded', () => { initRecon(); initTriage(); initMDM(); initResearch(); });
window.ALZStudio = { reconcile, triage, validateMDM, normDate, normAmount, normRef, BANK_CSV, LEDGER_CSV, MDM_A, MDM_B };
})();
