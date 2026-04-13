const views = [
  { id: 'landing', label: 'Landing / Dashboard' },
  { id: 'creator', label: 'Creator Dashboard' },
  { id: 'client', label: 'Client Dashboard' },
  { id: 'discovery', label: 'Track Discovery' },
  { id: 'submission', label: 'Submission View' },
];

const data = {
  tracks: [
    { title: 'Neon Echo', artist: 'Astra Vale', bpm: 122, genre: 'Synth Pop', mood: 'Uplifting', duration: '3:11', status: 'Ready' },
    { title: 'Gold in Motion', artist: 'Kairo Lane', bpm: 96, genre: 'Alt R&B', mood: 'Confident', duration: '2:54', status: 'Needs Stems' },
    { title: 'Runaway Lights', artist: 'Mara Dune', bpm: 128, genre: 'Dance', mood: 'Energetic', duration: '3:28', status: 'Ready' },
    { title: 'City of Glass', artist: 'Dune Harbor', bpm: 84, genre: 'Cinematic', mood: 'Emotional', duration: '4:02', status: 'Under Review' },
    { title: 'After Midnight', artist: 'Jett Noor', bpm: 118, genre: 'Electro Pop', mood: 'Dark', duration: '3:36', status: 'Ready' },
  ],
  briefs: [
    { id: 'BR-2149', title: 'Sportswear Campaign Q3', client: 'Northline Athletics', budget: '$28K', deadline: 'Apr 18, 2026', genre: 'Hip-Hop / Energetic', status: 'Open' },
    { id: 'BR-2156', title: 'Streaming Series Teaser', client: 'Aurora Studio', budget: '$45K', deadline: 'Apr 26, 2026', genre: 'Cinematic / Tension', status: 'Reviewing' },
    { id: 'BR-2162', title: 'Luxury EV Launch Spot', client: 'Velar Motors', budget: '$60K', deadline: 'May 5, 2026', genre: 'Ambient / Modern', status: 'Open' },
  ],
  submissions: [
    { track: 'Neon Echo', brief: 'BR-2149', creator: 'Astra Vale', status: 'Shortlisted', updated: '2h ago' },
    { track: 'Gold in Motion', brief: 'BR-2149', creator: 'Kairo Lane', status: 'Submitted', updated: '5h ago' },
    { track: 'City of Glass', brief: 'BR-2156', creator: 'Dune Harbor', status: 'In Review', updated: '1d ago' },
    { track: 'After Midnight', brief: 'BR-2162', creator: 'Jett Noor', status: 'Selected', updated: '30m ago' },
  ],
};

const state = {
  activeView: 'landing',
  selectedBriefId: data.briefs[0].id,
  discoveryQuery: '',
  discoveryGenre: 'all',
  discoveryMood: 'all',
};

const navEl = document.getElementById('primary-nav');
const viewContainer = document.getElementById('view-container');
const titleEl = document.getElementById('view-title');
const ctaButton = document.getElementById('cta-button');

function pill(text, variant = '') {
  return `<span class="pill ${variant}">${text}</span>`;
}

function statusPill(status) {
  const normalized = status.toLowerCase();
  if (normalized.includes('selected') || normalized.includes('shortlisted') || normalized.includes('ready')) {
    return pill(status, 'good');
  }
  if (normalized.includes('review') || normalized.includes('submitted')) {
    return pill(status, 'warn');
  }
  return pill(status, 'bad');
}

function renderNav() {
  navEl.innerHTML = views
    .map(
      (view) => `
      <button class="nav-link ${state.activeView === view.id ? 'active' : ''}" data-view="${view.id}">
        ${view.label}
      </button>
    `
    )
    .join('');

  navEl.querySelectorAll('.nav-link').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.activeView = btn.dataset.view;
      render();
    });
  });
}

