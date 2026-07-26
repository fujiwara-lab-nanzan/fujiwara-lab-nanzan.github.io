// =================================================================
// 藤原研究室 ホームページ 制御スクリプト (script.js)
// =================================================================
// このファイルは、サイトの動的表現（アニメーションやスライドショー、
// ニュースデータの自動生成など）を制御しています。
// 各関数の役割は以下の通りです：
// - 現在ページのナビゲーションメニューの強調表示
// - モバイルメニューのトグル開閉処理
// - initHeaderScroll: ヘッダーの透明から不透明への変化
// - initWaveCanvas: ファーストビュー背景の超音波ウェーブ描画
// - initDynamicNews: news-data.js からニュースを読み込み、自動生成
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    // --- 現在ページのナビゲーションをハイライト ---
    const navLinks = document.querySelectorAll('.main-nav a, .mobile-menu a');
    // 'index.html' を含めて現在のページファイル名を取得
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    navLinks.forEach(link => {
        const linkPage = link.getAttribute('href');
        // リンクのhrefと現在のページが一致する場合に 'active' クラスを付与
        if (linkPage === currentPage) {
             if(link.closest('.main-nav')) {
                link.classList.add('active');
             }
        }
    });

    // --- モバイルメニューのトグル ---
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('active');
        });
    }

    // --- ヘッダーのスクロール変化（透明→不透明） ---
    initHeaderScroll();

    // --- 超音波 波動Canvasアニメーション ---
    initWaveCanvas();

    // --- カウントアップアニメーション ---
    initCountUp();

    // --- お知らせの折りたたみ機能 (news.html専用) ---
    const toggleNewsBtn = document.getElementById('toggle-news-btn');
    const extraNews = document.getElementById('extra-news');
    if (toggleNewsBtn && extraNews) {
        const headerHeight = document.querySelector('.site-header').offsetHeight;
        toggleNewsBtn.addEventListener('click', () => {
            const isCurrentlyActive = extraNews.classList.contains('active');
            extraNews.classList.toggle('active');

            if (isCurrentlyActive) {
                toggleNewsBtn.textContent = 'さらに表示';
                const buttonRect = toggleNewsBtn.getBoundingClientRect();
                if (buttonRect.top < headerHeight) {
                    const targetPosition = buttonRect.top + window.pageYOffset - headerHeight - 20;
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            } else {
                toggleNewsBtn.textContent = '折りたたむ';
            }
        });
    }

    // --- ギャラリーの無限ループ & 自動スクロール（index.html のヒーロー）  ---
    initGallery();

    // --- 3D 横回転リングギャラリー（gallery.html） ---
    initRingGallery();

    // --- 動的トピックス生成 ---
    initDynamicNews();

    // --- ニュース画像の拡大機能 ---
    initImageZoom();
});


// ==================================
// ヘッダーのスクロール制御
// ==================================
// スクロール量が 80px を超えた場合にヘッダーの背景を不透明にし、
// 影をつけて境界線をはっきりさせます。（site-header.scrolled クラスが適用されます）
function initHeaderScroll() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    const checkScroll = () => {
        if (window.scrollY > 80) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };

    window.addEventListener('scroll', checkScroll, { passive: true });
    // 初期状態もチェック（ページ途中でリロードした場合）
    checkScroll();
}


