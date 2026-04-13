const demoScenes = [
  {
    id: 'scene-nike',
    title: 'Nike Spot – Tunnel Walk',
    duration: 27,
    notes: 'Athlete exits tunnel into stadium lights before kickoff.',
    thumbnail: 'linear-gradient(135deg, #322158 0%, #02070f 55%, #5643cc 100%)'
  },
  {
    id: 'scene-youtube',
    title: 'YouTube Travel Intro',
    duration: 22,
    notes: 'Fast-cut montage of cityscapes and handheld moments.',
    thumbnail: 'linear-gradient(135deg, #053d53 0%, #061018 60%, #08a6bf 100%)'
  },
  {
    id: 'scene-indie',
    title: 'Indie Drama – Closing Scene',
    duration: 30,
    notes: 'Slow emotional reveal and final glance through rainy glass.',
    thumbnail: 'linear-gradient(135deg, #4a253f 0%, #0a0d13 60%, #b36b72 100%)'
  }
];

const demoTracks = [
  { id: 'track-1', title: 'Night Run', artist: 'Mara Veil', genre: 'Alt Pop', moods: ['Energetic', 'Neon', 'Driving'], bpm: 126, duration: '2:34', seconds: 154, vocal: 'Instrumental', oneStop: true, easyClear: true },
  { id: 'track-2', title: 'Gold Lights', artist: 'Prime Archive', genre: 'Hip-Hop', moods: ['Confident', 'Urban', 'Bold'], bpm: 98, duration: '2:58', seconds: 178, vocal: 'Vocal', oneStop: true, easyClear: false },
  { id: 'track-3', title: 'Slow Burn', artist: 'Halo South', genre: 'Cinematic', moods: ['Emotional', 'Brooding', 'Intimate'], bpm: 76, duration: '3:21', seconds: 201, vocal: 'Instrumental', oneStop: false, easyClear: true },
  { id: 'track-4', title: 'Victory Lap', artist: 'Atlas Bloom', genre: 'Trailer', moods: ['Epic', 'Uplifting', 'Triumphant'], bpm: 132, duration: '2:11', seconds: 131, vocal: 'Instrumental', oneStop: true, easyClear: true },
  { id: 'track-5', title: 'Signal Fade', artist: 'Northwire', genre: 'Electronic', moods: ['Tense', 'Modern', 'Dark'], bpm: 118, duration: '2:46', seconds: 166, vocal: 'Instrumental', oneStop: true, easyClear: true },
  { id: 'track-6', title: 'Open Skies', artist: 'Rue Meridian', genre: 'Indie', moods: ['Hopeful', 'Warm', 'Open'], bpm: 102, duration: '3:05', seconds: 185, vocal: 'Vocal', oneStop: false, easyClear: true },
  { id: 'track-7', title: 'After Hours', artist: 'Ivory District', genre: 'R&B', moods: ['Sultry', 'Late Night', 'Moody'], bpm: 90, duration: '2:29', seconds: 149, vocal: 'Vocal', oneStop: true, easyClear: false },
  { id: 'track-8', title: 'Pulse Theory', artist: 'Circuit Union', genre: 'Electronic', moods: ['Kinetic', 'Precision', 'Future'], bpm: 124, duration: '2:57', seconds: 177, vocal: 'Instrumental', oneStop: true, easyClear: true },
  { id: 'track-9', title: 'Last Frame', artist: 'Lumen Choir', genre: 'Cinematic', moods: ['Reflective', 'Tender', 'Finale'], bpm: 72, duration: '3:12', seconds: 192, vocal: 'Instrumental', oneStop: true, easyClear: true },
  { id: 'track-10', title: 'City Static', artist: 'Vanta Echo', genre: 'Rock', moods: ['Raw', 'Restless', 'Gritty'], bpm: 136, duration: '2:42', seconds: 162, vocal: 'Vocal', oneStop: false, easyClear: true }
];

