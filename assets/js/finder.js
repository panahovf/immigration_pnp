/* =============================================================================
   PNP Navigator — questionnaire and matching engine
   Depends on data.js (PROVINCES, STREAMS, VERIFIED, NO_PNP_NOTE).
   ============================================================================= */

(function () {
  'use strict';

  const PROV_CHOICES = ['ON','BC','AB','SK','MB','NS','NB','PE','NL','YT','NT']
    .map(k => ({ value: k, label: PROVINCES[k].name }));

  /* ------------------------------- Questions ------------------------------ */

  const QUESTIONS = [
    {
      id: 'location',
      title: 'Where are you right now?',
      help: 'Several streams are only open to people already inside Canada. Knowing this first stops the tool showing you routes you cannot actually use.',
      options: [
        { value: 'outside',         label: 'Outside Canada',                 desc: 'This is the starting point for most people using this guide.' },
        { value: 'in_canada_work',  label: 'In Canada on a work permit' },
        { value: 'in_canada_study', label: 'In Canada on a study permit' },
        { value: 'in_canada_other', label: 'In Canada as a visitor or on another status' }
      ]
    },
    {
      id: 'canadaWork',
      title: 'Which province are you working in?',
      showIf: a => a.location === 'in_canada_work',
      options: PROV_CHOICES
    },
    {
      id: 'canadaStudy',
      title: 'Which province are you studying in?',
      showIf: a => a.location === 'in_canada_study',
      options: PROV_CHOICES
    },
    {
      id: 'jobOffer',
      title: 'Do you have a job offer from a Canadian employer?',
      help: 'Be strict with yourself here. A written offer of employment means a signed document naming the role, the wage and the hours — not an interview, a recruiter conversation, or a promise.',
      options: [
        { value: 'none',      label: 'No, and I have not started looking' },
        { value: 'searching', label: 'No, but I am actively looking' },
        { value: 'have',      label: 'Yes, I have a written job offer' }
      ]
    },
    {
      id: 'jobOfferProv',
      title: 'Which province is that job offer in?',
      showIf: a => a.jobOffer === 'have',
      options: PROV_CHOICES.concat([{ value: 'unsure', label: 'I am not sure yet' }])
    },
    {
      id: 'offerDesignated',
      title: 'Is that employer approved by an immigration program?',
      help: 'Some programs \u2014 the Atlantic Immigration Program, and the rural and francophone community pilots \u2014 only accept offers from employers that registered with them in advance. Those employers appear on published lists. Most employers are not on any list, and that is normal.',
      showIf: a => a.jobOffer === 'have',
      footnote: { text: 'Not sure? It is worth checking, because a designated employer can usually hire you without an LMIA.', link: 'job-offer.html#designated', linkText: 'How designated-employer programs work' },
      options: [
        { value: 'yes',    label: 'Yes \u2014 they are a designated or approved employer' },
        { value: 'no',     label: 'No, or they are not part of any program' },
        { value: 'unsure', label: 'I do not know' }
      ]
    },
    {
      id: 'field',
      title: 'Which of these is closest to your line of work?',
      help: 'Many streams target specific sectors. Pick the field you have the most experience in, not the one you would like to move into.',
      options: [
        { value: 'health',       label: 'Healthcare',        desc: 'Nursing, medicine, allied health, care work. The single most in-demand sector across almost every province.' },
        { value: 'tech',         label: 'Technology',        desc: 'Software, data, IT, engineering.' },
        { value: 'trades',       label: 'Skilled trades',    desc: 'Electrician, welder, mechanic, plumber, machinist.' },
        { value: 'construction', label: 'Construction' },
        { value: 'agri',         label: 'Agriculture and food production' },
        { value: 'transport',    label: 'Transport and logistics', desc: 'Truck driving, warehousing, supply chain.' },
        { value: 'hospitality',  label: 'Hospitality and tourism' },
        { value: 'education',    label: 'Education and childcare' },
        { value: 'business',     label: 'Business, finance and administration' },
        { value: 'other',        label: 'Something else' }
      ]
    },
    {
      id: 'teer',
      title: 'How skilled is your occupation, in Canada’s classification?',
      help: 'Canada sorts every job into a TEER level from 0 to 5, based on the training it requires. This single number decides which streams you can use, so it is worth looking up properly rather than guessing.',
      footnote: { text: 'Not sure? Choose the last option and check your NOC code afterwards.', link: 'requirements.html#noc', linkText: 'How to find your NOC code and TEER level' },
      options: [
        { value: 'teer01', label: 'TEER 0 or 1 — management, or a job needing a university degree', desc: 'Doctors, engineers, managers, accountants, teachers.' },
        { value: 'teer23', label: 'TEER 2 or 3 — a job needing a college diploma, apprenticeship, or 2+ years of training', desc: 'Nurses, electricians, technologists, chefs, truck drivers.' },
        { value: 'teer45', label: 'TEER 4 or 5 — a job needing high school or short on-the-job training', desc: 'Food service, cleaning, labouring, retail, harvesting.' },
        { value: 'unsure', label: 'I do not know yet', desc: 'The tool will show you everything and flag where this matters.' }
      ]
    },
    {
      id: 'experience',
      title: 'How many years have you worked in that occupation?',
      help: 'Count paid, full-time work in the same occupation over roughly the last ten years. Part-time counts proportionally. Unpaid internships and volunteering do not count.',
      options: [
        { value: 0, label: 'Less than a year' },
        { value: 1, label: '1 to 2 years' },
        { value: 2, label: '2 to 4 years' },
        { value: 4, label: '4 to 6 years' },
        { value: 6, label: 'More than 6 years' }
      ]
    },
    {
      id: 'education',
      title: 'What is your highest completed level of education?',
      help: 'What matters is the Canadian equivalent of your credential, which is established by an Educational Credential Assessment. A three-year foreign bachelor’s degree does not always assess as a Canadian bachelor’s degree.',
      options: [
        { value: 'none',      label: 'No formal qualifications' },
        { value: 'secondary', label: 'High school' },
        { value: 'cert1yr',   label: 'A post-secondary certificate or diploma of at least one year' },
        { value: 'bachelor',  label: 'A bachelor’s degree' },
        { value: 'masters',   label: 'A master’s degree' },
        { value: 'phd',       label: 'A doctorate' }
      ]
    },
    {
      id: 'clb',
      title: 'What is your English or French level?',
      help: 'Canada measures language in Canadian Language Benchmarks (CLB). Only results from an approved test count, and they expire after two years. If you have not taken one, say so — it is usually the fastest thing to fix.',
      footnote: { text: 'Roughly: IELTS 6.0 in each band is about CLB 7. IELTS 5.0 is about CLB 5.', link: 'requirements.html#language', linkText: 'Language tests explained' },
      options: [
        { value: 'untested', label: 'I have not taken an approved test yet' },
        { value: 4,  label: 'About CLB 4 — basic' },
        { value: 5,  label: 'About CLB 5 — modest' },
        { value: 6,  label: 'About CLB 6 — competent' },
        { value: 7,  label: 'About CLB 7 — good (IELTS 6.0 in each band)' },
        { value: 9,  label: 'CLB 9 or above — strong (IELTS 8/7/7/7)' }
      ]
    },
    {
      id: 'french',
      title: 'Do you speak French?',
      help: 'French is the most undervalued advantage in Canadian immigration. Francophone streams and French-language federal draws consistently have lower thresholds and far less competition.',
      options: [
        { value: 'none',   label: 'No' },
        { value: 'some',   label: 'A little, but not at a working level' },
        { value: 'nclc5',  label: 'Yes, at an intermediate level (around NCLC 5)' },
        { value: 'nclc7',  label: 'Yes, fluently (NCLC 7 or above)' }
      ]
    },
    {
      id: 'connections',
      title: 'Do you have real ties to any of these provinces?',
      help: 'Ties means something specific and documentable: a close relative who is a citizen or permanent resident settled there, or your own previous authorised work or study there. Some streams are closed without one. Select all that apply.',
      multi: true,
      options: PROV_CHOICES.concat([{ value: 'none', label: 'None of these', exclusive: true }])
    },
    {
      id: 'funds',
      title: 'How much money could you show in savings today?',
      help: 'Most routes require proof that you can support yourself on arrival. It has to be your own money, readily available, and visible in several months of bank statements. Borrowed funds deposited shortly before applying are routinely rejected.',
      options: [
        { value: 'under10',  label: 'Under $10,000 CAD' },
        { value: 'f10_25',   label: '$10,000 – $25,000 CAD' },
        { value: 'f25_50',   label: '$25,000 – $50,000 CAD' },
        { value: 'f50_150',  label: '$50,000 – $150,000 CAD' },
        { value: 'f150plus', label: 'Over $150,000 CAD' }
      ]
    },
    {
      id: 'business',
      title: 'Would you consider starting or buying a business in Canada?',
      help: 'Entrepreneur streams are a genuinely different path: significant capital, a business plan, and usually a period of actually running the business before you are nominated. Only say yes if you mean it.',
      options: [
        { value: 'no',           label: 'No — I want to immigrate as a worker' },
        { value: 'entrepreneur', label: 'Yes — I would start or buy a business' },
        { value: 'farm',         label: 'Yes — specifically a farm' },
        { value: 'either',       label: 'Maybe — show me the options' }
      ]
    }
  ];

  /* --------------------------------- State -------------------------------- */

  const STORE_KEY = 'pnp-navigator-answers-v1';
  let answers = {};
  let idx = 0;

  function load() {
    try {
      const fromUrl = location.hash.startsWith('#r=') ? location.hash.slice(3) : null;
      if (fromUrl) {
        answers = JSON.parse(decodeURIComponent(escape(atob(fromUrl.replace(/-/g, '+').replace(/_/g, '/')))));
        return true;
      }
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) { answers = JSON.parse(raw); return false; }
    } catch (e) { answers = {}; }
    return false;
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(answers)); } catch (e) { /* private mode */ }
  }

  function encodeAnswers() {
    try {
      return btoa(unescape(encodeURIComponent(JSON.stringify(answers))))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (e) { return ''; }
  }

  /* Questions that apply given current answers. */
  const active = () => QUESTIONS.filter(q => !q.showIf || q.showIf(answers));

  const isAnswered = q => {
    const v = answers[q.id];
    if (q.multi) return Array.isArray(v) && v.length > 0;
    return v !== undefined && v !== null;
  };

  /* ------------------------------ Evaluation ------------------------------ */

  function evaluate(stream, a) {
    const met = [], gaps = [], blockers = [];
    stream.reqs.forEach(r => {
      if (r.test(a)) met.push(r);
      else if (r.severity === 'blocking') blockers.push(r);
      else gaps.push(r);
    });
    let status = blockers.length ? 'no' : (gaps.length ? 'warn' : 'ok');
    if (status === 'ok' && (stream.status === 'paused' || stream.status === 'closed')) status = 'warn';
    return { status, met, gaps, blockers };
  }

  function relevantStreams(a) {
    return STREAMS.filter(s => {
      if (s.kind === 'entrepreneur') {
        return a.business === 'entrepreneur' || a.business === 'farm' || a.business === 'either';
      }
      return true;
    });
  }

  /* ------------------------------- Rendering ------------------------------ */

  const el = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

  function renderQuestion() {
    const list = active();
    if (idx >= list.length) return renderResults();
    if (idx < 0) idx = 0;

    const q = list[idx];
    const pct = Math.round((idx / list.length) * 100);

    el('finder').innerHTML = `
      <div class="progress-head">
        <span class="step-count">Question ${idx + 1} of ${list.length}</span>
        <button type="button" class="btn ghost" id="startOver">Start over</button>
      </div>
      <div class="progress-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"
           aria-label="Progress through the questions"><span style="width:${pct}%"></span></div>

      <div class="q-card">
        <h2 class="q-title">${esc(q.title)}</h2>
        ${q.help ? `<p class="q-help">${esc(q.help)}</p>` : ''}
        <fieldset style="border:0;padding:0;margin:0">
          <legend class="visually-hidden">${esc(q.title)}</legend>
          <div class="opts">
            ${q.options.map((o, i) => optionHtml(q, o, i)).join('')}
          </div>
        </fieldset>
        ${q.footnote ? `<p class="q-help small" style="margin:14px 0 0">${esc(q.footnote.text)}
            <a href="${q.footnote.link}" target="_blank" rel="noopener">${esc(q.footnote.linkText)}</a>.</p>` : ''}
        <div class="q-nav">
          <button type="button" class="btn secondary" id="back" ${idx === 0 ? 'disabled' : ''}>Back</button>
          <span class="spacer"></span>
          <button type="button" class="btn" id="next" ${isAnswered(q) ? '' : 'disabled'}>
            ${idx === list.length - 1 ? 'See my results' : 'Next'}
          </button>
        </div>
      </div>`;

    wireQuestion(q);
    el('finder').querySelector('.q-title').focus();
  }

  function optionHtml(q, o, i) {
    const type = q.multi ? 'checkbox' : 'radio';
    const cur = answers[q.id];
    const checked = q.multi
      ? Array.isArray(cur) && cur.includes(o.value)
      : cur === o.value;
    return `
      <label class="opt">
        <input type="${type}" name="${esc(q.id)}" value="${esc(o.value)}" ${checked ? 'checked' : ''}
               data-exclusive="${o.exclusive ? '1' : ''}">
        <span>
          <span class="opt-label">${esc(o.label)}</span>
          ${o.desc ? `<span class="opt-desc">${esc(o.desc)}</span>` : ''}
        </span>
      </label>`;
  }

  function wireQuestion(q) {
    const root = el('finder');
    root.querySelector('.q-title').setAttribute('tabindex', '-1');

    root.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', () => {
        if (q.multi) {
          let vals = Array.from(root.querySelectorAll('input:checked')).map(i => i.value);
          // "None of these" clears everything else, and vice versa.
          if (input.dataset.exclusive && input.checked) {
            vals = [input.value];
          } else if (input.checked) {
            vals = vals.filter(v => {
              const opt = q.options.find(o => String(o.value) === v);
              return !(opt && opt.exclusive);
            });
          }
          answers[q.id] = vals;
          root.querySelectorAll('input').forEach(i => { i.checked = vals.includes(i.value); });
        } else {
          const opt = q.options.find(o => String(o.value) === input.value);
          answers[q.id] = opt ? opt.value : input.value;
        }
        save();
        el('next').disabled = !isAnswered(q);
        if (!q.multi) { idx++; renderQuestion(); }
      });
    });

    el('next').addEventListener('click', () => { idx++; renderQuestion(); });
    el('back').addEventListener('click', () => { idx--; renderQuestion(); });
    el('startOver').addEventListener('click', () => {
      if (!confirm('Clear your answers and start again?')) return;
      answers = {}; idx = 0; save();
      history.replaceState(null, '', location.pathname);
      renderQuestion();
    });
  }

  /* -------------------------------- Results ------------------------------- */

  const GROUPS = {
    ok:   { title: 'Worth pursuing now',
            note: 'On the answers you gave, you appear to meet the main published requirements for these. That is not the same as being accepted — most streams are competitive and meeting the minimum only puts you in the pool — but these are where your effort belongs.' },
    warn: { title: 'Within reach, with work',
            note: 'Each of these is blocked by something you can actually go and get: a job offer, a language test, a credential assessment, savings, or more experience. The missing pieces are listed with each one.' },
    no:   { title: 'Not a realistic route right now',
            note: 'These need something structural you do not currently have — usually already living in the province, having studied there, or working in a sector they are not recruiting for. Shown so you know why, rather than leaving you wondering.' }
  };

  function renderResults() {
    const a = answers;
    const streams = relevantStreams(a);
    const scored = streams.map(s => ({ s, r: evaluate(s, a) }));
    const by = { ok: [], warn: [], no: [] };
    scored.forEach(x => by[x.r.status].push(x));

    // Within each group, put the least-blocked first.
    by.warn.sort((x, y) => x.r.gaps.length - y.r.gaps.length);
    by.no.sort((x, y) => x.r.blockers.length - y.r.blockers.length);

    el('finder').innerHTML = `
      <div class="results-summary">
        <h2 style="margin-top:0">Your results</h2>
        <p class="muted" style="margin-bottom:0">Matched against ${streams.length} streams across every province and territory that runs a nominee program, plus the federal routes that work the same way. Requirements confirmed ${esc(VERIFIED)}.</p>
        <div class="tally">
          <div class="tally-item ok"><span class="n">${by.ok.length}</span><span class="l">Worth pursuing now</span></div>
          <div class="tally-item warn"><span class="n">${by.warn.length}</span><span class="l">Within reach</span></div>
          <div class="tally-item no"><span class="n">${by.no.length}</span><span class="l">Not a fit yet</span></div>
        </div>
      </div>

      ${nextStepsHtml(a, by)}

      ${['ok','warn','no'].map(k => groupHtml(k, by[k])).join('')}

      ${quebecNote(a)}

      <div class="q-nav" style="margin-top:32px">
        <button type="button" class="btn secondary" id="redo">Change my answers</button>
        <button type="button" class="btn secondary" id="copyLink">Copy a link to these results</button>
        <button type="button" class="btn secondary" id="printBtn">Print or save as PDF</button>
      </div>
      <p class="small muted" style="margin-top:18px;max-width:var(--measure)">
        This tool reads published eligibility rules. It cannot see your documents, your family situation, or your immigration history,
        and it is not legal advice. Before you spend money on anything, confirm the requirements on the official page linked in each card.
      </p>`;

    el('redo').addEventListener('click', () => { idx = 0; renderQuestion(); window.scrollTo(0, 0); });
    el('printBtn').addEventListener('click', () => window.print());
    el('copyLink').addEventListener('click', ev => {
      const url = location.origin + location.pathname + '#r=' + encodeAnswers();
      navigator.clipboard?.writeText(url).then(
        () => { ev.target.textContent = 'Link copied'; setTimeout(() => { ev.target.textContent = 'Copy a link to these results'; }, 2200); },
        () => { history.replaceState(null, '', '#r=' + encodeAnswers()); ev.target.textContent = 'Link is in the address bar'; }
      );
    });

    window.scrollTo(0, 0);
  }

  function groupHtml(key, items) {
    if (!items.length) return '';
    const g = GROUPS[key];
    const pillClass = key === 'ok' ? 'ok' : key === 'warn' ? 'warn' : '';
    return `
      <section class="result-group">
        <h2>${esc(g.title)} <span class="pill ${pillClass}">${items.length}</span></h2>
        <p class="group-note">${esc(g.note)}</p>
        ${items.map(x => streamHtml(x.s, x.r, key)).join('')}
      </section>`;
  }

  function streamHtml(s, r, key) {
    const p = PROVINCES[s.prov];
    const statusPill = {
      paused:  '<span class="pill warn">Currently paused</span>',
      closed:  '<span class="pill no">Closed</span>',
      limited: '<span class="pill warn">Narrowed intake</span>',
      windows: '<span class="pill warn">Fixed intake windows</span>'
    }[s.status] || '';

    const routePill = { enhanced: 'Express Entry', base: 'Direct to PR', both: 'Either route' }[s.route];

    return `
      <details class="stream is-${key}">
        <summary class="stream-head">
          <span class="st-main">
            <span class="st-prov">${esc(p.name)} · ${esc(p.program)}</span>
            <span class="st-name">${esc(s.name)}</span>
            <span class="st-sub">${key === 'ok' ? 'You appear to meet the published requirements'
              : key === 'warn' ? `${r.gaps.length} thing${r.gaps.length === 1 ? '' : 's'} to get first`
              : r.blockers.map(b => b.label).slice(0, 1).join('')}</span>
          </span>
          <span class="chev" aria-hidden="true">›</span>
        </summary>
        <div class="stream-body">
          <p>${esc(s.summary)}</p>
          ${s.statusNote ? `<div class="note warn"><div class="note-title">Status</div><p>${esc(s.statusNote)}</p></div>` : ''}

          ${r.met.length ? `<h4>What you already meet</h4><ul class="check-list">
            ${r.met.map(m => `<li class="yes"><span class="ic">✓</span><span>${esc(m.label)}</span></li>`).join('')}
          </ul>` : ''}

          ${r.gaps.length ? `<h4>What you would need to get</h4><ul class="check-list">
            ${r.gaps.map(m => `<li class="gap"><span class="ic">→</span><span>${esc(m.label)}
              <span class="fix">${esc(m.fix.text)} <a href="${m.fix.link}">${esc(m.fix.linkText)}</a>.</span>
            </span></li>`).join('')}
          </ul>` : ''}

          ${r.blockers.length ? `<h4>Why this is not open to you right now</h4><ul class="check-list">
            ${r.blockers.map(m => `<li class="bad"><span class="ic">✕</span><span>${esc(m.label)}
              <span class="fix">${esc(m.fix.text)} <a href="${m.fix.link}">${esc(m.fix.linkText)}</a>.</span>
            </span></li>`).join('')}
          </ul>` : ''}

          ${s.notes && s.notes.length ? `<h4>Worth knowing</h4><ul>${s.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}

          <div class="stream-meta">
            <span class="pill accent">${esc(routePill)}</span>
            ${statusPill}
            <span class="pill">Checked ${esc(VERIFIED)}</span>
          </div>
          <div class="stream-links">
            <a href="${esc(s.url)}" target="_blank" rel="noopener">Official page for this stream ↗</a>
          </div>
        </div>
      </details>`;
  }

  /* A short, opinionated "do this next" block driven by the biggest gaps. */
  function nextStepsHtml(a, by) {
    const steps = [];

    if (a.clb === 'untested') {
      steps.push({
        t: 'Book a language test',
        d: 'Nothing else can be assessed until you have one, it gates almost every stream on this page, and it is the cheapest and fastest thing on your list. Book IELTS General Training or CELPIP.',
        href: 'requirements.html#language', link: 'What the tests are and how to book'
      });
    }
    if (a.education !== 'none' && a.education !== 'secondary') {
      steps.push({
        t: 'Start your credential assessment (ECA)',
        d: 'It takes weeks to months because it depends on your university sending documents, so start it early and in parallel with everything else.',
        href: 'requirements.html#eca', link: 'How to get an ECA'
      });
    }
    if (a.jobOffer !== 'have') {
      steps.push({
        t: 'Work out whether you actually need a job offer',
        d: by.ok.concat(by.warn).some(x => !x.s.reqs.some(r => r.id === 'jobOffer' || r.id === 'designatedEmployer'))
          ? 'Some of the routes above do not need one — pursue those first, and treat job hunting as a parallel effort rather than a prerequisite.'
          : 'On your answers, every realistic route runs through an employer. That makes the job search the whole task, so it is worth doing it properly.',
        href: 'job-offer.html', link: 'Getting a Canadian job offer from overseas'
      });
    }
    if (a.teer === 'unsure') {
      steps.push({
        t: 'Find your NOC code',
        d: 'Your five-digit occupation code and its TEER level decide which streams you can use. Guessing it wrongly can invalidate an application later.',
        href: 'requirements.html#noc', link: 'Finding your NOC code'
      });
    }
    if (a.french === 'some' || a.french === 'none') {
      steps.push({
        t: 'Consider French, seriously',
        d: 'French-language routes have consistently lower thresholds and much less competition than English ones. Reaching an intermediate level opens doors that are effectively shut otherwise.',
        href: 'requirements.html#language', link: 'Why French changes the maths'
      });
    }

    if (!steps.length) return '';
    return `
      <section class="result-group">
        <h2>Do these first</h2>
        <p class="group-note">Regardless of which stream you end up using, these are the things that unlock the most options, ordered by how much they open up relative to the effort.</p>
        <div class="grid two">
          ${steps.slice(0, 4).map(s => `
            <div class="card">
              <h3 style="margin-top:0">${esc(s.t)}</h3>
              <p class="small">${esc(s.d)}</p>
              <a class="small" href="${s.href}">${esc(s.link)} →</a>
            </div>`).join('')}
        </div>
      </section>`;
  }

  function quebecNote() {
    return `
      <div class="note">
        <div class="note-title">Two places this tool does not cover</div>
        <p><strong>Quebec.</strong> ${esc(NO_PNP_NOTE.QC)}</p>
        <p class="mb-0"><strong>Nunavut.</strong> ${esc(NO_PNP_NOTE.NU)}</p>
      </div>`;
  }

  /* --------------------------------- Boot --------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    if (!el('finder')) return;
    const fromLink = load();
    const list = active();
    const allDone = list.every(isAnswered);
    if (fromLink && allDone) { renderResults(); return; }
    idx = 0;
    // Resume where they left off.
    while (idx < list.length && isAnswered(list[idx])) idx++;
    if (idx >= list.length && allDone) renderResults(); else renderQuestion();
  });
})();