function renderLanding() {
  return `
    <div class="grid three">
      <article class="card metric"><span>Active briefs</span><strong>${data.briefs.length}</strong></article>
      <article class="card metric"><span>Tracks in catalog</span><strong>${data.tracks.length}</strong></article>
      <article class="card metric"><span>Submission win rate</span><strong>31%</strong></article>
    </div>
    <div class="grid two">
      <article class="card">
        <h3>Recent activity</h3>
        <div class="table-like">
          ${data.submissions
            .slice(0, 4)
            .map((item) => `<div class="row"><div><h4>${item.track}</h4><p class="subtle">${item.creator} · ${item.brief}</p></div>${statusPill(item.status)}</div>`)
            .join('')}
        </div>
      </article>
      <article class="card">
        <h3>Upcoming deadlines</h3>
        <div class="table-like">
          ${data.briefs
            .map((brief) => `<div class="row"><div><h4>${brief.title}</h4><p class="subtle">${brief.client} · ${brief.deadline}</p></div>${pill(brief.status)}</div>`)
            .join('')}
        </div>
      </article>
    </div>
  `;
}

function renderCreatorDashboard() {
  return `
    <article class="card">
      <h3>Track upload (visual mock)</h3>
      <div class="row">
        <div>
          <h4>Drop WAV, MP3, and stems</h4>
          <p class="subtle">No upload occurs in demo mode. Simulated progress shown below.</p>
        </div>
        ${pill('Demo Queue: 2 files')}
      </div>
      <div class="row">
        <div><p class="subtle">Neon Echo_master.wav</p></div>
        <div style="flex: 1; max-width: 280px; height: 10px; background:#0f172c; border-radius:999px; overflow:hidden;"><div style="width:74%; height:100%; background:linear-gradient(90deg,var(--accent),#3ff2d7)"></div></div>
        ${pill('74%')}
      </div>
    </article>

    <article class="card">
      <h3>Track library</h3>
      <div class="table-like">
        ${data.tracks
          .map(
            (track) => `
            <div class="row">
              <div>
                <h4>${track.title}</h4>
                <p class="subtle">${track.artist} · ${track.genre} · ${track.duration}</p>
              </div>
              <div class="controls">
                ${pill(`${track.bpm} BPM`)}
                ${pill(track.mood)}
                ${statusPill(track.status)}
              </div>
            </div>`
          )
          .join('')}
      </div>
    </article>
  `;
}

function renderClientDashboard() {
  const selectedBrief = data.briefs.find((brief) => brief.id === state.selectedBriefId) || data.briefs[0];

  return `
    <div class="grid two">
      <article class="card">
        <h3>Client briefs</h3>
        <div class="table-like">
          ${data.briefs
            .map(
              (brief) => `
                <button class="row brief-selector" data-brief-id="${brief.id}" style="cursor:pointer; text-align:left; color:inherit; width:100%; border-width:${selectedBrief.id === brief.id ? '2px' : '1px'}; border-color:${selectedBrief.id === brief.id ? '#5f78cf' : '#2e406d'}">
                  <div>
                    <h4>${brief.id} · ${brief.title}</h4>
                    <p class="subtle">${brief.client} · Deadline ${brief.deadline}</p>
                  </div>
                  <div class="controls">${pill(brief.budget)} ${statusPill(brief.status)}</div>
                </button>`
            )
            .join('')}
        </div>
      </article>

      <article class="card">
        <h3>Brief detail</h3>
        <div class="table-like">
          <div class="row"><div><p class="subtle">Brief ID</p><h4>${selectedBrief.id}</h4></div>${statusPill(selectedBrief.status)}</div>
          <div class="row"><div><p class="subtle">Creative direction</p><h4>${selectedBrief.genre}</h4></div>${pill(selectedBrief.budget)}</div>
          <div class="row"><div><p class="subtle">Target placement</p><h4>${selectedBrief.client} marketing campaign</h4></div>${pill(selectedBrief.deadline)}</div>
        </div>
      </article>
    </div>
  `;
}

