/* ALZ Technology Studio - Enterprise Delivery Lab.
   DEMONSTRATION PROTOTYPE with synthetic data. "AI" suggestions are simulated with rules.
   Plain JS, no dependencies, nothing leaves the browser. */
(function(){
'use strict';
const $ = (s, r=document) => r.querySelector(s);
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pillClass = t => {
  const k = String(t||'').toLowerCase();
  if (['done','pass','retest pass','go','closed','resolved','met'].includes(k)) return 'ok';
  if (['in progress','in uat','conditional go','medium','major','pending','not run','watch'].includes(k)) return 'warn';
  if (['critical','blocker','fail','retest fail','no-go','high','open'].includes(k)) return 'bad';
  if (['story','task','low','minor','backlog','to do','info'].includes(k)) return 'info';
  return 'info';
};
const pill = (t, k) => `<span class="pill pill--${k || pillClass(t)}">${esc(t)}</span>`;
const stat = (n, label, k='') => `<div class="stat ${k?'stat--'+k:''}"><b>${n}</b><span>${esc(label)}</span></div>`;

const TABS = [
  {id:'requirements', label:'Business Requirements'},
  {id:'issues', label:'Jira Issue Management'},
  {id:'triage', label:'AI-Assisted Triage'},
  {id:'board', label:'Agile Delivery Board'},
  {id:'uat', label:'UAT & Defect Management'},
  {id:'release', label:'Release Management'},
  {id:'dashboard', label:'Management Dashboard'}
];
const COLUMNS = ['Backlog','To Do','In Progress','In UAT','Done'];
const ORDER = ['crm','erp','fin','mdm','ecom','da'];
const SCENARIOS = {};


SCENARIOS.crm = {
  id:'crm', prefix:'CRM', title:'Salesforce CRM',
  blurb:'Customer onboarding workflow failure',
  org:'Lumen Partners (fictional B2B firm)',
  sprint:'Sprint 24 · 10–21 Nov 2026',
  context:'Sales converts a qualified lead in Salesforce. The agreed path is to start customer onboarding automatically: set the stage, assign a Customer Success owner, create a welcome task and queue a welcome email. In UAT, converted accounts stay at New and never reach the onboarding queue.',
  brd:{
    id:'BR-ONB-01', version:'1.2', date:'3 Oct 2026',
    title:'Customer onboarding after lead conversion',
    excerpt:'When a sales user converts a qualified lead to an Account and Contact, Salesforce must start a standard onboarding path. The Account Onboarding_Stage is set to KYC Pending, a Customer Success owner is assigned from the regional round-robin pool, a Welcome Task is created, and a welcome email is queued to the primary contact within five minutes. Conversion cannot complete if legal name or country is blank.',
    objective:'Give Customer Success a reliable, complete queue of new customers on the same day as conversion, with no manual re-keying.',
    inScope:['Lead convert in Salesforce','Account field updates and page layout for Onboarding_Stage','Welcome Task creation and assignment','Welcome email alert','Onboarding queue report for Customer Success'],
    outOfScope:['The identity-verification product itself','Billing and collections','A custom mobile app'],
    stakeholders:['Sales operations','Customer Success','Salesforce BA','QA']
  },
  epic:{key:'CRM-100', title:'Enable structured customer onboarding in Salesforce', text:'Deliver the conversion-to-onboarding path, the CS queue and the welcome communication so new customers are picked up on day one.'},
  stories:[
    {key:'CRM-101', title:'Lead convert starts the onboarding path', asA:'sales user', want:'lead conversion to start onboarding automatically', soThat:'Customer Success can pick up the new customer the same day', ac:['On successful convert, Onboarding_Stage is KYC Pending','A Welcome Task is created and assigned to the CS owner','CS Owner is populated from the regional round-robin pool','Convert is blocked if legal name or country is blank'], status:'In Progress'},
    {key:'CRM-102', title:'Customer Success onboarding queue and report', asA:'Customer Success lead', want:'a queue and report of accounts in KYC Pending', soThat:'the team can work new customers in arrival order', ac:['A list view or report shows accounts where Onboarding_Stage is KYC Pending','The report includes convert date, CS Owner, country and legal name','The queue is available to CS users in UAT and production'], status:'In UAT'},
    {key:'CRM-103', title:'Welcome email after convert', asA:'sales operations user', want:'a welcome email to go to the primary contact within five minutes of convert', soThat:'the customer receives a consistent first message', ac:['Email is queued within five minutes of a successful convert','The template uses legal name and CS Owner','A missing email address on the contact raises a task, not a silent skip'], status:'To Do'}
  ],
  issues:[
    {key:'CRM-101', type:'Story', priority:'High', status:'In Progress', summary:'Lead convert starts the onboarding path', assignee:'Priya (BA)', component:'Onboarding', requirement:'BR-ONB-01', story:'CRM-101', description:'Story covering the convert-to-onboarding automation and required-field checks.', tests:['TC-ONB-01','TC-ONB-02','TC-ONB-04'], history:[{date:'3 Nov 2026', author:'Priya (BA)', event:'Story refined with Sales Ops and accepted into Sprint 24.'},{date:'10 Nov 2026', author:'Dev', event:'Development started on the convert flow.'}], signoff:{state:'Pending'}, ai:{type:'Story', priority:'High', queue:'CRM workflow', reason:'This is a committed Sprint 24 story that other onboarding tests depend on.', confidence:'High'}},
    {key:'CRM-102', type:'Story', priority:'Medium', status:'In UAT', summary:'Customer Success onboarding queue and report', assignee:'Daniel (QA)', component:'Reporting', requirement:'BR-ONB-01', story:'CRM-102', description:'Queue and report for accounts in KYC Pending.', tests:['TC-ONB-06'], history:[{date:'11 Nov 2026', author:'Dev', event:'Report built in UAT and handed to QA.'}], signoff:{state:'Pending'}, ai:{type:'Story', priority:'Medium', queue:'Reporting', reason:'Reporting story already in UAT, with no wording that suggests a production incident.', confidence:'Medium'}},
    {key:'CRM-103', type:'Story', priority:'Medium', status:'To Do', summary:'Welcome email after convert', assignee:'Priya (BA)', component:'Communications', requirement:'BR-ONB-01', story:'CRM-103', tests:['TC-ONB-05'], history:[{date:'10 Nov 2026', author:'Priya (BA)', event:'Held in To Do until the convert path is retested.'}], signoff:{state:'Pending'}, ai:{type:'Story', priority:'Medium', queue:'Communications', reason:'Dependent on the convert path; currently blocked by CRM-104.', confidence:'High'}},
    {key:'CRM-104', type:'Bug', priority:'Critical', severity:'Blocker', status:'In Progress', summary:'Onboarding workflow does not start after lead convert', assignee:'Dev', component:'Onboarding', requirement:'BR-ONB-01', story:'CRM-101',
      steps:['In the UAT org, create a lead with legal name, country, email and a qualified status.','Convert the lead to an Account and Contact, leaving default convert options.','Open the new Account and check Onboarding_Stage, CS Owner and open Tasks.','Check the onboarding queue report and the email log.'],
      expected:'Onboarding_Stage is KYC Pending, CS Owner is filled, a Welcome Task exists, the account appears in the CS queue, and a welcome email is queued.',
      actual:'Onboarding_Stage stays New, CS Owner is blank, no Welcome Task is created, the account never appears in the onboarding queue, and no email is queued.',
      tests:['TC-ONB-04'],
      history:[
        {date:'12 Nov 2026, 09:40', author:'Daniel (QA)', event:'Logged during UAT of TC-ONB-04. Convert succeeds but onboarding fields do not change.'},
        {date:'12 Nov 2026, 14:15', author:'Priya (BA)', event:'Reproduced in UAT with two further leads, including an APAC record. Raised to Critical because CS has no queue to work.'},
        {date:'13 Nov 2026, 11:05', author:'Dev', event:'Entry criteria on the convert automation still look at a retired field (Onboarding_Flag__c) that is no longer set.'},
        {date:'14 Nov 2026, 16:20', author:'Dev', event:'Fix in progress: switch criteria to the convert event and set Onboarding_Stage directly. Planned for UAT build 24.3.'}
      ],
      signoff:{state:'Pending', note:'Business sign-off is waiting on a successful retest of TC-ONB-04.'},
      ai:{type:'Bug', priority:'Critical', queue:'CRM workflow', reason:'Failed UAT path after lead convert, with "never appears in the queue" and no stage change. This blocks the epic.', confidence:'High'}},
    {key:'CRM-105', type:'Bug', priority:'High', severity:'Major', status:'In UAT', summary:'Welcome email is skipped when the contact has no mobile number', assignee:'Daniel (QA)', component:'Communications', requirement:'BR-ONB-01', story:'CRM-103',
      steps:['Convert a lead whose primary contact has an email address but no mobile number.','Wait five minutes and check the email log and tasks.'],
      expected:'Welcome email is queued to the email address. A missing mobile number does not skip the email.',
      actual:'No email is queued. A debug log shows the alert entry criteria require both email and mobile.',
      tests:['TC-ONB-05'],
      history:[{date:'13 Nov 2026', author:'Daniel (QA)', event:'Found while preparing email cases for UAT.'},{date:'14 Nov 2026', author:'Dev', event:'Criteria loosened in build 24.3. Awaiting retest.'}],
      signoff:{state:'Pending'},
      ai:{type:'Bug', priority:'High', queue:'Communications', reason:'Welcome email silently skipped on a valid contact. Customer-facing communication gap, not a full convert blocker.', confidence:'High'}},
    {key:'CRM-106', type:'Bug', priority:'Medium', severity:'Major', status:'To Do', summary:'Partner-sourced convert creates a duplicate account for an existing customer', assignee:'Priya (BA)', component:'Data quality', requirement:'BR-ONB-01', story:'CRM-101',
      steps:['Identify an existing Account with a known company registration number.','Create a partner-sourced lead with the same registration number and a slightly different trading name.','Convert the lead without using the "attach to existing" option (the default UAT path).'],
      expected:'The convert flow warns that an account with the same registration number already exists, and offers to attach rather than create.',
      actual:'A second Account is created. Both records are active and eligible for onboarding.',
      tests:['TC-ONB-03'],
      history:[{date:'14 Nov 2026', author:'Priya (BA)', event:'Logged from a UAT walkthrough with Sales Ops. Duplicate check is only on exact account name.'}],
      signoff:{state:'Pending'},
      ai:{type:'Bug', priority:'High', queue:'Data quality', reason:'Duplicate customer records at convert. Suggested priority is High because two active accounts can split onboarding and reporting.', confidence:'Medium'}},
    {key:'CRM-107', type:'Bug', priority:'Medium', severity:'Minor', status:'Done', summary:'Onboarding_Stage picklist in UAT was missing KYC Pending', assignee:'Dev', component:'Configuration', requirement:'BR-ONB-01', story:'CRM-101',
      steps:['Open an Account in UAT and inspect the Onboarding_Stage picklist.'],
      expected:'KYC Pending is available.',
      actual:'The UAT picklist only had New, Active and Closed. KYC Pending was missing from the UAT value set.',
      tests:['TC-ONB-01'],
      history:[{date:'7 Nov 2026', author:'Daniel (QA)', event:'Logged during environment checks.'},{date:'8 Nov 2026', author:'Dev', event:'Value set deployed to UAT.'},{date:'9 Nov 2026', author:'Daniel (QA)', event:'Retest passed. Closed.'}],
      signoff:{state:'Signed off', by:'Sales operations', date:'9 Nov 2026', note:'Environment defect only. Accepted as closed.'},
      ai:{type:'Bug', priority:'Medium', queue:'Configuration', reason:'Environment data issue, already retested and closed.', confidence:'High'}},
    {key:'CRM-108', type:'Task', priority:'Medium', status:'To Do', summary:'Prepare UAT evidence pack for onboarding sign-off', assignee:'Priya (BA)', component:'UAT', requirement:'BR-ONB-01', story:'CRM-102', tests:[], history:[{date:'10 Nov 2026', author:'Priya (BA)', event:'Task opened. Waiting on CRM-104 retest evidence.'}], signoff:{state:'Pending'}, ai:{type:'Task', priority:'Medium', queue:'UAT', reason:'Evidence pack, not a defect. Priority follows the release sign-off date.', confidence:'Medium'}},
    {key:'CRM-109', type:'Bug', priority:'Low', severity:'Minor', status:'Backlog', summary:'Onboarding_Stage is missing from the Sales User page layout in UAT', assignee:'Unassigned', component:'Page layout', requirement:'BR-ONB-01', story:'CRM-101',
      steps:['Log in to UAT as a Sales User and open a converted Account.'],
      expected:'Onboarding_Stage is visible so the sales user can confirm the stage after convert.',
      actual:'The field is not on the Sales User page layout. Admins and CS users can see it. Testers using the sales layout cannot confirm the value without changing layout.',
      tests:['TC-ONB-01'],
      history:[{date:'15 Nov 2026', author:'Daniel (QA)', event:'Logged as a low layout issue. Does not block CS, who use a different layout.'}],
      signoff:{state:'Pending'},
      ai:{type:'Bug', priority:'Low', queue:'Page layout', reason:'Visibility gap on one UAT layout, with a workaround for testers. Not a workflow failure.', confidence:'High'}}
  ],
  tests:[
    {id:'TC-ONB-01', title:'Required fields block convert when legal name is blank', story:'CRM-101', requirement:'BR-ONB-01', result:'Pass', defect:'', notes:'Passed 11 Nov 2026.'},
    {id:'TC-ONB-02', title:'Required fields block convert when country is blank', story:'CRM-101', requirement:'BR-ONB-01', result:'Pass', defect:'', notes:'Passed 11 Nov 2026.'},
    {id:'TC-ONB-03', title:'Convert warns when the registration number already exists', story:'CRM-101', requirement:'BR-ONB-01', result:'Fail', defect:'CRM-106', notes:'Duplicate account created. No warning shown.'},
    {id:'TC-ONB-04', title:'Convert sets stage, CS Owner and Welcome Task', story:'CRM-101', requirement:'BR-ONB-01', result:'Fail', defect:'CRM-104', notes:'No field updates and no task. Retest planned after build 24.3.'},
    {id:'TC-ONB-05', title:'Welcome email queued when contact has email but no mobile', story:'CRM-103', requirement:'BR-ONB-01', result:'Retest fail', defect:'CRM-105', notes:'First fail 13 Nov. Fix in 24.3, retest still failing in the earlier build used on 14 Nov. Next retest booked.'},
    {id:'TC-ONB-06', title:'CS queue lists accounts in KYC Pending only', story:'CRM-102', requirement:'BR-ONB-01', result:'Blocked', defect:'CRM-104', notes:'Cannot seed the queue until the convert path sets the stage.'},
    {id:'TC-ONB-07', title:'APAC lead is assigned to the APAC CS pool', story:'CRM-101', requirement:'BR-ONB-01', result:'Not run', defect:'', notes:'Waiting on CRM-104.'}
  ],
  release:{
    name:'Onboarding path, UAT release 24.3', target:'21 Nov 2026',
    decision:'No-go', decisionKey:'nogo',
    rationale:'The convert path still does not start onboarding (CRM-104). Customer Success would have no queue on day one. A go decision is not recommended until TC-ONB-04 passes on a UAT build that also covers the welcome email.',
    conditions:['CRM-104 retested and passed','CRM-105 retested and passed','TC-ONB-06 unblocked and passed','UAT evidence pack attached to the sign-off note'],
    checklist:[
      {item:'Business requirements signed off at v1.2', state:'ok', notes:'Signed 3 Oct 2026 by Sales Ops and Customer Success.'},
      {item:'Critical and blocker defects closed', state:'bad', notes:'CRM-104 still open and in progress.'},
      {item:'UAT exit criteria met', state:'bad', notes:'2 failed, 1 retest fail, 1 blocked, 1 not run.'},
      {item:'Training notes for Sales and CS drafted', state:'warn', notes:'Draft in progress; screenshots waiting on a successful convert.'},
      {item:'Rollback is to disable the convert automation and revert to the manual CS task list', state:'ok', notes:'Documented. Manual path still works.'},
      {item:'Hypercare roster agreed for five working days after go-live', state:'ok', notes:'BA, Salesforce developer and CS lead on the roster.'}
    ],
    hypercare:{window:'Five working days after go-live, 09:00–18:00 MYT', channel:'Shared operations chat and a daily 15-minute stand-up', exit:'No new blocker or critical onboarding defects for two consecutive business days, and the CS queue is in use.'}
  },
  risks:[
    {id:'R-1', title:'If CRM-104 slips past 21 Nov, the release date moves by at least one sprint.', severity:'High', status:'Open', mitigation:'Daily defect huddle and a reserved UAT slot on 17 Nov.'},
    {id:'R-2', title:'Duplicate accounts (CRM-106) could split onboarding if a workaround convert is used.', severity:'Medium', status:'Open', mitigation:'Add a registration-number check before retest of the happy path.'},
    {id:'R-3', title:'Welcome email criteria may still be too strict after the first fix.', severity:'Medium', status:'Open', mitigation:'Retest TC-ONB-05 with email-only contacts in two regions.'}
  ],
  trend:[
    {sprint:'Sprint 21', blocker:0, critical:1, major:3, minor:4},
    {sprint:'Sprint 22', blocker:0, critical:2, major:4, minor:3},
    {sprint:'Sprint 23', blocker:1, critical:2, major:3, minor:2},
    {sprint:'Sprint 24', blocker:1, critical:1, major:2, minor:2}
  ]
};


SCENARIOS.erp = {
  id:'erp', prefix:'ERP', title:'ERP Transformation',
  blurb:'Incorrect account mapping during migration',
  org:'Cedar Manufacturing (fictional industrial firm)',
  sprint:'Sprint 18 · 3–14 Nov 2026',
  context:'Cedar is moving finance and inventory balances from a legacy system to a new ERP. The business-side work is a source-to-target mapping workbook, UAT of migrated trial-balance samples and an exception list. Finance stakeholders confirm each intended target. This lab does not show ERP administration or ownership of the chart of accounts, and it does not post entries.',
  brd:{
    id:'BR-MAP-01', version:'1.4', date:'18 Sep 2026',
    title:'Source-to-target account mapping for ERP cutover, phase 1',
    excerpt:'Every in-scope legacy account code must have an agreed target in the mapping workbook before cutover. UAT uses a sample trial balance to check that migrated balances land on the agreed targets, that the domestic and export revenue split is kept, and that codes with no target are parked in a named suspense account rather than dropped.',
    objective:'Give finance stakeholders a complete, tested mapping so opening balances in the new ERP can be trusted on Monday after cutover.',
    inScope:['Mapping workbook for in-scope finance and inventory codes','UAT of migrated trial-balance samples','Exception list and suspense-parking rule','Cutover rehearsal counts'],
    outOfScope:['Design or ownership of the new chart of accounts','ERP system administration','Posting of live journal entries','Payroll and tax filings'],
    stakeholders:['Finance stakeholders','Inventory lead','Business analyst','Data migration lead','QA']
  },
  epic:{key:'ERP-100', title:'Validate source-to-target account mapping before cutover', text:'Confirm the workbook, test migrated samples and clear mapping exceptions before the phase 1 cutover window.'},
  stories:[
    {key:'ERP-101', title:'Complete mapping workbook for in-scope codes', asA:'finance stakeholder', want:'every in-scope legacy code to have an agreed target', soThat:'the load file used at cutover matches what was signed', ac:['Workbook lists legacy code, name, proposed target, status and stakeholder confirmation','Version in the working folder matches the load file','Dormant codes are flagged rather than silently mapped'], status:'Done'},
    {key:'ERP-102', title:'UAT of migrated trial-balance samples', asA:'business analyst', want:'to test a sample trial balance after a mapping load', soThat:'mapping errors are found before cutover', ac:['Sample covers inventory, revenue, cost centres and intercompany codes','Differences versus the legacy sample are listed with a suggested cause','Blocker and critical mapping defects are logged in Jira'], status:'In UAT'},
    {key:'ERP-103', title:'Inventory receipts follow the agreed inventory targets', asA:'inventory lead', want:'goods-receipt postings in the sample to land on inventory accounts', soThat:'stock is not reported as an expense after cutover', ac:['Legacy 1401 and 1402 land on the agreed inventory targets','The sample expense total does not include those receipts'], status:'In Progress'}
  ],
  issues:[
    {key:'ERP-101', type:'Story', priority:'High', status:'Done', summary:'Complete mapping workbook for in-scope codes', assignee:'Aisha (BA)', component:'Mapping', requirement:'BR-MAP-01', story:'ERP-101', tests:['TC-MAP-01'], history:[{date:'28 Oct 2026', author:'Finance stakeholder', event:'Workbook v1.4 confirmed for in-scope codes.'}], signoff:{state:'Signed off', by:'Finance stakeholder', date:'28 Oct 2026'}, ai:{type:'Story', priority:'High', queue:'Mapping', reason:'Foundation story, already signed off.', confidence:'High'}},
    {key:'ERP-102', type:'Story', priority:'High', status:'In UAT', summary:'UAT of migrated trial-balance samples', assignee:'Wei (QA)', component:'UAT', requirement:'BR-MAP-01', story:'ERP-102', tests:['TC-MAP-02','TC-MAP-03','TC-MAP-04'], history:[{date:'4 Nov 2026', author:'Aisha (BA)', event:'Sample file loaded to the UAT ERP and test execution started.'}], signoff:{state:'Pending'}, ai:{type:'Story', priority:'High', queue:'UAT', reason:'UAT story with open critical mapping defects sitting underneath it.', confidence:'High'}},
    {key:'ERP-103', type:'Story', priority:'High', status:'In Progress', summary:'Inventory receipts follow the agreed inventory targets', assignee:'Dev', component:'Inventory', requirement:'BR-MAP-01', story:'ERP-103', tests:['TC-MAP-02'], history:[{date:'7 Nov 2026', author:'Inventory lead', event:'Raised after the first sample showed receipts in expenses.'}], signoff:{state:'Pending'}, ai:{type:'Story', priority:'High', queue:'Inventory', reason:'Tied to the open blocker on inventory mapping.', confidence:'High'}},
    {key:'ERP-104', type:'Bug', priority:'Critical', severity:'Blocker', status:'In Progress', summary:'Legacy inventory account 1401 is mapped to expense 6100', assignee:'Dev', component:'Mapping', requirement:'BR-MAP-01', story:'ERP-103',
      steps:['Load mapping workbook v1.4 and the agreed trial-balance sample to UAT.','Compare the inventory and expense totals with the legacy sample.','Inspect the mapping row for legacy code 1401.'],
      expected:'Legacy 1401 (Raw materials) lands on target inventory 1400. Inventory is not understated and expenses are not overstated by the sample receipts.',
      actual:'1401 is mapped to target 6100 (Operating expenses). In the sample, inventory is understated by 428,600 and expenses are overstated by the same amount.',
      tests:['TC-MAP-02'],
      history:[{date:'6 Nov 2026', author:'Wei (QA)', event:'Logged from TC-MAP-02. Difference is material for the sample.'},{date:'6 Nov 2026', author:'Aisha (BA)', event:'Compared with the signed workbook: the intended target is 1400. The load file has 6100.'},{date:'8 Nov 2026', author:'Data migration lead', event:'Root cause: a typo in the load file for 1401, copied from a neighbouring expense row. Correction prepared for the next rehearsal.'}],
      signoff:{state:'Pending', note:'Finance stakeholders will sign off after the corrected load is replayed on the sample.'},
      ai:{type:'Bug', priority:'Critical', queue:'Mapping', reason:'Material inventory versus expense mis-map in a cutover sample. This is a cutover blocker.', confidence:'High'}},
    {key:'ERP-105', type:'Bug', priority:'High', severity:'Critical', status:'To Do', summary:'Intercompany codes 9xxx are dropped instead of parked in suspense', assignee:'Aisha (BA)', component:'Mapping', requirement:'BR-MAP-01', story:'ERP-102',
      steps:['Filter the sample for legacy codes starting with 9.','Check the exception list and the suspense account after the load.'],
      expected:'Codes with no agreed target are parked in the named suspense account and listed as exceptions.',
      actual:'42 intercompany balances are missing from the target trial balance. They are not in suspense and do not appear on the exception list.',
      tests:['TC-MAP-04'],
      history:[{date:'7 Nov 2026', author:'Wei (QA)', event:'Logged after a balance-sheet total check failed to within 0.01.'}],
      signoff:{state:'Pending'},
      ai:{type:'Bug', priority:'Critical', queue:'Mapping', reason:'Balances disappeared rather than parking in suspense. Suggested priority Critical, one step above the logged High, because the trial balance no longer ties.', confidence:'High'}},
    {key:'ERP-106', type:'Bug', priority:'High', severity:'Major', status:'In UAT', summary:'Domestic and export revenue are both mapped to a single target 4000', assignee:'Wei (QA)', component:'Mapping', requirement:'BR-MAP-01', story:'ERP-102',
      steps:['Inspect mapping rows for legacy 4000 (domestic) and 4010 (export).','Check the UAT management revenue report after the sample load.'],
      expected:'The export split is kept. Legacy 4010 lands on the agreed export target 4010.',
      actual:'Both codes map to 4000. The management report can no longer separate export revenue.',
      tests:['TC-MAP-03'],
      history:[{date:'8 Nov 2026', author:'Finance stakeholder', event:'Raised in the UAT walkthrough. Split is needed for monthly management reports.'},{date:'9 Nov 2026', author:'Aisha (BA)', event:'Workbook already shows 4010 as the intended target. Load file needs a correction.'}],
      signoff:{state:'Pending'},
      ai:{type:'Bug', priority:'High', queue:'Mapping', reason:'Reporting split lost after mapping. High is right: visible to management reports, not a balance-sheet tie-out issue.', confidence:'High'}},
    {key:'ERP-107', type:'Bug', priority:'Medium', severity:'Major', status:'To Do', summary:'Opening balance for cost centre C-450 arrived with the opposite sign', assignee:'Data migration lead', component:'Balances', requirement:'BR-MAP-01', story:'ERP-102',
      steps:['Compare legacy and target opening balances for cost centre C-450.'],
      expected:'Debit and credit signs match the legacy sample.',
      actual:'C-450 arrived as a credit. The legacy sample shows a debit of 62,150.',
      tests:['TC-MAP-05'],
      history:[{date:'9 Nov 2026', author:'Wei (QA)', event:'Logged from the cost-centre sample.'}],
      signoff:{state:'Pending'},
      ai:{type:'Bug', priority:'Medium', queue:'Balances', reason:'Sign error on one cost centre. Material for that centre, contained in the sample.', confidence:'Medium'}},
    {key:'ERP-108', type:'Task', priority:'Medium', status:'In Progress', summary:'Rehearse the cutover mapping load and record exception counts', assignee:'Aisha (BA)', component:'Cutover', requirement:'BR-MAP-01', story:'ERP-102', tests:[], history:[{date:'10 Nov 2026', author:'Aisha (BA)', event:'Rehearsal scheduled for 13 Nov after the 1401 correction is in the load file.'}], signoff:{state:'Pending'}, ai:{type:'Task', priority:'Medium', queue:'Cutover', reason:'Cutover rehearsal task, timed after the blocker fix.', confidence:'High'}},
    {key:'ERP-109', type:'Bug', priority:'Low', severity:'Minor', status:'Done', summary:'Workbook v1.3 was still in the working folder beside load file v1.4', assignee:'Aisha (BA)', component:'Documentation', requirement:'BR-MAP-01', story:'ERP-101',
      steps:['Compare the version stamp on the workbook in the working folder with the load file header.'],
      expected:'Both show v1.4.',
      actual:'The folder still held a v1.3 copy. The load file was already v1.4.',
      tests:['TC-MAP-01'],
      history:[{date:'29 Oct 2026', author:'Aisha (BA)', event:'Replaced the folder copy with v1.4 and added a version line to the checklist.'},{date:'30 Oct 2026', author:'Finance stakeholder', event:'Retest passed. Closed.'}],
      signoff:{state:'Signed off', by:'Finance stakeholder', date:'30 Oct 2026'},
      ai:{type:'Bug', priority:'Low', queue:'Documentation', reason:'Version hygiene issue, already closed.', confidence:'High'}},
    {key:'ERP-110', type:'Bug', priority:'Medium', severity:'Minor', status:'Backlog', summary:'Dormant legacy codes are still in the load file', assignee:'Unassigned', component:'Mapping', requirement:'BR-MAP-01', story:'ERP-101',
      steps:['Filter the load file for codes marked Dormant in the workbook.'],
      expected:'Dormant codes are flagged and excluded from the opening-balance load, or listed as a deliberate residual.',
      actual:'17 dormant codes are still in the load with proposed targets. None had a balance in the sample, so this did not change totals.',
      tests:['TC-MAP-01'],
      history:[{date:'11 Nov 2026', author:'Aisha (BA)', event:'Logged for a later clean-up. Not in the cutover blocker set.'}],
      signoff:{state:'Pending'},
      ai:{type:'Bug', priority:'Low', queue:'Mapping', reason:'Suggested Low: no sample balance impact. Can wait until after the blocker corrections.', confidence:'Medium'}}
  ],
  tests:[
    {id:'TC-MAP-01', title:'Workbook version matches the load file and lists confirmation status', story:'ERP-101', requirement:'BR-MAP-01', result:'Retest pass', defect:'ERP-109', notes:'Passed after the v1.4 folder copy was put in place.'},
    {id:'TC-MAP-02', title:'Inventory sample lands on inventory targets, not expenses', story:'ERP-103', requirement:'BR-MAP-01', result:'Fail', defect:'ERP-104', notes:'1401 maps to 6100. Material difference of 428,600.'},
    {id:'TC-MAP-03', title:'Export revenue stays on a separate target', story:'ERP-102', requirement:'BR-MAP-01', result:'Fail', defect:'ERP-106', notes:'4000 and 4010 both map to 4000.'},
    {id:'TC-MAP-04', title:'Unmapped codes are parked in suspense and listed', story:'ERP-102', requirement:'BR-MAP-01', result:'Fail', defect:'ERP-105', notes:'42 intercompany balances dropped.'},
    {id:'TC-MAP-05', title:'Cost-centre opening balances keep their legacy signs', story:'ERP-102', requirement:'BR-MAP-01', result:'Fail', defect:'ERP-107', notes:'C-450 sign is reversed.'},
    {id:'TC-MAP-06', title:'Sample trial balance ties to the legacy sample within 0.01', story:'ERP-102', requirement:'BR-MAP-01', result:'Blocked', defect:'ERP-105', notes:'Cannot pass while balances are dropped.'},
    {id:'TC-MAP-07', title:'Cutover rehearsal records exception counts', story:'ERP-102', requirement:'BR-MAP-01', result:'Not run', defect:'', notes:'Booked for 13 Nov.'}
  ],
  release:{
    name:'ERP mapping rehearsal, 13 Nov 2026', target:'14 Nov 2026 (rehearsal) · cutover not in this sprint',
    decision:'No-go', decisionKey:'nogo',
    rationale:'The rehearsal should not run on the current load file. Inventory is mis-mapped, intercompany balances are dropped and the revenue split is lost. Finance stakeholders have asked for a corrected load before the next rehearsal.',
    conditions:['ERP-104 corrected and TC-MAP-02 passed','ERP-105 corrected and TC-MAP-04 and TC-MAP-06 passed','ERP-106 corrected and TC-MAP-03 passed','Exception counts recorded on a clean rehearsal'],
    checklist:[
      {item:'Mapping workbook v1.4 confirmed by finance stakeholders', state:'ok', notes:'Confirmed 28 Oct 2026. The load file still needs to match for 1401, 4010 and 9xxx.'},
      {item:'Critical and blocker mapping defects closed', state:'bad', notes:'ERP-104 and ERP-105 still open.'},
      {item:'UAT exit for the sample trial balance', state:'bad', notes:'Four failed tests and one blocked.'},
      {item:'Rollback plan: keep the legacy system as system of record', state:'ok', notes:'Cutover window has not started. Legacy remains the record.'},
      {item:'Rehearsal window and attendance agreed', state:'warn', notes:'13 Nov is on hold pending the corrected load.'},
      {item:'Hypercare plan drafted for the later cutover weekend', state:'ok', notes:'Draft only. Not in force until cutover is scheduled.'}
    ],
    hypercare:{window:'Cutover weekend plus five working days, once a later go decision is made', channel:'Finance war-room call and a shared exception log', exit:'Sample and opening balances tie, and no new blocker mapping defect is found in the first two business days.'}
  },
  risks:[
    {id:'R-1', title:'A rehearsal on the current load would give finance false comfort on inventory and intercompany.', severity:'High', status:'Open', mitigation:'Hold the 13 Nov rehearsal until ERP-104 and ERP-105 are corrected.'},
    {id:'R-2', title:'Further typo-style mapping errors may exist outside the sample.', severity:'Medium', status:'Open', mitigation:'After the known fixes, run a full mapping diff of the load file against the signed workbook.'},
    {id:'R-3', title:'Dormant codes left in the load may be reused by mistake later.', severity:'Low', status:'Open', mitigation:'Backlog clean-up in ERP-110.'}
  ],
  trend:[
    {sprint:'Sprint 15', blocker:0, critical:1, major:2, minor:5},
    {sprint:'Sprint 16', blocker:1, critical:1, major:3, minor:3},
    {sprint:'Sprint 17', blocker:1, critical:2, major:3, minor:2},
    {sprint:'Sprint 18', blocker:1, critical:1, major:3, minor:2}
  ]
};


SCENARIOS.fin = {
  id:'fin', prefix:'FIN', title:'Banking & Fintech',
  blurb:'Transaction reconciliation discrepancy',
  org:'Harbor Payments (fictional payments firm)',
  sprint:'Sprint 31 · 10–21 Nov 2026',
  context:'Each morning Harbor compares the card settlement file with the internal posting batch. On 15 Nov 2026 the settlement total is 8,220.40 MYR higher than the posting batch. The BA investigates exceptions, categorises them and raises defects for the integration and operations teams. This lab does not post ledger entries.',
  brd:{
    id:'BR-REC-01', version:'2.0', date:'12 Aug 2026',
    title:'Daily card settlement to posting-batch reconciliation',
    excerpt:'By 10:00 MYT each business day, the operations team must have a reconciliation of the previous day’s card settlement file against the internal posting batch. Items should match on reference, amount and scheme date. Unmatched items are grouped into an exception queue with a suggested category (scheme fee, late presentment, FX difference, duplicate, unidentified) and an owner. The tool does not post adjustments.',
    objective:'Give operations a same-morning view of every unmatched settlement item, with enough context to investigate before the daily cut-off.',
    inScope:['Daily match of settlement file and posting batch','Exception queue and categories','Handling of scheme fees and FX differences in the report','Duplicate-presentment detection'],
    outOfScope:['Posting or reversing ledger entries','Chargeback case management','Card-scheme contract changes'],
    stakeholders:['Payments operations','Finance operations','Integration team','Business analyst','QA']
  },
  epic:{key:'FIN-100', title:'Automated daily settlement reconciliation', text:'Match the settlement file to the posting batch, surface exceptions and keep fee and FX items visible rather than buried in an unexplained difference.'},
  stories:[
    {key:'FIN-101', title:'Match settlement items to the posting batch', asA:'payments operations analyst', want:'each settlement item to match a posting on reference, amount and scheme date', soThat:'only genuine exceptions need investigation', ac:['Match on reference first, then amount and scheme date within one day','Matched items are marked cleared in the daily report','Unmatched items appear in the exception queue the same morning'], status:'In UAT'},
    {key:'FIN-102', title:'Exception categories and owners', asA:'operations lead', want:'each unmatched item to carry a suggested category and owner', soThat:'the morning queue can be worked in a consistent order', ac:['Categories include scheme fee, late presentment, FX difference, duplicate and unidentified','Each category has a default owner','The unexplained difference on the summary equals the sum of open exceptions'], status:'In Progress'},
    {key:'FIN-103', title:'Scheme fees arrive in the same reconciliation window', asA:'finance operations analyst', want:'scheme fee files to be included in the same morning run', soThat:'fee totals are not left as an unexplained difference', ac:['Fee file for the scheme date is ingested before the 10:00 run','Fee items are categorised as scheme fee, not unidentified'], status:'To Do'}
  ],
  issues:[
    {key:'FIN-101', type:'Story', priority:'High', status:'In UAT', summary:'Match settlement items to the posting batch', assignee:'Rina (BA)', component:'Reconciliation', requirement:'BR-REC-01', story:'FIN-101', tests:['TC-REC-01','TC-REC-02'], history:[{date:'11 Nov 2026', author:'Rina (BA)', event:'Happy-path matches passing in UAT. Exception cases still open.'}], signoff:{state:'Pending'}, ai:{type:'Story', priority:'High', queue:'Reconciliation', reason:'Core daily story, already in UAT.', confidence:'High'}},
    {key:'FIN-102', type:'Story', priority:'High', status:'In Progress', summary:'Exception categories and owners', assignee:'Dev', component:'Exceptions', requirement:'BR-REC-01', story:'FIN-102', tests:['TC-REC-03'], history:[{date:'12 Nov 2026', author:'Dev', event:'Category rules in development, blocked by the 15 Nov unexplained difference.'}], signoff:{state:'Pending'}, ai:{type:'Story', priority:'High', queue:'Exceptions', reason:'Needed so the 8,220.40 difference can be split and owned.', confidence:'High'}},
    {key:'FIN-103', type:'Story', priority:'High', status:'To Do', summary:'Scheme fees arrive in the same reconciliation window', assignee:'Rina (BA)', component:'Fees', requirement:'BR-REC-01', story:'FIN-103', tests:['TC-REC-04'], history:[{date:'15 Nov 2026', author:'Rina (BA)', event:'Pulled into the sprint after the fee file was found to be sitting unused.'}], signoff:{state:'Pending'}, ai:{type:'Story', priority:'High', queue:'Fees', reason:'Directly related to the open critical difference.', confidence:'High'}},
    {key:'FIN-104', type:'Bug', priority:'Critical', severity:'Blocker', status:'In Progress', summary:'15 Nov settlement total is 8,220.40 MYR higher than the posting batch', assignee:'Rina (BA)', component:'Reconciliation', requirement:'BR-REC-01', story:'FIN-101',
      steps:['Load the 15 Nov 2026 settlement file and the internal posting batch into the UAT reconciliation run.','Compare the two totals and open the exception queue.','Confirm whether the unexplained difference equals the sum of exceptions.'],
      expected:'The daily summary ties, or every unit of difference is listed as an exception with a category.',
      actual:'Settlement total 1,284,330.40 MYR versus posting batch 1,276,110.00 MYR. Difference 8,220.40 MYR. The exception queue shows only 1,140.00 of late presentments. 7,080.40 remains unexplained and is not assigned.',
      tests:['TC-REC-02'],
      history:[{date:'16 Nov 2026, 08:50', author:'Ops analyst', event:'Morning run failed to tie. Raised to the BA.'},{date:'16 Nov 2026, 10:30', author:'Rina (BA)', event:'Reproduced in UAT with the same files. Part of the gap looks like scheme fees; the rest needs item-level investigation.'},{date:'16 Nov 2026, 15:10', author:'Integration', event:'Confirmed the fee file for 15 Nov landed at 09:12 but is not ingested by the reconciliation job.'}],
      signoff:{state:'Pending', note:'Operations sign-off of the 15 Nov run is on hold until the difference is fully categorised. No entries are posted from this lab.'},
      ai:{type:'Bug', priority:'Critical', queue:'Reconciliation', reason:'Material daily difference, only partly explained, and the queue does not balance. This is a same-day operations blocker.', confidence:'High'}},
    {key:'FIN-105', type:'Bug', priority:'High', severity:'Critical', status:'To Do', summary:'Scheme fee file is not ingested by the daily reconciliation job', assignee:'Integration', component:'Fees', requirement:'BR-REC-01', story:'FIN-103',
      steps:['Confirm the 15 Nov fee file is in the landing folder.','Run the reconciliation job and search the exception queue for scheme fee items.'],
      expected:'Fee items appear in the same morning run, categorised as scheme fee.',
      actual:'The file is present but ignored. Job logs show it only reads the main settlement file.',
      tests:['TC-REC-04'],
      history:[{date:'16 Nov 2026', author:'Rina (BA)', event:'Logged as a separate defect after the integration check on FIN-104.'}],
      signoff:{state:'Pending'},
      ai:{type:'Bug', priority:'Critical', queue:'Fees', reason:'A whole fee file is skipped, which likely explains most of the 15 Nov gap. Suggested Critical to match the daily tie-out.', confidence:'High'}},
    {key:'FIN-106', type:'Bug', priority:'High', severity:'Major', status:'In UAT', summary:'SGD merchant items used the previous day’s FX rate', assignee:'Daniel (QA)', component:'FX', requirement:'BR-REC-01', story:'FIN-101',
      steps:['Select SGD merchant items from 15 Nov.','Compare the MYR amount in the posting batch with the scheme rate for that date.'],
      expected:'The posting uses the scheme date FX rate.',
      actual:'The posting used the 14 Nov rate. 14 items differ by small FX amounts that add to 312.80 MYR.',
      tests:['TC-REC-05'],
      history:[{date:'16 Nov 2026', author:'Daniel (QA)', event:'Found while splitting the unexplained difference.'}],
      signoff:{state:'Pending'},
      ai:{type:'Bug', priority:'High', queue:'FX', reason:'Systematic FX rate lag, small per item but repeated. High is appropriate.', confidence:'High'}},
    {key:'FIN-107', type:'Bug', priority:'Medium', severity:'Major', status:'To Do', summary:'14 transactions from 9 Nov were presented twice in the 15 Nov file', assignee:'Ops lead', component:'Exceptions', requirement:'BR-REC-01', story:'FIN-102',
      steps:['Search the 15 Nov settlement file for references already cleared on 9 Nov.'],
      expected:'Duplicate presentments are flagged as duplicates and do not look like new sales.',
      actual:'14 items reappear as unmatched sales. The job does not check previously cleared references.',
      tests:['TC-REC-06'],
      history:[{date:'16 Nov 2026', author:'Ops analyst', event:'Spotted during manual investigation of late items.'}],
      signoff:{state:'Pending'},
      ai:{type:'Bug', priority:'High', queue:'Exceptions', reason:'Suggested High: duplicate presentments can be paid twice if they are worked as new sales.', confidence:'Medium'}},
    {key:'FIN-108', type:'Task', priority:'Medium', status:'In Progress', summary:'Write the 15 Nov investigation note for operations', assignee:'Rina (BA)', component:'UAT', requirement:'BR-REC-01', story:'FIN-102', tests:[], history:[{date:'16 Nov 2026', author:'Rina (BA)', event:'Note started: fees not ingested, FX lag, duplicates, residual late presentments.'}], signoff:{state:'Pending'}, ai:{type:'Task', priority:'Medium', queue:'UAT', reason:'Documentation task for the open critical run.', confidence:'High'}},
    {key:'FIN-109', type:'Bug', priority:'Low', severity:'Minor', status:'Done', summary:'Daily report header showed UTC instead of MYT', assignee:'Dev', component:'Reporting', requirement:'BR-REC-01', story:'FIN-101',
      steps:['Open the daily summary PDF and check the run timestamp.'],
      expected:'The header shows Malaysia Time.',
      actual:'The header showed UTC, which made a 09:50 MYT run look like 01:50.',
      tests:['TC-REC-01'],
      history:[{date:'4 Nov 2026', author:'Ops lead', event:'Logged as a presentation issue.'},{date:'6 Nov 2026', author:'Daniel (QA)', event:'Retest passed. Closed.'}],
      signoff:{state:'Signed off', by:'Payments operations', date:'6 Nov 2026'},
      ai:{type:'Bug', priority:'Low', queue:'Reporting', reason:'Display-only, already closed.', confidence:'High'}}
  ],
  tests:[
    {id:'TC-REC-01', title:'Happy-path items match on reference, amount and scheme date', story:'FIN-101', requirement:'BR-REC-01', result:'Pass', defect:'', notes:'Passed 11 Nov 2026. Header time retest also passed.'},
    {id:'TC-REC-02', title:'Daily summary ties or explains the full difference', story:'FIN-101', requirement:'BR-REC-01', result:'Fail', defect:'FIN-104', notes:'8,220.40 difference, only 1,140.00 listed.'},
    {id:'TC-REC-03', title:'Unmatched items have a category and default owner', story:'FIN-102', requirement:'BR-REC-01', result:'Fail', defect:'FIN-104', notes:'Residual 7,080.40 has no category.'},
    {id:'TC-REC-04', title:'Scheme fee file is included in the 10:00 run', story:'FIN-103', requirement:'BR-REC-01', result:'Fail', defect:'FIN-105', notes:'Fee file present but not ingested.'},
    {id:'TC-REC-05', title:'Foreign-currency items use the scheme date FX rate', story:'FIN-101', requirement:'BR-REC-01', result:'Fail', defect:'FIN-106', notes:'Previous day rate used for SGD items.'},
    {id:'TC-REC-06', title:'Previously cleared references are flagged as duplicates', story:'FIN-102', requirement:'BR-REC-01', result:'Fail', defect:'FIN-107', notes:'14 items from 9 Nov reappeared.'},
    {id:'TC-REC-07', title:'Run completes before the 10:00 MYT operations cut-off', story:'FIN-101', requirement:'BR-REC-01', result:'Not run', defect:'', notes:'Timed run booked after the ingest fix.'}
  ],
  release:{
    name:'Daily reconciliation, operations UAT window', target:'21 Nov 2026',
    decision:'No-go', decisionKey:'nogo',
    rationale:'The 15 Nov run does not tie and most of the difference is not yet in the exception queue. Operations should keep the existing manual workbook until fee ingest, FX rate and duplicate checks are retested.',
    conditions:['FIN-104 difference fully categorised','FIN-105 fee ingest retested','FIN-106 and FIN-107 retested','Two consecutive daily runs tie in UAT'],
    checklist:[
      {item:'Requirements v2.0 agreed with operations', state:'ok', notes:'Agreed 12 Aug 2026.'},
      {item:'Critical reconciliation defects closed', state:'bad', notes:'FIN-104 and the related fee ingest are open.'},
      {item:'UAT exit: two consecutive tying runs', state:'bad', notes:'Not yet started, waiting on fixes.'},
      {item:'Manual workbook remains the fallback', state:'ok', notes:'Still in use for the morning run.'},
      {item:'Hypercare roster for the first week after switchover', state:'ok', notes:'BA, integration and ops lead.'}
    ],
    hypercare:{window:'First five business days after switchover, from 08:30 MYT until the morning run is accepted', channel:'Operations chat and a 09:30 exception call', exit:'Two consecutive tying business days with no new critical exception-category defect.'}
  },
  risks:[
    {id:'R-1', title:'If fee ingest slips, operations will keep seeing a daily unexplained difference.', severity:'High', status:'Open', mitigation:'Treat FIN-105 as part of the FIN-104 blocker set.'},
    {id:'R-2', title:'Duplicate presentments could be treated as new sales.', severity:'High', status:'Open', mitigation:'Add a previously-cleared reference check before the next UAT run.'},
    {id:'R-3', title:'FX lag may also affect other currencies not in the first sample.', severity:'Medium', status:'Open', mitigation:'Extend TC-REC-05 to USD and EUR items.'}
  ],
  trend:[
    {sprint:'Sprint 28', blocker:0, critical:0, major:3, minor:3},
    {sprint:'Sprint 29', blocker:0, critical:1, major:2, minor:2},
    {sprint:'Sprint 30', blocker:0, critical:1, major:3, minor:2},
    {sprint:'Sprint 31', blocker:1, critical:1, major:2, minor:1}
  ]
};


SCENARIOS.mdm = {
  id:'mdm', prefix:'MDM', title:'Master Data Management',
  blurb:'Duplicate customer and partner records',
  org:'Meridian Distribution (fictional wholesaler)',
  sprint:'Sprint 12 · 3–14 Nov 2026',
  context:'Meridian is cleaning customer and partner records before a CRM refresh. The same company often appears twice: once under a trading name and once under the legal name, sometimes with the same tax ID. The BA defines match rules, an exception list and a survivorship proposal. Operations confirm which record survives. This lab does not merge live records on its own.',
  brd:{
    id:'BR-MDM-01', version:'1.1', date:'5 Sep 2026',
    title:'Customer and partner duplicate detection before the CRM refresh',
    excerpt:'The data quality workbench must flag potential duplicate customer and partner records. A definite match is the same tax ID on two active records. A suspected match is a name that is identical once punctuation and company suffixes are removed, or a name similarity of at least 85% in the same country. Each pair is listed with a proposed surviving record and the fields that differ, for operations to confirm.',
    objective:'Give operations a complete, reviewed list of duplicate pairs so the CRM refresh does not carry two active records for the same company.',
    inScope:['Tax ID and name-similarity match rules','Exception list with a proposed surviving record','Field-difference view (address, trading name, tax ID)','UAT against a synthetic extract'],
    outOfScope:['Automatic merge in production without an operations confirmation','Supplier records outside the customer/partner extract','A new MDM platform implementation'],
    stakeholders:['Master data operations','Sales operations','Business analyst','QA']
  },
  epic:{key:'MDM-100', title:'Detect and review duplicate customer and partner records', text:'Flag definite and suspected duplicates, propose a surviving record and collect operations confirmation before the CRM refresh.'},
  stories:[
    {key:'MDM-101', title:'Flag definite matches on tax ID', asA:'master data analyst', want:'two active records with the same tax ID to be flagged as a definite match', soThat:'these pairs are reviewed first', ac:['Same tax ID on two active records produces a definite-match pair','Inactive records are excluded from the daily list','The pair shows both record IDs and the conflicting fields'], status:'In UAT'},
    {key:'MDM-102', title:'Flag suspected matches on cleaned name and country', asA:'master data analyst', want:'near-duplicate names in the same country to appear as suspected matches', soThat:'typo and trading-name variants are not missed', ac:['Punctuation and suffixes such as Sdn Bhd, Pte Ltd and Ltd are ignored in the name comparison','Similarity of at least 85% in the same country is a suspected match','Different countries with the same trading name are not auto-flagged'], status:'In Progress'},
    {key:'MDM-103', title:'Propose a surviving record for each pair', asA:'operations lead', want:'each pair to carry a proposed surviving record and a field-difference view', soThat:'confirmation can be done without opening both records from scratch', ac:['Default survivor is the record with the most complete required fields, then the oldest create date','Differences in address, trading name and tax ID are listed','No merge is performed until operations confirm the pair'], status:'To Do'}
  ],
  issues:[
    {key:'MDM-101', type:'Story', priority:'High', status:'In UAT', summary:'Flag definite matches on tax ID', assignee:'Hana (BA)', component:'Matching', requirement:'BR-MDM-01', story:'MDM-101', tests:['TC-MDM-01','TC-MDM-02'], history:[{date:'5 Nov 2026', author:'Hana (BA)', event:'Tax ID rule in UAT. Found a pair that the rule missed because of spacing.'}], signoff:{state:'Pending'}, ai:{type:'Story', priority:'High', queue:'Matching', reason:'Lead story for the definite-match queue.', confidence:'High'}},
    {key:'MDM-102', type:'Story', priority:'High', status:'In Progress', summary:'Flag suspected matches on cleaned name and country', assignee:'Dev', component:'Matching', requirement:'BR-MDM-01', story:'MDM-102', tests:['TC-MDM-03'], history:[{date:'8 Nov 2026', author:'Dev', event:'Suffix stripping in progress.'}], signoff:{state:'Pending'}, ai:{type:'Story', priority:'High', queue:'Matching', reason:'Needed to catch trading-name variants.', confidence:'High'}},
    {key:'MDM-103', type:'Story', priority:'Medium', status:'To Do', summary:'Propose a surviving record for each pair', assignee:'Hana (BA)', component:'Survivorship', requirement:'BR-MDM-01', story:'MDM-103', tests:['TC-MDM-05'], history:[{date:'3 Nov 2026', author:'Hana (BA)', event:'Rules agreed with operations, development not started.'}], signoff:{state:'Pending'}, ai:{type:'Story', priority:'Medium', queue:'Survivorship', reason:'Depends on a stable pair list from the match rules.', confidence:'Medium'}},
    {key:'MDM-104', type:'Bug', priority:'Critical', severity:'Blocker', status:'In Progress', summary:'Two active partners share tax ID C1234567890 and both can place orders', assignee:'Hana (BA)', component:'Matching', requirement:'BR-MDM-01', story:'MDM-101',
      steps:['In the UAT extract, search for tax ID C1234567890.','Confirm both partner records are active and able to place an order in the sample workflow.','Run the definite-match job and check whether the pair is listed.'],
      expected:'The two records are flagged as a definite match and appear at the top of the review list. Only one should remain active after operations confirm a survivor.',
      actual:'The job lists no pair. One record stores the tax ID as C1234567890 and the other as C 1234567890 (with a space). Both are active and both placed a sample order.',
      tests:['TC-MDM-02'],
      history:[{date:'6 Nov 2026', author:'Ops analyst', event:'Spotted when two order documents arrived for the same legal entity.'},{date:'6 Nov 2026', author:'Hana (BA)', event:'Confirmed the tax ID values differ only by a space. Logged as a blocker for the definite-match rule.'},{date:'9 Nov 2026', author:'Dev', event:'Fix in progress: strip spaces and punctuation from tax IDs before compare.'}],
      signoff:{state:'Pending', note:'Operations will confirm the surviving partner after the pair appears on the list. No live merge is done in this lab.'},
      ai:{type:'Bug', priority:'Critical', queue:'Matching', reason:'Two active records for the same tax ID, missed because of formatting, and both can order. This is a blocker for the refresh.', confidence:'High'}},
    {key:'MDM-105', type:'Bug', priority:'High', severity:'Major', status:'In UAT', summary:'Trading name "Meridian Dist." is not matched to "Meridian Distribution Sdn Bhd"', assignee:'Wei (QA)', component:'Matching', requirement:'BR-MDM-01', story:'MDM-102',
      steps:['Run the suspected-match job on the UAT extract.','Look for the pair Meridian Dist. and Meridian Distribution Sdn Bhd, same country, no tax ID on the short name.'],
      expected:'The pair is listed as a suspected match after suffix and punctuation cleaning.',
      actual:'The pair is absent. Suffix stripping does not treat "Dist." as "Distribution", so similarity stays below 85%.',
      tests:['TC-MDM-03'],
      history:[{date:'8 Nov 2026', author:'Wei (QA)', event:'Failed TC-MDM-03. A short abbreviation list was agreed with operations and passed to development.'}],
      signoff:{state:'Pending'},
      ai:{type:'Bug', priority:'High', queue:'Matching', reason:'A known trading-name variant is missed. High, because this is a common pattern in the extract.', confidence:'High'}},
    {key:'MDM-106', type:'Bug', priority:'High', severity:'Major', status:'To Do', summary:'Bill-to and ship-to records for the same customer are flagged as duplicates', assignee:'Hana (BA)', component:'Matching', requirement:'BR-MDM-01', story:'MDM-102',
      steps:['Run the job on a customer that has a bill-to and a ship-to record with the same tax ID and different site types.'],
      expected:'Site-type pairs (bill-to versus ship-to) are not treated as duplicates when both are valid sites of one customer.',
      actual:'They are flagged as a definite match and the proposed survivor would retire a valid ship-to site.',
      tests:['TC-MDM-04'],
      history:[{date:'10 Nov 2026', author:'Sales operations', event:'Raised in the UAT walkthrough. Site type should be part of the match key.'}],
      signoff:{state:'Pending'},
      ai:{type:'Bug', priority:'High', queue:'Matching', reason:'False-positive definite matches would retire valid sites if someone confirmed them in bulk.', confidence:'High'}},
    {key:'MDM-107', type:'Bug', priority:'Medium', severity:'Minor', status:'To Do', summary:'Proposed survivor prefers a newer, emptier record over an older complete one', assignee:'Dev', component:'Survivorship', requirement:'BR-MDM-01', story:'MDM-103',
      steps:['Open a definite-match pair where the older record has address and tax ID, and the newer record has only a trading name.'],
      expected:'The older, more complete record is proposed as the survivor.',
      actual:'The newer record is proposed because the rule currently uses last-updated date only.',
      tests:['TC-MDM-05'],
      history:[{date:'11 Nov 2026', author:'Hana (BA)', event:'Logged against the survivorship story, which is still in To Do.'}],
      signoff:{state:'Pending'},
      ai:{type:'Bug', priority:'Medium', queue:'Survivorship', reason:'Wrong default survivor, but still a proposal, not an automatic merge.', confidence:'Medium'}},
    {key:'MDM-108', type:'Task', priority:'Medium', status:'In Progress', summary:'Prepare the operations review pack of the top 25 pairs', assignee:'Hana (BA)', component:'UAT', requirement:'BR-MDM-01', story:'MDM-101', tests:[], history:[{date:'10 Nov 2026', author:'Hana (BA)', event:'Pack started; waiting on the tax ID normalisation fix so the top pair is included.'}], signoff:{state:'Pending'}, ai:{type:'Task', priority:'Medium', queue:'UAT', reason:'Review pack for operations, tied to the open blocker.', confidence:'High'}},
    {key:'MDM-109', type:'Bug', priority:'Low', severity:'Minor', status:'Done', summary:'Exception list exported with a trailing blank column', assignee:'Dev', component:'Reporting', requirement:'BR-MDM-01', story:'MDM-101',
      steps:['Export the exception list to CSV and open it in a spreadsheet.'],
      expected:'Columns match the agreed heading list.',
      actual:'A blank column appeared at the end and shifted one heading in some spreadsheet tools.',
      tests:['TC-MDM-06'],
      history:[{date:'2 Nov 2026', author:'Wei (QA)', event:'Logged and fixed in the next build.'},{date:'4 Nov 2026', author:'Wei (QA)', event:'Retest passed. Closed.'}],
      signoff:{state:'Signed off', by:'Master data operations', date:'4 Nov 2026'},
      ai:{type:'Bug', priority:'Low', queue:'Reporting', reason:'Export formatting, already closed.', confidence:'High'}}
  ],
  tests:[
    {id:'TC-MDM-01', title:'Inactive records are excluded from the daily match list', story:'MDM-101', requirement:'BR-MDM-01', result:'Pass', defect:'', notes:'Passed 5 Nov 2026.'},
    {id:'TC-MDM-02', title:'Same tax ID with spacing differences is a definite match', story:'MDM-101', requirement:'BR-MDM-01', result:'Fail', defect:'MDM-104', notes:'Space in the tax ID hid the pair.'},
    {id:'TC-MDM-03', title:'Trading-name abbreviation is a suspected match', story:'MDM-102', requirement:'BR-MDM-01', result:'Fail', defect:'MDM-105', notes:'Dist. not expanded.'},
    {id:'TC-MDM-04', title:'Bill-to and ship-to sites of one customer are not treated as duplicates', story:'MDM-102', requirement:'BR-MDM-01', result:'Fail', defect:'MDM-106', notes:'False-positive definite match.'},
    {id:'TC-MDM-05', title:'Proposed survivor is the more complete, then older, record', story:'MDM-103', requirement:'BR-MDM-01', result:'Fail', defect:'MDM-107', notes:'Last-updated date used instead.'},
    {id:'TC-MDM-06', title:'Exception list export uses the agreed headings', story:'MDM-101', requirement:'BR-MDM-01', result:'Retest pass', defect:'MDM-109', notes:'Passed 4 Nov 2026.'},
    {id:'TC-MDM-07', title:'No merge runs until operations confirm the pair', story:'MDM-103', requirement:'BR-MDM-01', result:'Not run', defect:'', notes:'Story still in To Do.'}
  ],
  release:{
    name:'Duplicate-review workbench, UAT drop 12.2', target:'14 Nov 2026',
    decision:'Conditional go', decisionKey:'conditional',
    rationale:'The workbench can go to a limited operations pilot for name-based review, but definite tax ID matches must be fixed first (MDM-104). Automatic proposals that would retire ship-to sites should be switched off for the pilot.',
    conditions:['MDM-104 retested and passed','Ship-to false positives (MDM-106) excluded from the pilot list','Operations review pack of 25 pairs issued','No automatic merge in the pilot'],
    checklist:[
      {item:'Match rules agreed with operations', state:'ok', notes:'v1.1 agreed 5 Sep 2026.'},
      {item:'Blocker defects closed', state:'bad', notes:'MDM-104 still open.'},
      {item:'UAT exit for definite matches', state:'bad', notes:'TC-MDM-02 failed.'},
      {item:'Pilot scope limited to a review list, no automatic merge', state:'ok', notes:'Written into the go note.'},
      {item:'Rollback is to withdraw the pilot list and keep the current CRM records as they are', state:'ok', notes:'No production merge is planned in this drop.'},
      {item:'Hypercare for the two-week pilot', state:'ok', notes:'BA and master data operations on a daily 20-minute call.'}
    ],
    hypercare:{window:'Two-week operations pilot, business days 10:00–16:00 MYT', channel:'Daily pair-review call and a shared comment column on the list', exit:'Tax ID rule passing in UAT, and no further false-positive definite match found in the pilot sample.'}
  },
  risks:[
    {id:'R-1', title:'If tax ID formatting is not normalised, more definite matches will be missed.', severity:'High', status:'Open', mitigation:'Strip spaces and punctuation before compare, then replay the full extract.'},
    {id:'R-2', title:'False-positive site matches could retire a valid ship-to if a pilot user confirms in bulk.', severity:'High', status:'Open', mitigation:'Exclude those pairs from the pilot list until MDM-106 is fixed.'},
    {id:'R-3', title:'Abbreviation list may need a second pass after the first pilot week.', severity:'Medium', status:'Open', mitigation:'Collect missed pairs from operations and extend the list in Sprint 13.'}
  ],
  trend:[
    {sprint:'Sprint 9', blocker:0, critical:1, major:2, minor:4},
    {sprint:'Sprint 10', blocker:0, critical:1, major:3, minor:3},
    {sprint:'Sprint 11', blocker:1, critical:1, major:2, minor:2},
    {sprint:'Sprint 12', blocker:1, critical:0, major:3, minor:2}
  ]
};


SCENARIOS.ecom = {
  id:'ecom', prefix:'ECOM', title:'E-commerce',
  blurb:'Order fulfilment integration failure',
  org:'Willow & Co Retail (fictional retailer)',
  sprint:'Sprint 9 · 10–21 Nov 2026',
  context:'Willow & Co takes paid online orders and sends them to a warehouse management system for fulfilment. In UAT, some paid orders stay on Awaiting fulfilment after the warehouse API returns a timeout. A retry then decrements stock twice. The BA is tracing the order, the integration and the stock movement, and logging defects for engineering and QA.',
  brd:{
    id:'BR-FUL-01', version:'1.0', date:'22 Sep 2026',
    title:'Paid-order fulfilment hand-off to the warehouse',
    excerpt:'When an online order is paid, the commerce platform must send it to the warehouse system within two minutes, set the order status to Sent to warehouse, and reserve stock once. If the warehouse API times out, the order is retried safely and stays on a visible exception status. Split shipments must update the order to Partially shipped until the last parcel leaves.',
    objective:'Make sure a paid customer order is either accepted by the warehouse, or visible as an exception, with stock decremented only once.',
    inScope:['Paid-order hand-off','Timeout and retry behaviour','Stock reservation and decrement','Split-shipment status updates','Shipping-label trigger for East Malaysia postcodes'],
    outOfScope:['Payment-gateway changes','Warehouse picking hardware','Returns and refunds'],
    stakeholders:['E-commerce operations','Warehouse operations','Integration team','Business analyst','QA']
  },
  epic:{key:'ECOM-100', title:'Reliable paid-order fulfilment hand-off', text:'Send paid orders to the warehouse, handle timeouts safely, keep stock accurate and update shipment status, including split parcels.'},
  stories:[
    {key:'ECOM-101', title:'Paid orders are sent to the warehouse within two minutes', asA:'e-commerce operations analyst', want:'paid orders to be handed off quickly and visibly', soThat:'the warehouse can pick the same day', ac:['A paid order is sent within two minutes','Status becomes Sent to warehouse on acceptance','A warehouse timeout sets a visible exception status, not Awaiting fulfilment'], status:'In UAT'},
    {key:'ECOM-102', title:'Retries must not decrement stock twice', asA:'inventory lead', want:'a retried hand-off to reserve or decrement stock only once', soThat:'sellable stock stays accurate', ac:['A timeout followed by a successful retry results in a single stock decrement','The order carries one warehouse reference'], status:'In Progress'},
    {key:'ECOM-103', title:'Split shipments update the order status', asA:'customer operations agent', want:'a split shipment to show Partially shipped until the last parcel leaves', soThat:'the customer-facing status is honest', ac:['First parcel shipped sets Partially shipped','Last parcel shipped sets Shipped','The order shows both tracking numbers'], status:'To Do'}
  ],
  issues:[
    {key:'ECOM-101', type:'Story', priority:'High', status:'In UAT', summary:'Paid orders are sent to the warehouse within two minutes', assignee:'Jason (BA)', component:'Integration', requirement:'BR-FUL-01', story:'ECOM-101', tests:['TC-FUL-01','TC-FUL-02'], history:[{date:'11 Nov 2026', author:'Jason (BA)', event:'Happy path passed. Timeout cases failed.'}], signoff:{state:'Pending'}, ai:{type:'Story', priority:'High', queue:'Integration', reason:'Core hand-off story with an open blocker underneath.', confidence:'High'}},
    {key:'ECOM-102', type:'Story', priority:'High', status:'In Progress', summary:'Retries must not decrement stock twice', assignee:'Dev', component:'Stock', requirement:'BR-FUL-01', story:'ECOM-102', tests:['TC-FUL-03'], history:[{date:'13 Nov 2026', author:'Dev', event:'Idempotency key design started after ECOM-105 was logged.'}], signoff:{state:'Pending'}, ai:{type:'Story', priority:'High', queue:'Stock', reason:'Tied to the double-decrement defect.', confidence:'High'}},
    {key:'ECOM-103', type:'Story', priority:'Medium', status:'To Do', summary:'Split shipments update the order status', assignee:'Jason (BA)', component:'Status', requirement:'BR-FUL-01', story:'ECOM-103', tests:['TC-FUL-04'], history:[{date:'10 Nov 2026', author:'Jason (BA)', event:'Held until the main hand-off is stable.'}], signoff:{state:'Pending'}, ai:{type:'Story', priority:'Medium', queue:'Status', reason:'Important for customer-facing status, currently queued behind the timeout blocker.', confidence:'Medium'}},
    {key:'ECOM-104', type:'Bug', priority:'Critical', severity:'Blocker', status:'In Progress', summary:'Paid orders stay on Awaiting fulfilment after a warehouse API 504', assignee:'Dev', component:'Integration', requirement:'BR-FUL-01', story:'ECOM-101',
      steps:['Place a paid UAT order for an in-stock item.','Simulate a 504 timeout from the warehouse API.','Wait three minutes and inspect the order status, integration log and warehouse inbox.'],
      expected:'The order moves to a visible exception status such as Fulfilment error, is retried, and is not left on Awaiting fulfilment as if nothing happened.',
      actual:'The order stays on Awaiting fulfilment. The log shows the 504, but no exception status is set and operations cannot see it on the exception board. The warehouse never received the order.',
      tests:['TC-FUL-02'],
      history:[{date:'12 Nov 2026, 11:20', author:'Mei (QA)', event:'Logged during timeout UAT. Order 2,014 in the UAT shop.'},{date:'12 Nov 2026, 15:40', author:'Jason (BA)', event:'Reproduced on two further orders. Raised to Critical: paid orders can sit unnoticed.'},{date:'13 Nov 2026, 10:05', author:'Integration', event:'Timeout is caught, but the status update step is skipped when the response body is empty.'}],
      signoff:{state:'Pending', note:'E-commerce operations will sign off after a timeout case is visible on the exception board and the warehouse eventually receives the order.'},
      ai:{type:'Bug', priority:'Critical', queue:'Integration', reason:'Paid orders stall in a normal status after a 504, so operations cannot see the failure. This is a fulfilment blocker.', confidence:'High'}},
    {key:'ECOM-105', type:'Bug', priority:'High', severity:'Critical', status:'To Do', summary:'A retry after a timeout decrements stock twice', assignee:'Dev', component:'Stock', requirement:'BR-FUL-01', story:'ECOM-102',
      steps:['Use a paid order that first received a 504.','Allow the automatic retry to succeed.','Check the stock movement for the SKU and the warehouse references on the order.'],
      expected:'Stock is decremented once and the order has one warehouse reference.',
      actual:'Stock is decremented twice and the order has two warehouse references. Sellable quantity is understated by the order quantity.',
      tests:['TC-FUL-03'],
      history:[{date:'13 Nov 2026', author:'Mei (QA)', event:'Found while retesting a recovered timeout order.'}],
      signoff:{state:'Pending'},
      ai:{type:'Bug', priority:'Critical', queue:'Stock', reason:'Suggested Critical: inventory is wrong after a routine retry, which can oversell.', confidence:'High'}},
    {key:'ECOM-106', type:'Bug', priority:'High', severity:'Major', status:'To Do', summary:'Split shipments never move the order to Partially shipped', assignee:'Jason (BA)', component:'Status', requirement:'BR-FUL-01', story:'ECOM-103',
      steps:['Place a two-line order that the warehouse will split into two parcels.','Ship the first parcel only and refresh the order.'],
      expected:'Status is Partially shipped and the first tracking number is visible.',
      actual:'Status stays Sent to warehouse. The first tracking number is in the warehouse event but is not written to the order.',
      tests:['TC-FUL-04'],
      history:[{date:'14 Nov 2026', author:'Customer operations', event:'Raised in a UAT walkthrough with a split-parcel fixture.'}],
      signoff:{state:'Pending'},
      ai:{type:'Bug', priority:'High', queue:'Status', reason:'Customer-facing status is wrong on split parcels. High, not a full hand-off blocker.', confidence:'High'}},
    {key:'ECOM-107', type:'Bug', priority:'Medium', severity:'Major', status:'In UAT', summary:'Shipping labels are not generated for Sabah and Sarawak postcodes', assignee:'Mei (QA)', component:'Labels', requirement:'BR-FUL-01', story:'ECOM-101',
      steps:['Place a paid order with a Kota Kinabalu or Kuching postcode.','Accept the order in the warehouse UAT and request a label.'],
      expected:'A shipping label is generated for the East Malaysia carrier service.',
      actual:'Label generation fails with "service not available for postcode". West Malaysia postcodes succeed.',
      tests:['TC-FUL-05'],
      history:[{date:'14 Nov 2026', author:'Mei (QA)', event:'Logged with two East Malaysia fixtures.'},{date:'15 Nov 2026', author:'Integration', event:'Carrier service map in UAT is missing the East Malaysia service codes. Fix in the next build.'}],
      signoff:{state:'Pending'},
      ai:{type:'Bug', priority:'Medium', queue:'Labels', reason:'Regional label gap, confined to East Malaysia postcodes. Medium is fair if a manual label workaround exists; watch volume at go-live.', confidence:'Medium'}},
    {key:'ECOM-108', type:'Task', priority:'Medium', status:'To Do', summary:'Document the operations exception board and timeout playbook', assignee:'Jason (BA)', component:'UAT', requirement:'BR-FUL-01', story:'ECOM-101', tests:[], history:[{date:'12 Nov 2026', author:'Jason (BA)', event:'Task opened after ECOM-104. Playbook depends on the exception status existing.'}], signoff:{state:'Pending'}, ai:{type:'Task', priority:'Medium', queue:'UAT', reason:'Playbook task, blocked by the missing exception status.', confidence:'High'}},
    {key:'ECOM-109', type:'Bug', priority:'Low', severity:'Minor', status:'Done', summary:'Exception board default date range was UTC, hiding same-day MYT orders', assignee:'Dev', component:'Reporting', requirement:'BR-FUL-01', story:'ECOM-101',
      steps:['Open the exception board at 09:00 MYT and look for orders created after midnight local time.'],
      expected:'Same-day Malaysia orders are included by default.',
      actual:'The default "today" filter used UTC, so early-morning MYT orders were missing until the filter was widened.',
      tests:['TC-FUL-06'],
      history:[{date:'3 Nov 2026', author:'Ops analyst', event:'Logged and corrected to MYT.'},{date:'4 Nov 2026', author:'Mei (QA)', event:'Retest passed. Closed.'}],
      signoff:{state:'Signed off', by:'E-commerce operations', date:'4 Nov 2026'},
      ai:{type:'Bug', priority:'Low', queue:'Reporting', reason:'Filter default, already closed.', confidence:'High'}}
  ],
  tests:[
    {id:'TC-FUL-01', title:'A paid in-stock order is accepted by the warehouse within two minutes', story:'ECOM-101', requirement:'BR-FUL-01', result:'Pass', defect:'', notes:'Passed 11 Nov 2026 on the happy path.'},
    {id:'TC-FUL-02', title:'A warehouse 504 sets a visible exception status', story:'ECOM-101', requirement:'BR-FUL-01', result:'Fail', defect:'ECOM-104', notes:'Order stays on Awaiting fulfilment.'},
    {id:'TC-FUL-03', title:'A successful retry decrements stock only once', story:'ECOM-102', requirement:'BR-FUL-01', result:'Fail', defect:'ECOM-105', notes:'Stock decremented twice.'},
    {id:'TC-FUL-04', title:'First parcel of a split shipment sets Partially shipped', story:'ECOM-103', requirement:'BR-FUL-01', result:'Fail', defect:'ECOM-106', notes:'Status unchanged, tracking not written.'},
    {id:'TC-FUL-05', title:'A label is generated for a Kota Kinabalu postcode', story:'ECOM-101', requirement:'BR-FUL-01', result:'Fail', defect:'ECOM-107', notes:'Service map missing East Malaysia codes.'},
    {id:'TC-FUL-06', title:'Exception board default range uses Malaysia Time', story:'ECOM-101', requirement:'BR-FUL-01', result:'Retest pass', defect:'ECOM-109', notes:'Passed 4 Nov 2026.'},
    {id:'TC-FUL-07', title:'Last parcel of a split shipment sets Shipped', story:'ECOM-103', requirement:'BR-FUL-01', result:'Not run', defect:'', notes:'Waiting on ECOM-106.'}
  ],
  release:{
    name:'Fulfilment hand-off, UAT drop 9.3', target:'21 Nov 2026',
    decision:'No-go', decisionKey:'nogo',
    rationale:'Paid orders can stall after a warehouse timeout, and a retry can decrement stock twice. A go-live would put paid customers and inventory at risk. East Malaysia labels and split-shipment status can follow, but not ahead of the timeout path.',
    conditions:['ECOM-104 retested with a visible exception status','ECOM-105 retested with a single stock movement','Exception board used in a live UAT walkthrough with operations','Playbook published'],
    checklist:[
      {item:'Requirements v1.0 agreed', state:'ok', notes:'Agreed 22 Sep 2026.'},
      {item:'Blocker and critical fulfilment defects closed', state:'bad', notes:'ECOM-104 and ECOM-105 are open.'},
      {item:'UAT exit for timeout and retry', state:'bad', notes:'TC-FUL-02 and TC-FUL-03 failed.'},
      {item:'Rollback is to pause new online orders and raise warehouse tickets by hand', state:'ok', notes:'Documented, not desirable, but available.'},
      {item:'Hypercare roster for peak trading hours', state:'warn', notes:'Roster drafted, start date on hold.'}
    ],
    hypercare:{window:'Seven days after go-live, including weekend trading hours', channel:'Operations chat, warehouse voice bridge, and a mid-morning exception review', exit:'No new blocker timeout or double-decrement defect for three consecutive trading days.'}
  },
  risks:[
    {id:'R-1', title:'A production 504 could leave paid orders invisible to operations.', severity:'High', status:'Open', mitigation:'Do not go live until the exception status is proven in UAT.'},
    {id:'R-2', title:'Double stock decrement will understate sellable quantity and can oversell.', severity:'High', status:'Open', mitigation:'Add an idempotency key to the hand-off before the next retry test.'},
    {id:'R-3', title:'East Malaysia orders may need a manual label workaround at launch.', severity:'Medium', status:'Open', mitigation:'Carrier service map in the next build; manual label step documented as fallback.'}
  ],
  trend:[
    {sprint:'Sprint 6', blocker:0, critical:1, major:2, minor:3},
    {sprint:'Sprint 7', blocker:1, critical:1, major:3, minor:2},
    {sprint:'Sprint 8', blocker:1, critical:2, major:2, minor:2},
    {sprint:'Sprint 9', blocker:1, critical:1, major:2, minor:1}
  ]
};


SCENARIOS.da = {
  id:'da', prefix:'DA', title:'Digital Assets',
  blurb:'Wallet and ledger balance mismatch',
  org:'Amber Ledger Services (fictional digital-asset operations firm)',
  sprint:'Sprint 6 · 10–21 Nov 2026',
  context:'Amber keeps a wallet control balance and a customer operations ledger. On 14 Nov 2026 the wallet control balance is 70.00 units higher than the sum of customer ledgers. The BA is reconciling the two, grouping exceptions (unconfirmed deposit, missing memo or tag, unrecorded network fee) and logging defects. Figures are synthetic. This is not financial, investment, legal or tax advice, and this lab does not move funds.',
  brd:{
    id:'BR-WAL-01', version:'1.0', date:'1 Oct 2026',
    title:'Daily wallet control to customer-ledger reconciliation',
    excerpt:'Each business day, the operations team reconciles the wallet control balance with the sum of customer operations ledgers. Differences are itemised. Expected categories include unconfirmed deposits, incoming transfers with a missing memo or destination tag, network fees not yet recorded on the customer ledger, and timing differences inside an agreed window. The report is for investigation. It does not instruct a transfer.',
    objective:'Give operations a same-day explanation of any gap between the wallet control balance and customer ledgers, with each unit of difference categorised or marked for investigation.',
    inScope:['Daily control-to-ledger comparison','Exception categories and an investigation list','UAT with a synthetic wallet and ledger extract','A research-style note of open items'],
    outOfScope:['Moving customer funds','Investment or trading advice','Production wallet administration','Price prediction or portfolio management'],
    stakeholders:['Digital asset operations','Business analyst','QA','Engineering']
  },
  epic:{key:'DA-100', title:'Daily wallet and ledger reconciliation', text:'Compare the wallet control balance with customer ledgers, categorise every difference and keep unconfirmed or untagged items visible.'},
  stories:[
    {key:'DA-101', title:'Daily control balance compared with customer ledgers', asA:'operations analyst', want:'a daily comparison of the wallet control balance and the ledger sum', soThat:'a gap is visible before the end of the day', ac:['The report shows both totals and the difference','The difference equals the sum of listed exceptions, or a residual is marked unexplained','The run can be repeated on a synthetic extract in UAT'], status:'In UAT'},
    {key:'DA-102', title:'Incoming transfers with a missing memo or tag are parked', asA:'operations analyst', want:'untagged incoming transfers to be parked as exceptions', soThat:'they are not applied to a customer by guesswork', ac:['A missing memo or destination tag creates a parked exception','The parked amount is part of the daily difference','The item stays parked until an operations user assigns it with a note'], status:'In Progress'},
    {key:'DA-103', title:'Network fees are recorded on the same day', asA:'operations analyst', want:'network fees deducted at the wallet to appear on the operations ledger the same day', soThat:'fees do not look like a missing customer balance', ac:['Each outbound fee in the wallet extract has a same-day fee line on the ledger','Unrecorded fees appear as a fee exception, not an unexplained residual'], status:'To Do'}
  ],
  issues:[
    {key:'DA-101', type:'Story', priority:'High', status:'In UAT', summary:'Daily control balance compared with customer ledgers', assignee:'Lina (BA)', component:'Reconciliation', requirement:'BR-WAL-01', story:'DA-101', tests:['TC-WAL-01','TC-WAL-02'], history:[{date:'11 Nov 2026', author:'Lina (BA)', event:'Happy-path equal balances pass. The 14 Nov fixture does not tie.'}], signoff:{state:'Pending'}, ai:{type:'Story', priority:'High', queue:'Reconciliation', reason:'Core daily story with an open control-gap blocker.', confidence:'High'}},
    {key:'DA-102', type:'Story', priority:'High', status:'In Progress', summary:'Incoming transfers with a missing memo or tag are parked', assignee:'Dev', component:'Exceptions', requirement:'BR-WAL-01', story:'DA-102', tests:['TC-WAL-03'], history:[{date:'13 Nov 2026', author:'Dev', event:'Parking flow in development after DA-105 was logged.'}], signoff:{state:'Pending'}, ai:{type:'Story', priority:'High', queue:'Exceptions', reason:'Explains part of the 14 Nov gap.', confidence:'High'}},
    {key:'DA-103', type:'Story', priority:'Medium', status:'To Do', summary:'Network fees are recorded on the same day', assignee:'Lina (BA)', component:'Fees', requirement:'BR-WAL-01', story:'DA-103', tests:['TC-WAL-04'], history:[{date:'14 Nov 2026', author:'Lina (BA)', event:'Moved up after unrecorded fees appeared in the 14 Nov residual.'}], signoff:{state:'Pending'}, ai:{type:'Story', priority:'High', queue:'Fees', reason:'Suggested High rather than Medium while fees still sit in the unexplained residual.', confidence:'Medium'}},
    {key:'DA-104', type:'Bug', priority:'Critical', severity:'Blocker', status:'In Progress', summary:'14 Nov wallet control is 70.00 units higher than the customer ledger sum', assignee:'Lina (BA)', component:'Reconciliation', requirement:'BR-WAL-01', story:'DA-101',
      steps:['Load the synthetic 14 Nov 2026 wallet extract and the customer ledger extract.','Run the daily comparison.','Check whether the 70.00 difference is fully itemised in the exception list.'],
      expected:'The two totals match, or every unit of the 70.00 difference is listed with a category.',
      actual:'Wallet control 1,250.00 units, customer ledger sum 1,180.00 units, difference 70.00. The exception list currently shows only 15.00 of unconfirmed deposits. 55.00 remains unexplained.',
      tests:['TC-WAL-02'],
      history:[{date:'15 Nov 2026, 09:10', author:'Ops analyst', event:'Morning run on the 14 Nov fixture failed to tie.'},{date:'15 Nov 2026, 11:45', author:'Lina (BA)', event:'Reproduced. Working hypothesis: 40.00 untagged incoming, 12.00 unrecorded network fees, 3.00 still under review, plus the 15.00 already listed as unconfirmed.'},{date:'16 Nov 2026, 10:00', author:'Engineering', event:'Confirmed the job does not yet read memo or tag fields, so untagged items never become exceptions.'}],
      signoff:{state:'Pending', note:'Operations sign-off of the 14 Nov run waits on a fully itemised difference. This lab does not move funds.'},
      ai:{type:'Bug', priority:'Critical', queue:'Reconciliation', reason:'Control account and customer ledgers do not tie, and most of the gap is not in the exception list. Daily operations blocker.', confidence:'High'}},
    {key:'DA-105', type:'Bug', priority:'High', severity:'Critical', status:'To Do', summary:'Incoming transfers with a missing memo or tag never appear as parked exceptions', assignee:'Dev', component:'Exceptions', requirement:'BR-WAL-01', story:'DA-102',
      steps:['Include a 40.00 incoming transfer with a blank memo or destination tag in the wallet extract.','Run the daily job and search the exception list for a parked item.'],
      expected:'A parked exception is created for 40.00 and counted in the daily difference.',
      actual:'The 40.00 stays in the wallet control total only. It does not appear on the exception list and is not assigned to a customer.',
      tests:['TC-WAL-03'],
      history:[{date:'15 Nov 2026', author:'Lina (BA)', event:'Logged from the 14 Nov investigation.'}],
      signoff:{state:'Pending'},
      ai:{type:'Bug', priority:'Critical', queue:'Exceptions', reason:'Suggested Critical: untagged incoming value is invisible to operations and makes up most of the gap.', confidence:'High'}},
    {key:'DA-106', type:'Bug', priority:'High', severity:'Major', status:'In UAT', summary:'Network fees deducted at the wallet are missing from the operations ledger', assignee:'Mei (QA)', component:'Fees', requirement:'BR-WAL-01', story:'DA-103',
      steps:['Take the 14 Nov outbound transfers in the wallet extract.','Sum the network fees and look for same-day fee lines on the operations ledger.'],
      expected:'Each wallet fee has a same-day ledger fee line, or an unrecorded fee exception.',
      actual:'12.00 of fees are present on the wallet extract and absent from the ledger. They sit inside the unexplained residual.',
      tests:['TC-WAL-04'],
      history:[{date:'15 Nov 2026', author:'Mei (QA)', event:'Found while splitting the 70.00 difference.'}],
      signoff:{state:'Pending'},
      ai:{type:'Bug', priority:'High', queue:'Fees', reason:'Fees are a known, repeatable gap. High is right once they are visible as a category.', confidence:'High'}},
    {key:'DA-107', type:'Bug', priority:'Medium', severity:'Minor', status:'To Do', summary:'Unconfirmed deposits are included in one wallet view used by the report', assignee:'Lina (BA)', component:'Reconciliation', requirement:'BR-WAL-01', story:'DA-101',
      steps:['Compare the confirmed wallet balance with the view the report currently reads.'],
      expected:'The control total uses confirmed balances only. Unconfirmed deposits are listed separately.',
      actual:'One of the two wallet views includes a 15.00 unconfirmed deposit in the headline control total. The job can list it, but the headline is easy to misread.',
      tests:['TC-WAL-05'],
      history:[{date:'16 Nov 2026', author:'Lina (BA)', event:'Logged as a presentation issue. The 15.00 is already categorised, but the headline should show confirmed only.'}],
      signoff:{state:'Pending'},
      ai:{type:'Bug', priority:'Medium', queue:'Reporting', reason:'Categorised correctly, but the headline total can confuse a reviewer.', confidence:'Medium'}},
    {key:'DA-108', type:'Task', priority:'Medium', status:'In Progress', summary:'Write the 14 Nov investigation note with the proposed split of the 70.00', assignee:'Lina (BA)', component:'UAT', requirement:'BR-WAL-01', story:'DA-101', tests:[], history:[{date:'15 Nov 2026', author:'Lina (BA)', event:'Draft started: 15 unconfirmed, 40 untagged, 12 fees, 3 residual.'}], signoff:{state:'Pending'}, ai:{type:'Task', priority:'Medium', queue:'UAT', reason:'Investigation note for the open blocker.', confidence:'High'}},
    {key:'DA-109', type:'Bug', priority:'Low', severity:'Minor', status:'Done', summary:'Units were labelled "tokens" in the report header', assignee:'Dev', component:'Reporting', requirement:'BR-WAL-01', story:'DA-101',
      steps:['Open the daily report header and unit labels.'],
      expected:'The header uses the agreed generic label "units" for this synthetic demo.',
      actual:'The first UAT build used the word "tokens" in the header, which operations asked to change for clarity in this demo.',
      tests:['TC-WAL-01'],
      history:[{date:'5 Nov 2026', author:'Ops analyst', event:'Wording change requested.'},{date:'6 Nov 2026', author:'Mei (QA)', event:'Retest passed. Closed.'}],
      signoff:{state:'Signed off', by:'Digital asset operations', date:'6 Nov 2026'},
      ai:{type:'Bug', priority:'Low', queue:'Reporting', reason:'Wording only, already closed.', confidence:'High'}}
  ],
  tests:[
    {id:'TC-WAL-01', title:'When both extracts agree, the report shows a zero difference', story:'DA-101', requirement:'BR-WAL-01', result:'Pass', defect:'', notes:'Passed on the 10 Nov equal-balance fixture.'},
    {id:'TC-WAL-02', title:'A known 70.00 gap is fully itemised by category', story:'DA-101', requirement:'BR-WAL-01', result:'Fail', defect:'DA-104', notes:'Only 15.00 listed; 55.00 unexplained.'},
    {id:'TC-WAL-03', title:'A missing memo or tag creates a parked exception', story:'DA-102', requirement:'BR-WAL-01', result:'Fail', defect:'DA-105', notes:'40.00 incoming item not listed.'},
    {id:'TC-WAL-04', title:'Wallet network fees appear as same-day ledger fee lines or fee exceptions', story:'DA-103', requirement:'BR-WAL-01', result:'Fail', defect:'DA-106', notes:'12.00 of fees in the residual.'},
    {id:'TC-WAL-05', title:'Headline control total uses confirmed balances only', story:'DA-101', requirement:'BR-WAL-01', result:'Fail', defect:'DA-107', notes:'Unconfirmed 15.00 included in one view.'},
    {id:'TC-WAL-06', title:'The report can be rerun on the same extracts with the same result', story:'DA-101', requirement:'BR-WAL-01', result:'Pass', defect:'', notes:'Repeatable on the 10 Nov fixture.'},
    {id:'TC-WAL-07', title:'Parked items stay unassigned until an operations note is added', story:'DA-102', requirement:'BR-WAL-01', result:'Not run', defect:'', notes:'Waiting on DA-105.'}
  ],
  release:{
    name:'Wallet and ledger reconciliation, UAT drop 6.2', target:'21 Nov 2026',
    decision:'Conditional go', decisionKey:'conditional',
    rationale:'The happy-path equal-balance run is solid, so a limited operations pilot can continue on days that already tie. The 14 Nov fixture must not be treated as accepted until untagged incoming items and fees are itemised. The report remains investigative. It does not move funds.',
    conditions:['DA-104 difference fully categorised on a replay of 14 Nov','DA-105 and DA-106 retested','Headline total uses confirmed balances','Pilot users reminded that the report does not instruct transfers'],
    checklist:[
      {item:'Requirements v1.0 agreed', state:'ok', notes:'Agreed 1 Oct 2026.'},
      {item:'Blocker defects closed', state:'bad', notes:'DA-104 still open.'},
      {item:'UAT exit on the mismatch fixture', state:'bad', notes:'TC-WAL-02 failed.'},
      {item:'Happy-path equal-balance tests passed', state:'ok', notes:'TC-WAL-01 and TC-WAL-06 passed.'},
      {item:'Scope note: report is investigative only', state:'ok', notes:'Written in the go note and the page footer.'},
      {item:'Hypercare for the pilot week', state:'ok', notes:'BA and operations, morning run review.'}
    ],
    hypercare:{window:'Five business days after a later full go, 09:00–17:00 MYT', channel:'Morning reconciliation review and a shared exception note', exit:'Three consecutive tying business days on the UAT fixtures, including one mismatch fixture that is fully itemised.'}
  },
  risks:[
    {id:'R-1', title:'Untagged incoming value will keep appearing as an unexplained control gap.', severity:'High', status:'Open', mitigation:'Park missing memo or tag items before the next replay of 14 Nov.'},
    {id:'R-2', title:'Unrecorded fees can be misread as a missing customer balance.', severity:'Medium', status:'Open', mitigation:'Add a fee exception category and same-day fee lines.'},
    {id:'R-3', title:'A reader could treat the report as an instruction to move funds.', severity:'Medium', status:'Open', mitigation:'Keep the investigative scope note on the report and in hypercare.'}
  ],
  trend:[
    {sprint:'Sprint 3', blocker:0, critical:0, major:2, minor:3},
    {sprint:'Sprint 4', blocker:0, critical:1, major:2, minor:2},
    {sprint:'Sprint 5', blocker:1, critical:1, major:2, minor:2},
    {sprint:'Sprint 6', blocker:1, critical:1, major:1, minor:2}
  ]
};


let state = { scenario:'crm', tab:'requirements', issue:null };

function scenario(){ return SCENARIOS[state.scenario]; }
function issueByKey(key){ return (scenario().issues || []).find(i => i.key === key); }

function setHash(){
  const parts = [state.scenario, state.tab];
  if (state.issue) parts.push('issue', state.issue);
  const next = '#' + parts.join('/');
  if (location.hash !== next) history.replaceState(null, '', next);
}
function parseHash(){
  const raw = (location.hash || '').replace(/^#/, '');
  const parts = raw.split('/').filter(Boolean);
  if (parts[0] && SCENARIOS[parts[0]]) state.scenario = parts[0];
  if (parts[1] && TABS.some(t => t.id === parts[1])) state.tab = parts[1];
  if (parts[2] === 'issue' && parts[3]) state.issue = parts[3];
  else state.issue = null;
}

function renderScenarios(){
  const box = $('#edl-scenarios');
  box.innerHTML = ORDER.map(id => {
    const s = SCENARIOS[id];
    return `<button type="button" class="edl-scen" data-scen="${id}" aria-pressed="${id===state.scenario?'true':'false'}"><b>${esc(s.title)}</b><small>${esc(s.blurb)}</small></button>`;
  }).join('');
}
function renderTabs(){
  const box = $('#edl-tabs');
  box.innerHTML = TABS.map(t =>
    `<button type="button" role="tab" id="tab-${t.id}" data-tab="${t.id}" aria-selected="${t.id===state.tab?'true':'false'}" aria-controls="edl-panel">${esc(t.label)}</button>`
  ).join('');
}
function renderContext(){
  const s = scenario();
  $('#edl-context').innerHTML = `
    <p class="edl-kicker">${esc(s.org)}</p>
    <h3 style="margin:0 0 6px">${esc(s.title)} · ${esc(s.blurb)}</h3>
    <p style="margin:0 0 8px">${esc(s.context)}</p>
    <p class="muted" style="margin:0 0 14px">${esc(s.sprint)} · All records below are synthetic.</p>`;
}

function storyBlock(st){
  return `<article class="panel panel--tight" style="margin:0">
    <div class="demo__label">${pill(st.key,'info')} ${pill(st.status)}</div>
    <h4 style="margin:8px 0 6px">${esc(st.title)}</h4>
    <p>As a <b>${esc(st.asA)}</b>, I want <b>${esc(st.want)}</b> so that ${esc(st.soThat)}.</p>
    <p class="muted" style="margin:0 0 6px">Acceptance criteria</p>
    <ul>${st.ac.map(a=>`<li>${esc(a)}</li>`).join('')}</ul>
  </article>`;
}

function renderRequirements(){
  const s = scenario();
  const b = s.brd;
  return `
    <p class="edl-kicker">Business requirements document (excerpt)</p>
    <div class="panel__head"><h3 style="margin:0">${esc(b.title)}</h3>${pill(b.id,'info')} ${pill('v'+b.version,'info')}</div>
    <p class="muted">Dated ${esc(b.date)} · Synthetic excerpt</p>
    <p>${esc(b.excerpt)}</p>
    <div class="kv">
      <div><h5>Objective</h5><p>${esc(b.objective)}</p></div>
      <div><h5>Stakeholders</h5><ul>${b.stakeholders.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
      <div><h5>In scope</h5><ul>${b.inScope.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
      <div><h5>Out of scope</h5><ul>${b.outOfScope.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
    </div>
    <h4>Epic</h4>
    <p>${pill(s.epic.key,'info')} <b>${esc(s.epic.title)}</b></p>
    <p>${esc(s.epic.text)}</p>
    <h4>User stories</h4>
    <div class="grid2">${s.stories.map(storyBlock).join('')}</div>`;
}

function issueRow(i){
  const sevHtml = i.severity ? pill(i.severity) : '<span class="muted">n/a</span>';
  return `<tr class="edl-issue" tabindex="0" data-issue="${esc(i.key)}" role="button" aria-label="Open ${esc(i.key)}">
    <td><b>${esc(i.key)}</b></td>
    <td>${pill(i.type)}</td>
    <td>${pill(i.priority)}</td>
    <td>${sevHtml}</td>
    <td>${pill(i.status)}</td>
    <td>${esc(i.summary)}</td>
    <td>${esc(i.assignee)}</td>
  </tr>`;
}

function renderIssues(){
  const s = scenario();
  const heads = ['Key','Type','Priority','Severity','Status','Summary','Assignee'];
  const rows = s.issues.map(issueRow).join('');
  return `
    <p class="edl-kicker">Issue list</p>
    <h3 style="margin:0 0 6px">Jira-style issues for this scenario</h3>
    <p>Click a row to open the detail panel. Defects include reproduction steps, expected and actual behaviour, linked tests, a resolution timeline and business sign-off. All keys are synthetic.</p>
    <div class="tbl-wrap"><table class="tbl edl-tbl"><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderTriage(){
  const s = scenario();
  const rows = s.issues.filter(i => i.status !== 'Done').map(i => {
    const agreePri = i.ai && i.ai.priority === i.priority;
    const agreeType = i.ai && i.ai.type === i.type;
    return `<tr class="edl-issue" tabindex="0" data-issue="${esc(i.key)}" role="button">
      <td><b>${esc(i.key)}</b><div class="muted">${esc(i.summary)}</div></td>
      <td>${pill(i.type)} → ${pill(i.ai.type)}${agreeType?'':' <span class="muted">differs</span>'}</td>
      <td>${pill(i.priority)} → ${pill(i.ai.priority)}${agreePri?'':' <span class="muted">differs</span>'}</td>
      <td>${esc(i.ai.queue)}</td>
      <td>${pill(i.ai.confidence,'info')}</td>
      <td>${esc(i.ai.reason)}</td>
    </tr>`;
  }).join('');
  return `
    <div class="demo__label"><span class="badge badge--sim">Simulated AI output · rule-based</span></div>
    <h3 style="margin:8px 0 6px">Simulated triage suggestions</h3>
    <p>Suggestions below are generated from simple, pre-written rules for this prototype, not from a live language model. They sit beside the current type and priority so you can see where they agree and where they differ. Nothing is sent anywhere.</p>
    <p class="edl-sim">How the simulation works: each open issue already carries a suggested type, priority, queue and a short reason, written to look like a classifier. Where the suggestion differs from the logged values, the row is marked "differs" so a BA can review it. This is not a live model.</p>
    <div class="tbl-wrap"><table class="tbl edl-tbl"><thead><tr>
      <th>Issue</th><th>Type (current → suggested)</th><th>Priority (current → suggested)</th><th>Suggested queue</th><th>Confidence</th><th>Reason</th>
    </tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderBoard(){
  const s = scenario();
  const cols = COLUMNS.map(col => {
    const items = s.issues.filter(i => i.status === col);
    const cards = items.map(i => `
      <button type="button" class="edl-card" data-issue="${esc(i.key)}">
        <b>${esc(i.key)} · ${esc(i.type)}</b>
        <p>${esc(i.summary)}</p>
        <div class="meta">${pill(i.priority)} ${i.severity?pill(i.severity):''}</div>
      </button>`).join('') || '<p class="edl-empty">No items</p>';
    return `<div class="edl-col"><h3>${esc(col)} <span>${items.length}</span></h3>${cards}</div>`;
  }).join('');
  return `
    <p class="edl-kicker">Sprint board</p>
    <h3 style="margin:0 0 6px">${esc(s.sprint)}</h3>
    <p>Columns follow a simple BA delivery path: Backlog, To Do, In Progress, In UAT and Done. Open any card for detail.</p>
    <div class="edl-board-wrap"><div class="edl-board">${cols}</div></div>`;
}

function renderUat(){
  const s = scenario();
  const counts = {Pass:0,'Retest pass':0,Fail:0,'Retest fail':0,Blocked:0,'Not run':0};
  s.tests.forEach(t => { counts[t.result] = (counts[t.result]||0)+1; });
  const rows = s.tests.map(t => {
    const trace = `<div class="edl-trace">${esc(t.requirement)} <span>→</span> ${esc(t.story)} <span>→</span> ${esc(t.id)}${t.defect?` <span>→</span> <button type="button" class="chipbtn" data-issue="${esc(t.defect)}">${esc(t.defect)}</button>`:''}</div>`;
    return `<tr>
      <td><b>${esc(t.id)}</b></td>
      <td>${esc(t.title)}${trace}</td>
      <td>${pill(t.result)}</td>
      <td>${t.defect?`<button type="button" class="chipbtn" data-issue="${esc(t.defect)}">${esc(t.defect)}</button>`:'<span class="muted">None</span>'}</td>
      <td>${esc(t.notes)}</td>
    </tr>`;
  }).join('');
  return `
    <p class="edl-kicker">UAT and defect traceability</p>
    <h3 style="margin:0 0 6px">Test cases for this scenario</h3>
    <p>Each test traces requirement to story to test case, and on to a defect when one was raised. Retest results stay visible so you can see what is still failing after a fix.</p>
    <div class="summary">
      ${stat(s.tests.length,'Test cases')}
      ${stat(counts.Pass + (counts['Retest pass']||0),'Passed / retest passed','ok')}
      ${stat((counts.Fail||0)+(counts['Retest fail']||0),'Failed / retest failed','bad')}
      ${stat(counts.Blocked||0,'Blocked','warn')}
      ${stat(counts['Not run']||0,'Not run')}
    </div>
    <div class="tbl-wrap"><table class="tbl edl-tbl"><thead><tr>
      <th>Test</th><th>Title and traceability</th><th>Result</th><th>Defect</th><th>Notes</th>
    </tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderRelease(){
  const s = scenario();
  const r = s.release;
  const list = r.checklist.map(c => `
    <li><span class="mark ${esc(c.state)}" aria-hidden="true">${c.state==='ok'?'✓':c.state==='warn'?'!':'×'}</span>
    <div><b>${esc(c.item)}</b><div class="muted">${esc(c.notes)}</div></div></li>`).join('');
  const decisionLabel = r.decisionKey==='go'?'Go':r.decisionKey==='conditional'?'Conditional go':'No-go';
  return `
    <p class="edl-kicker">Release readiness</p>
    <h3 style="margin:0 0 6px">${esc(r.name)}</h3>
    <p class="muted">Target: ${esc(r.target)}</p>
    <div class="edl-go edl-go--${esc(r.decisionKey)}">
      <strong>Go / no-go: ${esc(decisionLabel)}</strong>
      ${esc(r.rationale)}
    </div>
    <h4>Readiness checklist</h4>
    <ul class="edl-check">${list}</ul>
    <h4>Conditions still to meet</h4>
    <ul>${r.conditions.map(c=>`<li>${esc(c)}</li>`).join('')}</ul>
    <h4>Hypercare</h4>
    <div class="kv">
      <div><h5>Window</h5><p>${esc(r.hypercare.window)}</p></div>
      <div><h5>Channel</h5><p>${esc(r.hypercare.channel)}</p></div>
      <div class="wide"><h5>Exit criteria</h5><p>${esc(r.hypercare.exit)}</p></div>
    </div>`;
}

function stackedChart(trend){
  const keys = [['blocker','#ff5c7a','Blocker'],['critical','#ff8fa3','Critical'],['major','#ffb84d','Major'],['minor','#6cc0ff','Minor']];
  const w=640,h=220,pad={t:16,r:12,b:36,l:36};
  const iw=w-pad.l-pad.r, ih=h-pad.t-pad.b;
  const max = Math.max(1, ...trend.map(t => t.blocker+t.critical+t.major+t.minor));
  const bw = iw/trend.length;
  const bars = trend.map((t,i) => {
    let y = pad.t + ih;
    const stack = keys.map(([k,color]) => {
      const val = t[k]||0;
      const bh = (val/max)*ih;
      y -= bh;
      return val?`<rect x="${(pad.l+i*bw+bw*0.22).toFixed(1)}" y="${y.toFixed(1)}" width="${(bw*0.56).toFixed(1)}" height="${bh.toFixed(1)}" fill="${color}" rx="2"></rect>`:'';
    }).join('');
    const labelX = pad.l+i*bw+bw/2;
    return `${stack}<text x="${labelX}" y="${h-12}" text-anchor="middle" fill="#7d8bab" font-size="11">${esc(t.sprint)}</text>`;
  }).join('');
  const ticks = [0,max].map(v => {
    const y = pad.t + ih - (v/max)*ih;
    return `<text x="${pad.l-6}" y="${y+3}" text-anchor="end" fill="#7d8bab" font-size="10">${v}</text>`;
  }).join('');
  const legend = keys.map(([,color,label]) => `<span><i style="background:${color}"></i>${label}</span>`).join('');
  return `<svg class="edl-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Open defects by severity across sprints">${ticks}${bars}</svg><div class="edl-legend-row">${legend}</div>`;
}

function renderDashboard(){
  const s = scenario();
  const bugs = s.issues.filter(i => i.type==='Bug');
  const openBugs = bugs.filter(i => i.status!=='Done');
  const openBlockers = openBugs.filter(i => i.severity==='Blocker' || i.priority==='Critical');
  const doneStories = s.stories.filter(st => st.status==='Done').length;
  const passed = s.tests.filter(t => t.result==='Pass' || t.result==='Retest pass').length;
  const openRisks = s.risks.filter(r => r.status==='Open').length;
  const riskRows = s.risks.map(r => `<tr>
    <td><b>${esc(r.id)}</b></td><td>${esc(r.title)}</td>
    <td>${pill(r.severity)}</td><td>${pill(r.status)}</td><td>${esc(r.mitigation)}</td>
  </tr>`).join('');
  return `
    <p class="edl-kicker">Management view</p>
    <h3 style="margin:0 0 6px">Delivery snapshot · ${esc(s.title)}</h3>
    <p>A compact view of open defects, test progress and risks for this synthetic scenario. Charts are drawn in the browser from the same sample data.</p>
    <div class="summary">
      ${stat(openBugs.length,'Open defects', openBugs.length?'bad':'ok')}
      ${stat(openBlockers.length,'Open critical / blocker', openBlockers.length?'bad':'ok')}
      ${stat(doneStories+' / '+s.stories.length,'Stories done')}
      ${stat(passed+' / '+s.tests.length,'Tests passed')}
      ${stat(openRisks,'Open risks', openRisks?'warn':'ok')}
      ${stat(s.release.decision,'Go / no-go', s.release.decisionKey==='nogo'?'bad':s.release.decisionKey==='conditional'?'warn':'ok')}
    </div>
    <div class="grid2">
      <div>
        <h4>Defect counts by severity, recent sprints</h4>
        ${stackedChart(s.trend)}
      </div>
      <div>
        <h4>Open risks</h4>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>ID</th><th>Risk</th><th>Severity</th><th>Status</th><th>Mitigation</th></tr></thead><tbody>${riskRows}</tbody></table></div>
      </div>
    </div>`;
}

const RENDER = {
  requirements: renderRequirements,
  issues: renderIssues,
  triage: renderTriage,
  board: renderBoard,
  uat: renderUat,
  release: renderRelease,
  dashboard: renderDashboard
};

function renderPanel(){
  $('#edl-panel').innerHTML = RENDER[state.tab]();
}

function historyList(h){
  if (!h || !h.length) return '<p class="edl-empty">No history recorded.</p>';
  return `<ol class="timeline">${h.map(x=>`<li><b>${esc(x.date)}</b> · ${esc(x.author)}<span>${esc(x.event)}</span></li>`).join('')}</ol>`;
}

function renderDrawer(issue){
  const isBug = issue.type==='Bug';
  const story = scenario().stories.find(st => st.key === issue.story);
  const tests = (issue.tests||[]).map(id => scenario().tests.find(t => t.id===id)).filter(Boolean);
  const so = issue.signoff || {state:'Pending'};
  const signoffHtml = so.state==='Signed off'
    ? `<p>${pill('Signed off','ok')} ${esc(so.by||'')} ${so.date?('on '+esc(so.date)):''}</p>${so.note?`<p>${esc(so.note)}</p>`:''}`
    : `<p>${pill('Pending','warn')} Business sign-off is not complete.</p>${so.note?`<p>${esc(so.note)}</p>`:''}`;
  const testHtml = tests.length
    ? `<ul>${tests.map(t=>`<li><b>${esc(t.id)}</b> ${pill(t.result)} · ${esc(t.title)}</li>`).join('')}</ul>`
    : '<p class="edl-empty">No linked test cases.</p>';
  const ac = story && story.ac ? `<ul>${story.ac.map(a=>`<li>${esc(a)}</li>`).join('')}</ul>` : '';
  const req = issue.requirement || scenario().brd.id;
  const body = isBug ? `
      <div><dt>Business requirement</dt><dd>${esc(req)}${story?` · Story ${esc(story.key)}: ${esc(story.title)}`:''}</dd></div>
      <div><dt>Severity</dt><dd>${pill(issue.severity||issue.priority)} ${pill(issue.priority)} · ${pill(issue.status)}</dd></div>
      <div><dt>Reproduction steps</dt><dd><ol>${(issue.steps||[]).map(x=>`<li>${esc(x)}</li>`).join('')||'<li>Not recorded.</li>'}</ol></dd></div>
      <div><dt>Expected behaviour</dt><dd>${esc(issue.expected||'Not recorded.')}</dd></div>
      <div><dt>Actual behaviour</dt><dd>${esc(issue.actual||'Not recorded.')}</dd></div>
      <div><dt>Linked test cases</dt><dd>${testHtml}</dd></div>
      <div><dt>Resolution history</dt><dd>${historyList(issue.history)}</dd></div>
      <div><dt>Business sign-off</dt><dd>${signoffHtml}</dd></div>`
    : `
      <div><dt>Business requirement</dt><dd>${esc(req)}</dd></div>
      <div><dt>Type and status</dt><dd>${pill(issue.type)} ${pill(issue.priority)} ${pill(issue.status)}</dd></div>
      <div><dt>Description</dt><dd>${esc(issue.description || issue.summary)}</dd></div>
      ${story?`<div><dt>Acceptance criteria</dt><dd>${ac}</dd></div>`:''}
      <div><dt>Linked test cases</dt><dd>${testHtml}</dd></div>
      <div><dt>History</dt><dd>${historyList(issue.history)}</dd></div>
      <div><dt>Business sign-off</dt><dd>${signoffHtml}</dd></div>`;
  return `
    <div class="edl-drawer__top">
      <div>
        <p class="edl-kicker">${esc(issue.key)} · ${esc(issue.type)} · ${esc(issue.component||'')}</p>
        <h2 id="edl-drawer-title">${esc(issue.summary)}</h2>
        <p class="muted" style="margin:6px 0 0">Assignee: ${esc(issue.assignee)}</p>
      </div>
      <button type="button" class="edl-close" id="edl-close">Close</button>
    </div>
    <dl class="edl-dl">${body}</dl>`;
}

function openIssue(key){
  const issue = issueByKey(key);
  if (!issue) return;
  state.issue = key;
  const drawer = $('#edl-drawer');
  const back = $('#edl-backdrop');
  drawer.innerHTML = renderDrawer(issue);
  drawer.hidden = false;
  back.hidden = false;
  requestAnimationFrame(() => {
    drawer.classList.add('is-open');
    back.classList.add('is-open');
  });
  document.body.classList.add('edl-lock');
  const closeBtn = $('#edl-close');
  if (closeBtn) closeBtn.focus();
  setHash();
}

function closeIssue(){
  const drawer = $('#edl-drawer');
  const back = $('#edl-backdrop');
  drawer.classList.remove('is-open');
  back.classList.remove('is-open');
  document.body.classList.remove('edl-lock');
  state.issue = null;
  setHash();
  setTimeout(() => {
    if (state.issue) return;
    drawer.hidden = true;
    back.hidden = true;
    drawer.innerHTML = '';
  }, 220);
}

function closeIssueQuiet(){
  const drawer = $('#edl-drawer');
  const back = $('#edl-backdrop');
  drawer.classList.remove('is-open');
  back.classList.remove('is-open');
  document.body.classList.remove('edl-lock');
  drawer.hidden = true;
  back.hidden = true;
  drawer.innerHTML = '';
}

function renderAll(){
  renderScenarios();
  renderContext();
  renderTabs();
  renderPanel();
  if (state.issue && issueByKey(state.issue)) openIssue(state.issue);
  else if (state.issue) { state.issue = null; }
  setHash();
}

function onReady(){
  parseHash();
  renderAll();

  $('#edl-scenarios').addEventListener('click', e => {
    const btn = e.target.closest('[data-scen]');
    if (!btn) return;
    state.scenario = btn.getAttribute('data-scen');
    state.issue = null;
    closeIssueQuiet();
    renderAll();
  });
  $('#edl-tabs').addEventListener('click', e => {
    const btn = e.target.closest('[data-tab]');
    if (!btn) return;
    state.tab = btn.getAttribute('data-tab');
    renderTabs();
    renderPanel();
    setHash();
  });
  $('#edl-panel').addEventListener('click', e => {
    const el = e.target.closest('[data-issue]');
    if (!el) return;
    e.preventDefault();
    openIssue(el.getAttribute('data-issue'));
  });
  $('#edl-panel').addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const el = e.target.closest('[data-issue]');
    if (!el) return;
    e.preventDefault();
    openIssue(el.getAttribute('data-issue'));
  });
  $('#edl-backdrop').addEventListener('click', closeIssue);
  $('#edl-drawer').addEventListener('click', e => {
    if (e.target.id === 'edl-close' || e.target.closest('#edl-close')) closeIssue();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && state.issue) closeIssue();
  });
  window.addEventListener('hashchange', () => {
    const prev = state.scenario + '|' + state.tab + '|' + (state.issue||'');
    parseHash();
    const next = state.scenario + '|' + state.tab + '|' + (state.issue||'');
    if (prev === next) return;
    if (!state.issue) closeIssueQuiet();
    renderAll();
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady);
else onReady();
})();