let savedMatches = [
  { id: 'match-1', sceneId: 'scene-nike', trackId: 'track-4', offset: 2.4, note: 'Starts with shoulder push-in; lands perfectly on logo reveal.' },
  { id: 'match-2', sceneId: 'scene-youtube', trackId: 'track-1', offset: 0.8, note: 'Punchy opening works with cut cadence.' },
  { id: 'match-3', sceneId: 'scene-indie', trackId: 'track-9', offset: 4.1, note: 'Piano swell supports emotional beat at final glance.' }
];

const state = {
  view: 'landing',
  uploadedClip: null,
  uploadState: 'idle',
  uploadError: '',
  uploadProgress: 0,
  scene: demoScenes[0],
  timeline: 0,
  playing: false,
  clipAudioMuted: false,
  clipVolume: 68,
  trackVolume: 74,
  startOffset: 1.2,
  activeTrackId: null,
  previewTrackId: null,
  favorites: new Set(['track-1', 'track-8']),
  query: '',
  genreFilter: 'All',
  moodFilter: 'Any',
  vocalFilter: 'All',
  saveNote: ''
};

const app = document.getElementById('app');
let playbackTimer = null;
let uploadTimer = null;

const genreOptions = ['All', ...new Set(demoTracks.map((track) => track.genre))];
const moodOptions = ['Any', ...new Set(demoTracks.flatMap((track) => track.moods))];