// ==================================
// ギャラリー（無限ループ・自動スクロール）
// ==================================
// index.html のヒーローと gallery.html のスライドショーで共用しています。
//
// 【設計方針】
// ・アイテムの幅は JavaScript では一切計算しません。
//   CSS 側で「高さ固定 ＋ 画像 width:auto」にしてあるため、
//   ブラウザが元画像の縦横比どおりの幅を自動で決めます。
//   → 画像のサイズがバラバラでも写真が切れず、送り幅もずれません。
// ・移動先は必ず「実在するアイテムの中央位置」を実測して指定します。
//   （以前は全アイテムの平均幅ずつ送っていたため、幅が不揃いだと
//     スナップ位置と一致せず、カクつき・引き戻しの原因になっていました）
function initGallery() {
    const wrapper = document.querySelector('.gallery-wrapper');
    if (!wrapper) return;

    const container = document.getElementById('gallery-container');
    if (!container || container.children.length === 0) return;

    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    const AUTO_SCROLL_MS = 5000; // 自動送りの間隔（ミリ秒）
    const SET_COUNT = 3;         // 「前・本体・後ろ」の3セットを並べて無限ループさせる

    // 元の並びを控えておく（以降はこのクローンだけを使う）
    const originalItems = Array.from(container.children).map(node => node.cloneNode(true));
    const itemCount = originalItems.length;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    let autoScrollTimer = null;
    let lastWrapperWidth = wrapper.clientWidth;
    let isAdjusting = false;

    // --- 位置の計測 ---------------------------------------------------
    // アイテムとコンテナは同じ基準要素からの座標なので、差を取ると
    // コンテナ内での位置（＝scrollLeft と同じ座標系）になります。
    const offsetOf = (item) => item.offsetLeft - container.offsetLeft;

    // 1セット分の幅 ＝「後ろセットの先頭」と「本体セットの先頭」の距離。
    // 実測なので、アイテム幅が不揃いでも、余白（gap）があっても正確です。
    //
    // この値は保持せず、必要になるたびに測り直します。
    // 保持してしまうと、画面幅の変化を取りこぼしたときに古い幅で計算し続け、
    // 継ぎ目の補正が効かなくなって端で動かなくなる（行き止まりになる）ためです。
    const measureSetWidth = () => {
        const items = container.children;
        if (items.length < itemCount * SET_COUNT) return 0;
        return offsetOf(items[itemCount * 2]) - offsetOf(items[itemCount]);
    };

    // 指定アイテムが中央に来る scrollLeft（CSS の scroll-snap-align: center に合わせる）
    const targetFor = (item) => {
        const max = container.scrollWidth - container.clientWidth;
        const left = offsetOf(item) - (container.clientWidth - item.offsetWidth) / 2;
        return Math.max(0, Math.min(max, left));
    };

    // --- スクロール操作 -------------------------------------------------
    // スクロールスナップ（scroll-snap-type: x mandatory）は、指で操作したときに
    // 写真がぴたりと止まる利点がある一方で、JavaScript からの移動指示を横取りして
    // 元の位置へ引き戻してしまいます。これが「カクつく・途中で止まる」原因でした。
    // そのため、JS が動かしている間だけスナップを切り、
    // 動きが落ち着いてから元に戻すようにしています。
    let snapReleaseTimer = null;

    const suspendSnap = () => {
        isAdjusting = true;
        container.classList.add('is-adjusting');
        clearTimeout(snapReleaseTimer);
    };

    const resumeSnap = (delay) => {
        clearTimeout(snapReleaseTimer);
        snapReleaseTimer = setTimeout(() => {
            container.classList.remove('is-adjusting');
            isAdjusting = false;
        }, delay);
    };

    // アニメーションなしで即座に移動する（継ぎ目の補正や初期配置で使用）
    const jumpTo = (left) => {
        suspendSnap();
        container.scrollLeft = left;
        resumeSnap(0);
    };

    // 滑らかに移動する。
    // ブラウザやOSの設定でスムーススクロールが無効になっている環境では
    // scrollTo({behavior:'smooth'}) が何も起こさず、写真が全く動かなくなります。
    // 動き出さなかった場合は即時移動へ切り替えて、必ず送れるようにしています。
    const glideTo = (left) => {
        const from = container.scrollLeft;
        if (Math.abs(left - from) < 1) return;

        if (reduceMotion.matches) {
            jumpTo(left);
            return;
        }

        suspendSnap();
        container.scrollTo({ left: left, behavior: 'smooth' });
        setTimeout(() => {
            if (Math.abs(container.scrollLeft - from) < 1) container.scrollLeft = left;
        }, 120);
        resumeSnap(700); // スムーススクロールが終わる頃にスナップを戻す
    };

    // いま画面中央にいちばん近いアイテムの番号
    const currentIndex = () => {
        const center = container.scrollLeft + container.clientWidth / 2;
        const items = container.children;
        let best = 0;
        let bestDistance = Infinity;
        for (let i = 0; i < items.length; i++) {
            const distance = Math.abs(offsetOf(items[i]) + items[i].offsetWidth / 2 - center);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = i;
            }
        }
        return best;
    };

    // 表示位置を常に「本体セット」の範囲へ引き戻す。
    // 3セットとも中身が同じなので、1セット分ちょうど動かせば見た目は変わりません。
    const normalize = () => {
        const setWidth = measureSetWidth();
        if (setWidth <= 0) return;
        let left = container.scrollLeft;
        while (left < setWidth * 0.5) left += setWidth;
        while (left >= setWidth * 1.5) left -= setWidth;
        if (Math.abs(left - container.scrollLeft) > 0.5) jumpTo(left);
    };

    // 1枚送る。先に本体セットへ戻してから動かすので、継ぎ目でも止まりません。
    const step = (direction) => {
        normalize();
        const items = container.children;
        const index = Math.max(0, Math.min(items.length - 1, currentIndex() + direction));
        glideTo(targetFor(items[index]));
    };

    // --- 自動送り -------------------------------------------------------
    const stopAutoScroll = () => {
        clearInterval(autoScrollTimer);
        autoScrollTimer = null;
    };

    const startAutoScroll = () => {
        stopAutoScroll();
        // OSの「視差効果を減らす／アニメーションを減らす」設定時は自動送りしない
        if (reduceMotion.matches) return;
        autoScrollTimer = setInterval(() => step(1), AUTO_SCROLL_MS);
    };

    // --- 組み立て -------------------------------------------------------
    const build = () => {
        container.innerHTML = '';
        for (let set = 0; set < SET_COUNT; set++) {
            originalItems.forEach(item => container.appendChild(item.cloneNode(true)));
        }
    };

    // 本体セットの先頭に位置を合わせ直す
    const layout = () => {
        const items = container.children;
        if (items.length > itemCount) jumpTo(targetFor(items[itemCount]));
    };

    // 画像の読み込み完了を待つ（幅が確定してから位置を決めるため）
    const whenImagesReady = () => {
        const pending = Array.from(container.querySelectorAll('img')).filter(img => !img.complete);
        if (pending.length === 0) return Promise.resolve();
        return Promise.all(pending.map(img => new Promise(resolve => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
        })));
    };

    build();
    layout(); // HTML の width/height 属性から縦横比が分かるため、この時点でほぼ正確
    whenImagesReady().then(() => {
        layout(); // 実寸で測り直し
        startAutoScroll();
    });

    // --- イベント -------------------------------------------------------
    if (nextBtn) nextBtn.addEventListener('click', () => { step(1); startAutoScroll(); });
    if (prevBtn) prevBtn.addEventListener('click', () => { step(-1); startAutoScroll(); });

    // 指やトラックパッドで動かしたときは、スクロールが止まってから位置を整える
    if ('onscrollend' in window) {
        container.addEventListener('scrollend', () => { if (!isAdjusting) normalize(); });
    } else {
        let settleTimer;
        container.addEventListener('scroll', () => {
            clearTimeout(settleTimer);
            settleTimer = setTimeout(() => { if (!isAdjusting) normalize(); }, 120);
        }, { passive: true });
    }

    // 端まで一気に振り切られた場合は待たずに補正する（行き止まりを作らない）
    container.addEventListener('scroll', () => {
        if (isAdjusting) return;
        const max = container.scrollWidth - container.clientWidth;
        if (container.scrollLeft <= 0 || container.scrollLeft >= max - 0.5) normalize();
    }, { passive: true });

    wrapper.addEventListener('mouseenter', stopAutoScroll);
    wrapper.addEventListener('mouseleave', startAutoScroll);
    wrapper.addEventListener('focusin', stopAutoScroll);
    wrapper.addEventListener('focusout', startAutoScroll);

    // 非表示のタブで自動送りが溜まると、戻ったときに一気に動いてしまうため止める
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopAutoScroll();
        else startAutoScroll();
    });

    // リサイズ時は DOM を作り直さず、位置だけ合わせ直す。
    // スマホはアドレスバーの出入りだけでも resize が発火するため、
    // 「横幅が実際に変わったとき」に限定しないと縦スクロール中にリセットされてしまう。
    let resizeTimer;
    const handleResize = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            const width = wrapper.clientWidth;
            if (width === lastWrapperWidth) return; // 高さだけの変化では何もしない
            lastWrapperWidth = width;
            layout();
        }, 200);
    };

    window.addEventListener('resize', handleResize);
    // resize イベントを取りこぼす場面（表示領域だけが変わる等）にも追従させる
    if ('ResizeObserver' in window) new ResizeObserver(handleResize).observe(wrapper);

    reduceMotion.addEventListener('change', startAutoScroll);
}


