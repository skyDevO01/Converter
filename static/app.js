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
const resultListEl = document.getElementById("resultList");
const zipLink = document.getElementById("zipLink");
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
    const data = await res.json();
    showResults(data);
  } catch (err) {
    alert("Conversion failed: " + err.message);
  } finally {
    convertBtn.disabled = false;
    convertBtn.textContent = "Convert";
  }
});

function showResults(data) {
  resultListEl.innerHTML = "";

  data.results.forEach((r) => {
    const li = document.createElement("li");
    li.className = "result-row" + (r.ok ? "" : " error");

    const names = document.createElement("span");
    names.className = "names";
    if (r.ok) {
      names.innerHTML = `${r.original}<span class="arrow">\u2192</span>${r.converted}`;
    } else {
      names.textContent = r.original;
    }
    li.appendChild(names);

    if (r.ok) {
      const link = document.createElement("a");
      link.className = "download";
      link.href = r.download_url;
      link.textContent = "Download";
      link.setAttribute("download", "");
      li.appendChild(link);
    } else {
      const err = document.createElement("span");
      err.className = "error-text";
      err.textContent = r.error;
      li.appendChild(err);
    }

    resultListEl.appendChild(li);
  });

  if (data.zip_url) {
    zipLink.href = data.zip_url;
    zipLink.hidden = false;
  } else {
    zipLink.hidden = true;
  }

  dropzone.parentElement.querySelectorAll(".dropzone, .file-list, .controls").forEach((el) => {
    // keep dropzone/list/controls but tuck them away visually by hiding this round's inputs
  });
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
