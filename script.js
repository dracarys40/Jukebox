const defaultSongNames = [
  "ABBA - Lay All Your Love On Me .mp3",
  "Amy Winehouse - Back To Black.mp3",
  "Boney M - Rasputin.mp3",
  "Feet Don't Fail Me Now .mp3",
  "Gloria Gaynor - I Will Survive.mp3",
  "grover washington jr - just the two of us .mp3",
  "Stephen Sanchez - Until I Found You .mp3",
];

const fileInput = document.querySelector("#tracks");
const player = document.querySelector("#player");
const currentTrack = document.querySelector("#current-track");
const message = document.querySelector("#message");
const record = document.querySelector("#record");
const playlist = document.querySelector("#playlist");
const previousButton = document.querySelector("#previous");
const nextButton = document.querySelector("#next");
const playerLayout = document.querySelector(".player-layout");
const playerSection = document.querySelector(".player-section");
const playlistSection = document.querySelector(".playlist-section");
const sameSongMessage = document.querySelector("#same-song-message");
const title = document.querySelector("h1");
const titleText = title.firstChild;
const titleTextRange = document.createRange();
titleTextRange.selectNodeContents(titleText);

const sunRadius = 140;
let pointerPosition = null;
let sunFrame = 0;

const tracks = defaultSongNames.map((name) => ({
  name,
  src: new URL(`music/${encodeURIComponent(name)}`, document.baseURI).href,
}));
let currentIndex = -1;
let isTransitioning = false;
let sameSongMessageTimer;

function getTrackTitle(filename) {
  return filename.replace(/\.mp3$/i, "").trim();
}

function updateTitleSun() {
  sunFrame = 0;
  if (!pointerPosition) {
    title.classList.remove("sun-nearby");
    return;
  }

  const textBounds = titleTextRange.getBoundingClientRect();
  const nearestX = Math.max(textBounds.left, Math.min(pointerPosition.x, textBounds.right));
  const nearestY = Math.max(textBounds.top, Math.min(pointerPosition.y, textBounds.bottom));
  const distance = Math.hypot(pointerPosition.x - nearestX, pointerPosition.y - nearestY);

  if (distance >= sunRadius) {
    title.classList.remove("sun-nearby");
    return;
  }

  const titleBounds = title.getBoundingClientRect();
  const intensity = 1 - distance / sunRadius;

  title.style.setProperty(
    "--sun-x",
    `${((pointerPosition.x - titleBounds.left) / titleBounds.width) * 100}%`,
  );
  title.style.setProperty(
    "--sun-y",
    `${((pointerPosition.y - titleBounds.top) / titleBounds.height) * 100}%`,
  );
  title.style.setProperty("--sun-intensity", intensity.toFixed(2));
  title.classList.add("sun-nearby");
}

window.addEventListener("pointermove", (event) => {
  if (event.target instanceof Element && event.target.closest(".player-layout")) {
    pointerPosition = null;
    title.classList.remove("sun-nearby");
    return;
  }

  pointerPosition = { x: event.clientX, y: event.clientY };
  if (!sunFrame) sunFrame = requestAnimationFrame(updateTitleSun);
});

window.addEventListener("pointerleave", () => {
  pointerPosition = null;
  title.classList.remove("sun-nearby");
});

function renderPlaylist() {
  playlist.replaceChildren();

  tracks.forEach((track, index) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.trackIndex = index;
    button.textContent = getTrackTitle(track.name);
    item.setAttribute("aria-current", index === currentIndex ? "true" : "false");
    item.append(button);
    playlist.append(item);
  });
}

playlist.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;

  const button = event.target.closest("button[data-track-index]");
  if (!button || !playlist.contains(button)) return;

  transitionToTrack(Number(button.dataset.trackIndex));
});

function selectTrack(index, play = false) {
  if (index < 0 || index >= tracks.length) return;

  currentIndex = index;
  record.classList.remove("is-playing");
  player.src = tracks[index].src;
  currentTrack.textContent = getTrackTitle(tracks[index].name);
  message.textContent = "";
  previousButton.disabled = index === 0;
  nextButton.disabled = index === tracks.length - 1;

  for (const [trackIndex, item] of [...playlist.children].entries()) {
    item.setAttribute("aria-current", trackIndex === index ? "true" : "false");
  }

  if (play) {
    player.play().catch(() => {
      message.textContent = "Couldn't play this file. Try another audio file.";
    });
  }
}

function showSameSongMessage() {
  clearTimeout(sameSongMessageTimer);
  sameSongMessage.textContent = "This song is already selected";
  sameSongMessage.classList.remove("is-visible");
  void sameSongMessage.offsetWidth;
  sameSongMessage.classList.add("is-visible");
  sameSongMessageTimer = setTimeout(() => {
    sameSongMessage.classList.remove("is-visible");
    sameSongMessage.textContent = "";
  }, 2400);
}

function createTransitionDisc(center, size, scale, opacity) {
  const disc = record.cloneNode(true);
  disc.removeAttribute("id");
  disc.classList.remove("is-playing", "is-transition-hidden");
  disc.classList.add("transition-disc");
  disc.setAttribute("aria-hidden", "true");
  disc.style.width = `${size}px`;
  disc.style.left = `${center.x - size / 2}px`;
  disc.style.top = `${center.y - size / 2}px`;
  disc.style.opacity = opacity;
  disc.style.transform = `scale(${scale})`;
  disc.dataset.size = size;
  disc.dataset.centerX = center.x;
  disc.dataset.centerY = center.y;
  disc.dataset.scale = scale;
  document.body.append(disc);
  return disc;
}