// ==================================
// 3D 横回転リングギャラリー（gallery.html）
// ==================================
// 写真を立体的な円柱の側面に等間隔で並べ、Y軸まわりに回転させます。
//
// 【設計方針】
// ・写真は 360度 ÷ 枚数 の等間隔で配置し、最後と最初が自然に隣り合う完全な円環にします。
//   回転角は上限を設けず加算し続け、表示は角度の剰余で決まるため、
//   何周してもジャンプやカクつきは起きません。
// ・毎フレーム書き換えるのはリング全体の rotateY 1か所だけです。
//   各カードの位置（角度・奥行き）は画面サイズが変わったときにだけ計算します。
// ・カードの枠は写真の縦横比どおりに作るため、写真が切れることはありません。
function initRingGallery() {
    const gallery = document.getElementById('ring-gallery');
    if (!gallery) return;

    const ring = gallery.querySelector('.ring');
    const cards = Array.from(gallery.querySelectorAll('.ring-card'));
    const count = cards.length;
    if (!ring || count === 0) return;

    const prevBtn = gallery.querySelector('.ring-btn.prev');
    const nextBtn = gallery.querySelector('.ring-btn.next');

    const AUTO_SPEED = 0.18;     // 自動回転の速さ（1フレームあたりの度数）
    const DRAG_THRESHOLD = 8;    // これを超えて動かされたら「ドラッグ」と判定する距離（px）
    const DEG_PER_PX = 0.3;      // マウスでドラッグしたときの、移動量→回転角の換算係数
    // 指でのスワイプはマウスの2倍にする。画面が狭く大きく動かせないため、
    // 半分の移動量で写真1枚ぶん進むようにしています。
    const DEG_PER_PX_TOUCH = 0.6;
    const EASE = 0.12;           // 目標角度へ近づく速さ（スナップのなめらかさ）
    const stepDeg = 360 / count; // 写真1枚ぶんの角度

    // --- 写真の大きさを調整したいときはこの5つを変えてください -----------------
    const MAX_CARD_HEIGHT = 544;   // 写真の高さの上限（px）。大きくすると写真が大きくなります
    const HEIGHT_BY_WIDTH = 0.535; // 表示エリアの幅に対する写真の高さの割合（スマホで効きやすい）
    const HEIGHT_BY_SCREEN = 0.528; // 画面の高さに対する写真の高さの割合（PCで効きやすい）
    const MAX_CARD_WIDTH = 0.88;   // 表示エリアの幅に対する、写真1枚の幅の上限
    // 回転中に横のカードが表示エリアからどれだけはみ出してよいか（1.0 = まったく出さない）。
    // 奥にある写真の端が少し切れるのを許すことで、正面の写真を大きく見せられます。
    const SWING_TOLERANCE = 1.45;
    // -------------------------------------------------------------------------

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // mode は 'auto'（自動回転）/ 'animating'（目標角度へ移動中）
    //        / 'dragging'（手動操作中）/ 'idle'（固定して停止中）
    let mode = 'auto';
    let angle = 0;
    let target = 0;
    let pendingMode = 'auto'; // animating が終わったあとに移る状態
    let locked = false;       // 写真を正面に固定しているか
    let lockedIndex = -1;
    let radius = 300;
    let lastRendered = null;
    let lastWidth = 0;
    let visible = true;

    // ---- 角度の計算 -------------------------------------------------
    // 写真 i を正面に持ってくるのに必要な回転角のうち、今の角度にいちばん近いものを返す。
    // こうすることで、常に短いほうの向きに回ります。
    const targetFor = (i) => {
        const base = -i * stepDeg;
        return base + Math.round((angle - base) / 360) * 360;
    };

    const indexFromAngle = (a) => {
        const i = Math.round(-a / stepDeg) % count;
        return i < 0 ? i + count : i;
    };

    const frontIndex = () => indexFromAngle(angle);

    // ---- 状態の切り替え ---------------------------------------------
    const updateHighlight = () => {
        for (let i = 0; i < count; i++) {
            cards[i].classList.toggle('is-active', locked && i === lockedIndex);
        }
    };

    const unlock = () => {
        if (!locked) return;
        locked = false;
        lockedIndex = -1;
        updateHighlight();
    };

    // 写真を正面へ回して固定する
    const lockTo = (i) => {
        locked = true;
        lockedIndex = i;
        target = targetFor(i);
        pendingMode = 'idle';
        mode = 'animating';
        updateHighlight();
    };

    // 固定を解除して自動回転へ戻す
    const resume = () => {
        unlock();
        mode = 'auto';
    };

    // いちばん正面に近い写真へ吸着させ、止まったら自動回転を再開する
    const snapAndResume = () => {
        target = targetFor(frontIndex());
        pendingMode = 'auto';
        mode = 'animating';
    };

    // 隣の写真へ移動して固定する（dir: 1=次へ / -1=前へ）
    const stepBy = (dir) => {
        target = targetFor(frontIndex()) - dir * stepDeg;
        locked = true;
        lockedIndex = indexFromAngle(target);
        pendingMode = 'idle';
        mode = 'animating';
        updateHighlight();
    };

    // ---- 描画 -------------------------------------------------------
    // リング全体を -radius だけ奥へ下げることで、正面の写真がちょうど
    // パースの基準面に来て、実寸どおりの大きさで表示されます。
    const render = () => {
        ring.style.transform = 'translateZ(' + (-radius) + 'px) rotateY(' + angle + 'deg)';

        // 正面ほど濃く、背面ほど淡くして奥行きを分かりやすくする
        for (let i = 0; i < count; i++) {
            const facing = Math.cos((i * stepDeg + angle) * Math.PI / 180); // 1:正面, -1:背面
            const opacity = 0.28 + 0.72 * ((facing + 1) / 2);
            const card = cards[i];
            if (card.dataset.opacity !== undefined &&
                Math.abs(parseFloat(card.dataset.opacity) - opacity) < 0.01) continue;
            card.dataset.opacity = opacity;
            card.style.opacity = opacity.toFixed(3);
        }
    };

    // ---- 寸法・配置の計算（レスポンシブ） ------------------------------
    const aspectOf = (img) => {
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
            return img.naturalWidth / img.naturalHeight;
        }
        // 読み込み前でも HTML の width/height 属性から縦横比が分かる
        const w = parseFloat(img.getAttribute('width'));
        const h = parseFloat(img.getAttribute('height'));
        return (w > 0 && h > 0) ? w / h : 4 / 3;
    };

    // 指定した高さを基準にしたときの、各カードの寸法とリングの半径を求める
    const planLayout = (baseHeight, stageWidth) => {
        const maxWidth = stageWidth * MAX_CARD_WIDTH;
        const sizes = [];
        let widest = 0;

        for (let i = 0; i < count; i++) {
            const aspect = aspectOf(cards[i].querySelector('img'));
            let w = baseHeight * aspect;
            let h = baseHeight;
            if (w > maxWidth) {
                // 横長すぎる写真は幅で頭打ちにする。縦横比は保つので写真は切れません。
                w = maxWidth;
                h = w / aspect;
            }
            sizes.push({ w: w, h: h });
            if (w > widest) widest = w;
        }

        // 隣り合うカードが重ならない半径。
        // 円周上の弦の長さ（2 * R * sin(π/枚数)）がカード幅以上になるようにします。
        const minRadius = count > 1 ? widest / (2 * Math.sin(Math.PI / count)) : 0;
        return {
            sizes: sizes,
            widest: widest,
            // 半径が大きいほど横のカードが外へ張り出し、そのぶん写真を小さくせざるを得ません。
            // 重ならない最小限（弦の長さ＝カード幅）を基準にして、無駄に広げないようにします。
            radius: Math.max(minRadius * 1.1, widest * 0.55)
        };
    };

    // リングが1周する間に、中心から横方向へいちばん張り出す量を求める。
    // 奥にあるカードは遠近で小さく見えるため、その縮小率も加味しています。
    const maxExtent = (r, widest, perspective) => {
        let max = 0;
        for (let d = 0; d <= 180; d += 2) {
            const t = d * Math.PI / 180;
            const z = r * (Math.cos(t) - 1);              // 正面を0とした奥行き（0 〜 -2R）
            const scale = perspective / (perspective - z); // 遠近による縮小率
            const e = scale * Math.abs(r * Math.sin(t) + (widest / 2) * Math.cos(t));
            if (e > max) max = e;
        }
        return max;
    };

    const measure = () => {
        const stageWidth = gallery.clientWidth;
        if (stageWidth === 0) return;

        const stage = gallery.querySelector('.ring-stage');
        const perspective = parseFloat(getComputedStyle(stage).perspective) || 1100;

        // 画面の幅と高さの両方を見て、写真の基準サイズを決める
        let baseHeight = Math.max(140, Math.min(
            stageWidth * HEIGHT_BY_WIDTH,
            window.innerHeight * HEIGHT_BY_SCREEN,
            MAX_CARD_HEIGHT
        ));
        const allowed = (stageWidth / 2) * SWING_TOLERANCE;

        let plan = planLayout(baseHeight, stageWidth);

        // 回転の途中で横へ張り出しすぎる場合は、収まるまで縮める。
        // 張り出し量はサイズにほぼ比例するので、2回の調整で十分収束します。
        for (let n = 0; n < 2; n++) {
            const extent = maxExtent(plan.radius, plan.widest, perspective);
            if (extent <= allowed) break;
            baseHeight = Math.max(120, baseHeight * (allowed / extent));
            plan = planLayout(baseHeight, stageWidth);
        }

        // 正面に来た写真だけは、どんな場合でも絶対に切れないようにする。
        // （横のカードは SWING_TOLERANCE のぶんだけ端が切れることを許容しています）
        if (plan.widest > stageWidth) {
            baseHeight = baseHeight * (stageWidth / plan.widest);
            plan = planLayout(baseHeight, stageWidth);
        }

        radius = plan.radius;

        for (let i = 0; i < count; i++) {
            cards[i].style.width = plan.sizes[i].w + 'px';
            cards[i].style.height = plan.sizes[i].h + 'px';
            cards[i].style.transform =
                'translate(-50%, -50%) rotateY(' + (i * stepDeg) + 'deg) translateZ(' + radius + 'px)';
        }

        gallery.style.height = Math.round(baseHeight * 1.18) + 'px';
        lastRendered = null; // 次の描画を必ず走らせる
    };

    // 高さだけの変化（スマホのアドレスバーの出入り等）では作り直さない
    const maybeMeasure = () => {
        const width = gallery.clientWidth;
        if (width === lastWidth) return;
        lastWidth = width;
        measure();
    };

    // ---- アニメーションループ -------------------------------------------
    const tick = () => {
        requestAnimationFrame(tick);
        if (!visible || document.hidden) return;

        if (mode === 'auto') {
            // 「動きを減らす」設定の環境では自動回転させない
            if (!reduceMotion.matches) angle += AUTO_SPEED;
        } else if (mode === 'animating') {
            const diff = target - angle;
            if (Math.abs(diff) < 0.05 || reduceMotion.matches) {
                angle = target;
                mode = pendingMode;
                updateHighlight();
            } else {
                angle += diff * EASE;
            }
        }

        if (angle !== lastRendered) {
            render();
            lastRendered = angle;
        }
    };

    // ---- ドラッグ・スワイプ・タップ ---------------------------------------
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startAngle = 0;
    let downCard = null;
    let dragging = false;
    let movedEnough = false;
    let modeBeforeDrag = 'auto';
    let dragDegPerPx = DEG_PER_PX; // 操作の種類（指かマウスか）に応じて切り替える

    gallery.addEventListener('pointerdown', (e) => {
        if (e.button > 0) return;
        if (e.target.closest('.ring-btn')) return; // ボタンはボタン側の処理に任せる

        pointerId = e.pointerId;
        try { gallery.setPointerCapture(pointerId); } catch (err) { /* 未対応環境では無視 */ }

        startX = e.clientX;
        startY = e.clientY;
        startAngle = angle;
        // 指でのスワイプはマウスより感度を上げる
        dragDegPerPx = (e.pointerType === 'touch') ? DEG_PER_PX_TOUCH : DEG_PER_PX;
        // ポインタを捕捉すると以降の target が gallery になるため、
        // 押した瞬間にどの写真だったかをここで覚えておく
        downCard = e.target.closest('.ring-card');
        dragging = true;
        movedEnough = false;
        modeBeforeDrag = mode;

        // 【重要】ここでは固定を解除しない。
        // 実際に一定距離動かされたときだけ解除する（タップとドラッグを取り違えないため）
        mode = 'dragging';
    });

    gallery.addEventListener('pointermove', (e) => {
        if (!dragging || e.pointerId !== pointerId) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (!movedEnough) {
            if (Math.sqrt(dx * dx + dy * dy) <= DRAG_THRESHOLD) return;
            movedEnough = true;
            unlock(); // ここで初めて固定を解除する
        }

        // 指やマウスの動きにそのまま追従させる（慣性で反発しないように）
        angle = startAngle + dx * dragDegPerPx;
        // 手動操作中は次のフレームを待たずに描き直し、遅れを感じさせないようにする
        render();
        lastRendered = angle;
    });

    const endPointer = (e) => {
        if (!dragging || (pointerId !== null && e.pointerId !== pointerId)) return;
        dragging = false;
        try { gallery.releasePointerCapture(pointerId); } catch (err) { /* 無視 */ }
        pointerId = null;

        if (movedEnough) {
            // 手を離したら、いちばん正面に近い写真へピタッと吸着させる
            snapAndResume();
            return;
        }

        // ここからは「動いていない＝タップ／クリック」の処理
        if (locked) {
            resume(); // 固定中にもう一度押されたら自動回転へ戻す（トグル）
        } else if (downCard) {
            lockTo(cards.indexOf(downCard));
        } else {
            mode = modeBeforeDrag; // 背景を押しただけなので元の状態に戻す
        }
    };

    gallery.addEventListener('pointerup', endPointer);
    gallery.addEventListener('pointercancel', endPointer);

    // ---- ホイール／トラックパッド -----------------------------------------
    let wheelTimer = null;
    gallery.addEventListener('wheel', (e) => {
        // 横方向の操作のときだけ回す。
        // 縦方向まで受け取ってしまうと、ギャラリーの上でページを
        // 上下にスクロールできなくなるため通しています。
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
        e.preventDefault();

        unlock();
        angle += e.deltaX * 0.15;
        mode = 'dragging';
        render();
        lastRendered = angle;

        clearTimeout(wheelTimer);
        wheelTimer = setTimeout(snapAndResume, 160);
    }, { passive: false });

    // ---- ボタン・キーボード -------------------------------------------------
    if (prevBtn) prevBtn.addEventListener('click', () => stepBy(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => stepBy(1));

    gallery.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            stepBy(-1);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            stepBy(1);
        } else if (e.key === 'Escape' && locked) {
            resume();
        } else if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('ring-card')) {
            e.preventDefault();
            const i = cards.indexOf(e.target);
            if (locked && lockedIndex === i) resume();
            else lockTo(i);
        }
    });

    // ---- 画面サイズ・表示状態の監視 -------------------------------------------
    let resizeTimer = null;
    const scheduleMeasure = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(maybeMeasure, 120);
    };

    window.addEventListener('resize', scheduleMeasure);
    if ('ResizeObserver' in window) {
        // 高さは measure() 自身が書き換えるため、幅が変わったときだけ再計算する
        // （そうしないと監視と再計算が無限に呼び合ってしまう）
        new ResizeObserver(scheduleMeasure).observe(gallery);
    }

    // 画面外にあるときは描画を止める（スマホの電池消費を抑えるため）
    if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
            visible = entries[0].isIntersecting;
        }).observe(gallery);
    }

    // 画像の実寸が分かった時点で測り直す
    cards.forEach((card) => {
        const img = card.querySelector('img');
        if (img && !img.complete) {
            img.addEventListener('load', () => { lastWidth = 0; maybeMeasure(); }, { once: true });
        }
    });

    maybeMeasure();
    updateHighlight();
    render();
    tick();
}


