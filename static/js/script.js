const btnLocal = document.getElementById("btn-local");
const btnPhoto = document.getElementById("btn-photo");
const btnCapture = document.getElementById("btn-capture");
const locationEl = document.getElementById("location");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const photo = document.getElementById("photo");
const historyDiv = document.getElementById("history");

let currentLocation = "";
let activeStream = null;

if (btnLocal) {
  btnLocal.addEventListener("click", () => {
    if (!navigator.geolocation) {
      alert("Geolocalização não suportada!");
      return;
    }

    if (locationEl) {
      locationEl.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Obtendo localização...`;
    }
    btnLocal.disabled = true;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;

          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const addr = data.address || {};
          const formatted = formatAddress(addr);
          currentLocation = formatted || data.display_name;
          if (locationEl) locationEl.textContent = currentLocation;
        } catch (e) {
          if (locationEl) locationEl.textContent = "Não foi possível obter o endereço.";
          console.error(e);
        } finally {
          btnLocal.disabled = false;
        }
      },
      (err) => {
        if (locationEl) locationEl.textContent = "Permissão negada ou indisponível.";
        console.error(err);
        btnLocal.disabled = false;
      }
    );
  });
}

function formatAddress(addr) {
  const neighborhood = addr.suburb || addr.neighbourhood || addr.quarter || addr.hamlet || addr.locality;
  const city = addr.city || addr.town || addr.village || addr.municipality || addr.county; // fallback amplo
  const state = addr.state;
  const country = addr.country;
  const parts = [neighborhood, city, state, country].filter(Boolean);
  return parts.join(", ");
}

if (btnPhoto) {
  btnPhoto.addEventListener("click", async () => {
    try {
      activeStream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (video) {
        video.classList.remove("d-none");
        video.srcObject = activeStream;
      }
      if (btnCapture) btnCapture.classList.remove("d-none");
      btnPhoto.disabled = true;
    } catch (err) {
      alert("Não foi possível acessar a câmera");
      console.error(err);
    }
  });
}

if (btnCapture) {
  btnCapture.addEventListener("click", () => {
    if (!canvas || !video) return;
    if (!activeStream) return;

    canvas.classList.remove("d-none");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const imgData = canvas.toDataURL("image/png");
    if (photo) photo.src = imgData;

    activeStream.getTracks().forEach(track => track.stop());
    activeStream = null;
    if (video) video.classList.add("d-none");
    if (btnCapture) btnCapture.classList.add("d-none");
    if (btnPhoto) btnPhoto.disabled = false;

    saveMoment(imgData, currentLocation);
    loadHistory();

    if (canvas) {
      canvas.classList.add("d-none");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  });
}

function saveMoment(photo, location) {
  const momentos = JSON.parse(localStorage.getItem("momentos") || "[]");
  momentos.push({
    photo,
    location,
    date: new Date().toLocaleString()
  });
  localStorage.setItem("momentos", JSON.stringify(momentos));
}

function loadHistory() {
  if (!historyDiv) return; 
  const momentos = JSON.parse(localStorage.getItem("momentos") || "[]");
  historyDiv.innerHTML = "";
  momentos.forEach((m, i) => {
    historyDiv.innerHTML += `
      <div class="col-12 col-md-4 mb-3">
        <div class="card shadow-sm h-100">
          <img src="${m.photo}" class="card-img-top clickable-img" onclick="openLightbox('${m.photo.replace(/'/g, "&#39;")}')"/>
          <div class="card-body">
            <p class="card-text"><strong>Local:</strong> ${m.location || "Não informado"}</p>
            <p class="card-text"><small>${m.date}</small></p>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteMoment(${i})">Excluir</button>
          </div>
        </div>
      </div>
    `;
  });
}

function openLightbox(src) {
  try {
    const isInIframe = window.self !== window.top;
    if (isInIframe && window.top && typeof window.top.openLightboxRoot === 'function') {
      window.top.openLightboxRoot(src);
      return;
    }
  } catch (_) {
  }
  openLightboxRoot(src);
}

function openLightboxRoot(src) {
  const existing = document.querySelector('.lightbox-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';

  const img = document.createElement('img');
  img.src = src;
  img.alt = 'Foto ampliada';

  overlay.appendChild(img);
  document.body.appendChild(overlay);

  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };

  overlay.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
}

function deleteMoment(index) {
  const momentos = JSON.parse(localStorage.getItem("momentos") || "[]");
  if (index >= 0 && index < momentos.length) {
    momentos.splice(index, 1);
    localStorage.setItem("momentos", JSON.stringify(momentos));
    loadHistory();
  }
}

window.addEventListener("storage", (e) => {
  if (e.key === "momentos") {
    loadHistory();
  }
});

if (historyDiv) {
  loadHistory();
}
