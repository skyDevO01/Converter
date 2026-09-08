const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const fileListEl = document.getElementById("fileList");
const controls = document.getElementById("controls");
const audioField = document.getElementById("audioField");
const imageField = document.getElementById("imageField");
const audioTarget = document.getElementById("audioTarget");
const imageTarget = document.getElementById("imageTarget");
const convertBtn = document.getElementById("convertBtn");
const panel = document.getElementById("panel");
const resultsEl = document.getElementById("results");
const resultMsg = document.getElementById("resultMsg");
const resetBtn = document.getElementById("resetBtn");

let selectedFiles = [];
let AUDIO_EXTS = [];
let IMAGE_EXTS = [];

function extOf(name) {
  return name.includes(".") ? name.split(".").pop().toLowerCase() : "";
}

function kindOf(name) {
  const ext = extOf(name);
  if (AUDIO_EXTS.includes(ext)) return "audio";
  if (IMAGE_EXTS.includes(ext)) return "image";
  return null;
}

async function loadFormats() {
  const res = await fetch("/formats");
  const data = await res.json();
  AUDIO_EXTS = data.audio;
  IMAGE_EXTS = data.image;
  fillSelect(audioTarget, AUDIO_EXTS, "mp3");
  fillSelect(imageTarget, IMAGE_EXTS, "png");
}

function fillSelect(select, options, preferred) {
  select.innerHTML = "";
  options.forEach((ext) => {
    const opt = document.createElement("option");
    opt.value = ext;
    opt.textContent = ext;
    if (ext === preferred) opt.selected = true;
    select.appendChild(opt);
  });
}

function addFiles(fileArray) {
  for (const f of fileArray) {
    if (!selectedFiles.some((existing) => existing.name === f.name && existing.size === f.size)) {
      selectedFiles.push(f);
    }
  }
  renderFileList();
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  renderFileList();
}

function renderFileList() {
  fileListEl.innerHTML = "";
  fileListEl.hidden = selectedFiles.length === 0;
  controls.hidden = selectedFiles.length === 0;

  const hasAudio = selectedFiles.some((f) => kindOf(f.name) === "audio");
  const hasImage = selectedFiles.some((f) => kindOf(f.name) === "image");
  audioField.hidden = !hasAudio;
  imageField.hidden = !hasImage;

  selectedFiles.forEach((f, i) => {
    const li = document.createElement("li");
    li.className = "file-row";

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = f.name;

    const kind = document.createElement("span");
    kind.className = "kind";
    const k = kindOf(f.name);
    kind.textContent = k ? k : "unsupported";

    const right = document.createElement("span");
    right.style.display = "flex";
    right.style.alignItems = "center";
    right.appendChild(kind);

    const remove = document.createElement("button");
    remove.className = "remove";
    remove.setAttribute("aria-label", `Remove ${f.name}`);
    remove.textContent = "\u00d7";
    remove.addEventListener("click", () => removeFile(i));
    right.appendChild(remove);

    li.appendChild(name);
    li.appendChild(right);
    fileListEl.appendChild(li);
  });
}

dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fileInput.click();
  }
});

fileInput.addEventListener("change", () => {
  addFiles(Array.from(fileInput.files));
  fileInput.value = "";
});

["dragenter", "dragover"].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  })
);

["dragleave", "drop"].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
  })
);

dropzone.addEventListener("drop", (e) => {
  const files = Array.from(e.dataTransfer.files);
  addFiles(files);
});

convertBtn.addEventListener("click", async () => {
  if (selectedFiles.length === 0) return;

  convertBtn.disabled = true;
  convertBtn.textContent = "Converting\u2026";

  const formData = new FormData();
  selectedFiles.forEach((f) => formData.append("files", f));
  if (!audioField.hidden) formData.append("audio_target", audioTarget.value);
  if (!imageField.hidden) formData.append("image_target", imageTarget.value);

  try {
    const res = await fetch("/convert", { method: "POST", body: formData });

    if (!res.ok) {
      let msg = "Conversion failed";
      try {
        const data = await res.json();
        msg = data.error || msg;
        if (data.details) msg += ": " + data.details.join(", ");
      } catch {}
      alert(msg);
      return;
    }

    // Get filename from Content-Disposition header
    const disposition = res.headers.get("Content-Disposition") || "";
    let filename = "converted_file";
    const match = disposition.match(/filename\*?=(?:UTF-8''|"?)([^";]+)/i);
    if (match) filename = decodeURIComponent(match[1].replace(/"/g, ""));

    // Download the file
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    // Show done
    const count = selectedFiles.length;
    resultMsg.textContent = count === 1
      ? `Your file has been converted and downloaded.`
      : `${count} files converted and downloaded as a zip.`;
    showDone();
  } catch (err) {
    alert("Conversion failed: " + err.message);
  } finally {
    convertBtn.disabled = false;
    convertBtn.textContent = "Convert";
  }
});

function showDone() {
  document.getElementById("dropzone").hidden = true;
  fileListEl.hidden = true;
  controls.hidden = true;
  resultsEl.hidden = false;
}

resetBtn.addEventListener("click", () => {
  selectedFiles = [];
  document.getElementById("dropzone").hidden = false;
  resultsEl.hidden = true;
  renderFileList();
});

loadFormats();