// ==================================
// 超音波 波動（Canvas）アニメーション
// ==================================
// 正弦波（サイン波）を複数重ね合わせ、干渉させることで
// 超音波が空間を伝搬しているイメージを背景に描画し続けます。
function initWaveCanvas() {
    const canvas = document.getElementById('wave-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // 表示上の大きさ（CSSピクセル）。描画計算はこの値を基準に行います。
    let width = 0;
    let height = 0;

    function resize() {
        width = canvas.parentElement.offsetWidth;
        height = canvas.parentElement.offsetHeight;

        // 高解像度ディスプレイでは実ピクセル数が CSS ピクセルの整数倍あるため、
        // 等倍のまま描くと波線がぼやけます。画面の倍率に合わせて実寸を確保します。
        const ratio = window.devicePixelRatio || 1;
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    // 「動きを減らす」設定の環境ではアニメーションさせず、静止画として一度だけ描く
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // ヒーローが画面外にあるときは描画を止める（スマホの電池消費を抑えるため）
    let isVisible = true;
    if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
            isVisible = entries[0].isIntersecting;
        }).observe(canvas.parentElement);
    }

    let time = 0;

    function drawWaves() {
        // 停止中はフレームを進めず、次の確認だけ予約する
        if (!isVisible || document.hidden) {
            requestAnimationFrame(drawWaves);
            return;
        }

        ctx.clearRect(0, 0, width, height);

        // 複数の波を重ね合わせて超音波の干渉パターンを表現
        const waves = [
            { amplitude: 30, frequency: 0.008, speed: 0.02, yOffset: 0.3, color: 'rgba(0, 180, 255, 0.25)', lineWidth: 1.5 },
            { amplitude: 25, frequency: 0.012, speed: 0.025, yOffset: 0.4, color: 'rgba(0, 220, 255, 0.18)', lineWidth: 1 },
            { amplitude: 40, frequency: 0.006, speed: 0.015, yOffset: 0.5, color: 'rgba(0, 160, 255, 0.22)', lineWidth: 2 },
            { amplitude: 20, frequency: 0.015, speed: 0.03, yOffset: 0.6, color: 'rgba(100, 200, 255, 0.12)', lineWidth: 1 },
            { amplitude: 35, frequency: 0.01, speed: 0.018, yOffset: 0.7, color: 'rgba(0, 140, 255, 0.18)', lineWidth: 1.5 },
        ];

        waves.forEach(wave => {
            ctx.beginPath();
            ctx.strokeStyle = wave.color;
            ctx.lineWidth = wave.lineWidth;

            for (let x = 0; x < width; x += 2) {
                const y = height * wave.yOffset
                    + Math.sin(x * wave.frequency + time * wave.speed) * wave.amplitude
                    + Math.sin(x * wave.frequency * 2.5 + time * wave.speed * 1.5) * wave.amplitude * 0.3;

                if (x === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        });

        // 「動きを減らす」設定のときは時間を進めず、波を静止させる
        if (!reduceMotion.matches) time += 1;
        requestAnimationFrame(drawWaves);
    }

    drawWaves();
}

// ==================================
// カウントアップアニメーション
// ==================================
function initCountUp() {
    const counters = document.querySelectorAll('.stat-number');
    if (counters.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseInt(el.dataset.target, 10);
                if (isNaN(target)) return;

                const duration = 2000;
                const start = performance.now();

                function update(now) {
                    const elapsed = now - start;
                    const progress = Math.min(elapsed / duration, 1);
                    // easeOutQuart
                    const eased = 1 - Math.pow(1 - progress, 4);
                    el.textContent = Math.floor(eased * target);
                    if (progress < 1) {
                        requestAnimationFrame(update);
                    } else {
                        el.textContent = target;
                    }
                }

                requestAnimationFrame(update);
                observer.unobserve(el);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => observer.observe(counter));
}


// ==================================
// 動的トピックス（ニュース）生成・配置
// ==================================
// 「news-data.js」で定義されている「NEWS_DATA」配列の値を基に、
// HTMLの特定のコンテナ要素へ自動で要素を生成して流し込みます。
// - index.html用: ID「index-news-list」へ、最新の5件をシンプルなリスト形式で表示
// - news.html用: ID「news-page-list」へ、西暦ごとにグループ化して詳細表示
function initDynamicNews() {
    // データが定義されていない場合は何もしない
    if (typeof NEWS_DATA === 'undefined' || !Array.isArray(NEWS_DATA)) return;

    // --- インデックスページの簡易トピックス表示 ---
    const indexNewsList = document.getElementById('index-news-list');
    if (indexNewsList) {
        indexNewsList.innerHTML = '';
        // 最新の5件だけ表示する
        const latestNews = NEWS_DATA.slice(0, 5);
        latestNews.forEach(item => {
            const li = document.createElement('li');
            // 日付と本文はそれぞれブロック要素にして、確実に行を分ける
            // （news.html 側の .news-item と同じ構造にそろえています）
            li.innerHTML = `<p class="date">${item.date}</p><a class="title" href="news.html">${item.title}</a>`;
            indexNewsList.appendChild(li);
        });
    }

    // --- トピックス（news.html）ページのグループ分けトピックス表示 ---
    const newsPageList = document.getElementById('news-page-list');
    if (newsPageList) {
        newsPageList.innerHTML = '';
        
        // 年ごとにデータをグループ化
        const groups = {};
        NEWS_DATA.forEach(item => {
            // 日付文字列の最初の4桁（年）をキーにする。例: "2026.03.23" -> "2026"
            const year = item.date.substring(0, 4);
            if (!groups[year]) {
                groups[year] = [];
            }
            groups[year].push(item);
        });

        // 年（キー）を降順（新しい順）で並び替えて出力
        const years = Object.keys(groups).sort((a, b) => b - a);
        years.forEach(year => {
            // 年ごとのヘッダーを追加
            const h3 = document.createElement('h3');
            h3.className = 'group-title';
            h3.textContent = ` ${year}年`;
            newsPageList.appendChild(h3);

            // その年のニュースアイテムを追加
            groups[year].forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'news-item';

                let imageHtml = '';
                if (item.image) {
                    imageHtml = `
                        <div class="news-images">
                            <img src="${item.image}" alt="">
                        </div>`;
                }

                itemDiv.innerHTML = `
                    <p class="date">${item.date}</p>
                    <h3 class="title">${item.title}</h3>
                    ${imageHtml}
                `;
                newsPageList.appendChild(itemDiv);
            });
        });
    }
}