function formatTime(seconds) {
  const clamped = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function getCurrentScene() {
  return state.scene;
}

function getActiveTrack() {
  return demoTracks.find((track) => track.id === state.activeTrackId) || null;
}

function getTrack(trackId) {
  return demoTracks.find((track) => track.id === trackId);
}

function getScene(sceneId) {
  return demoScenes.find((scene) => scene.id === sceneId);
}

function filteredTracks() {
  return demoTracks.filter((track) => {
    const matchesQuery = `${track.title} ${track.artist}`.toLowerCase().includes(state.query.toLowerCase());
    const matchesGenre = state.genreFilter === 'All' || track.genre === state.genreFilter;
    const matchesMood = state.moodFilter === 'Any' || track.moods.includes(state.moodFilter);
    const matchesVocal = state.vocalFilter === 'All' || track.vocal === state.vocalFilter;
    return matchesQuery && matchesGenre && matchesMood && matchesVocal;
  });
}

function stopPlayback() {
  state.playing = false;
  if (playbackTimer) {
    clearInterval(playbackTimer);
    playbackTimer = null;
  }
}

function startPlayback() {
  const duration = getCurrentScene().duration;
  stopPlayback();
  state.playing = true;
  playbackTimer = setInterval(() => {
    state.timeline = +(state.timeline + 0.2).toFixed(1);
    if (state.timeline >= duration) {
      state.timeline = duration;
      stopPlayback();
    }
    render();
  }, 200);
}

function handleFileValidation(file) {
  if (!file.name.toLowerCase().endsWith('.mov')) {
    return 'Invalid file type. Please upload a .mov clip.';
  }

  if (file.size > 85 * 1024 * 1024) {
    return 'Clip appears to be over 30 seconds. Please upload a shorter scene.';
  }

  return '';
}

function beginUpload(file, forceFailure = false) {
  state.uploadState = 'uploading';
  state.uploadError = '';
  state.uploadProgress = 0;
  render();

  if (uploadTimer) {
    clearInterval(uploadTimer);
  }

  uploadTimer = setInterval(() => {
    state.uploadProgress += 10;

    if (state.uploadProgress >= 100) {
      clearInterval(uploadTimer);
      uploadTimer = null;

      if (forceFailure) {
        state.uploadState = 'error';
        state.uploadError = 'Upload failed. Please retry in a moment.';
        state.uploadProgress = 0;
      } else {
        state.uploadState = 'success';
        state.uploadedClip = {
          id: 'uploaded-custom',
          title: document.getElementById('sceneTitleInput')?.value || file.name.replace('.mov', ''),
          duration: 28,
          notes: document.getElementById('sceneNotesInput')?.value || 'Uploaded through demo flow.',
          thumbnail: 'linear-gradient(135deg, #33404f 0%, #090f17 60%, #6e8196 100%)'
        };
        state.scene = state.uploadedClip;
      }
      render();
    } else {
      render();
    }
  }, 190);
}

function navTemplate() {
  const tabs = [
    { id: 'landing', label: 'Landing' },
    { id: 'upload', label: 'Upload Clip' },
    { id: 'workspace', label: 'Studio Workspace' },
    { id: 'saved', label: 'Saved Matches' }
  ];

  return `
    <header class="top-nav">
      <div>
        <div class="brand">SYNC STUDIO</div>
        <div class="brand-sub">Concept demo · standalone prototype</div>
      </div>
      <nav class="tabs">
        ${tabs
          .map(
            (tab) => `<button class="tab ${state.view === tab.id ? 'tab-active' : ''}" data-action="go-view" data-view="${tab.id}">${tab.label}</button>`
          )
          .join('')}
      </nav>
    </header>
  `;
}

function landingView() {
  return `
    <section class="landing card">
      <div>
        <p class="eyebrow">Scene-to-music auditioning</p>
        <h1>Upload a scene. Audition music in context.</h1>
        <p class="subtext">Sync Studio lets creative teams try tracks directly against picture, tweak start offsets, and save emotional pairings in seconds.</p>
        <div class="cta-row">
          <button class="btn btn-primary" data-action="go-view" data-view="upload">Upload Clip</button>
          <button class="btn btn-secondary" data-action="load-demo-scene">Try Demo Scene</button>
        </div>
      </div>
      <div class="hero-preview">
        <div class="hero-faux-video">
          <div class="playhead"></div>
          <div class="hero-caption">Live audition · offset +1.2s · track: Pulse Theory</div>
        </div>
      </div>
    </section>
  `;
}

function uploadView() {
  const uploadLabel =
    state.uploadState === 'idle'
      ? 'Ready for upload.'
      : state.uploadState === 'uploading'
        ? `Uploading… ${state.uploadProgress}%`
        : state.uploadState === 'success'
          ? 'Clip uploaded. Ready in studio.'
          : state.uploadError;

  return `
    <section class="upload-grid">
      <div class="card">
        <h2>Upload Clip</h2>
        <p class="subtext">Drop a file below to start a scene. Demo validates format and simulated duration constraints.</p>
        <label class="dropzone" for="clipInput">
          <input id="clipInput" type="file" accept=".mov" />
          <span class="dropzone-title">Drag and drop your .mov scene</span>
          <span class="dropzone-sub">Only .mov files · maximum 30 seconds</span>
        </label>
        <div class="field-row">
          <label>
            Scene title (optional)
            <input id="sceneTitleInput" class="input" placeholder="e.g. Product Reveal v2" />
          </label>
          <label>
            Scene notes (optional)
            <textarea id="sceneNotesInput" class="input textarea" placeholder="Creative direction, edit notes, emotional intent..."></textarea>
          </label>
        </div>
        <div class="upload-actions">
          <button class="btn btn-primary" data-action="trigger-upload">Upload Clip</button>
          <button class="btn btn-ghost" data-action="trigger-upload-fail">Simulate Failed Upload</button>
          <button class="btn btn-secondary" data-action="load-demo-scene">Use Demo Scene Instead</button>
        </div>
        <div class="state-panel ${state.uploadState}">
          <div class="state-panel-head">
            <span class="state-dot"></span>
            <strong>${state.uploadState === 'idle' ? 'Waiting for clip' : state.uploadState === 'uploading' ? 'Uploading clip' : state.uploadState === 'success' ? 'Upload complete' : 'Upload issue detected'}</strong>
          </div>
          <span>${uploadLabel}</span>
          ${state.uploadState === 'uploading' ? `<div class="progress"><span style="width:${state.uploadProgress}%"></span></div>` : ''}
        </div>
      </div>
      <aside class="card requirements">
        <h3>Validation states covered</h3>
        <ul>
          <li>Invalid file type (non-.mov)</li>
          <li>Clip over 30 seconds (simulated by file size)</li>
          <li>Failed upload state</li>
        </ul>
        <p class="small">For demo speed, duration validation is represented by a file-size threshold and error messaging.</p>
      </aside>
    </section>
  `;
}

function trackCard(track) {
  const active = state.activeTrackId === track.id;
  const favorite = state.favorites.has(track.id);
  const previewing = state.previewTrackId === track.id;
  const matchScore = Math.round(86 + (track.bpm % 12));

  return `
    <article class="track-card ${active ? 'track-active' : ''}">
      <div class="track-main">
        <div class="track-head">
          <div class="track-art" style="background:linear-gradient(140deg, rgba(135, 160, 255, 0.7), rgba(61, 77, 122, 0.2) 58%, rgba(16, 22, 35, 0.86));"></div>
          <div>
            <h4>${track.title}</h4>
            <p>${track.artist}</p>
          </div>
        </div>
        <div class="track-head-actions">
          ${active ? '<span class="live-pill">Live</span>' : ''}
          ${previewing ? '<span class="preview-pill">Previewing</span>' : ''}
          <button class="icon-btn ${favorite ? 'favorite' : ''}" data-action="toggle-favorite" data-track="${track.id}">${favorite ? '★' : '☆'}</button>
        </div>
      </div>
      <div class="chips">
        <span>${track.genre}</span>
        <span>${track.vocal}</span>
        <span>${track.duration}</span>
        <span>Match ${matchScore}%</span>
      </div>
      <div class="moods">${track.moods.map((mood) => `<em>${mood}</em>`).join('')}</div>
      <div class="track-meta">
        <span>${track.bpm} BPM</span>
        <span>${track.oneStop ? 'One-stop' : 'Split-rights'}</span>
        <span>${track.easyClear ? 'Easy-clear' : 'Manual clearance'}</span>
      </div>
      <div class="track-actions">
        <button class="btn btn-ghost" data-action="toggle-preview" data-track="${track.id}">${previewing ? 'Stop Preview' : 'Preview'}</button>
        <button class="btn btn-primary" data-action="try-track" data-track="${track.id}">Try on Scene</button>
      </div>
    </article>
  `;
}

function workspaceView() {
  const scene = getCurrentScene();
  const activeTrack = getActiveTrack();
  const tracks = filteredTracks();

  return `
    <section class="workspace">
      <div class="left-pane card">
        <div class="video-shell" style="background:${scene.thumbnail}">
          <div class="video-overlay">
            <h3>${scene.title}</h3>
            <p>${scene.notes}</p>
            <span class="status-pill">${state.playing ? 'Playing' : 'Paused'} · ${formatTime(state.timeline)} / ${formatTime(scene.duration)}</span>
          </div>
        </div>

        <div class="timeline-wrap">
          <input type="range" min="0" max="${scene.duration}" step="0.1" value="${state.timeline}" data-action="timeline" />
          <div class="timeline-meta">
            <span>${formatTime(state.timeline)}</span>
            <span>${formatTime(scene.duration)}</span>
          </div>
        </div>

        <div class="controls-grid">
          <button class="btn btn-primary" data-action="toggle-play">${state.playing ? 'Pause' : 'Play'}</button>
          <button class="btn btn-secondary" data-action="restart-scene">Restart Scene</button>
          <button class="btn btn-ghost" data-action="toggle-mute">${state.clipAudioMuted ? 'Unmute Clip Audio' : 'Mute Clip Audio'}</button>
        </div>

        <div class="sliders">
          <label>Clip audio volume: ${state.clipVolume}%
            <input type="range" min="0" max="100" value="${state.clipVolume}" data-action="clip-volume" />
          </label>
          <label>Track volume: ${state.trackVolume}%
            <input type="range" min="0" max="100" value="${state.trackVolume}" ${activeTrack ? '' : 'disabled'} data-action="track-volume" />
          </label>
          <label>Music start offset: +${state.startOffset.toFixed(1)}s
            <input type="range" min="0" max="12" step="0.1" value="${state.startOffset}" ${activeTrack ? '' : 'disabled'} data-action="offset" />
          </label>
        </div>

        <div class="audition-panel">
          <h4>Audition Mode</h4>
          ${
            activeTrack
              ? `<p><strong>Active track:</strong> ${activeTrack.title} — ${activeTrack.artist}</p>
                 <p>Simulated sync: track enters at +${state.startOffset.toFixed(1)}s with ${state.trackVolume}% level against clip audio ${state.clipAudioMuted ? 'muted' : `${state.clipVolume}%`}.</p>
                 <div class="controls-grid">
                   <button class="btn btn-secondary" data-action="save-match">Save Scene Match</button>
                   <button class="btn btn-ghost" data-action="remove-track">Remove Current Track</button>
                 </div>
                 <label>Add note to saved match
                   <textarea class="input textarea" data-action="save-note" placeholder="Why this pairing works...">${state.saveNote}</textarea>
                 </label>`
              : '<p>Select a track on the right and click <strong>Try on Scene</strong> to audition it.</p>'
          }
        </div>
      </div>

      <aside class="right-pane card">
        <div class="filters">
          <input class="input" placeholder="Search tracks or artists" value="${state.query}" data-action="search" />
          <div class="filter-grid">
            <label>Genre
              <select data-action="genre">${genreOptions.map((genre) => `<option ${state.genreFilter === genre ? 'selected' : ''}>${genre}</option>`).join('')}</select>
            </label>
            <label>Mood
              <select data-action="mood">${moodOptions.map((mood) => `<option ${state.moodFilter === mood ? 'selected' : ''}>${mood}</option>`).join('')}</select>
            </label>
            <label>Vocal
              <select data-action="vocal">
                ${['All', 'Instrumental', 'Vocal'].map((opt) => `<option ${state.vocalFilter === opt ? 'selected' : ''}>${opt}</option>`).join('')}
              </select>
            </label>
          </div>
        </div>
        <div class="track-list">
          ${tracks.length ? tracks.map(trackCard).join('') : '<p class="small">No tracks match current filters.</p>'}
        </div>
      </aside>
    </section>
  `;
}

function savedMatchesView() {
  return `
    <section class="card saved">
      <h2>Saved Scene Matches</h2>
      <p class="subtext">Review shortlisted pairings and reopen them in the workspace.</p>
      <div class="saved-grid">
        ${savedMatches
          .map((match) => {
            const scene = getScene(match.sceneId) || state.uploadedClip;
            const track = getTrack(match.trackId);
            return `
              <article class="saved-item">
                <div class="thumb" style="background:${scene.thumbnail}"></div>
                <div class="saved-content">
                  <h3>${scene.title}</h3>
                  <div class="saved-meta">
                    <span>${formatTime(scene.duration)}</span>
                    <span>Offset +${match.offset.toFixed(1)}s</span>
                  </div>
                  <p><strong>Track:</strong> ${track.title} — ${track.artist}</p>
                  <p class="small">${match.note || 'No note added.'}</p>
                </div>
                <div class="saved-actions">
                  <span class="status-pill">Saved Match</span>
                  <button class="btn btn-secondary" data-action="reopen-match" data-match="${match.id}">Reopen</button>
                </div>
              </article>
            `;
          })
          .join('')}
      </div>
    </section>
  `;
}

function render() {
  app.innerHTML = `
    <main class="shell">
      ${navTemplate()}
      ${state.view === 'landing' ? landingView() : ''}
      ${state.view === 'upload' ? uploadView() : ''}
      ${state.view === 'workspace' ? workspaceView() : ''}
      ${state.view === 'saved' ? savedMatchesView() : ''}
    </main>
  `;

  bindEvents();
}

function bindEvents() {
  app.querySelectorAll('[data-action="go-view"]').forEach((button) => {
    button.addEventListener('click', () => {
      state.view = button.dataset.view;
      render();
    });
  });

  app.querySelector('[data-action="load-demo-scene"]')?.addEventListener('click', () => {
    state.scene = demoScenes[1];
    state.timeline = 0;
    state.view = 'workspace';
    render();
  });

  app.querySelector('[data-action="trigger-upload"]')?.addEventListener('click', () => {
    const input = document.getElementById('clipInput');
    const file = input?.files?.[0];

    if (!file) {
      state.uploadState = 'error';
      state.uploadError = 'Select a .mov file to continue.';
      render();
      return;
    }

    const validationError = handleFileValidation(file);
    if (validationError) {
      state.uploadState = 'error';
      state.uploadError = validationError;
      render();
      return;
    }

    beginUpload(file);
  });

  app.querySelector('[data-action="trigger-upload-fail"]')?.addEventListener('click', () => {
    const fallback = new File(['demo'], 'investor_scene.mov', { type: 'video/quicktime' });
    beginUpload(fallback, true);
  });

  app.querySelector('[data-action="timeline"]')?.addEventListener('input', (event) => {
    state.timeline = Number(event.target.value);
    render();
  });

  app.querySelector('[data-action="toggle-play"]')?.addEventListener('click', () => {
    if (state.playing) {
      stopPlayback();
    } else {
      startPlayback();
    }
    render();
  });

  app.querySelector('[data-action="restart-scene"]')?.addEventListener('click', () => {
    state.timeline = 0;
    startPlayback();
    render();
  });

  app.querySelector('[data-action="toggle-mute"]')?.addEventListener('click', () => {
    state.clipAudioMuted = !state.clipAudioMuted;
    render();
  });

  app.querySelector('[data-action="clip-volume"]')?.addEventListener('input', (event) => {
    state.clipVolume = Number(event.target.value);
    render();
  });

  app.querySelector('[data-action="track-volume"]')?.addEventListener('input', (event) => {
    state.trackVolume = Number(event.target.value);
    render();
  });

  app.querySelector('[data-action="offset"]')?.addEventListener('input', (event) => {
    state.startOffset = Number(event.target.value);
    render();
  });

  app.querySelector('[data-action="search"]')?.addEventListener('input', (event) => {
    state.query = event.target.value;
    render();
  });

  app.querySelector('[data-action="genre"]')?.addEventListener('change', (event) => {
    state.genreFilter = event.target.value;
    render();
  });

  app.querySelector('[data-action="mood"]')?.addEventListener('change', (event) => {
    state.moodFilter = event.target.value;
    render();
  });

  app.querySelector('[data-action="vocal"]')?.addEventListener('change', (event) => {
    state.vocalFilter = event.target.value;
    render();
  });

  app.querySelectorAll('[data-action="toggle-favorite"]').forEach((button) => {
    button.addEventListener('click', () => {
      const { track } = button.dataset;
      if (state.favorites.has(track)) {
        state.favorites.delete(track);
      } else {
        state.favorites.add(track);
      }
      render();
    });
  });

  app.querySelectorAll('[data-action="toggle-preview"]').forEach((button) => {
    button.addEventListener('click', () => {
      const { track } = button.dataset;
      state.previewTrackId = state.previewTrackId === track ? null : track;
      render();
    });
  });

  app.querySelectorAll('[data-action="try-track"]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeTrackId = button.dataset.track;
      state.previewTrackId = null;
      state.timeline = 0;
      state.view = 'workspace';
      startPlayback();
      render();
    });
  });

  app.querySelector('[data-action="remove-track"]')?.addEventListener('click', () => {
    state.activeTrackId = null;
    state.trackVolume = 74;
    state.startOffset = 0;
    render();
  });

  app.querySelector('[data-action="save-note"]')?.addEventListener('input', (event) => {
    state.saveNote = event.target.value;
  });

  app.querySelector('[data-action="save-match"]')?.addEventListener('click', () => {
    if (!state.activeTrackId) return;

    const match = {
      id: `match-${Date.now()}`,
      sceneId: state.scene.id,
      trackId: state.activeTrackId,
      offset: state.startOffset,
      note: state.saveNote.trim()
    };

    savedMatches = [match, ...savedMatches];
    state.saveNote = '';
    state.view = 'saved';
    stopPlayback();
    render();
  });

  app.querySelectorAll('[data-action="reopen-match"]').forEach((button) => {
    button.addEventListener('click', () => {
      const match = savedMatches.find((item) => item.id === button.dataset.match);
      if (!match) return;

      state.scene = getScene(match.sceneId) || state.uploadedClip || demoScenes[0];
      state.activeTrackId = match.trackId;
      state.startOffset = match.offset;
      state.timeline = 0;
      state.view = 'workspace';
      startPlayback();
      render();
    });
  });
}

render();
