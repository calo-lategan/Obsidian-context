/**
 * 00_Config.gs — central configuration for the Site Services engine.
 *
 * All IDs below point at the SANDBOX (calo.lategan@allaith.com My Drive).
 * Production IDs are kept in PROD_* for reference only and are NEVER written
 * to until an explicit, approved cutover.
 */

// ---- Sandbox combined master (the one file) ----
var MASTER_ID = '1dTdxRoNLXQN7PNB43PIpQykZHlkhwl0wEYl2bcbmzIM';

// ---- Sandbox source workbooks (isolated copies; read-only inputs to the build) ----
var SRC_STOCK_ID  = '1J_XV_XfpbSDAZxxQifOMw4wzApKScphetopl3zYwHcA'; // SRC - Season Stock
var SRC_FLEXI_ID  = '1Poj3--9KbcYzIN68LXK8-0Z6-AJ8mP___yXBWNWzDE8'; // SRC - Flexiloo Allocation
var SRC_QUOTES_ID = '1TSo_wrsumjH52-2XAajp8ee57rmV0PDU-B8_GkBzFlU'; // SRC - Quotes Fleetboard

// ---- Sandbox folders ----
var SANDBOX_ROOT_ID = '1FL2YsvZZ-xC8hAXbjYLIJCDY_pwzTHO2'; // __SANDBOX SITE SERVICES

// ---- PRODUCTION references (READ ONLY — do not write until cutover) ----
var PROD_PROJECTS_ROOT_ID = '1O3Ct3J30sXyl_ths7g1oVLdoRekRznSH'; // 00. Site Services Projects
var PROD_JOB_FOLDER_BY_YEAR = {
  '2026': '1M5v-0ZoclnxEgu4vOdoRsGfDSmbzuo0n', // 2026 - JOB FOLDER
  '2027': '1JvlO3gOy7GqKLkWZm1vzguhtA14rj592'  // 2027- JOB FOLDER
};

// ---- Canonical tab names ----
var TAB = {
  CONTROL: '⚙ CONTROL',
  CONFIG:  'CONFIG',
  ASSETS:  'ASSETS',
  STOCK:   'STOCK STATUS',
  ERP:     'ERP LIST',
  FLEXI:   'FLEXILOO',
  FLX:     'FLX PLANT NOS',
  Q_UAE:   'UAE 2026',
  Q_KSA:   'KSA 2025-2026',
  Q_MANUAL:'MANUAL 2026',
  CS_TEMPLATE: 'CS - 12345 - TEMPLATE PROJ'
};

// ---- Status vocabularies (verbatim from the live sheets) ----
var STOCK_STATUSES = ['AVAILABLE','ON HIRE','SOLD TO KSA','QUOTE','SERVICE','BOOKED','IN KSA'];
var FLEXI_APPROVAL = ['CONFIRM','PENDING APPROVAL','JOB COMPLETED','CANCELLED','TBC'];
var FLEXI_NEWREPEAT = ['NEW','REPEAT'];

// ---- Flexiloo unit-type detection: plant prefix + the words/abbreviations to count ----
var FLEXI_UNIT_TYPES = [
  { key: 'WC',   plantPrefix: 'FLX.WC',  words: ['WC','WATER CLOSET','TOILET'] },
  { key: 'VA',   plantPrefix: 'FLX.VA',  words: ['VA','VANITY'] },
  { key: 'UR',   plantPrefix: 'FLX.UR',  words: ['UR','URINAL'] },
  { key: 'SH',   plantPrefix: 'FLX.SHC', words: ['SH','SHOWER'] },
  { key: 'PUMP', plantPrefix: 'FLX.PU',  words: ['PUMP'] },
  { key: 'POD',  plantPrefix: 'FLX.POD', words: ['POD'] }
];

// ---- ERP LIST / FLX calendar span (from the live sheets) ----
var CAL_START_ISO = '2026-03-01';
var CAL_END_ISO   = '2027-10-09';

// ---- On-hire document (drives the ON HIRE state). Default = Delivery Note. ----
// Adjust keywords/folder once the user confirms the hire-agreement example (plan Task 4.5).
var ONHIRE_DOC = {
  folder: '02 - DELIVERY _ RETURN NOTES',
  // NOTE: no bare 'ON HIRE' keyword — quote titles legitimately contain it.
  keywords: ['DELIVERY NOTE', 'HIRE AGREEMENT']
};

// ---- Seasons (multi-year). A season groups a start-year; see 60_Season.js. ----
var SEASONS = ['2026-2027', '2027-2028'];
