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

    // --- ギャラリーの無限ループ & 自動スクロール  ---
    initGallery();

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
