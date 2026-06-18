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
    const galleryWrapper = document.querySelector('.gallery-wrapper');
    if (galleryWrapper) {
        const galleryContainer = document.getElementById('gallery-container');
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        let autoScrollInterval;

        if (galleryContainer && galleryContainer.children.length > 0) {
            const originalItems = Array.from(galleryContainer.children);
            const itemCount = originalItems.length;
            let scrollTimeout;

            // 画像のアスペクト比に基づいて各gallery-itemの幅を動的に設定
            const GALLERY_IMG_HEIGHT = 320; // 20rem = 320px（1rem=16px）
            const adjustGalleryItemWidths = () => {
                const items = galleryContainer.querySelectorAll('.gallery-item');
                items.forEach(item => {
                    const img = item.querySelector('img');
                    if (img && img.naturalWidth && img.naturalHeight) {
                        const aspectRatio = img.naturalWidth / img.naturalHeight;
                        const calculatedWidth = GALLERY_IMG_HEIGHT * aspectRatio;
                        item.style.width = calculatedWidth + 'px';
                    } else if (img) {
                        // 画像がまだ読み込まれていない場合
                        img.addEventListener('load', () => {
                            if (img.naturalWidth && img.naturalHeight) {
                                const aspectRatio = img.naturalWidth / img.naturalHeight;
                                const calculatedWidth = GALLERY_IMG_HEIGHT * aspectRatio;
                                item.style.width = calculatedWidth + 'px';
                            }
                        }, { once: true });
                    }
                });
            };

            // 平均アイテム幅を取得する関数
            const getCurrentItemWidth = () => {
                const items = galleryContainer.querySelectorAll('.gallery-item');
                if (items.length === 0) return 0;
                let totalWidth = 0;
                items.forEach(item => totalWidth += item.offsetWidth);
                return totalWidth / items.length;
            };

            const setupGallery = () => {
                galleryContainer.innerHTML = '';
                originalItems.forEach(item => galleryContainer.appendChild(item.cloneNode(true)));
                
                const allItems = Array.from(galleryContainer.children);
                allItems.forEach(item => galleryContainer.appendChild(item.cloneNode(true)));
                allItems.slice().reverse().forEach(item => galleryContainer.prepend(item.cloneNode(true)));
                
                // 画像のサイズに合わせて枠を調整
                adjustGalleryItemWidths();

                galleryContainer.style.scrollBehavior = 'auto';

                // 準備が整うのを待ってからスクロール位置を設定
                setTimeout(() => {
                    const itemWidth = getCurrentItemWidth(); // ← 実行直前に幅を再計算
                    if (itemWidth > 0) {
                        galleryContainer.scrollLeft = itemWidth * itemCount;
                    }
                    galleryContainer.style.scrollBehavior = 'smooth';
                }, 200); // 画像読み込み後に正確な幅が反映されるよう待機
            };
            
            window.addEventListener('load', setupGallery);
            window.addEventListener('resize', () => {
                clearInterval(autoScrollInterval);
                setupGallery();
                startAutoScroll();
            });

            const handleScroll = () => {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    const currentItemWidth = getCurrentItemWidth();
                    if (currentItemWidth === 0) return;

                    const scrollLeft = galleryContainer.scrollLeft;
                    const totalItemWidth = currentItemWidth * itemCount;

                    // 無限スクロールのつなぎ目処理
                    if (scrollLeft >= totalItemWidth * 2 - currentItemWidth / 2) {
                        galleryContainer.style.scrollBehavior = 'auto';
                        galleryContainer.scrollLeft -= totalItemWidth;
                        setTimeout(() => galleryContainer.style.scrollBehavior = 'smooth', 50);
                    }
                    if (scrollLeft <= 0 + currentItemWidth / 2) {
                        galleryContainer.style.scrollBehavior = 'auto';
                        galleryContainer.scrollLeft += totalItemWidth;
                        setTimeout(() => galleryContainer.style.scrollBehavior = 'smooth', 50);
                    }
                }, 150);
            };

            const startAutoScroll = () => {
                stopAutoScroll();
                autoScrollInterval = setInterval(() => {
                    galleryContainer.scrollBy({ left: getCurrentItemWidth(), behavior: 'smooth' });
                }, 5000); //スクロール間隔：5秒
            };

            const stopAutoScroll = () => {
                clearInterval(autoScrollInterval);
            };

            nextBtn.addEventListener('click', () => {
                galleryContainer.scrollBy({ left: getCurrentItemWidth(), behavior: 'smooth' });
            });
            prevBtn.addEventListener('click', () => {
                galleryContainer.scrollBy({ left: -getCurrentItemWidth(), behavior: 'smooth' });
            });
            galleryContainer.addEventListener('scroll', handleScroll, { passive: true });
            
            galleryWrapper.addEventListener('mouseenter', stopAutoScroll);
            galleryWrapper.addEventListener('mouseleave', startAutoScroll);

            startAutoScroll();
        }
    }

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
// 超音波 波動（Canvas）アニメーション
// ==================================
// 正弦波（サイン波）を複数重ね合わせ、干渉させることで
// 超音波が空間を伝搬しているイメージを背景に描画し続けます。
function initWaveCanvas() {
    const canvas = document.getElementById('wave-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
        canvas.width = canvas.parentElement.offsetWidth;
        canvas.height = canvas.parentElement.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    let time = 0;

    function drawWaves() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

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

            for (let x = 0; x < canvas.width; x += 2) {
                const y = canvas.height * wave.yOffset
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

        time += 1;
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
            li.innerHTML = `<span class="date">${item.date}</span><a href="news.html">${item.title}</a>`;
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
