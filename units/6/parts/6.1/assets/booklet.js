(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  if (!$('#booklet-product') || !$('#booklet-page-title') || !$('#booklet-sample-label') || !$('#booklet-completed')) return;
  const cell = (tag, value) => { const node = document.createElement(tag); node.textContent = value; return node; };
  const bookletItems = [
    { object: '充電線', sample: '線芯', clues: ['容易導電','可抽成細線','表面有光澤'], category: 'metal', name: '銅', symbol: 'Cu', answer: '導電性佳又能拉成細線，因此常用在線芯；不同商品的線材仍以製造標示為準。', image: 'assets/booklet-cable.webp', imageAlt: '白色充電線局部剝開外皮，可見裡面的細金屬線芯。', art: '<svg class="product-art" viewBox="0 0 600 230" role="img" aria-label="剖面可見線芯的充電線示意圖"><path d="M55 105C50 35 100 28 170 28h252c86 0 115 31 115 78s-39 75-101 75H185c-44 0-72-18-72-48" fill="none" stroke="#d8ddd9" stroke-width="30" stroke-linecap="round"/><path d="M55 105C50 35 100 28 170 28h252c86 0 115 31 115 78s-39 75-101 75H185c-44 0-72-18-72-48" fill="none" stroke="#fbfcfa" stroke-width="20" stroke-linecap="round"/><path d="M37 91h40v29H37zM21 88h16v35H21zM503 163h35v27h-35zM538 159h37v35h-37z" fill="#e5e9e6" stroke="#9da9a2" stroke-width="3"/><circle cx="323" cy="178" r="35" fill="#fff" stroke="#9ca8a2" stroke-width="3"/><g stroke="#929d98" stroke-width="4" stroke-linecap="round"><path d="M302 158l42 40M310 153l42 40M318 151l40 38M326 150l37 34M299 168l31 31M301 179l22 20"/></g></svg>' },
    { object: '包裝薄片', sample: '薄片', clues: ['容易導電','可壓成很薄的片','表面有光澤'], category: 'metal', name: '鋁', symbol: 'Al', answer: '延展性佳，可以壓成薄片。實際包材可能還有塑膠層或其他塗層。', image: 'assets/booklet-foil.webp', imageAlt: '一片表面反光、帶有摺痕的銀色包裝薄片。', art: '<svg class="product-art" viewBox="0 0 600 230" role="img" aria-label="包裝薄片示意圖"><path d="M97 72l281-30 127 62-283 38z" fill="#f8faf8" stroke="#a9b4ae" stroke-width="4"/><path d="M97 72v87l125 63V142z" fill="#d6ddd9" stroke="#a9b4ae" stroke-width="4"/><path d="M222 142l283-38v78l-283 40z" fill="#edf0ed" stroke="#a9b4ae" stroke-width="4"/><path d="m145 87 82-7m-42 45 78-11m97-43 58 25m-21 55 64-11" stroke="#fff" stroke-width="7" opacity=".9"/></svg>' },
    { object: '釘子', sample: '釘身材料', clues: ['容易導電','可加工成細長形狀','表面有光澤'], category: 'metal', name: '鐵', symbol: 'Fe', answer: '常見釘子多以鋼材製成，鋼含鐵；這裡顯示的是鐵元素資料，不代表整根釘子是純鐵。', image: 'assets/booklet-nail.webp', imageAlt: '一枚灰色金屬釘子，完整呈現釘頭與尖端。', art: '<svg class="product-art" viewBox="0 0 600 230" role="img" aria-label="釘子示意圖"><path d="M108 71l53-31 22 25-29 41 288 78-18 31-289-99-17 47-27-4 14-59-34 22-20-26z" fill="#c7cfca" stroke="#7d8b84" stroke-width="5"/><path d="m164 67 275 95M150 106l285 83" stroke="#eef1ef" stroke-width="7" opacity=".8"/></svg>' },
    { object: '書寫用筆', sample: '筆芯材料', clues: ['較軟，容易留下痕跡','可以導電','不容易拉成細線'], category: 'nonmetal', name: '碳', symbol: 'C', answer: '石墨是碳的一種形態，能導電卻較軟；一般筆芯還含黏土，不是純碳。', image: 'assets/booklet-pencil.webp', imageAlt: '一枝削尖的木製書寫筆，深色筆芯清楚可見。', art: '<svg class="product-art" viewBox="0 0 600 230" role="img" aria-label="書寫用筆示意圖"><path d="M100 176L363 40l78 77-265 137-91 10z" fill="#e0bd83" stroke="#a9824e" stroke-width="4"/><path d="M363 40l46-24 78 77-46 24z" fill="#d5dcd7" stroke="#9da9a2" stroke-width="4"/><path d="m100 176 76 78-91 10z" fill="#efe8da" stroke="#a9824e" stroke-width="4"/><path d="m85 264 29-43 33 32z" fill="#626a66"/></svg>' },
    { object: '戒指', sample: '飾品材料', clues: ['表面有光澤','容易敲成薄片','容易導電'], category: 'metal', name: '金', symbol: 'Au', answer: '具有光澤與延展性。首飾可能是含金合金或鍍層，不一定由純金製成。', image: 'assets/booklet-ring.webp', imageAlt: '一枚素面金色戒指，完整呈現環狀外形。', art: '<svg class="product-art" viewBox="0 0 600 230" role="img" aria-label="戒指示意圖"><ellipse cx="301" cy="129" rx="128" ry="67" fill="none" stroke="#aeb9b3" stroke-width="36"/><ellipse cx="301" cy="129" rx="128" ry="67" fill="none" stroke="#f6f8f6" stroke-width="20"/><path d="M248 53l53-42 54 42-54 46z" fill="#e7ece8" stroke="#9da9a2" stroke-width="4"/><path d="m248 53 53 46 54-46m-54-42v88" fill="none" stroke="#b1bbb5" stroke-width="3"/></svg>' }
  ];
  let currentBookletItem = 0;
  let selectedForPlacement = false;
  const solvedItems = new Set();
  const bookletFeedback = $('#booklet-feedback');
  const sampleToken = $('#sample-token');
  function makeProductArt(item) {
    if (item.image) {
      const image = document.createElement('img');
      image.className = 'product-art';
      image.src = item.image;
      image.alt = item.imageAlt || '';
      return image;
    }
    const template = document.createElement('template');
    template.innerHTML = item.art;
    return template.content.firstElementChild;
  }
  function updateBookletProgress() {
    $('#booklet-completed').textContent = `已辨認 ${solvedItems.size} / ${bookletItems.length} 件`;
    $$('[data-booklet-item]').forEach((button, index) => button.classList.toggle('is-solved', solvedItems.has(index)));
    $$('#booklet-dots i').forEach((dot, index) => {
      dot.classList.toggle('is-current', index === currentBookletItem);
      dot.classList.toggle('is-solved', solvedItems.has(index));
    });
  }
  function chooseBookletItem(index) {
    currentBookletItem = index;
    const item = bookletItems[index];
    $$('[data-booklet-item]').forEach((button, i) => {
      button.setAttribute('aria-pressed', String(i === index));
      if (i === index) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    });
    $('#booklet-page-title').replaceChildren(cell('span', String(index + 1).padStart(2, '0')), document.createTextNode(`｜${item.object}裡的樣本`));
    $('#booklet-progress').textContent = `第 ${index + 1} 件｜共 ${bookletItems.length} 件`;
    $('#booklet-completed').textContent = `第 ${index + 1} 件｜共 ${bookletItems.length} 件`;
    $('#booklet-sample-label').replaceChildren(document.createTextNode(`取出的${item.sample}：`), cell('strong', `樣本 ${String.fromCharCode(65 + index)}`));
    $('#booklet-sample-id').textContent = String.fromCharCode(65 + index);
    $('#clue-one').textContent = item.clues[0]; $('#clue-two').textContent = item.clues[1]; $('#clue-three').textContent = item.clues[2];
    const product = $('#booklet-product');
    const sampleLabel = $('#booklet-sample-label');
    product.replaceChildren(makeProductArt(item), sampleLabel);
    sampleToken.textContent = `樣本 ${String.fromCharCode(65 + index)}`;
    sampleToken.hidden = solvedItems.has(index);
    sampleToken.setAttribute('aria-pressed', 'false'); selectedForPlacement = false;
    bookletFeedback.textContent = solvedItems.has(index) ? '這件樣本已完成；可查看揭曉結果，或選擇其他物品。' : '拖曳樣本卡，或先選取樣本再點分類區。';
    $('#booklet-reveal').hidden = !solvedItems.has(index);
    $('#booklet-lock-note').hidden = solvedItems.has(index);
    $$('.classification-zone').forEach(zone => { zone.classList.remove('is-correct','is-wrong'); zone.querySelector('[data-drop-slot]').textContent = '放入樣本'; });
    if (solvedItems.has(index)) revealBookletAnswer(item, index);
    else {
      $('#reveal-explanation').textContent = '';
    }
    $('#booklet-prev').disabled = index === 0;
    $('#booklet-next').disabled = index === bookletItems.length - 1;
    updateBookletProgress();
  }
  function revealBookletAnswer(item, index) {
    const zone = $(`.classification-zone[data-classify="${item.category}"]`);
    $$('.classification-zone').forEach(candidate => candidate.classList.remove('is-correct','is-wrong'));
    zone.classList.add('is-correct');
    zone.querySelector('[data-drop-slot]').replaceChildren(cell('span', item.name), cell('strong', item.symbol));
    $('#reveal-explanation').textContent = item.answer;
    $('#booklet-reveal').hidden = false;
    $('#booklet-lock-note').hidden = true;
    sampleToken.hidden = true;
    updateBookletProgress();
  }
  function classifyBookletItem(category) {
    if (solvedItems.has(currentBookletItem)) return;
    const item = bookletItems[currentBookletItem];
    selectedForPlacement = false;
    sampleToken.setAttribute('aria-pressed', 'false');
    if (category === item.category) {
      solvedItems.add(currentBookletItem);
      bookletFeedback.textContent = '分類正確！樣本卡已放入分類區，現在揭曉它的元素名稱與符號。';
      revealBookletAnswer(item, currentBookletItem);
    } else {
      $$('.classification-zone').forEach(zone => zone.classList.toggle('is-wrong', zone.dataset.classify === category));
      bookletFeedback.textContent = '這個位置還不合適。回看樣本的性質線索，再試一次。';
      window.setTimeout(() => $$('.classification-zone').forEach(zone => zone.classList.remove('is-wrong')), 700);
    }
  }
  $$('[data-booklet-item]').forEach(button => button.addEventListener('click', () => chooseBookletItem(Number(button.dataset.bookletItem))));
  sampleToken.addEventListener('click', () => {
    selectedForPlacement = !selectedForPlacement;
    sampleToken.setAttribute('aria-pressed', String(selectedForPlacement));
    bookletFeedback.textContent = selectedForPlacement ? '已選取樣本卡；現在選擇金屬元素或非金屬元素。' : '拖曳樣本卡，或先選取樣本再點分類區。';
  });
  sampleToken.addEventListener('dragstart', event => { event.dataTransfer.setData('text/plain', String(currentBookletItem)); event.dataTransfer.effectAllowed = 'move'; });
  $$('.classification-zone').forEach(zone => {
    zone.addEventListener('click', () => { if (selectedForPlacement || !sampleToken.hidden) classifyBookletItem(zone.dataset.classify); });
    zone.addEventListener('dragover', event => { event.preventDefault(); zone.classList.add('is-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('is-over'));
    zone.addEventListener('drop', event => { event.preventDefault(); zone.classList.remove('is-over'); classifyBookletItem(zone.dataset.classify); });
  });
  $('#booklet-prev').addEventListener('click', () => chooseBookletItem(Math.max(0, currentBookletItem - 1)));
  $('#booklet-next').addEventListener('click', () => chooseBookletItem(Math.min(bookletItems.length - 1, currentBookletItem + 1)));
  chooseBookletItem(0);
})();
