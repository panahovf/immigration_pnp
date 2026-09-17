/* =============================================================================
   PNP Navigator — stream data
   -----------------------------------------------------------------------------
   Every stream links to its official government page. Requirement shapes
   (does this need a job offer? must you already be in the province?) are stable
   and are what this tool matches on. Exact numeric thresholds change often, so
   they are stated only where confirmed against the official page, and every
   card tells the reader to confirm before applying.

   VERIFIED is the date the official pages were last checked.
   ============================================================================= */

const VERIFIED = 'September 2026';

const PROVINCES = {
  ON: { name: 'Ontario',                   program: 'OINP',  url: 'https://www.ontario.ca/page/ontario-immigrant-nominee-program-oinp' },
  BC: { name: 'British Columbia',          program: 'BC PNP', url: 'https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program' },
  AB: { name: 'Alberta',                   program: 'AAIP',  url: 'https://www.alberta.ca/alberta-advantage-immigration-program' },
  SK: { name: 'Saskatchewan',              program: 'SINP',  url: 'https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program' },
  MB: { name: 'Manitoba',                  program: 'MPNP',  url: 'https://immigratemanitoba.com/' },
  NS: { name: 'Nova Scotia',               program: 'NSNP',  url: 'https://liveinnovascotia.com/' },
  NB: { name: 'New Brunswick',             program: 'NBPNP', url: 'https://www.welcomenb.ca/en/immigrate/' },
  PE: { name: 'Prince Edward Island',      program: 'PEI PNP', url: 'https://www.princeedwardisland.ca/en/topic/office-of-immigration' },
  NL: { name: 'Newfoundland and Labrador', program: 'NLPNP', url: 'https://www.gov.nl.ca/immigration/' },
  YT: { name: 'Yukon',                     program: 'YNP',   url: 'https://yukon.ca/en/immigrate-yukon' },
  NT: { name: 'Northwest Territories',     program: 'NTNP',  url: 'https://www.immigratenwt.ca/' },
  CA: { name: 'Federal (all provinces)',   program: 'IRCC',  url: 'https://www.canada.ca/en/immigration-refugees-citizenship.html' }
};

/* ---------------------------------------------------------------------------
   Ordered scales, so "at least X" comparisons are simple.
   --------------------------------------------------------------------------- */

const EDU_ORDER  = ['none', 'secondary', 'cert1yr', 'bachelor', 'masters', 'phd'];
const eduRank    = v => Math.max(0, EDU_ORDER.indexOf(v));

const FUNDS_ORDER = ['under10', 'f10_25', 'f25_50', 'f50_150', 'f150plus'];
const fundsRank   = v => Math.max(0, FUNDS_ORDER.indexOf(v));

const inCanada = a => a.location !== 'outside';

/* ---------------------------------------------------------------------------
   Requirement builders.

   severity 'blocking' = a structural fact about your situation. If you don't
                         have it, this stream is not a realistic near-term route.
   severity 'closable' = something you can go and obtain. The `fix` explains how.
   --------------------------------------------------------------------------- */

