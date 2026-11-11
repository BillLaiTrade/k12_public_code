const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs/promises');
const { chromium } = require('playwright');
const { createHash } = require('node:crypto');

test('6.1 element lesson in a real browser', { timeout: 60000 }, async t => {
  const server = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], {
    cwd: path.resolve(__dirname, '..'), stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => server.kill());
  const port = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('HTTP server did not start')), 5000);
    server.stdout.on('data', chunk => {
      output += chunk;
      const match = output.match(/port (\d+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
    server.once('error', reject);
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`HTTP server exited ${code}`)); });
  });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const failures = [];
  const watch = p => {
    p.on('pageerror', error => failures.push(error.message));
    p.on('requestfailed', request => failures.push(request.url()));
    p.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  };
  watch(page);
  const base = process.env.ELEMENTS_URL || `http://127.0.0.1:${port}/units/6/parts/6.1/`;
  await page.goto(base);
  const text = selector => page.locator(selector).innerText();
  const pressed = selector => page.locator(selector).getAttribute('aria-pressed');
  const captureDir = process.env.ELEMENTS_CAPTURE_DIR;
  if (captureDir) await fs.mkdir(captureDir, { recursive: true });
  async function capture(selector, name) {
    if (captureDir) await page.locator(selector).screenshot({ path: path.join(captureDir, `${name}.png`) });
  }

  await t.test('asset versions match content and avoid the legacy unversioned fire script', async () => {
    const assetURLs = await page.locator('link[rel=stylesheet],script[src]').evaluateAll(nodes => nodes.map(node => node.href || node.src));
    assert.equal(assetURLs.length, 11);
    for (const assetURL of assetURLs) {
      const url = new URL(assetURL);
      const filename = path.basename(url.pathname);
      const sharedAsset = url.pathname.includes('/shared-assets/');
      const assetPath = sharedAsset ? '../shared-assets' : '../units/6/parts/6.1/assets';
      const bytes = await fs.readFile(path.resolve(__dirname, assetPath, filename));
      const expectedVersion = sharedAsset ? '20261109-quiz-header-standard' : createHash('sha256').update(bytes).digest('hex').slice(0, 12);
      assert.equal(url.searchParams.get('v'), expectedVersion, filename);
    }
    const context = await browser.newContext();
    try {
      let legacyRequests = 0;
      await context.route('**/assets/classical-inquiry.js*', async route => {
        if (!new URL(route.request().url()).search) {
          legacyRequests++;
          await route.fulfill({ contentType: 'text/javascript', body: 'window.ClassicalInquiry={render(){document.querySelector("#inquiry-diagram").textContent="銀白色鎂帶"}};' });
        } else await route.continue();
      });
      const revisited = await context.newPage();
      await revisited.goto(base);
      await revisited.locator('[data-classical=fire]').click();
      assert.match(await revisited.locator('#inquiry-illustration img').getAttribute('alt'), /熟悉的蠟燭/);
      assert.equal(await revisited.locator('#inquiry-controls button').count(), 0);
      assert.doesNotMatch(await revisited.locator('#inquiry-diagram').innerText(), /鎂帶|氧化鎂/);
      assert.equal(legacyRequests, 0);
    } finally { await context.close(); }
  });

  await t.test('six approved topics, booklet interaction, shared characters and working anchors', async () => {
    assert.deepEqual(await page.locator('.lesson-card h2').allTextContents(), [
      '古人說的「元素」，和今天一樣嗎？', '金屬和非金屬，有什麼不一樣？',
      '金屬和非金屬，總是有這些性質嗎？', '元素的名稱和符號，怎麼對起來？',
      '石墨和鑽石差這麼多，為什麼都和碳有關？', '生活用品元素線索冊'
    ]);
    assert.equal(await page.locator('form').count(), 0);
    assert.equal(await page.locator('#s1 input,#s2 input,#s3 input,#s4 input,#s5 input').count(), 0);
    for (const href of await page.locator('.route a').evaluateAll(links => links.map(a => a.hash))) {
      assert.equal(await page.locator(href).count(), 1);
    }
    const thirdHeading = page.locator('#title-3');
    const originalThirdHeading = await thirdHeading.innerText();
    await thirdHeading.evaluate(node => { node.textContent = '測試標題同步'; });
    await page.waitForFunction(() => document.querySelector('.route a[href="#s3"] span').textContent === '測試標題同步');
    await thirdHeading.evaluate((node, title) => { node.textContent = title; }, originalThirdHeading);
    await page.waitForFunction(title => document.querySelector('.route a[href="#s3"] span').textContent === title, originalThirdHeading);
    const avatar = await page.locator('.speaker').first().evaluate(node => getComputedStyle(node, '::before').backgroundImage);
    assert.match(avatar, /shared-assets\/characters\/dialogue-character-avatars.png/);
    assert.doesNotMatch(await text('body'), /CARD\s*0|Part|候選版|製作階段/);
    const heroColumns = await page.locator('.hero').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').map(parseFloat));
    assert.equal(heroColumns.length, 2);
    assert.ok(heroColumns[1] > heroColumns[0], 'cover column is wider than the heading column, matching the completed unit headers');
    const cover = await page.locator('.hero-figure img').boundingBox();
    assert.ok(Math.abs(cover.width / cover.height - 16 / 9) < 0.03, 'cover uses the same 16:9 ratio as completed units');
    await capture('.masthead', 'hero-desktop');
    assert.equal(await page.locator('[data-booklet-item]').count(), 5);
    assert.equal(await page.locator('.booklet-item .item-icon svg').count(), 5);
    assert.deepEqual(await page.locator('[data-booklet-item] span:nth-child(2)').allTextContents(), ['充電線','包裝薄片','釘子','書寫用筆','戒指']);
    assert.equal(await page.locator('#booklet-reveal').isVisible(), false);
    assert.equal(await page.locator('.classification-zone').count(), 2);
  });

  await t.test('four complete aligned pairs are visible before clicking; details never replace results', async () => {
    const rows = page.locator('[data-classical]');
    assert.equal(await rows.count(), 4);
    assert.equal(await page.locator('#classical-detail').isVisible(), false);
    const expected = ['日常泥土通常是混合物','水是化合物','日常空氣是混合物','火焰是燃燒的現象'];
    assert.deepEqual(await page.locator('.modern-cell strong').allTextContents(), expected);
    const initial = await rows.allTextContents();
    await capture('#s1', 'comparison-initial-desktop');
    await capture('.comparison-table', 'comparison-table-desktop');
    for (const key of ['earth','fire','air','water','earth','water']) {
      await page.locator(`[data-classical="${key}"]`).click();
      assert.equal(await page.locator('#classical-detail').isVisible(), true);
      assert.equal(await page.locator('[data-classical][aria-expanded=true]').count(), 1);
      assert.deepEqual(await rows.allTextContents(), initial);
      for (const row of await rows.all()) assert.equal(await row.isVisible(), true);
      assert.equal(await page.locator('.water-record').count(), key === 'water' ? 2 : 0);
    }
    assert.match(await text('#inquiry-evidence-summary'), /水.*氫.*氧/);
    assert.equal(await page.locator('.inquiry-study').isVisible(), false);
    await capture('#s1', 'comparison-water-desktop');
    await page.locator('#inquiry-research summary').click();
    assert.match(await text('#history-scope'), /並不是波以耳/);
    assert.match(await text('#inquiry-diagram-note'), /未表示氣體體積比例/);
    await page.locator('#classical-close').click();
    assert.equal(await page.locator('#classical-detail').isVisible(), false);
    assert.equal(await page.locator('[data-classical][aria-expanded=true]').count(), 0);
    assert.equal(await page.locator('[data-classical=water]').evaluate(n => n === document.activeElement), true);
    assert.deepEqual(await rows.allTextContents(), initial);
    await page.locator('[data-classical=earth]').click();
    const headerBox = await page.locator('#classical-close').boundingBox();
    await page.mouse.click(headerBox.x + headerBox.width * 0.55, headerBox.y + headerBox.height / 2);
    assert.equal(await page.locator('#classical-detail').isVisible(), false, 'blank area in the detail header should collapse it');
    assert.equal(await page.locator('#classical-close').getAttribute('aria-expanded'), 'false');
  });

  await t.test('each classical item has its own past, evidence and modern explanation', async () => {
    const expected = {
      earth: ['土', /道庫恰耶夫/, /礦物、有機物/, /混合物/],
      water: ['水', /卡文迪西/, /拉瓦節與拉普拉斯/, /化合物/],
      air: ['氣', /布萊克/, /普利斯特里/, /混合物/],
      fire: ['火', /拉瓦節/, /質量增加/, /燃燒/]
    };
    const explanations = new Set();
    const original = await page.locator('[data-classical]').allTextContents();
    for (const [key, [name, first, second, conclusion]] of Object.entries(expected)) {
      await page.locator(`[data-classical="${key}"]`).click();
      assert.equal(await text('#classical-history-title'), `${name}的觀念發展脈絡`);
      assert.equal(await page.locator('.inquiry-stage').count(), 3);
      assert.equal(await page.locator('.inquiry-path p').count(), 3);
      assert.equal(await page.locator('.inquiry-main-figure').count(), 1);
      assert.equal(await page.locator('.inquiry-study').isVisible(), false);
      assert.ok((await page.locator('#classical-detail').boundingBox()).height <= 650, `compact desktop panel for ${key}`);
      await page.locator('#inquiry-research summary').click();
      assert.equal(await page.locator('[data-stage=past]').isVisible(), true);
      assert.equal(await page.locator('[data-stage=evidence]').isVisible(), true);
      assert.equal(await page.locator('[data-stage=modern]').isVisible(), true);
      assert.match(await text('#history-evidence-text'), first);
      assert.match((await text('#history-evidence-text')) + (await text('#history-observation')), second);
      assert.match(await text('#history-modern-title'), conclusion);
      assert.ok((await text('#history-past-text')).length > 30);
      assert.ok((await text('#history-scope')).length > 30);
      assert.ok(await page.locator('#history-sources a').count() >= 2);
      explanations.add(await text('#history-evidence-text'));
      assert.deepEqual(await page.locator('[data-classical]').allTextContents(), original);
      await page.locator('#inquiry-research summary').click();
      const orderedStages = await page.locator('.inquiry-stage').all();
      for (let i=1;i<orderedStages.length;i++) {
        const previous=await orderedStages[i-1].boundingBox(), current=await orderedStages[i].boundingBox();
        assert.ok(current.y >= previous.y + previous.height, `ordered stages for ${key}`);
      }
      assert.equal(await page.locator('[data-stage=modern] img').count(), 0);
      await capture('#classical-detail', `history-${key}-desktop`);
    }
    assert.equal(explanations.size, 4);
    assert.equal(await page.locator('#s1 .visual-inquiry').count(), 1);
    await page.setViewportSize({width:390,height:1000});
    await page.locator('[data-classical=air]').click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    assert.ok((await page.locator('#classical-detail').boundingBox()).height <= 850);
    const panels = await page.locator('.inquiry-stage').all();
    for (let i=1;i<panels.length;i++) {
      const a=await panels[i-1].boundingBox(), b=await panels[i].boundingBox();
      assert.ok(b.y >= a.y + a.height);
    }
    await capture('#classical-detail', 'history-air-mobile');
    await page.locator('#classical-close').click();
    await page.setViewportSize({width:1440,height:1000});
  });

  await t.test('pictures can be explored directly while narrative details stay collapsed', async () => {
    await page.locator('[data-classical=earth]').click();
    assert.equal(await page.locator('#inquiry-research').getAttribute('open'), null);
    assert.equal(await page.locator('.soil-target').count(), 4);
    await page.locator('.soil-legend button[data-observation=air]').click();
    assert.equal(await page.locator('.soil-target.focused').getAttribute('data-observe'), 'air');
    await page.locator('[data-observe=mineral]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.soil-legend button[data-observation=mineral]').getAttribute('aria-pressed'), 'true');
    for (const label of await page.locator('[data-stage=past] p,[data-stage=modern] p').allTextContents()) assert.ok(label.length <= 20);
    assert.ok((await text('#inquiry-evidence-summary')).length <= 45);
    await page.locator('[data-classical=air]').click();
    const initial = await page.locator('.gas-thumbnail small').allTextContents();
    assert.deepEqual(initial, ['較旺','燃燒','熄滅']);
    for (const value of ['oxygen','ordinary','carbon']) {
      const trigger=page.locator(`[data-gas-view="${value}"]`);
      await trigger.click();
      assert.equal(await page.locator('#observation-view').isVisible(), true);
      await page.waitForFunction(() => document.querySelector('#observation-view-image img').naturalWidth > 1000);
      if (value === 'oxygen') {
        assert.match(await text('#observation-view-caption'), /助燃.*不是燃料/);
        await capture('#observation-view', 'air-magnified');
        await page.locator('#observation-view-close').click();
      } else await page.keyboard.press('Escape');
      assert.equal(await page.locator('#observation-view').isVisible(), false);
      assert.equal(await trigger.evaluate(node => node === document.activeElement), true);
      assert.equal(await page.locator('#inquiry-research').getAttribute('open'), null);
      assert.deepEqual(await page.locator('.gas-thumbnail small').allTextContents(), initial);
    }
    await page.locator('[data-classical=fire]').click();
    assert.equal(await page.locator('.inquiry-main-figure button').count(), 0);
    for (const label of await page.locator('[data-stage=past] p,[data-stage=modern] p').allTextContents()) assert.ok(label.length <= 20);
    assert.ok((await text('#inquiry-evidence-summary')).length <= 45);
    await page.locator('#classical-close').click();
  });

  await t.test('detailed explorations remain available without expanding the primary explanation', async () => {
    await page.locator('[data-classical=earth]').click();
    assert.equal(await page.locator('#inquiry-research').getAttribute('open'), null);
    assert.equal(await page.locator('#inquiry-controls').isVisible(), false);
    await page.locator('#inquiry-research summary').click();
    assert.equal(await page.locator('.soil-target').count(), 4);
    assert.equal(await page.locator('.soil-observer image').evaluate(n => n.href.baseVal.endsWith('soil-composition.png')), true);
    for (const value of ['mineral','organic','water','air']) {
      await page.locator(`.soil-legend button[data-observation="${value}"]`).click();
      assert.equal(await page.locator('.soil-target.focused').getAttribute('data-observe'), value);
      assert.equal(await page.locator(`.soil-legend button[data-observation="${value}"]`).getAttribute('aria-pressed'), 'true');
    }
    assert.match(await text('#inquiry-feedback'), /未被水填滿的孔隙/);
    await page.locator('[data-observe=mineral]').focus(); await page.keyboard.press('Enter');
    assert.match(await text('#inquiry-feedback'), /岩石風化/);
    await page.locator('[data-classical=water]').click();
    assert.equal(await page.locator('#inquiry-research').getAttribute('open'), null);
    await page.locator('#inquiry-research summary').click();
    assert.match(await text('.water-record[data-focus=formation]'), /冷卻後，容器壁出現水滴/);
    assert.match(await text('.water-record[data-focus=decomposition]'), /兩側收集的氣體，分別是氫與氧/);
    assert.match(await page.locator('.water-record[data-focus=decomposition] svg').getAttribute('aria-label'), /負極收集氫氣、正極收集氧氣/);
    for (const value of ['formation','decomposition']) {
      await page.locator(`#inquiry-controls button[data-observation="${value}"]`).click();
      assert.equal(await page.locator('.water-record.focused').getAttribute('data-focus'), value);
      for (const record of await page.locator('.water-record').all()) assert.equal(await record.isVisible(), true);
    }
    await page.locator('[data-classical=air]').click();
    await page.locator('#inquiry-research summary').click();
    await page.waitForFunction(() => [...document.querySelectorAll('#visual-inquiry img')].every(img => img.complete && img.naturalWidth > 1000));
    assert.equal(await page.locator('.gas-record img').count(), 3);
    assert.match(await text('#inquiry-diagram-note'), /氣體均無色/);
    for (const value of ['oxygen','carbon','ordinary']) {
      await page.locator(`#inquiry-controls button[data-observation="${value}"]`).click();
      assert.equal(await page.locator('.gas-record.focused').getAttribute('data-focus'), value);
      assert.equal(await page.locator('.gas-record').count(), 3);
    }
    assert.match(await page.locator('.air-composition').textContent(), /氮.*氧.*其他氣體/);
    await page.locator('#inquiry-controls button[data-observation=carbon]').click();
    assert.match(await text('#inquiry-feedback'), /不足以證明空氣是混合物/);
    await page.locator('[data-classical=fire]').click();
    await page.locator('#inquiry-research summary').click();
    assert.match(await text('#inquiry-title'), /火.*燃燒時的現象/);
    await page.waitForFunction(() => [...document.querySelectorAll('#visual-inquiry img')].every(img => img.complete && img.naturalWidth > 1000));
    assert.equal(await page.locator('.fire-sequence img').count(), 2);
    assert.match(await text('.fire-burning'), /火焰發光、放熱/);
    assert.match(await text('.fire-after'), /水蒸氣、二氧化碳/);
    assert.match(await text('#inquiry-conclusion-text'), /火焰.*燃燒.*現象/);
    assert.equal(await page.locator('.fire-findings,#inquiry-conclusion-visual').count(), 0);
    assert.match(await text('.candle-reaction'), /蠟.*氧氣.*充分燃燒/s);
    assert.equal(await page.locator('#inquiry-controls button').count(), 0);
    assert.equal(await page.locator('#inquiry-controls').isVisible(), false);
    assert.equal(await page.locator('#inquiry-feedback').isVisible(), false);
    assert.match(await text('#inquiry-diagram-note'), /蠟融化本身不是燃燒/);
    assert.doesNotMatch(await text('#visual-inquiry'), /鎂帶|氧化鎂/);
    await page.locator('[data-classical=earth]').click();
    assert.equal(await page.locator('.inquiry-study').isVisible(), false);
    await page.locator('#inquiry-research summary').click();
    assert.equal(await page.locator('.soil-legend button').first().isVisible(), true);
    assert.equal(await page.locator('#inquiry-controls').isVisible(), false);
    assert.equal(await page.locator('#inquiry-feedback').isVisible(), true);
    assert.equal(await page.locator('#visual-inquiry').getAttribute('data-observation'), 'water');
    assert.equal(await page.locator('.water-record').count(), 0);
    await page.locator('#classical-close').click();
  });

  await t.test('comparison pairs share a row at every width, and details appear below all pairs', async () => {
    for (const width of [1440,1280,1024,768,390,320]) {
      await page.setViewportSize({width,height:1000});
      const rects = [];
      for (const row of await page.locator('[data-classical]').all()) {
        const left = await row.locator('.ancient-cell').boundingBox();
        const right = await row.locator('.modern-cell').boundingBox();
        assert.ok(left.x + left.width <= right.x, `left/right at ${width}`);
        assert.ok(Math.abs(left.y - right.y) < 1, `paired y at ${width}`);
        assert.ok(Math.abs(left.height - right.height) < 1, `paired height at ${width}`);
        rects.push(await row.boundingBox());
      }
      for (let i=1;i<rects.length;i++) assert.ok(rects[i].y >= rects[i-1].y + rects[i-1].height - 1);
      await page.locator('[data-classical=water]').click();
      const detail = await page.locator('#classical-detail').boundingBox();
      assert.ok(detail.y > rects[3].y + rects[3].height);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      if (width === 390) {
        await capture('#s1', 'comparison-water-mobile');
        await capture('.comparison-table', 'comparison-table-mobile');
        await capture('.inquiry-main-figure', 'water-main-mobile');
      }
      await page.locator('[data-classical=air]').click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      for (const image of await page.locator('.inquiry-main-figure').all()) {
        const rect = await image.boundingBox();
        assert.ok(rect.x >= 0 && rect.x + rect.width <= width + 1);
      }
      await page.locator('[data-classical=fire]').click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      const picturePair = await page.locator('.inquiry-main-figure').boundingBox();
      const explanation = await page.locator('.inquiry-path').boundingBox();
      const contentWidth = await page.locator('#visual-inquiry').evaluate(node => node.clientWidth - parseFloat(getComputedStyle(node).paddingLeft) - parseFloat(getComputedStyle(node).paddingRight));
      if (contentWidth > 600) assert.ok(explanation.x >= picturePair.x + picturePair.width, `fire picture and text at ${width}`);
      else assert.ok(explanation.y >= picturePair.y + picturePair.height, `stacked fire explanation at ${width}`);
      assert.ok((await page.locator('#classical-detail').boundingBox()).height <= (contentWidth > 600 ? 650 : 850), `compact panel height at ${width}`);
      const ordered = await page.locator('.inquiry-stage').all();
      for (let i=1;i<ordered.length;i++) {
        const previous=await ordered[i-1].boundingBox(), current=await ordered[i].boundingBox();
        assert.ok(current.y >= previous.y + previous.height, `reading order at ${width}`);
      }
      if (width === 390) await capture('#classical-detail', 'history-fire-mobile');
      await page.locator('#classical-close').click();
    }
    await page.setViewportSize({width:1440,height:1000});
  });

  await t.test('reference format has matching numbered routes and a separate unit booklet', async () => {
    assert.deepEqual(await page.locator('.lesson-head .num').allTextContents(), ['01','02','03','04','05']);
    for (let n = 1; n <= 5; n++) {
      const link = page.locator(`.route a[href="#s${n}"]`);
      assert.equal(await link.locator('span').innerText(), await text(`#title-${n}`));
      assert.equal(await link.locator('b').innerText(), String(n).padStart(2, '0'));
      await link.click();
      await page.waitForFunction(id => document.querySelector(`.route a[href="#${id}"]`).getAttribute('aria-current') === 'step', `s${n}`);
      const header = await page.locator(`#s${n} .lesson-head`).boundingBox();
      const body = await page.locator(`#s${n} .lesson-body`).boundingBox();
      assert.ok(body.y >= header.y + header.height - 1);
    }
    assert.equal(await text('.quiz-nav span'), '單元小測');
    assert.equal(await text('#title-6'), '生活用品元素線索冊');
    assert.notEqual(await text('.quiz-nav span'), await text('#title-6'));
    await page.locator('.quiz-nav').click();
    await page.waitForFunction(() => location.hash === '#s6');
    assert.equal(await text('.booklet-mark'), '?');
    assert.equal(await text('.booklet-kicker'), '單元小測');
    assert.equal(await page.locator('.booklet-mark').evaluate(n => getComputedStyle(n).backgroundColor), 'rgb(240, 226, 190)');
    assert.equal(await page.locator('.booklet-kicker').evaluate(n => getComputedStyle(n).color), 'rgb(148, 111, 45)');
    assert.equal(await text('.booklet-sorter h3'), '把樣本放進分類區');
    assert.equal(await page.locator('#booklet-product img').evaluate(n => n.complete && n.naturalWidth > 0), true);
    await capture('#s6', 'booklet-format-desktop');
    await page.locator('.route a[href="#s1"]').click();
    if (captureDir) await page.screenshot({ path: path.join(captureDir, 'route-format-desktop.png') });
  });

  await t.test('material desk compares identified samples without grading and retains full data', async () => {
    assert.equal(await page.locator('#s2 [data-desk-sample]').count(), 5);
    assert.equal(await page.locator('#s2 [data-property]').count(), 3);
    assert.equal(await page.locator('#s2 .desk-overview').getAttribute('open'), null);
    const names = await page.locator('#properties-table tbody th').allTextContents();
    assert.equal(names.length, 5);
    await page.locator('[data-property="conductivity"]').click();
    const metal = page.locator('[data-desk-side=metal]');
    const nonmetal = page.locator('[data-desk-side=nonmetal]');
    assert.equal(await metal.locator('.desk-circuit').getAttribute('data-lit'), 'true');
    assert.equal(await nonmetal.locator('.desk-circuit').getAttribute('data-lit'), 'false');
    assert.match(await metal.locator('.desk-result').innerText(), /銅.*燈亮/);
    await page.locator('#desk-power').click();
    assert.equal(await page.locator('#desk-power').getAttribute('aria-checked'), 'false');
    assert.equal(await page.locator('.desk-circuit[data-lit=true]').count(), 0);
    await page.locator('[data-desk-sample=aluminium]').click();
    assert.equal(await metal.locator('.desk-circuit').getAttribute('data-lit'), 'false');
    assert.match(await text('#desk-use-title'), /鋁箔/);
    await page.locator('#desk-power').click();
    assert.equal(await metal.locator('.desk-circuit').getAttribute('data-lit'), 'true');
    await page.locator('[data-desk-sample=diamond]').click();
    assert.equal(await nonmetal.locator('.desk-circuit').getAttribute('data-lit'), 'false');
    assert.match(await nonmetal.locator('.desk-result').innerText(), /碳（鑽石）.*不易導電/);
    assert.match(await text('#desk-use-title'), /鑽石.*切割/);
    assert.match(await text('.desk-use-note'), /整件工具不是純碳/);
    await page.locator('#desk-reset').click();
    assert.equal(await pressed('[data-desk-sample=copper]'), 'true');
    assert.equal(await pressed('[data-desk-sample=sulfur]'), 'true');
    assert.match(await text('#desk-use-title'), /銅.*電線/);
    for (const id of ['copper','aluminium','iron']) {
      await page.locator(`[data-desk-sample=${id}]`).click();
      assert.equal(await metal.locator('.desk-circuit').getAttribute('data-lit'), 'true');
      assert.equal(await nonmetal.locator('.desk-circuit').getAttribute('data-lit'), 'false');
    }
    await page.locator('#desk-reset').click();
    await page.locator('.desk-overview summary').click();
    for (const key of ['appearance', 'ductility', 'conductivity']) {
      await page.locator(`[data-property="${key}"]`).click();
      assert.equal(await pressed(`[data-property="${key}"]`), 'true');
      assert.equal(await page.locator('#properties-table .active-column').count(), 6);
      assert.equal(await page.locator('#properties-table .active-column').evaluateAll(nodes => nodes.every(n => n.dataset.column === nodes[0].dataset.column)), true);
      assert.deepEqual(await page.locator('#properties-table tbody th').allTextContents(), names);
    }
    assert.match(await text('#properties-table tr[data-sample="diamond"]'), /不易導電/);
    assert.match(await text('#property-note'), /下一段加入石墨/);
    await page.locator('.desk-overview summary').click();
    assert.equal(await page.locator('#s2 input,#s2 select').count(), 0);
    await capture('#s2', 'properties-desktop');
  });

  await t.test('appearance and processing compare shape without confusing hardness and ductility', async () => {
    await page.locator('[data-property=appearance]').click();
    assert.equal(await page.locator('.desk-specimen').count(), 2);
    assert.equal(await page.locator('#desk-power').isVisible(), false);
    assert.equal(await page.locator('#desk-process').isVisible(), false);
    await page.locator('[data-desk-sample=iron]').click();
    assert.match(await text('[data-desk-side=metal] .desk-result'), /銀灰色/);
    await page.locator('[data-desk-sample=diamond]').click();
    assert.match(await text('[data-desk-side=nonmetal] .desk-result'), /透明.*非金屬光澤/);
    await capture('#s2', 'desk-appearance-desktop');
    await page.locator('[data-property=ductility]').click();
    assert.equal(await page.locator('.desk-processing').count(), 2);
    assert.match(await text('[data-desk-side=metal] .desk-picture'), /拉成線.*壓成片/s);
    assert.match(await text('[data-desk-side=nonmetal] .desk-picture'), /不能像金屬延展/);
    assert.doesNotMatch(await text('[data-desk-side=nonmetal] .desk-picture'), /容易碎裂/);
    await page.locator('#desk-process').click();
    assert.equal(await page.locator('#desk-process').getAttribute('aria-pressed'), 'false');
    assert.match(await text('[data-desk-side=nonmetal] .desk-result'), /加工前/);
    await page.locator('#desk-process').click();
    await page.locator('[data-desk-sample=sulfur]').click();
    assert.match(await text('[data-desk-side=nonmetal] .desk-picture'), /容易碎裂/);
    await page.locator('[data-desk-sample=aluminium]').click();
    assert.match(await text('#desk-use-title'), /鋁箔/);
    await capture('#s2', 'desk-processing-desktop');
    await page.locator('#desk-reset').click();
    await page.locator('[data-property=conductivity]').click();
  });

  await t.test('material desk stays paired on desktop and readable at six widths', async () => {
    for (const width of [1440,1280,1024,768,390,320]) {
      await page.setViewportSize({width,height:1000});
      for (const key of ['conductivity','appearance','ductility']) {
        await page.locator(`[data-property="${key}"]`).click();
        const left = await page.locator('[data-desk-side=metal]').boundingBox();
        const right = await page.locator('[data-desk-side=nonmetal]').boundingBox();
        if (width > 760) { assert.ok(right.x > left.x); assert.ok(Math.abs(left.y-right.y)<1); }
        else assert.ok(right.y >= left.y+left.height);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1), true);
        for (const button of await page.locator('#s2 button:visible').all()) {
          const r=await button.boundingBox();
          assert.ok(r.x>=0 && r.x+r.width<=width+1, `desk control outside ${width}`);
        }
        if (width===390) await capture('#s2', `desk-${key}-mobile`);
      }
    }
    await page.setViewportSize({width:1440,height:1000});
    await page.locator('[data-property=conductivity]').click();
  });

  await t.test('exceptions genuinely add independent data, support both counterexamples and reset', async () => {
    assert.equal(await page.locator('#exceptions-table tbody tr').count(), 5);
    assert.equal(await page.locator('#exception-takeaway').isVisible(), false);
    await page.locator('[data-exception="graphite"]').click();
    assert.equal(await page.locator('[data-exception-result="graphite"]').isVisible(), true);
    assert.equal(await page.locator('#exception-takeaway').isVisible(), false);
    assert.equal(await page.locator('#exceptions-table tbody tr').count(), 6);
    assert.deepEqual(await page.locator('#exceptions-table tr[data-sample="graphite"] td').allTextContents(), ['非金屬', '固體', '可導電']);
    await page.locator('[data-exception="mercury"]').click();
    assert.equal(await page.locator('#exception-takeaway').isVisible(), true);
    assert.equal(await page.locator('[data-exception-result="mercury"]').isVisible(), true);
    assert.equal(await page.locator('#exceptions-table tbody tr').count(), 7);
    assert.deepEqual(await page.locator('#exceptions-table tr[data-sample="mercury"] td').allTextContents(), ['金屬', '液體', '可導電']);
    assert.match(await text('#exception-note'), /能導電就一定是金屬/);
    assert.match(await text('#exception-note'), /室溫下全部是固體/);
    await page.locator('[data-exception="graphite"]').click();
    assert.equal(await page.locator('#exceptions-table tr[data-sample="graphite"]').count(), 0);
    assert.equal(await page.locator('#exceptions-table tr[data-sample="mercury"]').count(), 1);
    await page.locator('.exception-comparison summary').click();
    await page.locator('#exceptions-reset').click();
    assert.equal(await page.locator('#exceptions-table tbody tr').count(), 5);
    assert.equal(await pressed('[data-exception="mercury"]'), 'false');
    assert.equal(await pressed('[data-property="conductivity"]'), 'true');
  });

  await t.test('all element names resolve to correct case, including mercury naming exception', async () => {
    const expected = { H: '氫', He: '氦', C: '碳', Ca: '鈣', Cu: '銅', Fe: '鐵', Al: '鋁', S: '硫', Hg: '汞' };
    assert.equal(await page.locator('[data-symbol]').count(), Object.keys(expected).length);
    assert.equal(await page.locator('#symbol-choices .symbol-choice-sample').count(), Object.keys(expected).length);
    assert.equal(await page.locator('#symbol-choices').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length), 3);
    assert.equal(await page.locator('.symbol-workbench-grid').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length), 2);
    assert.equal(await page.locator('#symbol-clue-details').evaluate(node => node.open), false);
    for (const [symbol, name] of Object.entries(expected)) {
      await page.locator(`[data-symbol="${symbol}"]`).click();
      assert.equal(await text('#symbol-glyph'), symbol);
      assert.equal(await text('#symbol-name'), name);
      assert.equal(await page.locator(`[data-symbol="${symbol}"] .symbol-choice-sample`).getAttribute('data-specimen'), symbol);
      assert.equal(await page.locator('#symbol-sample').getAttribute('data-specimen'), symbol);
      assert.match(await page.locator('#symbol-sample').evaluate(node => getComputedStyle(node).backgroundImage), /element-specimens\.webp/);
      assert.equal(await page.locator('#symbol-sample').getAttribute('aria-label'), `${name}的代表性樣品示意`);
      assert.equal(await page.locator('#symbol-glyph .symbol-lower').count(), symbol.length - 1);
      assert.match(await text('#symbol-writing'), /大寫/);
      if (symbol.length === 2) assert.match(await text('#symbol-writing'), /小寫/);
    }
    await page.locator('#symbol-clue-details summary').click();
    assert.match(await text('#symbol-clue'), /液態金屬/);
    await page.locator('[data-symbol="Al"]').click();
    assert.match(await text('#symbol-clue'), /小寫 l/);
    await page.locator('#symbol-clue-details summary').click();
    await page.locator('[data-symbol="Fe"]').click();
    await capture('#s4', 'symbols-desktop');
  });

  await t.test('carbon samples connect their shared identity to different atomic structures', async () => {
    assert.deepEqual(await page.locator('.carbon-sample h3 span').allTextContents(), ['C', 'C']);
    assert.deepEqual(await page.locator('.carbon-sample img').count(), 2);
    assert.deepEqual(await page.locator('.carbon-sample img').evaluateAll(images => images.map(image => image.complete && image.naturalWidth > 0)), [true, true]);
    assert.equal(await page.locator('.carbon-grid').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length), 2);
    assert.match(await page.locator('.carbon-sample img').nth(0).getAttribute('alt'), /石墨樣品/);
    assert.match(await page.locator('.carbon-sample img').nth(1).getAttribute('alt'), /鑽石樣品/);
    assert.deepEqual(await page.locator('.carbon-structure-card svg title').allTextContents(), ['石墨碳原子層狀結構的立體球棍模型', '鑽石碳原子四面體連接的立體球棍模型']);
    assert.ok(await page.locator('[data-carbon-model="graphite"] svg circle').count() > 80);
    assert.ok(await page.locator('[data-carbon-model="diamond"] svg circle').count() > 40);
    const model = page.locator('[data-carbon-model="graphite"]');
    const atomBefore = await model.locator('svg circle').first().getAttribute('cx');
    await model.focus();
    await page.keyboard.press('ArrowRight');
    assert.notEqual(await model.locator('svg circle').first().getAttribute('cx'), atomBefore);
    for (const [kind, neighbors] of [['graphite', 3], ['diamond', 4]]) {
      const stage = page.locator(`[data-carbon-model="${kind}"]`);
      const panel = page.locator(`#${kind}-neighbors`);
      await stage.click({ position: { x: 20, y: 20 } });
      assert.equal(await panel.isVisible(), true);
      const data = await page.evaluate(kind => {
        const stage = document.querySelector(`[data-carbon-model="${kind}"]`);
        const inset = document.querySelector(`#${kind}-neighbors svg`);
        const center = inset.dataset.centerId;
        const atoms = [...inset.querySelectorAll('[data-inset-atom]')].map(el => ({ id: el.dataset.insetAtom, x: +el.getAttribute('cx'), y: +el.getAttribute('cy') }));
        const bonds = [...stage.querySelectorAll('[data-bond]')].map(el => el.dataset.bond.split('-'));
        const selected = [...stage.querySelectorAll('[data-atom-id][data-selected="true"]')].map(el => el.dataset.atomId);
        const minDistance = Math.min(...atoms.flatMap((a, i) => atoms.slice(i + 1).map(b => Math.hypot(a.x-b.x, a.y-b.y))));
        return { center, atoms, selected, insetBondCount: inset.querySelectorAll('[data-inset-bond]').length, minDistance,
          directlyConnected: atoms.filter(a => a.id !== center).every(a => bonds.some(pair => pair.includes(center) && pair.includes(a.id))) };
      }, kind);
      assert.equal(data.atoms.length, neighbors + 1);
      assert.equal(data.selected.length, neighbors + 1);
      assert.equal(data.insetBondCount, neighbors);
      assert.equal(data.directlyConnected, true);
      assert.ok(data.minDistance > 25, 'enlarged atoms must not overlap');
      assert.deepEqual(data.selected.sort(), data.atoms.map(a => a.id).sort());
      await stage.focus();
      await page.keyboard.press('Enter');
      assert.equal(await panel.isHidden(), true);
      await page.locator(`[data-neighbors-toggle="${kind}"]`).click();
      assert.equal(await panel.isVisible(), true);
      await page.locator(`[data-neighbors-toggle="${kind}"]`).click();
    }
    assert.match(await page.locator('.carbon-structure-card').nth(0).innerText(), /連接 3 個鄰近碳原子/);
    assert.match(await page.locator('.carbon-structure-card').nth(1).innerText(), /連接 4 個鄰近碳原子/);
    assert.match(await text('.carbon-structure-head'), /原子排列/);
    assert.match(await text('.carbon-structure .caption'), /大小與距離並非實際比例/);
    await page.locator('[data-carbon="conductivity"]').click();
    assert.equal(await page.locator('#carbon-comparison').getAttribute('data-view'), 'conductivity');
    assert.match(await text('#graphite-sample-cue'), /可以導電/);
    assert.match(await text('#diamond-sample-cue'), /通常不易導電/);
    assert.match(await page.locator('#graphite-sample-image').getAttribute('src'), /conductivity-graphite/);
    assert.match(await page.locator('#diamond-sample-image').getAttribute('src'), /conductivity-diamond/);
    await page.locator('[data-carbon="uses"]').click();
    assert.match(await text('#carbon-comparison-takeaway'), /含石墨與黏土/);
    assert.match(await text('#diamond-sample-cue'), /切割/);
    assert.equal(await page.locator('#carbon-comparison').getAttribute('data-view'), 'uses');
    assert.match(await text('#graphite-sample-cue'), /鉛筆芯/);
    assert.match(await page.locator('#diamond-sample-image').getAttribute('src'), /uses-diamond/);
    assert.deepEqual(await page.locator('.carbon-sample h3 span').allTextContents(), ['C', 'C']);
    await page.locator('[data-carbon="appearance"]').click();
    assert.equal(await page.locator('#carbon-comparison').getAttribute('data-view'), 'appearance');
    assert.match(await text('#graphite-sample-cue'), /較軟[\s\S]*莫氏硬度 1–2/);
    assert.match(await text('#diamond-sample-cue'), /非常堅硬[\s\S]*莫氏硬度 10/);
    assert.match(await text('#s5'), /層狀結構|立體網狀結構/);
    assert.match(await text('.carbon-structure-card:nth-child(1) .carbon-reasons'), /層與層較易滑動[\s\S]*較軟[\s\S]*可移動的電子[\s\S]*可導電/);
    assert.match(await text('.carbon-structure-card:nth-child(2) .carbon-reasons'), /向各方向牢固連接[\s\S]*非常堅硬[\s\S]*電子較難自由移動[\s\S]*通常不易導電/);
    await capture('#s5', 'carbon-desktop');
  });

  await t.test('the booklet withholds identities until each sample is correctly classified', async () => {
    await page.goto(base);
    const cases = [
      ['0','metal','銅','Cu'], ['1','metal','鋁','Al'], ['2','metal','鐵','Fe'],
      ['3','nonmetal','碳','C'], ['4','metal','金','Au']
    ];
    for (const [index, category, name, symbol] of cases) {
      await page.locator(`[data-booklet-item="${index}"]`).click();
      assert.match(await page.locator('#booklet-product img').getAttribute('src'), /assets\/booklet-(cable|foil|nail|pencil|ring)\.webp/);
      assert.equal(await page.locator('#booklet-product img').evaluate(image => image.decode().then(() => image.naturalWidth > 0)), true, `sample art failed to load for item ${index}`);
      await capture('#booklet-product', `booklet-sample-${index}`);
      assert.equal(await page.locator('#booklet-reveal').isVisible(), false, `reveal was visible before classifying item ${index}; hidden=${await page.locator('#booklet-reveal').getAttribute('hidden')}`);
      assert.equal(await page.locator('.drop-slot').first().innerText(), '放入樣本');
      assert.equal(await page.locator('.drop-slot').last().innerText(), '放入樣本');
      if (index === '0') {
        await page.locator('[data-classify="nonmetal"]').click();
        assert.equal(await page.locator('#booklet-reveal').isVisible(), false);
        assert.match(await text('#booklet-feedback'), /再試一次/);
        await page.locator('#sample-token').focus();
        await page.keyboard.press('Space');
        assert.equal(await page.locator('#sample-token').getAttribute('aria-pressed'), 'true');
        await page.locator('[data-classify="metal"]').focus();
        await page.keyboard.press('Enter');
      } else if (index === '1') {
        await page.locator('#sample-token').dragTo(page.locator(`[data-classify="${category}"]`));
      } else {
        await page.locator(`[data-classify="${category}"]`).click();
      }
      assert.equal(await page.locator('#booklet-reveal').isVisible(), true);
      assert.equal(await page.locator(`.classification-zone[data-classify="${category}"] .drop-slot`).innerText(), `${name}\n${symbol}`);
      assert.equal(await page.locator(`.classification-zone[data-classify="${category}"]`).evaluate(n => n.classList.contains('is-correct')), true);
    }
    assert.equal(await text('#booklet-completed'), '已辨認 5 / 5 件');
    await page.locator('[data-booklet-item="3"]').click();
    assert.equal(await page.locator('#booklet-reveal').isVisible(), true);
    assert.equal(await page.locator('.classification-zone--nonmetal .drop-slot').innerText(), '碳\nC');
    assert.equal(await page.locator('.classification-zone--metal .drop-slot').innerText(), '放入樣本');
    assert.equal(await page.locator('.booklet-item.is-solved').count(), 5);
    await capture('#s6', 'booklet-complete-desktop');
  });

  await t.test('native controls work by keyboard and reduced motion', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('[data-classical=fire]').focus();
    await page.keyboard.press('Enter');
    assert.match(await text('#classical-detail-title'), /火/);
    await page.locator('#classical-close').focus();
    await page.keyboard.press('Space');
    assert.equal(await page.locator('#classical-detail').isVisible(), false);
    await page.locator('[data-property="ductility"]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await pressed('[data-property="ductility"]'), 'true');
    await page.locator('[data-property=conductivity]').click();
    await page.locator('#desk-power').focus();
    await page.keyboard.press('Space');
    assert.equal(await page.locator('#desk-power').getAttribute('aria-checked'), 'false');
    await page.locator('#desk-reset').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#desk-power').getAttribute('aria-checked'), 'true');
    await page.locator('[data-symbol="Cu"]').focus();
    await page.keyboard.press('Space');
    assert.equal(await text('#symbol-glyph'), 'Cu');
    await page.locator('[data-exception="mercury"]').focus();
    await page.keyboard.press('Enter');
    assert.match(await text('#exception-note'), /液態金屬/);
  });

  await t.test('desktop and narrow layouts contain their content and tables can scroll locally', async () => {
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `page overflow at ${width}`);
      assert.equal(await page.locator('.symbol-workbench-grid').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length), width <= 760 ? 1 : 2, `symbol workbench columns at ${width}`);
      assert.equal(await page.locator('.carbon-grid').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length), 2, `carbon comparison columns at ${width}`);
      assert.equal(await page.locator('.hero').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length), width <= 760 ? 1 : 2, `hero columns at ${width}`);
      for (const card of await page.locator('.lesson-card').all()) {
        const rect = await card.boundingBox();
        assert.ok(rect.x >= 0 && rect.x + rect.width <= width + 1, `card outside viewport at ${width}`);
      }
      if (width === 390) {
        const heroCopy = await page.locator('.hero-copy').boundingBox();
        const heroCover = await page.locator('.hero-figure').boundingBox();
        assert.ok(heroCover.y >= heroCopy.y + heroCopy.height - 1, 'mobile cover follows the text');
        await capture('.masthead', 'hero-mobile');
        await capture('#s5', 'carbon-mobile');
        await page.locator('.desk-overview summary').click();
        assert.equal(await page.locator('#s2 .table-wrap').evaluate(n => n.scrollWidth > n.clientWidth), true);
        await page.locator('.desk-overview summary').click();
        await capture('#s2', 'properties-mobile');
        await capture('#s6', 'booklet-mobile');
      }
    }
  });

  await t.test('touch controls work on a narrow viewport', async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const mobile = await context.newPage();
    watch(mobile);
    await mobile.goto(base);
    await mobile.locator('[data-classical=earth]').tap();
    await mobile.locator('.soil-legend button[data-observation=air]').tap();
    assert.equal(await mobile.locator('.soil-target.focused').getAttribute('data-observe'), 'air');
    await mobile.locator('[data-classical=air]').tap();
    await mobile.locator('[data-gas-view=carbon]').tap();
    assert.equal(await mobile.locator('#observation-view').isVisible(), true);
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    if (captureDir) await mobile.locator('#observation-view').screenshot({ path: path.join(captureDir, 'air-magnified-mobile.png') });
    await mobile.locator('#observation-view-close').tap();
    assert.equal(await mobile.locator('#observation-view').isVisible(), false);
    await mobile.locator('[data-booklet-item="3"]').tap();
    await mobile.locator('[data-classify="nonmetal"]').tap();
    assert.equal(await mobile.locator('#booklet-reveal').isVisible(), true);
    assert.equal(await mobile.locator('.classification-zone--nonmetal .drop-slot').innerText(), '碳\nC');
    await mobile.locator('[data-classical=water]').tap();
    assert.equal(await mobile.locator('#classical-detail').isVisible(), true);
    assert.equal(await mobile.locator('[data-classical]').count(), 4);
    await mobile.locator('[data-desk-sample=aluminium]').tap();
    assert.match(await mobile.locator('#desk-use-title').innerText(), /鋁箔/);
    await mobile.locator('#desk-power').tap();
    assert.equal(await mobile.locator('.desk-circuit[data-lit=true]').count(), 0);
    await mobile.locator('[data-exception="graphite"]').tap();
    assert.equal(await mobile.locator('#exceptions-table tr[data-sample="graphite"]').count(), 1);
    await mobile.locator('[data-symbol="He"]').tap();
    assert.equal(await mobile.locator('#symbol-glyph').innerText(), 'He');
    assert.equal(await mobile.locator('#symbol-sample').getAttribute('data-specimen'), 'He');
    if (captureDir) await mobile.locator('#s4').screenshot({ path: path.join(captureDir, 'symbols-mobile.png') });
    await context.close();
  });

  await t.test('unit and site navigation reach the lesson without dead future links', async () => {
    await page.goto(new URL('../../', base).href);
    const lesson = page.getByRole('link', { name: /6.1/ });
    await lesson.click();
    assert.match(page.url(), /\/units\/6\/parts\/6\.1\//);
    await page.goto(new URL('../../../../', base).href);
    await page.getByRole('link', { name: '進入單元 6', exact: true }).click();
    assert.match(page.url(), /\/units\/6\//);
    assert.equal(await page.locator('main a').count(), 1);
    assert.deepEqual(failures, []);
  });
});
