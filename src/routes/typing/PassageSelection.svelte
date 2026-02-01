<script>
  import { onMount } from "svelte";
  import { passages } from "./passages.json";

  // Props
  export let selectedPassage = null;
  export let onSelectPassage;
  export let onClose;
  export let currentContent = "";

  // State
  let searchTerm = "";
  let selectedCategories = [];
  let selectedLength = "all";
  let showCustomTextPanel = false;
  let customText = "";

  // Categories for filtering
  const categories = [
    "DSE十二篇範文",
    "說明文",
    "白話文",
    "英文",
    "流行曲歌詞",
  ];

  // Helper function to get passage length category
  function getPassageLengthCategory(content) {
    const length = content.length;
    if (length < 100) return "短篇";
    if (length <= 500) return "中篇";
    return "長篇";
  }
  const lengths = [
    { value: "all", label: "全部長度" },
    { value: "short", label: "短篇 (100字以下)" },
    { value: "medium", label: "中篇 (100-500字)" },
    { value: "long", label: "長篇 (500字以上)" },
  ];

  // Helper function for fuzzy search
  function fuzzySearch(text, pattern) {
    if (!pattern) return true;

    const textLower = text.toLowerCase();
    const patternLower = pattern.toLowerCase();
    let textIndex = 0;
    let patternIndex = 0;

    while (textIndex < textLower.length && patternIndex < patternLower.length) {
      if (textLower[textIndex] === patternLower[patternIndex]) {
        patternIndex++;
      }
      textIndex++;
    }

    return patternIndex === patternLower.length;
  }

  // Computed filtered passages
  $: filteredPassages = passages.filter((passage) => {
    // Search filter - use fuzzy search
    const matchesSearch =
      !searchTerm ||
      fuzzySearch(passage.title, searchTerm) ||
      fuzzySearch(passage.content, searchTerm) ||
      passage.category.some((cat) => fuzzySearch(cat, searchTerm));

    // Category filter
    const matchesCategory =
      selectedCategories.length === 0 ||
      selectedCategories.some((cat) => passage.category.includes(cat));

    // Length filter
    const contentLength = passage.content.length;
    let matchesLength = true;
    if (selectedLength === "short") {
      matchesLength = contentLength < 100;
    } else if (selectedLength === "medium") {
      matchesLength = contentLength >= 100 && contentLength <= 500;
    } else if (selectedLength === "long") {
      matchesLength = contentLength > 500;
    }

    return matchesSearch && matchesCategory && matchesLength;
  });

  // Handle category toggle
  function toggleCategory(category) {
    if (selectedCategories.includes(category)) {
      selectedCategories = selectedCategories.filter((c) => c !== category);
    } else {
      selectedCategories = [...selectedCategories, category];
    }
  }

  // Handle length selection
  function selectLength(length) {
    selectedLength = length;
  }

  // Handle search input
  function handleSearch(event) {
    searchTerm = event.target.value;
  }

  // Handle passage selection
  function selectPassage(passage) {
    if (onSelectPassage) {
      onSelectPassage(passage);
    }
  }

  // Handle close
  function handleClose() {
    if (onClose) {
      onClose();
    }
  }

  // Handle custom text selection
  function selectCustomText() {
    if (customText.trim()) {
      const customPassage = {
        title: "自訂文章",
        content: customText.trim(),
        category: ["自訂"],
      };
      if (onSelectPassage) {
        onSelectPassage(customPassage);
      }
    }
  }

  // Handle custom text panel close
  function closeCustomTextPanel() {
    showCustomTextPanel = false;
    customText = "";
  }

  // Handle clear custom text
  function clearCustomText() {
    customText = "";
  }

  // Handle custom text panel open
  function openCustomTextPanel() {
    showCustomTextPanel = true;
    // Set default text to current test content
    customText = currentContent || "";
  }

  // Keyboard navigation
  function handleKeyDown(event) {
    if (event.key === "Escape") {
      handleClose();
    }
  }

  // Tooltip functions
  let hoverTooltipVisible = false;
  let hoverTooltipContent = "";
  let hoverTooltipX = 0;
  let hoverTooltipY = 0;

  function showHoverTooltip(event, content) {
    hoverTooltipContent = content;
    hoverTooltipX = event.clientX + 10;
    hoverTooltipY = event.clientY + 10;
    hoverTooltipVisible = true;
  }

  function updateTooltipPosition(event) {
    if (hoverTooltipVisible) {
      hoverTooltipX = event.clientX + 10;
      hoverTooltipY = event.clientY + 10;
    }
  }

  function hideHoverTooltip() {
    hoverTooltipVisible = false;
  }

  onMount(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });
</script>