const R = {

  jobOffer: (prov, extra) => ({
    id: 'jobOffer',
    label: extra || `A job offer from an employer in ${PROVINCES[prov].name}`,
    severity: 'closable',
    test: a => {
      if (a.jobOffer !== 'have') return false;
      return a.jobOfferProv === prov || a.jobOfferProv === 'unsure';
    },
    fix: {
      text: `You need a written job offer from an employer in ${PROVINCES[prov].name}. This is the single biggest hurdle from overseas, and it is a real one — but it is learnable.`,
      link: 'job-offer.html',
      linkText: 'How to get a Canadian job offer from overseas'
    }
  }),

  designatedEmployer: (what, href, provs) => ({
    id: 'designatedEmployer',
    label: `A job offer from a ${what}`,
    severity: 'closable',
    test: a => {
      if (a.jobOffer !== 'have' || a.offerDesignated !== 'yes') return false;
      if (!provs) return true;
      return provs.includes(a.jobOfferProv) || a.jobOfferProv === 'unsure';
    },
    fix: {
      text: `Not any employer will do. The employer must be approved by the program in advance, and each province or community publishes its list of approved employers. An ordinary job offer does not qualify \u2014 but applying to employers already on those lists is far more productive than applying cold.`,
      link: href || 'job-offer.html#designated',
      linkText: 'How designated-employer programs work'
    }
  }),

  minEdu: (level, note) => ({
    id: 'edu',
    label: note || ({
      secondary: 'Completed high school (or equivalent)',
      cert1yr:   'A post-secondary credential of at least one year',
      bachelor:  "A bachelor's degree or higher",
      masters:   "A master's degree or higher"
    })[level],
    severity: 'closable',
    test: a => eduRank(a.education) >= eduRank(level),
    fix: {
      text: `Your credential has to be assessed as comparable to the Canadian level. If you studied outside Canada you will need an Educational Credential Assessment (ECA).`,
      link: 'requirements.html#eca',
      linkText: 'What an ECA is and how to get one'
    }
  }),

  minExp: (years, note) => ({
    id: 'exp',
    label: note || `${years}+ year${years === 1 ? '' : 's'} of skilled work experience`,
    severity: 'closable',
    test: a => a.experience >= years,
    fix: {
      text: `This is the one requirement with no shortcut — it accrues with time. Keep working in a single occupation and keep reference letters, contracts and pay records as you go.`,
      link: 'requirements.html#experience',
      linkText: 'How work experience is counted and proved'
    }
  }),

  minCLB: (n, note) => ({
    id: 'clb',
    label: note || `English or French at about CLB ${n} or higher`,
    severity: 'closable',
    test: a => a.clb !== 'untested' && Number(a.clb) >= n,
    fix: {
      text: `You need a result from an approved test (IELTS General Training, CELPIP, PTE Core, TEF or TCF Canada). Self-assessment does not count, and results expire after two years.`,
      link: 'requirements.html#language',
      linkText: 'Language tests and what CLB means'
    }
  }),

  frenchNCLC: n => ({
    id: 'french',
    label: `French at about NCLC ${n} in all four abilities`,
    severity: 'closable',
    test: a => (a.french === 'nclc7') || (a.french === 'nclc5' && n <= 5),
    fix: {
      text: `This route is only for French speakers. You must prove it with a TEF Canada or TCF Canada result — English test scores do not substitute.`,
      link: 'requirements.html#language',
      linkText: 'Language tests and what NCLC means'
    }
  }),

  alreadyIn: (prov, note) => ({
    id: 'alreadyIn',
    label: note || `Already living and working in ${PROVINCES[prov].name} on a valid work permit`,
    severity: 'blocking',
    test: a => inCanada(a) && a.canadaWork === prov,
    fix: {
      text: `This stream is for people already in the province. From overseas it is not a direct route — you would first need to get here on a work permit or as a student.`,
      link: 'requirements.html#getting-here-first',
      linkText: 'Routes that get you into Canada first'
    }
  }),

  studiedIn: (prov, note) => ({
    id: 'studiedIn',
    label: note || `Graduated from a recognised institution in ${PROVINCES[prov].name}`,
    severity: 'blocking',
    test: a => a.canadaStudy === prov,
    fix: {
      text: `Reserved for graduates of the province's own colleges and universities. Studying in Canada is a genuine long-game route into PNP, but it is a multi-year, high-cost decision.`,
      link: 'requirements.html#study-route',
      linkText: 'The study-then-immigrate route, honestly'
    }
  }),

  connection: prov => ({
    id: 'connection',
    label: `A genuine connection to ${PROVINCES[prov].name} (close family, or past work or study there)`,
    severity: 'blocking',
    test: a => (a.connections || []).includes(prov) || a.canadaStudy === prov || a.canadaWork === prov,
    fix: {
      text: `A "connection" here means something specific and documented — a close relative settled in the province, or your own previous authorised work or study there. It cannot be manufactured, and a friend-of-a-friend generally is not enough.`,
      link: 'requirements.html#connection',
      linkText: 'What provinces mean by a "connection"'
    }
  }),

  eePool: () => ({
    id: 'eePool',
    label: 'An active Express Entry profile (you must qualify for a federal program first)',
    severity: 'closable',
    test: a => eduRank(a.education) >= eduRank('secondary') &&
               a.experience >= 1 &&
               a.clb !== 'untested' && Number(a.clb) >= 7,
    fix: {
      text: `The province draws candidates out of the federal Express Entry pool, so you have to be in that pool before it can pick you. Entering it generally means CLB 7+, at least one year of skilled experience, and an ECA.`,
      link: 'requirements.html#express-entry',
      linkText: 'How Express Entry and PNP fit together'
    }
  }),

  field: (fields, label) => ({
    id: 'field',
    label: label || `Work experience in a targeted occupation`,
    severity: 'blocking',
    test: a => fields.includes(a.field),
    fix: {
      text: `This stream only takes specific occupations, and yours is not currently on the list. Lists are revised periodically — it is worth re-checking the official page.`,
      link: 'requirements.html#noc',
      linkText: 'Finding your NOC code and TEER level'
    }
  }),

  teerIn: (teers, label) => ({
    id: 'teer',
    label: label || 'Your occupation must fall in the right skill category',
    severity: 'blocking',
    test: a => a.teer === 'unsure' || teers.includes(a.teer),
    fix: {
      text: `Canada classifies every job by a TEER level from 0 to 5. Which streams you can use depends heavily on where your occupation lands.`,
      link: 'requirements.html#noc',
      linkText: 'Finding your NOC code and TEER level'
    }
  }),

  funds: (rank, label) => ({
    id: 'funds',
    label: label || 'Enough settlement money to support yourself on arrival',
    severity: 'closable',
    test: a => fundsRank(a.funds) >= fundsRank(rank),
    fix: {
      text: `Provinces want to see liquid, unencumbered savings you can prove with months of bank statements. A loan or a sudden deposit shortly before applying tends to be rejected.`,
      link: 'costs.html#settlement-funds',
      linkText: 'Settlement funds: how much and what counts'
    }
  }),

  business: (kind, amount) => ({
    id: 'business',
    label: kind === 'farm'
      ? 'You intend to buy and operate a farm'
      : 'You intend to start or buy a business and run it yourself',
    severity: 'blocking',
    test: a => a.business === kind || (kind === 'entrepreneur' && a.business === 'either'),
    fix: {
      text: amount || `Entrepreneur routes are a different proposition from worker routes: they need substantial capital, a business plan, an exploratory visit in many cases, and you usually arrive on a temporary work permit and only get nominated after you have actually run the business for a period.`,
      link: 'requirements.html#entrepreneur',
      linkText: 'How entrepreneur streams really work'
    }
  })
};