function renderTrackDiscovery() {
  const genres = ['all', ...new Set(data.tracks.map((track) => track.genre))];
  const moods = ['all', ...new Set(data.tracks.map((track) => track.mood))];

  const results = data.tracks.filter((track) => {
    const matchesQuery = `${track.title} ${track.artist}`.toLowerCase().includes(state.discoveryQuery.toLowerCase());
    const matchesGenre = state.discoveryGenre === 'all' || track.genre === state.discoveryGenre;
    const matchesMood = state.discoveryMood === 'all' || track.mood === state.discoveryMood;
    return matchesQuery && matchesGenre && matchesMood;
  });

  return `
    <article class="card">
      <h3>Search and filters</h3>
      <div class="controls">
        <input id="search-input" class="input" type="text" placeholder="Search by title or creator" value="${state.discoveryQuery}" />
        <select id="genre-filter" class="select">
          ${genres.map((genre) => `<option value="${genre}" ${state.discoveryGenre === genre ? 'selected' : ''}>${genre === 'all' ? 'All genres' : genre}</option>`).join('')}
        </select>
        <select id="mood-filter" class="select">
          ${moods.map((mood) => `<option value="${mood}" ${state.discoveryMood === mood ? 'selected' : ''}>${mood === 'all' ? 'All moods' : mood}</option>`).join('')}
        </select>
      </div>
      <p class="subtle">${results.length} track${results.length === 1 ? '' : 's'} matched.</p>
    </article>

    <article class="card">
      <h3>Track results</h3>
      <div class="table-like">
        ${results
          .map((track) => `<div class="row"><div><h4>${track.title}</h4><p class="subtle">${track.artist} · ${track.genre}</p></div><div class="controls">${pill(`${track.bpm} BPM`)} ${pill(track.mood)} ${statusPill(track.status)}</div></div>`)
          .join('')}
      </div>
    </article>
  `;
}

function renderSubmissionView() {
  return `
    <article class="card">
      <h3>Tracks submitted to briefs</h3>
      <p class="subtle">Workflow simulation: Submitted → In Review → Shortlisted → Selected</p>
      <div class="table-like">
        ${data.submissions
          .map(
            (item) => `
            <div class="row">
              <div>
                <h4>${item.track}</h4>
                <p class="subtle">${item.creator} · ${item.brief} · Updated ${item.updated}</p>
              </div>
              <div class="controls">
                ${statusPill(item.status)}
              </div>
            </div>
          `
          )
          .join('')}
      </div>
    </article>
  `;
}

function attachInteractions() {
  if (state.activeView === 'client') {
    viewContainer.querySelectorAll('.brief-selector').forEach((button) => {
      button.addEventListener('click', () => {
        state.selectedBriefId = button.dataset.briefId;
        render();
      });
    });
  }

  if (state.activeView === 'discovery') {
    const searchInput = document.getElementById('search-input');
    const genreFilter = document.getElementById('genre-filter');
    const moodFilter = document.getElementById('mood-filter');

    searchInput?.addEventListener('input', (event) => {
      state.discoveryQuery = event.target.value;
      render();
    });
    genreFilter?.addEventListener('change', (event) => {
      state.discoveryGenre = event.target.value;
      render();
    });
    moodFilter?.addEventListener('change', (event) => {
      state.discoveryMood = event.target.value;
      render();
    });
  }
}

function render() {
  renderNav();

  const current = views.find((view) => view.id === state.activeView);
  titleEl.textContent = current?.label || 'Synchroni Demo';

  if (state.activeView === 'landing') viewContainer.innerHTML = renderLanding();
  if (state.activeView === 'creator') viewContainer.innerHTML = renderCreatorDashboard();
  if (state.activeView === 'client') viewContainer.innerHTML = renderClientDashboard();
  if (state.activeView === 'discovery') viewContainer.innerHTML = renderTrackDiscovery();
  if (state.activeView === 'submission') viewContainer.innerHTML = renderSubmissionView();

  ctaButton.textContent = state.activeView === 'creator' ? 'New Upload' : 'Create Brief';
  attachInteractions();
}

render();
