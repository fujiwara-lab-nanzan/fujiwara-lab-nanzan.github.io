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

            // 幅を動的に取得する関数
            const getCurrentItemWidth = () => galleryContainer.querySelector('.gallery-item')?.offsetWidth || 0;

            const setupGallery = () => {
                galleryContainer.innerHTML = '';
                originalItems.forEach(item => galleryContainer.appendChild(item.cloneNode(true)));
                
                const allItems = Array.from(galleryContainer.children);
                allItems.forEach(item => galleryContainer.appendChild(item.cloneNode(true)));
                allItems.slice().reverse().forEach(item => galleryContainer.prepend(item.cloneNode(true)));
                
                galleryContainer.style.scrollBehavior = 'auto';

                // 準備が整うのを待ってからスクロール位置を設定
                setTimeout(() => {
                    const itemWidth = getCurrentItemWidth(); // ← 実行直前に幅を再計算
                    if (itemWidth > 0) {
                        galleryContainer.scrollLeft = itemWidth * itemCount;
                    }
                    galleryContainer.style.scrollBehavior = 'smooth';
                }, 100); // 少しだけ待機時間を増やして安定させる
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
                }, 5000); //スクロール間隔：3秒 = 3000
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

});