/* =============================================================================
   THE STREAMS
   ============================================================================= */

const STREAMS = [

  /* ------------------------------- ONTARIO ------------------------------- */
  {
    id: 'on-owps-skilled',
    prov: 'ON',
    name: 'Ontario Workforce Priority Stream — job offer path (TEER 0–3)',
    url: 'https://www.ontario.ca/page/ontario-workforce-priority-stream',
    route: 'both',
    kind: 'worker',
    status: 'open',
    statusNote: 'Ontario closed every one of its previous streams and replaced them with this one. Older guides describing the Masters Graduate, PhD, Human Capital Priorities or In-Demand Skills streams are out of date.',
    summary: 'Ontario now runs essentially one worker stream, and it is employer-first: your employer registers the job with Ontario before you can even submit an expression of interest. You cannot start this one on your own.',
    reqs: [
      R.jobOffer('ON', 'A full-time, permanent job offer from an approved Ontario employer'),
      R.teerIn(['teer01', 'teer23'], 'An occupation in TEER 0–3 (see the TEER 4–5 path if yours is lower-skilled)'),
      R.minEdu('cert1yr', 'A post-secondary credential of at least one year (with an ECA if earned abroad)'),
      R.minCLB(6, 'English or French at CLB 6+ (CLB 5 for skilled trades)'),
      R.minExp(1, 'Relevant experience in the occupation — commonly 6 months in the specific role, or 2 years in the same occupation within 5 years')
    ],
    notes: [
      'Your employer has to be registered, have operated 3+ years, have physical premises in Ontario, and must submit their side first to get a job offer ID.',
      'You then register an expression of interest within 30 days of getting that ID, and are scored out of 130 points.',
      'Points strongly favour working outside Toronto: Northern Ontario is worth 15 points, Toronto itself 0.'
    ]
  },
  {
    id: 'on-owps-teer45',
    prov: 'ON',
    name: 'Ontario Workforce Priority Stream — job offer path (TEER 4–5)',
    url: 'https://www.ontario.ca/page/ontario-workforce-priority-stream',
    route: 'base',
    kind: 'worker',
    status: 'open',
    summary: 'The same stream, but the lane for lower-skilled occupations. Notably, Ontario accepts any NOC occupation here — which is unusual and makes it one of the few PNP routes open to lower-skilled work.',
    reqs: [
      R.jobOffer('ON', 'A full-time, permanent job offer from an approved Ontario employer'),
      R.teerIn(['teer45'], 'An occupation in TEER 4–5'),
      R.minEdu('secondary', 'A high school diploma or equivalent'),
      R.minCLB(4, 'English or French at CLB 4+'),
      R.minExp(1, '9 months of cumulative full-time experience in the role within the past 2 years')
    ],
    notes: [
      'Scoring gives 0 points for TEER 4–5 occupation level, so wage, region and language do the heavy lifting on your score.',
      'This path is outside Express Entry, so it leads to permanent residence directly rather than through the federal pool.'
    ]
  },
  {
    id: 'on-owps-physician',
    prov: 'ON',
    name: 'Ontario Workforce Priority Stream — self-employed physician path',
    url: 'https://www.ontario.ca/page/ontario-workforce-priority-stream',
    route: 'both',
    kind: 'worker',
    status: 'open',
    summary: 'The one Ontario route with no employer involved at all — but it requires you to already be licensed and billing in Ontario, which is itself a years-long process.',
    reqs: [
      R.field(['health'], 'You are a physician'),
      { id: 'ohip', label: 'An OHIP billing number and good standing with the College of Physicians and Surgeons of Ontario',
        severity: 'blocking',
        test: () => false,
        fix: { text: 'Foreign-trained physicians must go through Canadian credential recognition and licensing before this applies. It is a long road, but provinces actively recruit physicians and there is support for it.', link: 'requirements.html#licensing', linkText: 'Regulated professions and licensing' } }
    ],
    notes: ['No job offer and no employer registration needed — you contact OINP directly to register an expression of interest.']
  },

  /* --------------------------- BRITISH COLUMBIA -------------------------- */
  {
    id: 'bc-skilled-worker',
    prov: 'BC',
    name: 'Skills Immigration — Skilled Worker',
    url: 'https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program',
    route: 'both',
    kind: 'worker',
    status: 'open',
    statusNote: 'BC restructured in 2026. The International Graduate and Entry Level & Semi-Skilled (ELSS) streams no longer exist, and the old standalone tech draws were folded into the main selection system.',
    summary: 'BC\'s main worker route. Registration is free and you are scored and ranked; only invited candidates pay the application fee.',
    reqs: [
      R.jobOffer('BC', 'An indeterminate, full-time job offer from a BC employer'),
      R.teerIn(['teer01', 'teer23'], 'A skilled occupation (TEER 0–3)'),
      R.minExp(2, '2+ years of directly related skilled work experience in the last 10 years'),
      R.minCLB(5, 'A language test result if your occupation is TEER 2–5')
    ],
    notes: [
      'Selection is score-based and wage-weighted, so a higher-paying offer materially improves your odds.',
      'High Economic Impact draws target very high wage offers; ordinary draws rank everyone together.',
      'The application fee is $1,750 CAD as of 22 January 2026. Registering costs nothing.'
    ]
  },
  {
    id: 'bc-health-authority',
    prov: 'BC',
    name: 'Skills Immigration — Health Authority',
    url: 'https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program',
    route: 'both',
    kind: 'worker',
    status: 'open',
    summary: 'A dedicated lane for people offered a job by one of BC\'s public health authorities. Health authorities recruit internationally and actively, which makes this one of the more realistic overseas routes if you are a clinician.',
    reqs: [
      R.field(['health'], 'You work in healthcare'),
      R.jobOffer('BC', 'A job offer from a BC public health authority')
    ],
    notes: ['Health authorities run their own international recruitment campaigns — going direct to them is usually more productive than general job boards.']
  },
  {
    id: 'bc-entrepreneur',
    prov: 'BC',
    name: 'Entrepreneur Immigration — Base and Regional streams',
    url: 'https://www.welcomebc.ca/immigrate-to-b-c/about-the-bc-provincial-nominee-program',
    route: 'base',
    kind: 'entrepreneur',
    status: 'open',
    summary: 'For people investing in and actively managing a BC business. You arrive on a work permit first and are only nominated once you have delivered what you promised.',
    reqs: [
      R.business('entrepreneur'),
      R.funds('f150plus', 'Substantial personal net worth and investment capital')
    ],
    notes: ['The Regional stream has lower thresholds than the Base stream in exchange for settling in a smaller community.']
  },

  /* -------------------------------- ALBERTA ------------------------------- */
  {
    id: 'ab-express-entry',
    prov: 'AB',
    name: 'Alberta Express Entry Stream',
    url: 'https://www.alberta.ca/aaip-alberta-express-entry-stream',
    route: 'enhanced',
    kind: 'worker',
    status: 'open',
    summary: 'One of the few genuinely no-job-offer routes. Alberta reaches into the federal Express Entry pool and invites candidates it wants — including dedicated pathways for healthcare, technology and policing.',
    reqs: [
      R.eePool(),
      R.minCLB(7, 'CLB 7+ in all four abilities (the practical floor for entering the Express Entry pool)'),
      R.minExp(1, '1+ year of skilled work experience')
    ],
    notes: [
      'You cannot apply to this stream directly — you make yourself visible in the Express Entry pool and indicate interest in Alberta.',
      'Alberta has historically invited candidates with CRS scores well below federal cutoffs, which is what makes PNP valuable.',
      'A provincial nomination adds 600 CRS points, which in practice guarantees a federal invitation.'
    ]
  },
  {
    id: 'ab-opportunity',
    prov: 'AB',
    name: 'Alberta Opportunity Stream',
    url: 'https://www.alberta.ca/aaip-alberta-opportunity-stream',
    route: 'base',
    kind: 'worker',
    status: 'open',
    summary: 'For people already working in Alberta on a valid work permit. Not an overseas route, but a common destination for people who arrive on a work permit first.',
    reqs: [
      R.alreadyIn('AB'),
      R.jobOffer('AB', 'A full-time job offer from your current Alberta employer'),
      R.minCLB(4, 'CLB 4+ (higher for some occupations)'),
      R.minEdu('secondary', 'High school or equivalent')
    ],
    notes: ['This is the stream most temporary foreign workers in Alberta eventually use.']
  },
  {
    id: 'ab-rural-renewal',
    prov: 'AB',
    name: 'Rural Renewal Stream',
    url: 'https://www.alberta.ca/aaip-rural-renewal-stream',
    route: 'base',
    kind: 'worker',
    status: 'open',
    summary: 'Genuinely open from overseas. A designated rural Alberta community endorses you, and you need a job offer from an employer in that community. Smaller towns, far less competition.',
    reqs: [
      R.jobOffer('AB', 'A full-time, permanent job offer from an employer in a designated rural community'),
      { id: 'endorsement', label: 'An endorsement letter from the designated community',
        severity: 'closable',
        test: () => false,
        fix: { text: 'Each participating community publishes its own process and contact. You approach the community directly, usually after you have an offer in hand. This is one of the most overlooked overseas routes.', link: 'job-offer.html#rural', linkText: 'Targeting rural communities that want you' } },
      R.minCLB(4, 'CLB 4+ (5 for TEER 0–3 occupations)'),
      R.minEdu('secondary', 'High school or equivalent')
    ],
    notes: ['Communities publish the specific occupations they need. Matching their list matters far more than your overall score.']
  },
  {
    id: 'ab-tourism',
    prov: 'AB',
    name: 'Tourism and Hospitality Stream',
    url: 'https://www.alberta.ca/aaip-tourism-and-hospitality-stream',
    route: 'base',
    kind: 'worker',
    status: 'open',
    summary: 'A narrow stream for people working for an Alberta tourism or hospitality employer, including some lower-skilled roles.',
    reqs: [
      R.field(['hospitality'], 'You work in tourism or hospitality'),
      R.alreadyIn('AB'),
      R.jobOffer('AB', 'A full-time job offer from an eligible tourism or hospitality employer')
    ]
  },
  {
    id: 'ab-rural-entrepreneur',
    prov: 'AB',
    name: 'Rural Entrepreneur Stream',
    url: 'https://www.alberta.ca/aaip-rural-entrepreneur-stream',
    route: 'base',
    kind: 'entrepreneur',
    status: 'open',
    summary: 'Start or buy a business in a rural Alberta community. Lower capital thresholds than most entrepreneur streams.',
    reqs: [ R.business('entrepreneur'), R.funds('f50_150') ]
  },
  {
    id: 'ab-farm',
    prov: 'AB',
    name: 'Farm Stream',
    url: 'https://www.alberta.ca/aaip-farm-stream',
    route: 'base',
    kind: 'entrepreneur',
    status: 'open',
    summary: 'For experienced farmers intending to buy and run an Alberta farm. Requires demonstrable farm management experience, not just agricultural labour.',
    reqs: [ R.business('farm'), R.funds('f150plus') ]
  },

  /* ----------------------------- SASKATCHEWAN ----------------------------- */
  {
    id: 'sk-oid',
    prov: 'SK',
    name: 'International Skilled Worker — Occupation In-Demand',
    url: 'https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-international-skilled-workers/international-skilled-worker-occupations-in-demand',
    route: 'base',
    kind: 'worker',
    status: 'open',
    summary: 'One of the most important streams for someone overseas with no Canadian ties: no job offer, no connection to Saskatchewan, and no need to be in the Express Entry pool. You submit an expression of interest and are ranked.',
    reqs: [
      R.minEdu('cert1yr', 'Post-secondary education comparable to at least one year of Canadian study, with an ECA'),
      R.minExp(1, '1 year of skilled experience in the last 10 years (2 years in the last 5 for trades)'),
      R.minCLB(4, 'CLB 4 or higher, from a test less than two years old'),
      R.teerIn(['teer01', 'teer23'], 'A TEER 0–3 occupation that is on Saskatchewan\'s in-demand list and not on the excluded list'),
      { id: 'points60', label: 'At least 60 points on the SINP points grid (out of 100)',
        severity: 'closable',
        test: a => a.experience >= 1 && a.clb !== 'untested' && Number(a.clb) >= 5 && eduRank(a.education) >= eduRank('cert1yr'),
        fix: { text: 'Points come from education, experience, language, age and connection to Saskatchewan. Language is usually the cheapest place to gain points quickly.', link: 'requirements.html#points-grids', linkText: 'How provincial points grids work' } }
    ],
    notes: [
      'Meeting the minimum only puts you in the pool. Selection is competitive and the cut-off moves.',
      'Check the excluded-occupations list before anything else — it is short but decisive.'
    ]
  },
  {
    id: 'sk-ee',
    prov: 'SK',
    name: 'International Skilled Worker — Saskatchewan Express Entry',
    url: 'https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-international-skilled-workers/international-skilled-worker-saskatchewan-express-entry',
    route: 'enhanced',
    kind: 'worker',
    status: 'open',
    summary: 'The same idea as Occupation In-Demand, but for candidates already in the federal Express Entry pool — and it is faster, because a nomination here adds 600 CRS points.',
    reqs: [
      R.eePool(),
      R.minEdu('cert1yr', 'Post-secondary education with an ECA'),
      R.minExp(1, '1 year of skilled experience in the last 10 years'),
      R.teerIn(['teer01', 'teer23'], 'An in-demand TEER 0–3 occupation'),
      R.minCLB(7, 'CLB 7+, as required to be in the Express Entry pool')
    ],
    notes: ['If you qualify for both this and Occupation In-Demand, submit to both — they are ranked separately.']
  },
  {
    id: 'sk-employment-offer',
    prov: 'SK',
    name: 'International Skilled Worker — Employment Offer',
    url: 'https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-international-skilled-workers/international-skilled-worker-with-employment-offer',
    route: 'both',
    kind: 'worker',
    status: 'open',
    summary: 'With a Saskatchewan job offer you skip the in-demand occupation list entirely, and your occupation can be a wider range including some semi-skilled roles.',
    reqs: [
      R.jobOffer('SK', 'A permanent, full-time job offer from a Saskatchewan employer'),
      R.minCLB(4, 'CLB 4 or higher'),
      R.minEdu('secondary', 'Education and training relevant to the job offer')
    ],
    notes: ['The employer needs a Job Approval Letter from the SINP — this is a step your employer must take, not you.']
  },
  {
    id: 'sk-health',
    prov: 'SK',
    name: 'Health Talent Pathway and International Healthcare Worker EOI Pool',
    url: 'https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-international-skilled-workers',
    route: 'both',
    kind: 'worker',
    status: 'open',
    summary: 'A dedicated pool for healthcare workers, which Saskatchewan draws from directly. Strong option for clinicians overseas.',
    reqs: [
      R.field(['health'], 'You work in a healthcare occupation'),
      R.minCLB(4, 'A valid approved language test result')
    ],
    notes: ['Saskatchewan runs overseas recruitment missions for healthcare. Watch the SINP news page for where and when.']
  },
  {
    id: 'sk-tech',
    prov: 'SK',
    name: 'Innovation and Tech Talent Pathway',
    url: 'https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-international-skilled-workers/sinp-innovation-tech-talent-pathway',
    route: 'both',
    kind: 'worker',
    status: 'open',
    summary: 'A targeted pathway for technology occupations, typically tied to a Saskatchewan tech employer.',
    reqs: [
      R.field(['tech'], 'You work in a technology occupation'),
      R.jobOffer('SK', 'A job offer from a Saskatchewan technology employer')
    ]
  },
  {
    id: 'sk-agri',
    prov: 'SK',
    name: 'Agriculture Talent Pathway',
    url: 'https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-international-skilled-workers',
    route: 'both',
    kind: 'worker',
    status: 'open',
    summary: 'Targeted at agricultural occupations, an area where Saskatchewan has persistent shortages and less competition.',
    reqs: [
      R.field(['agri'], 'You work in an agricultural occupation'),
      R.jobOffer('SK', 'A job offer from a Saskatchewan agricultural employer')
    ]
  },
  {
    id: 'sk-entrepreneur',
    prov: 'SK',
    name: 'Entrepreneur and Farm Owner/Operator',
    url: 'https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/browse-sinp-programs',
    route: 'base',
    kind: 'entrepreneur',
    status: 'open',
    summary: 'Invest in and actively run a Saskatchewan business or farm. You sign a performance agreement and are nominated only after delivering on it.',
    reqs: [ R.business('entrepreneur'), R.funds('f150plus') ]
  },

  /* ------------------------------- MANITOBA ------------------------------- */
  {
    id: 'mb-swo',
    prov: 'MB',
    name: 'Skilled Worker Overseas',
    url: 'https://immigratemanitoba.com/immigrate/skilled-worker-overseas/',
    route: 'base',
    kind: 'worker',
    status: 'open',
    summary: 'Explicitly designed for people outside Canada — but it is gated on having a real, documented connection to Manitoba. Without one, this stream is closed to you no matter how strong your profile.',
    reqs: [
      R.connection('MB'),
      R.minExp(2, '2+ years of work experience in your occupation in the last 5 years'),
      R.minCLB(5, 'CLB 5+ for TEER 2–3 occupations, CLB 6+ for TEER 0–1'),
      R.minEdu('cert1yr', 'Post-secondary education, with an ECA'),
      R.funds('f10_25', 'Settlement funds sufficient for your family size')
    ],
    notes: [
      'The connection can be a close relative settled in Manitoba, or your own previous authorised work or study there.',
      'Manitoba also runs overseas recruitment missions — being invited at one of those counts as a connection in its own right.',
      'You must score at least 60 points on Manitoba\'s assessment grid to submit an expression of interest; actual invitation cut-offs run far higher.'
    ]
  },
  {
    id: 'mb-swm',
    prov: 'MB',
    name: 'Skilled Worker in Manitoba',
    url: 'https://immigratemanitoba.com/immigrate/skilled-worker-in-manitoba/',
    route: 'base',
    kind: 'worker',
    status: 'open',
    summary: 'For people already working in Manitoba. Includes pathways for healthcare, agriculture, mining, manufacturing, energy and tech workers with fewer restrictions.',
    reqs: [
      R.alreadyIn('MB'),
      R.jobOffer('MB', 'A long-term, full-time job offer from your Manitoba employer'),
      R.minCLB(4, 'CLB 4+ (higher for some occupations)')
    ]
  },
  {
    id: 'mb-ies',
    prov: 'MB',
    name: 'International Education Stream',
    url: 'https://immigratemanitoba.com/immigrate/ies/',
    route: 'base',
    kind: 'graduate',
    status: 'open',
    summary: 'For recent graduates of Manitoba institutions, with faster routes for those in in-demand fields or working in a Manitoba start-up.',
    reqs: [ R.studiedIn('MB') ]
  },

  /* ------------------------------ NOVA SCOTIA ----------------------------- */
  {
    id: 'ns-lmp',
    prov: 'NS',
    name: 'Labour Market Priorities',
    url: 'https://liveinnovascotia.com/',
    route: 'enhanced',
    kind: 'worker',
    status: 'open',
    statusNote: 'Draws are occasional and targeted — there is no standing intake to apply to.',
    summary: 'No job offer needed. Nova Scotia periodically searches the Express Entry pool and issues letters of interest to candidates matching whatever it currently needs. You cannot apply — you can only be findable.',
    reqs: [
      R.eePool(),
      R.minCLB(7, 'CLB 7+, as required for the Express Entry pool')
    ],
    notes: [
      'Because draws are targeted and unannounced, the only strategy is to be in the pool with a complete, accurate profile and wait.',
      'Recent draws have favoured healthcare, early childhood education and French speakers.'
    ]
  },
  {
    id: 'ns-skilled-worker',
    prov: 'NS',
    name: 'Skilled Worker',
    url: 'https://liveinnovascotia.com/',
    route: 'base',
    kind: 'worker',
    status: 'open',
    summary: 'The job-offer route into Nova Scotia, and it accepts semi-skilled and low-skilled occupations that most provinces will not.',
    reqs: [
      R.jobOffer('NS', 'A permanent, full-time job offer from a Nova Scotia employer'),
      R.minCLB(5, 'CLB 5+ for TEER 0–3; CLB 4+ for TEER 4–5'),
      R.minExp(1, '1+ year of experience related to the job'),
      R.minEdu('secondary', 'High school or equivalent')
    ]
  },
  {
    id: 'ns-construction',
    prov: 'NS',
    name: 'Critical Construction Worker',
    url: 'https://liveinnovascotia.com/',
    route: 'base',
    kind: 'worker',
    status: 'open',
    summary: 'A targeted route for construction trades, including roles that fall outside the usual skilled-occupation definitions.',
    reqs: [
      R.field(['construction', 'trades'], 'You work in a construction occupation'),
      R.jobOffer('NS', 'A job offer from a Nova Scotia construction employer')
    ]
  },
  {
    id: 'ns-physician',
    prov: 'NS',
    name: 'Physician stream',
    url: 'https://liveinnovascotia.com/',
    route: 'both',
    kind: 'worker',
    status: 'open',
    summary: 'A direct route for physicians with an offer from Nova Scotia Health or the IWK Health Centre.',
    reqs: [
      R.field(['health'], 'You are a physician'),
      R.jobOffer('NS', 'An offer from Nova Scotia Health or IWK Health Centre')
    ]
  },

  /* ----------------------------- NEW BRUNSWICK ---------------------------- */
  {
    id: 'nb-ee-labour',
    prov: 'NB',
    name: 'NB Express Entry Labour Market Stream',
    url: 'https://www.welcomenb.ca/en/immigrate/',
    route: 'enhanced',
    kind: 'worker',
    status: 'paused',
    statusNote: 'Reported paused as of 2026. Confirm on the official page before planning around it.',
    summary: 'When open, this draws Express Entry candidates with a New Brunswick job offer. Currently not accepting applications.',
    reqs: [ R.eePool(), R.jobOffer('NB') ]
  },
  {
    id: 'nb-experience',
    prov: 'NB',
    name: 'New Brunswick Experience',
    url: 'https://www.welcomenb.ca/en/immigrate/',
    route: 'base',
    kind: 'worker',
    status: 'limited',
    statusNote: 'Since May 2026 invitations have been limited to healthcare, education and construction trades.',
    summary: 'For people already working in New Brunswick, now narrowed to three priority sectors.',
    reqs: [
      R.alreadyIn('NB'),
      R.field(['health', 'education', 'construction', 'trades'], 'You work in healthcare, education or a construction trade')
    ]
  },
  {
    id: 'nb-strategic',
    prov: 'NB',
    name: 'Strategic Initiative (Francophone)',
    url: 'https://www.welcomenb.ca/en/immigrate/',
    route: 'both',
    kind: 'worker',
    status: 'open',
    summary: 'A French-language route into New Brunswick, Canada\'s only officially bilingual province — and one of the best-value uses of French if you have it.',
    reqs: [
      R.frenchNCLC(5),
      R.minExp(1, '1+ year of relevant work experience')
    ],
    notes: ['New Brunswick recruits actively at French-language job fairs abroad, particularly in France and francophone Africa.']
  },

  /* --------------------------------- PEI ---------------------------------- */
  {
    id: 'pe-ee',
    prov: 'PE',
    name: 'PEI Express Entry',
    url: 'https://www.princeedwardisland.ca/en/topic/office-of-immigration',
    route: 'enhanced',
    kind: 'worker',
    status: 'open',
    summary: 'PEI draws from the Express Entry pool, with monthly expression-of-interest draws. Small province, small allocation, but a genuine no-job-offer possibility.',
    reqs: [ R.eePool(), R.minCLB(7) ],
    notes: ['PEI has signalled it will limit invitations in occupations that are already oversubscribed.']
  },
  {
    id: 'pe-critical-worker',
    prov: 'PE',
    name: 'Critical Worker',
    url: 'https://www.princeedwardisland.ca/en/topic/office-of-immigration',
    route: 'base',
    kind: 'worker',
    status: 'open',
    summary: 'For people already working in PEI in specific occupations such as truck driving, food service, housekeeping and labourer roles.',
    reqs: [
      R.alreadyIn('PE'),
      R.jobOffer('PE', 'A full-time, permanent job offer from your PEI employer'),
      R.minCLB(4)
    ]
  },

  /* ---------------------- NEWFOUNDLAND AND LABRADOR ----------------------- */
  {
    id: 'nl-priority-skills',
    prov: 'NL',
    name: 'Priority Skills NL',
    url: 'https://www.gov.nl.ca/immigration/',
    route: 'enhanced',
    kind: 'worker',
    status: 'open',
    summary: 'Newfoundland\'s no-job-offer route, aimed at in-demand talent — particularly technology, healthcare and aquaculture — and at graduates of Canadian master\'s and doctoral programs.',
    reqs: [
      R.eePool(),
      R.minEdu('bachelor', 'A degree-level credential'),
      R.minCLB(7)
    ]
  },
  {
    id: 'nl-skilled-worker',
    prov: 'NL',
    name: 'Skilled Worker / Express Entry Skilled Worker',
    url: 'https://www.gov.nl.ca/immigration/',
    route: 'both',
    kind: 'worker',
    status: 'open',
    summary: 'The job-offer route into Newfoundland and Labrador, available both inside and outside Express Entry.',
    reqs: [
      R.jobOffer('NL', 'A job offer from a Newfoundland and Labrador employer'),
      R.minCLB(5),
      R.minEdu('secondary')
    ]
  },

  /* -------------------------------- YUKON --------------------------------- */
  {
    id: 'yt-skilled',
    prov: 'YT',
    name: 'Yukon Skilled Worker and Critical Impact Worker',
    url: 'https://yukon.ca/en/immigrate-yukon',
    route: 'both',
    kind: 'worker',
    status: 'windows',
    statusNote: 'Yukon opens two intake windows a year and expressions of interest do not carry over between them. Timing matters as much as eligibility.',
    summary: 'Employer-driven throughout. The Critical Impact Worker lane covers lower-skilled occupations (TEER 4–5), which is unusual and useful.',
    reqs: [
      R.jobOffer('YT', 'A full-time, permanent job offer from a Yukon employer'),
      R.minCLB(4, 'CLB 4+ for Critical Impact Worker; higher for Skilled Worker')
    ],
    notes: ['Yukon\'s annual allocation is small — a few hundred nominations — so intake windows fill fast.']
  },

  /* ------------------------ NORTHWEST TERRITORIES ------------------------- */
  {
    id: 'nt-employer-driven',
    prov: 'NT',
    name: 'Employer Driven — Skilled Worker and Entry Level/Semi-Skilled',
    url: 'https://www.immigratenwt.ca/',
    route: 'both',
    kind: 'worker',
    status: 'open',
    statusNote: 'Moved to expression-of-interest draws in 2026.',
    summary: 'The NWT route is entirely employer-led, and it covers entry-level and semi-skilled work as well as skilled occupations.',
    reqs: [
      R.jobOffer('NT', 'A job offer from an approved Northwest Territories employer'),
      R.minCLB(4)
    ]
  },
  {
    id: 'nt-francophone',
    prov: 'NT',
    name: 'Francophone Stream',
    url: 'https://www.immigratenwt.ca/',
    route: 'both',
    kind: 'worker',
    status: 'open',
    summary: 'A French-language stream for the Northwest Territories, still requiring an employer.',
    reqs: [ R.frenchNCLC(5), R.jobOffer('NT', 'A job offer from an NWT employer') ]
  },

  /* ------------------ FEDERAL ROUTES THAT ARE NOT PNP --------------------- */
  {
    id: 'ca-aip',
    prov: 'CA',
    name: 'Atlantic Immigration Program (AIP)',
    url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration.html',
    route: 'base',
    kind: 'federal',
    status: 'open',
    summary: 'Not a PNP, but it belongs in the same conversation: a permanent-residence route into Nova Scotia, New Brunswick, PEI or Newfoundland that needs a job offer from a designated employer — and crucially, no LMIA. That makes employers far more willing to hire you.',
    reqs: [
      R.designatedEmployer('designated employer in Atlantic Canada', null, ['NS','NB','PE','NL']),
      R.minExp(1, '1+ year of relevant work experience in the last 5 years'),
      R.minCLB(4, 'CLB 4+ or higher depending on the occupation\'s TEER level'),
      R.minEdu('secondary', 'A high school diploma or higher, with an ECA if earned abroad')
    ],
    notes: [
      'Because no LMIA is needed, the employer\'s paperwork burden is dramatically lower. Lead with this when you approach Atlantic employers — many small employers do not know it exists.',
      'Designated employers are published by each province. Apply to those lists directly rather than to the general job market.',
      'You also need a settlement plan from an approved settlement organisation, and an endorsement from the province.'
    ]
  },
  {
    id: 'ca-rcip',
    prov: 'CA',
    name: 'Rural Community Immigration Pilot (RCIP)',
    url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/rural-immigration.html',
    route: 'base',
    kind: 'federal',
    status: 'open',
    summary: 'Fourteen designated rural communities across Canada select candidates with a job offer from a local designated employer. Far less competition than the big provinces, and explicitly open from overseas.',
    reqs: [
      R.designatedEmployer('designated employer inside one of the 14 participating communities'),
      R.minExp(1, '1+ year of relevant work experience'),
      R.minCLB(4, 'CLB 4–6 depending on the occupation\'s TEER level'),
      R.minEdu('secondary', 'A high school diploma or higher'),
      R.funds('f10_25', 'Proof of settlement funds')
    ],
    notes: [
      'The job must be full-time (30+ paid hours a week), non-seasonal and permanent, and located inside the community boundary.',
      'You also need a recommendation from the community\'s economic development organisation.'
    ]
  },
  {
    id: 'ca-fcip',
    prov: 'CA',
    name: 'Francophone Community Immigration Pilot (FCIP)',
    url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/franco-immigration.html',
    route: 'base',
    kind: 'federal',
    status: 'open',
    summary: 'The same structure as RCIP, but for six French-minority communities outside Quebec — and it requires French rather than English. If you speak French, this is one of the least contested routes into Canada.',
    reqs: [
      R.frenchNCLC(5),
      R.designatedEmployer('designated employer in one of the 6 francophone communities'),
      R.minExp(1, '1+ year of relevant work experience'),
      R.minEdu('secondary', 'A high school diploma or higher'),
      R.funds('f10_25', 'Proof of settlement funds')
    ],
    notes: ['French ability is assessed with TEF Canada or TCF Canada. English test results do not substitute here.']
  },
  {
    id: 'ca-ee-category',
    prov: 'CA',
    name: 'Express Entry category-based draws',
    url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html',
    route: 'enhanced',
    kind: 'federal',
    status: 'open',
    summary: 'Not a PNP at all, but worth knowing: IRCC runs draws targeting specific categories — healthcare, trades, education, agriculture, and French speakers — at much lower score cut-offs than general draws. No provincial nomination required.',
    reqs: [
      R.eePool(),
      R.minCLB(7, 'CLB 7+ across all four abilities'),
      R.minExp(1, '6 months to 1 year of experience in a category occupation, depending on the category')
    ],
    notes: [
      'French-language draws have consistently had among the lowest cut-offs of any draw type.',
      'If you qualify for a category draw, you may not need a PNP at all.'
    ]
  }
];

/* Quebec and Nunavut have no PNP — surfaced as an explanatory note, not a card. */
const NO_PNP_NOTE = {
  QC: 'Quebec runs its own immigration system entirely separately under an agreement with the federal government. It is not part of the PNP, and nothing in this tool applies to it. Start at Quebec\'s own immigration ministry.',
  NU: 'Nunavut does not operate a Provincial Nominee Program.'
};
