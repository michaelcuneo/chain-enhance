<script lang="ts">
	let {
		files = $bindable([]),
		name = $bindable("file"),
		multiple = false,
		label = `file-dropper-label-${Math.random().toString(36).substring(2, 15)}`
	}: {
		files: File[];
		name: string;
		multiple?: boolean;
		label?: string;
	 } = $props();

  let dropArea: HTMLElement;
  let progressBar: HTMLElement | null = $state(null);
  let gallery: HTMLElement;
  let hiddenInput: HTMLInputElement;

  let progress = $state(0);
  let highlight = $state(false);

  let allFiles: File[] = $state([]);
  let srcFiles: { name: string; src: string }[] = $state([]);

  let filesDone = $state(0);
  let filesToDo = $state(0);
  let hidden = $derived(() => filesDone === filesToDo && filesToDo !== 0);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    highlight = true;
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    highlight = false;
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    highlight = false;
    const dropped = e.dataTransfer?.files;
    if (dropped && dropped.length) processFiles(dropped);
  };

  const handleFiles = (event: Event) => {
    const input = event.target as HTMLInputElement;
    const selected = input.files;
    if (selected && selected.length) processFiles(selected);
  };

  const processFiles = (fileList: FileList) => {
    allFiles = Array.from(fileList);
    files = allFiles;

    // populate hidden input so the form actually submits files
    const dt = new DataTransfer();
    for (const f of allFiles) dt.items.add(f);
    hiddenInput.files = dt.files;

    filesToDo = allFiles.length;
    filesDone = 0;
    srcFiles = [];

    for (const file of allFiles) previewFile(file);
  };

  const previewFile = (file: File) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      srcFiles.push({ name: file.name, src: reader.result as string });
      updateProgress();
    };
  };

  const updateProgress = () => {
    filesDone++;
    progress = Math.floor((filesDone / filesToDo) * 100);
  };

  const removeFile = (file: { name: string; src: string }) => {
    srcFiles = srcFiles.filter((f) => f !== file);
    allFiles = allFiles.filter((f) => f.name !== file.name);

    const dt = new DataTransfer();
    for (const f of allFiles) dt.items.add(f);
    hiddenInput.files = dt.files;
    files = allFiles;
  };
</script>

<div
  bind:this={dropArea}
  role="region"
  aria-label={label}
  class="drop-area"
  class:highlight
  ondragenter={handleDragOver}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
>
  <p id={label} class="drop-instructions">
    Drag and drop your image files here or
    <label class="button" for={label + "-input"}>browse</label>.
  </p>

  <input
    type="file"
    id={label + "-input"}
    aria-labelledby={label}
    {multiple}
    accept="image/*"
    onchange={handleFiles}
    class="files"
  />

  <!-- Hidden real input to ensure form data includes files -->
  <input
    bind:this={hiddenInput}
    type="file"
    name={name}
    multiple={multiple}
    hidden
  />

  <div class="gallery" bind:this={gallery} role="list" aria-label="Uploaded file previews">
    {#each srcFiles as file}
      <div class="image-container" role="listitem">
        <img src={file.src} alt={`Preview of ${file.name}`} />
        <p class="filename">{file.name}</p>
        <button
          class="icon-button"
          type="button"
          aria-label={`Remove ${file.name}`}
          onclick={() => removeFile(file)}
        >
          <span aria-hidden="true" class="material-icons">cancel</span>
        </button>
      </div>
    {/each}
  </div>

  {#if !hidden && progress > 0 && progress < 100}
    <progress
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={progress}
      class="progress"
      bind:this={progressBar}
      max="100"
      value={progress}
    >
      {progress}%
    </progress>
  {/if}
</div>

<style>
  .drop-area {
    display: flex;
    flex-direction: column;
    border: 2px dashed var(--color-border);
    border-radius: 20px;
    width: 100%;
    min-width: 300px;
    max-width: 600px;
    padding: 1rem;
    justify-content: center;
    align-items: center;
    font-family: system-ui, sans-serif;
    color: var(--color-text);
    background: var(--color-background);
    outline: none;
    transition: all 0.3s ease-in-out;
  }

  .drop-area:focus {
    box-shadow: 0 0 0 3px var(--color-focus);
  }

  .highlight {
    background-color: var(--color-surface);
    border-color: var(--color-accent);
  }

  .gallery {
    display: flex;
    flex-wrap: wrap;
    width: 100%;
    margin-top: 1rem;
    gap: 1rem;
  }

  .image-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--color-surface);
    border-radius: 12px;
    padding: 0.5rem 1rem;
    width: 100%;
  }

  .progress {
    width: 100%;
    height: 1rem;
    margin-top: 1rem;
  }

  .icon-button {
    background: var(--color-danger);
    color: var(--color-background);
    border-radius: 50%;
    border: none;
    padding: 6px;
    cursor: pointer;
  }

  .icon-button:hover {
    background: var(--color-danger-hover);
  }

  .files {
    display: none;
  }

  .button {
    text-decoration: underline;
    cursor: pointer;
    color: var(--color-accent);
  }

  img {
    height: 60px;
    border-radius: 8px;
  }

  .filename {
    margin: 0 1rem;
    flex-grow: 1;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
</style>