// ==================================
// ニュース画像の拡大（ライトボックス風）
// ==================================
// ニュース内の写真をクリックしたときに、画面全体に拡大表示します。
// 画面上のどこをクリックしても、拡大表示はキャンセルされます。
function initImageZoom() {
    const overlay = document.getElementById('image-overlay');
    const overlayImg = document.getElementById('overlay-img');
    const newsPageList = document.getElementById('news-page-list');
    
    // 必要な要素が存在しない場合（news.html 以外のページ）は処理を行わない
    if (!overlay || !overlayImg || !newsPageList) return;

    // トピックスリスト内のクリックを監視（動的生成されるためイベントデリゲーションを利用）
    newsPageList.addEventListener('click', (e) => {
        const clickedImg = e.target.closest('.news-images img');
        if (clickedImg) {
            overlayImg.src = clickedImg.src;
            overlayImg.alt = clickedImg.alt || '拡大画像';
            overlay.classList.add('active');
            overlay.setAttribute('aria-hidden', 'false');
        }
    });

    // 画面のどこをクリックしても拡大表示をキャンセル（非表示にする）
    overlay.addEventListener('click', () => {
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
        // アニメーション（フェードアウト）完了後にsrcをクリアしてチラつきを防ぐ
        setTimeout(() => {
            overlayImg.src = '';
        }, 300);
    });
}