<div class="passage-selection-overlay" onclick={handleClose}>
  <div class="passage-selection-panel" onclick={(e) => e.stopPropagation()}>
    <div class="panel-header">
      <h2>選擇文章</h2>
      <button class="close-btn" onclick={handleClose}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    <div class="filters-section">
      <!-- Search Bar -->
      <div class="search-container">
        <div class="search-with-custom">
          <input
            type="text"
            class="search-input"
            placeholder="搜尋文章標題或內容..."
            bind:value={searchTerm}
            oninput={handleSearch}
          />
          <button class="custom-text-btn" onclick={openCustomTextPanel}>
            自訂文章
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-container">
        <!-- Category Filters -->
        <div class="filter-group">
          <label class="filter-label">類別</label>
          <div class="category-buttons">
            {#each categories as category}
              <button
                class="category-btn {selectedCategories.includes(category)
                  ? 'active'
                  : ''}"
                onclick={() => toggleCategory(category)}
              >
                {category}
              </button>
            {/each}
          </div>
        </div>

        <!-- Length Filter -->
        <div class="filter-group">
          <label class="filter-label">長度</label>
          <div class="length-buttons">
            {#each lengths as length}
              <button
                class="length-btn {selectedLength === length.value
                  ? 'active'
                  : ''}"
                onclick={() => selectLength(length.value)}
              >
                {length.label}
              </button>
            {/each}
          </div>
        </div>
      </div>
    </div>

    <!-- Passage Grid -->
    <div class="passages-grid">
      {#if filteredPassages.length === 0}
        <div class="no-results">
          <p>沒有找到符合條件的文章</p>
          <button
            class="clear-filters-btn"
            onclick={() => {
              searchTerm = "";
              selectedCategories = [];
              selectedLength = "all";
            }}
          >
            清除篩選條件
          </button>
        </div>
      {:else}
        {#each filteredPassages as passage, index}
          <button class="passage-card" onclick={() => selectPassage(passage)}>
            <div class="passage-header">
              <h3 class="passage-title">{passage.title}</h3>
              <span class="passage-length">{passage.content.length} 字</span>
            </div>
            <div class="passage-categories">
              {#each passage.category as cat}
                <span class="category-tag">{cat}</span>
              {/each}
              <span class="category-tag"
                >{getPassageLengthCategory(passage.content)}</span
              >
            </div>
            <div class="passage-preview">
              {passage.content.substring(0, 100)}{passage.content.length > 100
                ? "..."
                : ""}
            </div>
          </button>
        {/each}
      {/if}
    </div>

    <!-- Custom Text Panel -->
    {#if showCustomTextPanel}
      <div class="custom-text-overlay" onclick={closeCustomTextPanel}>
        <div class="custom-text-panel" onclick={(e) => e.stopPropagation()}>
          <div class="panel-header">
            <h2>自訂文章</h2>
            <button class="close-btn" onclick={closeCustomTextPanel}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="custom-text-content">
            <div class="text-input-container">
              <label class="input-label">請輸入或貼上您想要練習的文章：</label>
              <textarea
                class="custom-textarea"
                bind:value={customText}
                placeholder="在這裡輸入您的文章內容..."
                rows="10"
              ></textarea>
              <div class="text-stats">
                <span class="char-count">{customText.length} 字</span>
              </div>
            </div>
            <div class="custom-text-actions">
              <button
                class="clear-btn"
                onclick={clearCustomText}
                onmouseenter={(e) => showHoverTooltip(e, "清空文章")}
                onmousemove={updateTooltipPosition}
                onmouseleave={hideHoverTooltip}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="trash-icon"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                  />
                </svg>
              </button>
              <button class="cancel-btn" onclick={closeCustomTextPanel}>
                取消
              </button>
              <button
                class="select-btn"
                disabled={!customText.trim()}
                onclick={selectCustomText}
              >
                選擇此文章
              </button>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Tooltip -->
    {#if hoverTooltipVisible}
      <div
        class="hover-tooltip visible"
        style="left: {hoverTooltipX}px; top: {hoverTooltipY}px;"
      >
        {hoverTooltipContent}
      </div>
    {/if}
  </div>
</div>

<style>
  .passage-selection-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: top;
    justify-content: center;
    z-index: 3000;
    padding: 20px;
  }

  .passage-selection-panel {
    background: #2d2d2d;
    border-radius: 12px;
    width: 100%;
    max-width: 800px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    border: 1px solid #444;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #444;
  }

  .panel-header h2 {
    color: white;
    margin: 0;
    font-size: 1.5rem;
  }

  .close-btn {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 5px;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .close-btn:hover {
    background-color: #444;
  }

  .filters-section {
    padding: 20px;
    border-bottom: 1px solid #444;
    background: #252525;
  }

  .search-container {
    margin-bottom: 20px;
  }

  .search-with-custom {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .search-input {
    flex: 1;
    padding: 12px 16px;
    border-radius: 8px;
    border: 1px solid #555;
    background: #333;
    color: white;
    font-size: 1rem;
    outline: none;
    transition: border-color 0.2s;
  }

  .search-input:focus {
    border-color: #007bff;
  }

  .custom-text-btn {
    padding: 12px 20px;
    border-radius: 8px;
    border: 1px solid #555;
    background: #333;
    color: white;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .custom-text-btn:hover {
    background: #444;
    border-color: #666;
  }

  .custom-text-btn:active {
    transform: translateY(1px);
  }

  .filters-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .filter-label {
    color: #ccc;
    font-size: 0.9rem;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .category-buttons,
  .length-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .category-btn,
  .length-btn {
    padding: 8px 16px;
    border: 1px solid #555;
    background: #333;
    color: white;
    border-radius: 20px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .category-btn:hover,
  .length-btn:hover {
    background: #444;
    border-color: #666;
  }

  .category-btn.active,
  .length-btn.active {
    background: #007bff;
    border-color: #007bff;
    color: white;
  }

  .passages-grid {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 16px;
  }

  .passage-card {
    background: #333;
    border: 1px solid #444;
    border-radius: 8px;
    padding: 16px;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 120px;
  }

  .passage-card:hover {
    background: #3a3a3a;
    border-color: #555;
    transform: translateY(-2px);
  }

  .passage-card:active {
    transform: translateY(0);
  }

  .passage-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;
  }

  .passage-title {
    color: white;
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    flex: 1;
    margin-right: 10px;
  }

  .passage-length {
    color: #888;
    font-size: 0.8rem;
    background: #444;
    padding: 2px 8px;
    border-radius: 12px;
    align-self: flex-start;
  }

  .passage-categories {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
  }

  .category-tag {
    color: #ccc;
    font-size: 0.75rem;
    background: #444;
    padding: 2px 8px;
    border-radius: 12px;
  }

  .passage-preview {
    color: #aaa;
    font-size: 0.9rem;
    line-height: 1.4;
    flex: 1;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    text-overflow: ellipsis;
  }

  .no-results {
    text-align: center;
    color: #888;
    padding: 40px;
    grid-column: 1 / -1;
  }

  .no-results p {
    margin-bottom: 20px;
    font-size: 1.1rem;
  }

  .clear-filters-btn {
    background: #007bff;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .clear-filters-btn:hover {
    background: #0056b3;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .passage-selection-panel {
      max-height: 90vh;
    }

    .passages-grid {
      grid-template-columns: 1fr;
      padding: 16px;
    }

    .panel-header {
      padding: 16px;
    }

    .filters-section {
      padding: 16px;
    }
  }

  /* Custom Text Panel Styles */
  .custom-text-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 4000;
    padding: 20px;
  }

  .custom-text-panel {
    background: #2d2d2d;
    border-radius: 12px;
    width: 100%;
    max-width: 600px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    border: 1px solid #444;
  }

  .custom-text-content {
    padding: 20px;
  }

  .text-input-container {
    margin-bottom: 20px;
  }

  .input-label {
    display: block;
    color: #ccc;
    font-size: 0.9rem;
    font-weight: bold;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .custom-textarea {
    width: 100%;
    padding: 12px 16px;
    border-radius: 8px;
    border: 1px solid #555;
    background: #333;
    color: white;
    font-size: 1rem;
    font-family: inherit;
    outline: none;
    transition: border-color 0.2s;
    resize: vertical;
    min-height: 200px;
  }

  .custom-textarea:focus {
    border-color: #007bff;
  }

  .text-stats {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
  }

  .char-count {
    color: #888;
    font-size: 0.8rem;
    background: #444;
    padding: 4px 8px;
    border-radius: 12px;
  }

  .custom-text-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .cancel-btn,
  .select-btn {
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid #555;
  }

  .cancel-btn {
    background: #333;
    color: white;
    border-color: #555;
  }

  .cancel-btn:hover {
    background: #444;
    border-color: #666;
  }

  .clear-btn {
    background: #dc3545;
    color: white;
    border-color: #dc3545;
    padding: 10px 16px;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid #dc3545;
  }

  .clear-btn:hover {
    background: #c82333;
    border-color: #c82333;
    transform: translateY(-1px);
  }

  .clear-btn:active {
    transform: translateY(0);
  }

  .clear-btn .trash-icon {
    width: 1.2rem;
    height: 1.2rem;
  }

  .select-btn {
    background: #28a745;
    color: white;
    border-color: #28a745;
  }

  .select-btn:hover:not(:disabled) {
    background: #218838;
    border-color: #1e7e34;
  }

  .select-btn:disabled {
    background: #6c757d;
    border-color: #6c757d;
    color: #adb5bd;
    cursor: not-allowed;
    opacity: 0.6;
  }

  /* Responsive adjustments for custom text panel */
  @media (max-width: 768px) {
    .custom-text-panel {
      max-height: 90vh;
    }

    .custom-text-actions {
      flex-direction: column;
    }

    .cancel-btn,
    .select-btn {
      width: 100%;
    }
  }

  /* Tooltip Styles */
  .hover-tooltip {
    position: fixed;
    background-color: #333;
    color: white;
    padding: 0.5rem 0.75rem;
    border-radius: 0.25rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    z-index: 5000;
    pointer-events: none;
    opacity: 0;
    transform: translateY(-5px);
    transition:
      opacity 0.2s ease,
      transform 0.2s ease;
    font-size: 0.8rem;
    white-space: nowrap;
  }

  .hover-tooltip.visible {
    opacity: 1;
    transform: translateY(0);
  }
</style>