async function moveTransitionDisc(disc, point, duration, scale = 1, opacity = 1) {
  const startX = Number(disc.dataset.centerX);
  const startY = Number(disc.dataset.centerY);
  const startScale = Number(disc.dataset.scale);
  const size = Number(disc.dataset.size);
  const offsetX = point.x - startX;
  const offsetY = point.y - startY;
  const animation = disc.animate(
    [
      {
        opacity: disc.style.opacity,
        transform: `translate3d(0, 0, 0) scale(${startScale})`,
      },
      {
        opacity,
        transform: `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})`,
      },
    ],
    {
      duration,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    },
  );

  await animation.finished;
  disc.style.left = `${point.x - size / 2}px`;
  disc.style.top = `${point.y - size / 2}px`;
  disc.style.opacity = opacity;
  disc.style.transform = `scale(${scale})`;
  disc.dataset.centerX = point.x;
  disc.dataset.centerY = point.y;
  disc.dataset.scale = scale;
  animation.cancel();
}

async function movePlayerDiscOut(center, duration) {
  const animation = record.animate(
    [
      {
        opacity: 1,
        transform: "scale(0.75)",
      },
      {
        opacity: 0,
        transform: `translate3d(${-center.x - record.offsetWidth}px, 0, 0) scale(0.75)`,
      },
    ],
    {
      duration,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    },
  );

  await animation.finished;
  record.classList.add("is-transition-hidden");
  animation.cancel();
}

async function animateTrackHandoff(index) {
  const recordBounds = record.getBoundingClientRect();
  const playlistBounds = playlistSection.getBoundingClientRect();
  const playerBounds = playerSection.getBoundingClientRect();
  const discSize = recordBounds.width;
  const playlistCenter = {
    x: playlistBounds.left + playlistBounds.width / 2,
    y: Math.max(discSize / 2 + 8, playlistBounds.top - discSize * 0.65),
  };
  const playerCenter = {
    x: playerBounds.left + playerBounds.width / 2,
    y: Math.max(discSize / 2 + 8, playerBounds.top - discSize * 0.65),
  };
  const recordCenter = {
    x: recordBounds.left + recordBounds.width / 2,
    y: recordBounds.top + recordBounds.height / 2,
  };
  const incomingDisc = createTransitionDisc(playlistCenter, discSize, 0.12, 0);
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const durationScale = prefersReducedMotion ? 0.85 : 1;

  player.pause();
  record.classList.remove("is-playing");

  try {
    await Promise.all([
      movePlayerDiscOut(recordCenter, 1000 * durationScale),
      moveTransitionDisc(incomingDisc, playlistCenter, 520 * durationScale, 0.72, 1),
    ]);

    await moveTransitionDisc(incomingDisc, playerCenter, 930 * durationScale, 0.72, 1);
    await moveTransitionDisc(incomingDisc, recordCenter, 720 * durationScale, 0.75, 1);
  } finally {
    incomingDisc.remove();
    record.classList.remove("is-transition-hidden");
  }

  selectTrack(index, true);
}

async function transitionToTrack(index) {
  if (isTransitioning) return;
  if (index === currentIndex) {
    showSameSongMessage();
    return;
  }

  isTransitioning = true;
  playerLayout.classList.add("is-transitioning");
  playerLayout.setAttribute("aria-busy", "true");
  player.pause();

  try {
    await animateTrackHandoff(index);
  } catch (error) {
    console.error("Couldn't animate the track transition:", error);
    record.classList.remove("is-transition-hidden");
    selectTrack(index, true);
  } finally {
    isTransitioning = false;
    playerLayout.classList.remove("is-transitioning");
    playerLayout.removeAttribute("aria-busy");
  }
}

fileInput.addEventListener("change", () => {
  const addedTracks = [...fileInput.files].map((file) => ({
    name: file.name,
    src: URL.createObjectURL(file),
    isLocalFile: true,
  }));

  if (!addedTracks.length) return;

  tracks.push(...addedTracks);
  renderPlaylist();
  nextButton.disabled = currentIndex === tracks.length - 1;
});

previousButton.addEventListener("click", () => {
  if (!isTransitioning && currentIndex > 0) {
    transitionToTrack(currentIndex - 1);
  }
});

nextButton.addEventListener("click", () => {
  if (!isTransitioning && currentIndex < tracks.length - 1) {
    transitionToTrack(currentIndex + 1);
  }
});

player.addEventListener("ended", () => {
  record.classList.remove("is-playing");
  if (!isTransitioning && currentIndex < tracks.length - 1) {
    transitionToTrack(currentIndex + 1);
  }
});

player.addEventListener("playing", () => record.classList.add("is-playing"));
player.addEventListener("pause", () => record.classList.remove("is-playing"));
player.addEventListener("waiting", () => record.classList.remove("is-playing"));
player.addEventListener("error", () => {
  record.classList.remove("is-playing");
  if (player.currentSrc) message.textContent = "Couldn't play this file. Try another audio file.";
});

window.addEventListener("beforeunload", () => {
  for (const track of tracks) {
    if (track.isLocalFile) URL.revokeObjectURL(track.src);
  }
});

renderPlaylist();
selectTrack(0);
