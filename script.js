// ==========================================
//  設定・データ定義エリア
// ==========================================
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgV5MvOa8ZUcpQ9jL1HhYQOLS_y78ZoOnQI96iru-5JZVTrRc5Li4hBkN7igEyB5p73EuaaEfLC38G/pub?gid=0&single=true&output=csv";
const FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLScOeevJJLGm7kWo48V9YR4xAWYBU7vSBHKZQPnFCdEljE1-xQ/viewform?usp=dialog";

const tagMapping = {
    // 【衣装】
    "school_uniform": "制服", "maid": "メイド", "gym_uniform": "ジャージ",
    "swimsuit": "水着", "bikini": "ビキニ", "santa_costume": "サンタ",
    "kimono": "着物", "yukata": "浴衣", "dress": "ドレス",
    "china_dress": "チャイナ", "hoodie": "パーカー", "jacket": "ジャケット",
    "nurse": "ナース", "police": "ポリス", "idol": "アイドル衣装",
    "bunny": "バニー", "miko": "巫女", "waitress": "ウェイトレス",
    "pajamas": "パジャマ", "track_suit": "ジャージ",
    // 【特徴】
    "glasses": "眼鏡", "animal_ears": "ケモミミ", "cat_ears": "猫耳",
    "rabbit_ears": "うさ耳", "fox_ears": "狐耳", "dog_ears": "犬耳",
    "headphones": "ヘッドホン", "mask": "マスク", "twintails": "ツインテ",
    "ponytail": "ポニテ", "short_hair": "ショート", "long_hair": "ロング",
    "braid": "三つ編み", "ahoge": "アホ毛", "heterochromia": "オッドアイ"
};

const memberReadings = {
    "花芽すみれ": "かがすみれ", "花芽なずな": "かがなずな", "小雀とと": "こがらとと",
    "一ノ瀬うるは": "いちのせうるは", "胡桃のあ": "くるみのあ", "橘ひなの": "たちばなひなの",
    "如月れん": "きさらぎれん", "英リサ": "はなぶさりさ", "空澄セナ": "あすみせな",
    "兎咲ミミ": "とさきみみ", "神成きゅぴ": "かみなりきゅぴ", "八雲べに": "やくもべに",
    "藍沢エマ": "あいざわえま", "紫宮るな": "しのみやるな", "猫汰つな": "ねこたつな",
    "白波らむね": "しらなみらむね", "小森めと": "こもりめと", "夢野あかり": "ゆめのあかり",
    "夜乃くろむ": "やのくろむ", "紡木こかげ": "つむぎこかげ", "千燈ゆうひ": "せんどうゆうひ",
    "蝶屋はなび": "ちょうやはなび", "甘結もか": "あまゆいもか"
};

const memberIcons = {
    "花芽すみれ": "👾💤", "花芽なずな": "🍣", "小雀とと": "🔫🐥",
    "一ノ瀬うるは": "🌠", "胡桃のあ": "🧸♔", "橘ひなの": "🍫💘",
    "如月れん": "⏰", "英リサ": "💐", "空澄セナ": "🗝♠︎",
    "兎咲ミミ": "🐰🍭", "神成きゅぴ": "🌩", "八雲べに": "💄💚",
    "藍沢エマ": "🥞💫", "紫宮るな": "☪🐾", "猫汰つな": "🍒✨",
    "白波らむね": "🐻‍❄️🏖", "小森めと": "🪐", "夢野あかり": "🍼",
    "夜乃くろむ": "💀⛓", "紡木こかげ": "📘💧", "千燈ゆうひ": "🫠",
    "蝶屋はなび": "🦋🎆", "甘結もか": "🕹🔖"
};

// ==========================================
//  状態管理変数
// ==========================================
let allData = [];
let filteredData = []; 
let currentMode = 'member';
let currentSort = 'new';
let favorites = JSON.parse(localStorage.getItem('vspo_favs')) || [];
let currentImageIndex = 0;
let slideshowList = [];
let latestIndexThreshold = 0;
let autoPlayInterval = null;
let displayLimit = 40;
let displayStep = 40;
let isGroupMode = false;

let storiesData = [];
let currentStoryMemberIndex = 0;
let currentStorySlideIndex = 0;
let storyTimer = null;

// ==========================================
//  初期化処理
// ==========================================
window.onload = function() {
    const contactLink = document.getElementById('contact-link');
    if (FORM_URL && contactLink) { contactLink.href = FORM_URL; }
    
    // ★追加：フッターの削除依頼リンクにも同じURLを設定
    const removeLink = document.getElementById('remove-link');
    if (FORM_URL && removeLink) { removeLink.href = FORM_URL; }

    generateMemberTags();
    renderUnitButtons();
    
    if (navigator.share) {
        const btnNative = document.getElementById('btn-native');
        if(btnNative) btnNative.style.display = 'flex';
    }

    document.addEventListener('keydown', function(e) {
        if (!document.getElementById('modal').classList.contains('open')) return;
        if (e.key === 'ArrowLeft') changeImage(-1);
        if (e.key === 'ArrowRight') changeImage(1);
        if (e.key === 'Escape') closeModal();
    });
    
    Papa.parse(CSV_URL, {
        download: true, header: true,
        complete: function(results) {
            allData = results.data
                .filter(item => item.member && item.image)
                .map((item, index) => {
                    item._originalIndex = index;
                    
                    let rawTags = item["Tags"] || item["タグ"] || ""; 
                    let tagKeywords = "";
                    for (const [engTag, japWord] of Object.entries(tagMapping)) {
                        if (rawTags.includes(engTag)) {
                            tagKeywords += " " + japWord;
                        }
                    }

                    let unitName = item["ユニット"] || item["Unit"] || item["unit"] || "";
                    item._unitName = unitName.trim();
                    item._tagsArray = rawTags.split(',').map(t => t.trim().toLowerCase());

                    item._searchKey = (
                        item.member + 
                        (memberReadings[item.member] || "") + 
                        item.cosplayer + 
                        tagKeywords + 
                        " " + unitName 
                    ).toLowerCase();

                    return item;
                });
            
            latestIndexThreshold = Math.max(0, allData.length - 5);
            const totalCountEl = document.getElementById('total-count');
            if(totalCountEl) totalCountEl.innerText = `現在 ${allData.length} 枚`;

            filteredData = [...allData];
            generateStories();
            applySort();
        },
        error: function() { document.getElementById('app').innerHTML = '<p style="text-align:center;">読み込み失敗</p>'; }
    });

    window.addEventListener('scroll', () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            loadMore();
        }
    });
};

// ==========================================
//  レンダリング
// ==========================================
function render() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    prepareSlideshowList();
    
    displayLimit = 40;
    const sentinel = document.getElementById('loading-sentinel');
    if(sentinel) sentinel.style.display = 'block';

    if (slideshowList.length === 0) {
        app.innerHTML = `
            <div class="empty-guide">
                <div style="font-size:3rem; margin-bottom:10px;">😢</div>
                <p>条件に合う画像が見つかりませんでした...</p>
                <p style="margin-top:20px; font-weight:bold;">人気のタグで探してみる？</p>
                <div class="guide-tags">
                    <span class="guide-chip" onclick="filterByText('メイド')">メイド</span>
                    <span class="guide-chip" onclick="filterByText('制服')">制服</span>
                    <span class="guide-chip" onclick="filterByText('水着')">水着</span>
                    <span class="guide-chip" onclick="filterByText('眼鏡')">眼鏡</span>
                    <span class="guide-chip" onclick="filterByText('猫耳')">猫耳</span>
                    <span class="guide-chip" onclick="filterByText('バニー')">バニー</span>
                </div>
            </div>
        `;
        if(sentinel) sentinel.style.display = 'none';
        return;
    }

    isGroupMode = !(currentSort === 'new' || currentSort === 'shuffle' || currentMode === 'favorite' || currentMode === 'cosplayer');

    if (isGroupMode) {
        renderGroupMode(app);
        if(sentinel) sentinel.style.display = 'none';
    } else {
        renderFlatMode(app);
    }
}

function renderFlatMode(container) {
    let grid = container.querySelector('.masonry-grid');
    if (!grid) {
        grid = document.createElement('div');
        grid.className = 'masonry-grid';
        container.appendChild(grid);
    }
    const targetData = slideshowList.slice(0, displayLimit);
    let html = '';
    targetData.forEach(item => { html += createCardHTML(item); });
    grid.innerHTML = html;
    
    if (displayLimit >= slideshowList.length) {
        const sentinel = document.getElementById('loading-sentinel');
        if(sentinel) sentinel.style.display = 'none';
    }
}

function loadMore() {
    if (isGroupMode) return;
    if (displayLimit >= slideshowList.length) return;
    displayLimit += displayStep;
    renderFlatMode(document.getElementById('app'));
}

function renderGroupMode(container) {
    const groups = {};
    slideshowList.forEach(item => {
        const groupName = item.member || "未分類";
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push(item);
    });

    let fullHtml = '';
    Object.keys(groups).forEach(name => {
        fullHtml += `<div class="section-title">■ ${name}</div><div class="masonry-grid">`;
        groups[name].forEach(item => { fullHtml += createCardHTML(item); });
        fullHtml += `</div>`;
    });
    container.innerHTML = fullHtml;
}

function createCardHTML(item) {
    const isFav = favorites.includes(item.image);
    const isNew = item._originalIndex >= latestIndexThreshold;
    const safeMember = (item.member || "").replace(/"/g, '&quot;');
    const safeCos = (item.cosplayer || "").replace(/"/g, '&quot;');
    
    let unitHtml = '';
    if (item._unitName) {
        unitHtml = `<span class="card-unit" onclick="event.stopPropagation(); filterByText('${item._unitName}')">${item._unitName}</span>`;
    }
    
    return `
    <div class="card" onclick="openModal('${item.image}')">
        ${isNew ? '<div class="card-new">NEW</div>' : ''}
        <button class="card-fav ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); toggleFav('${item.image}', this)">
            <i class="fas fa-heart"></i>
        </button>
        <img src="${item.image}" loading="lazy" onload="this.style.opacity=1" onerror="this.src='https://placehold.jp/300x300.png?text=No+Image'">
        <div class="card-overlay">
            <div style="display:flex; flex-wrap:wrap; width:100%;">
                <span class="card-tag">${safeMember}</span>
                ${unitHtml}
            </div>
            <div class="card-name" title="このレイヤーさんで検索" onclick="event.stopPropagation(); filterByText('${safeCos}')">${safeCos}</div>
        </div>
    </div>`;
}

// ==========================================
//  検索・ソート
// ==========================================
function filterByText(text) {
    const input = document.getElementById('searchInput');
    if(input) {
        input.value = text;
        handleSearch();
        showToast(`「${text}」で絞り込みました🔍`);
        closeModal(); 
        scrollToTop();
    }
}

function handleSearch() {
    const input = document.getElementById('searchInput');
    if(!input) return;
    const rawKey = input.value.toLowerCase();
    const keywords = rawKey.split(/\s+/).filter(k => k.trim() !== "");
    filteredData = allData.filter(d => keywords.every(k => d._searchKey.includes(k)));
    applySort();
}

function setSort(type) {
    currentSort = type;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    const btnNew = document.getElementById('btn-new');
    const btnOrig = document.getElementById('btn-orig');
    const btnShuf = document.getElementById('btn-shuf');
    if(type === 'new' && btnNew) btnNew.classList.add('active');
    if(type === 'original' && btnOrig) btnOrig.classList.add('active');
    if(type === 'shuffle' && btnShuf) btnShuf.classList.add('active');
    applySort();
}

function applySort() {
    if(currentSort === 'new') filteredData.sort((a,b) => b._originalIndex - a._originalIndex);
    else if(currentSort === 'original') filteredData.sort((a,b) => a._originalIndex - b._originalIndex);
    else if(currentSort === 'shuffle') filteredData.sort(() => Math.random() - 0.5);
    render();
}

function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    const navBtn = document.getElementById('nav-' + mode);
    if(navBtn) navBtn.classList.add('active');
    render();
}

function generateMemberTags() {
    const box = document.getElementById('memberBar');
    if(!box) return;
    box.innerHTML = `<span class="member-chip active" onclick="filterByMember('all', this)">🏠</span>`;
    Object.keys(memberReadings).forEach(k => {
        box.innerHTML += `<span class="member-chip" onclick="filterByMember('${k}', this)">${memberIcons[k]||k}</span>`;
    });
}

function filterByMember(name, el) {
    document.querySelectorAll('.member-chip').forEach(c=>c.classList.remove('active'));
    if(el) el.classList.add('active');
    if(name==='all') filteredData = [...allData];
    else filteredData = allData.filter(d=>d.member===name);
    setMode('member');
    applySort();
}

// ==========================================
//  モーダル (画像拡大) ＆ レコメンド
// ==========================================
function prepareSlideshowList() {
    if (currentMode === 'favorite') slideshowList = allData.filter(item => favorites.includes(item.image));
    else slideshowList = filteredData;
}

function openModal(url) {
    if(autoPlayInterval) clearInterval(autoPlayInterval);
    let idx = slideshowList.findIndex(d => d.image === url);
    if (idx === -1) { slideshowList = allData; idx = allData.findIndex(d => d.image === url); }
    if (idx !== -1) {
        currentImageIndex = idx;
        updateModal();
        const modal = document.getElementById('modal');
        if(modal) modal.classList.add('open');
        document.body.classList.add('modal-open');
    }
}

function updateModal() {
    const item = slideshowList[currentImageIndex];
    if(!item) return;
    document.getElementById('m-img').src = item.image;
    document.getElementById('m-link').href = item.link; 
    
    // ★追加：プロフィールへGOボタンの生成
    const btnProfile = document.getElementById('btn-profile');
    if (btnProfile && item.link) {
        // ツイートURLからユーザー名を抽出 (例: https://twitter.com/user/status/123 -> user)
        const match = item.link.match(/https?:\/\/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/);
        if (match && match[1]) {
            btnProfile.style.display = 'flex';
            btnProfile.href = `https://twitter.com/${match[1]}`;
        } else {
            btnProfile.style.display = 'none';
        }
    } else if (btnProfile) {
        btnProfile.style.display = 'none';
    }

    const tagsContainer = document.getElementById('m-tags');
    if (tagsContainer) {
        tagsContainer.innerHTML = ''; 
        if (item.member) tagsContainer.innerHTML += `<span class="modal-tag-chip" onclick="filterByText('${item.member}')">${item.member}</span>`;
        if (item._unitName) tagsContainer.innerHTML += `<span class="modal-tag-chip" onclick="filterByText('${item._unitName}')">${item._unitName}</span>`;

        let rawTags = item["Tags"] || item["タグ"] || "";
        let tagsArray = rawTags.split(',').map(t => t.trim()).filter(t => t);
        const ignoreList = ["best quality", "high quality", "absurdres", "1girl", "2girls", "multiple_girls", "cosplay", "general"];

        tagsArray.forEach(tag => {
            if (ignoreList.includes(tag.toLowerCase())) return;
            let displayText = "";
            if (tagMapping[tag]) displayText = tagMapping[tag].split(" ")[0]; 
            if (displayText) tagsContainer.innerHTML += `<span class="modal-tag-chip" onclick="filterByText('${displayText}')">${displayText}</span>`;
        });
    }

    const recContainer = document.getElementById('m-recommend');
    const recLabel = document.getElementById('rec-label');
    if (recContainer && recLabel) {
        recContainer.innerHTML = '';
        const candidates = allData.filter(d => d.image !== item.image).map(other => {
            let score = 0;
            if (other.member === item.member) score += 3;
            if (item._unitName && other._unitName === item._unitName) score += 5;
            if (other.cosplayer === item.cosplayer) score += 2;
            const commonTags = other._tagsArray.filter(t => item._tagsArray.includes(t));
            const validCommon = commonTags.filter(t => !["best quality", "high quality", "absurdres", "1girl", "cosplay"].includes(t));
            score += validCommon.length * 1.5;
            return { item: other, score: score };
        });
        candidates.sort((a, b) => b.score - a.score);
        const topPicks = candidates.slice(0, 4);

        if (topPicks.length > 0) {
            recLabel.style.display = 'block';
            topPicks.forEach(pick => {
                const imgDiv = document.createElement('div');
                imgDiv.className = 'recommend-card';
                imgDiv.innerHTML = `<img src="${pick.item.image}">`;
                imgDiv.onclick = (e) => { e.stopPropagation(); openModal(pick.item.image); };
                recContainer.appendChild(imgDiv);
            });
        } else { recLabel.style.display = 'none'; }
    }
}

function closeModal() {
    if(autoPlayInterval) clearInterval(autoPlayInterval);
    const modal = document.getElementById('modal');
    if(modal) modal.classList.remove('open');
    document.body.classList.remove('modal-open');
}

function changeImage(dir, e) {
    if(e) e.stopPropagation();
    currentImageIndex += dir;
    if(currentImageIndex < 0) currentImageIndex = slideshowList.length -1;
    if(currentImageIndex >= slideshowList.length) currentImageIndex = 0;
    updateModal();
}

function toggleAutoPlay() {
    if(autoPlayInterval) { clearInterval(autoPlayInterval); autoPlayInterval=null; }
    else { autoPlayInterval = setInterval(() => changeImage(1), 3000); }
}

// ==========================================
//  お気に入り・シェア・その他機能
// ==========================================
function toggleFav(imgUrl, btn) {
    if (favorites.includes(imgUrl)) favorites = favorites.filter(u => u !== imgUrl);
    else favorites.push(imgUrl);
    localStorage.setItem('vspo_favs', JSON.stringify(favorites));
    if (btn) btn.classList.toggle('active');
    if(currentMode==='favorite') render();
}

function nativeShare() {
    const item = slideshowList[currentImageIndex];
    if (navigator.share) {
        navigator.share({
            title: 'ぶいすぽっ！コスプレアーカイブ',
            text: `${item.member} (${item.cosplayer}さん) のコスプレ！ #ぶいすぽっ`,
            url: item.link || window.location.href 
        }).catch(console.error);
    }
}

function shareX() {
    const item = slideshowList[currentImageIndex];
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(item.member + "コスプレ")}&url=${encodeURIComponent(item.link)}`);
}

function toggleTheme() { document.body.classList.toggle('dark-mode'); }

function showToast(msg) {
    const t = document.getElementById('toast');
    if(!t) return;
    t.innerText = msg; t.className="show";
    setTimeout(()=>t.className="", 3000);
}

function scrollToTop() { window.scrollTo({top:0, behavior:'smooth'}); }

window.onscroll = function() {
    const btn = document.getElementById('scrollTopBtn');
    if(btn) {
        if(!document.body.classList.contains('modal-open')) {
            btn.style.display = (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) ? "flex" : "none";
        }
    }
};

// ==========================================
//  ストーリーズ機能
// ==========================================
function generateStories() {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    let seed = parseInt(today);
    const container = document.getElementById('stories-container');
    if(!container) return;
    
    container.innerHTML = '';
    storiesData = [];

    function seededRandom(s) { var x = Math.sin(s++) * 10000; return x - Math.floor(x); }

    Object.keys(memberReadings).forEach(member => {
        const memberImages = allData.filter(d => d.member === member);
        if(memberImages.length === 0) return;

        const temp = [...memberImages];
        for (let i = temp.length - 1; i > 0; i--) {
            const r = Math.floor(seededRandom(seed + i + member.length) * (i + 1));
            [temp[i], temp[r]] = [temp[r], temp[i]];
        }

        const picks = [];
        const seenLayer = new Set();
        const spares = [];

        for (const item of temp) {
            if (!seenLayer.has(item.cosplayer)) {
                picks.push(item);
                seenLayer.add(item.cosplayer);
            } else { spares.push(item); }
            if (picks.length >= 5) break;
        }

        if (picks.length < 5) {
            const needed = 5 - picks.length;
            for (let i = 0; i < needed; i++) { if (spares[i]) picks.push(spares[i]); }
        }

        storiesData.push({ name: member, icon: picks[0].image, images: picks });
    });

    storiesData.forEach((s, idx) => {
        const el = document.createElement('div');
        el.className = 'story-item';
        el.innerHTML = `<div class="story-ring" id="ring-${idx}"><img class="story-img" src="${s.icon}"></div><div class="story-name">${memberIcons[s.name] || s.name}</div>`;
        el.onclick = () => openStory(idx);
        container.appendChild(el);
    });
}

function openStory(idx) {
    currentStoryMemberIndex = idx;
    currentStorySlideIndex = 0;
    document.getElementById(`ring-${idx}`).classList.add('seen');
    document.getElementById('story-viewer').classList.add('active');
    renderStorySlide();
}
function renderStorySlide() {
    const story = storiesData[currentStoryMemberIndex];
    const img = story.images[currentStorySlideIndex];
    document.getElementById('story-icon').src = story.icon;
    document.getElementById('story-user').innerText = story.name;
    document.getElementById('story-main').src = img.image;
    
    const bars = document.getElementById('story-bars');
    bars.innerHTML = '';
    story.images.forEach((_, i) => {
        const bar = document.createElement('div');
        bar.className = 'story-bar';
        const fill = document.createElement('div');
        fill.className = 'story-fill';
        if (i < currentStorySlideIndex) fill.style.width = '100%';
        else if (i === currentStorySlideIndex) fill.id = 'current-fill';
        bar.appendChild(fill);
        bars.appendChild(bar);
    });
    startStoryTimer();
}
function startStoryTimer() {
    if(storyTimer) clearTimeout(storyTimer);
    const fill = document.getElementById('current-fill');
    if(fill) {
        setTimeout(() => { fill.style.transition = 'width 4s linear'; fill.style.width = '100%'; }, 10);
    }
    storyTimer = setTimeout(nextStory, 4000);
}
function nextStory() {
    const story = storiesData[currentStoryMemberIndex];
    if (currentStorySlideIndex < story.images.length - 1) {
        currentStorySlideIndex++; renderStorySlide();
    } else {
        if (currentStoryMemberIndex < storiesData.length - 1) {
            currentStoryMemberIndex++; currentStorySlideIndex=0; renderStorySlide();
        } else { closeStory(); }
    }
}
function prevStory() {
    if (currentStorySlideIndex > 0) { currentStorySlideIndex--; renderStorySlide(); }
    else if (currentStoryMemberIndex > 0) {
        currentStoryMemberIndex--; 
        currentStorySlideIndex = storiesData[currentStoryMemberIndex].images.length - 1;
        renderStorySlide();
    }
}
function closeStory() {
    if(storyTimer) clearTimeout(storyTimer);
    document.getElementById('story-viewer').classList.remove('active');
}

// ==========================================
// 🌸 ユニット・ペア検索ボタン機能
// ==========================================
const unitList = [
    { label: "花芽姉妹", keyword: "花芽姉妹" },
    { label: "あいかが", keyword: "あいかが" },
    { label: "ととつな", keyword: "ととつな" },
    { label: "ととリサ", keyword: "ととリサ" },
    { label: "BIG☆STAR", keyword: "BIG☆STAR" },
    { label: "のせれん", keyword: "のせれん" },
    { label: "のせミミ", keyword: "のせミミ" },
    { label: "のあうひ", keyword: "のあうひ" },
    { label: "のあらむ", keyword: "のあらむ" },
    { label: "わざとあざとエキスパート", keyword: "わざとあざとエキスパート歌みた" },
    { label: "のあセナ", keyword: "のあセナ" },
    { label: "セナひな", keyword: "セナひな" },
    { label: "セナうひ", keyword: "セナうひ" },
    { label: "セナつな", keyword: "セナつな" },
    { label: "はなばな", keyword: "はなばな" },
    { label: "花鳥牛月", keyword: "花鳥牛月" },
    { label: "こかげに咲くはなばな", keyword: "こかげに咲くはなばな" },
    { label: "すみひな", keyword: "すみひな" },
    { label: "のせひな", keyword: "のせひな" },
    { label: "のあひな", keyword: "のあひな" },
    { label: "べにエマ", keyword: "べにエマ" },
    { label: "ひなるな", keyword: "ひなるな" },
    { label: "すみるな", keyword: "すみるな" },
    { label: "寒色組", keyword: "寒色組" },
    { label: "ひなつな", keyword: "ひなつな" },
    { label: "つならむ", keyword: "つならむ" },
    { label: "バカ信号機", keyword: "バカ信号機" },
    { label: "くろかげ", keyword: "くろかげ" },
    { label: "蝶結び", keyword: "蝶結び" },
    { label: "集合・コラボ", keyword: "集合" }
];

function renderUnitButtons() {
    const container = document.getElementById('unit-buttons-container');
    if (!container) return;
    container.innerHTML = ""; 
    unitList.forEach(unit => {
        const btn = document.createElement('button');
        btn.innerText = unit.label;
        btn.className = "tool-btn"; 
        btn.style.backgroundColor = "rgba(255,255,255,0.15)";
        btn.style.border = "1px solid rgba(255,255,255,0.3)";
        btn.style.marginRight = "6px";
        btn.style.borderRadius = "15px";
        btn.style.whiteSpace = "nowrap";
        btn.onclick = () => {
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = unit.keyword; 
                if (typeof handleSearch === "function") { handleSearch(); } 
                else { const event = new Event('input'); searchInput.dispatchEvent(event); }
            }
        };
        container.appendChild(btn);
    });
}

// ==========================================
// ★変更：レイヤー一覧（50音順リスト）機能
// ==========================================
function openCosplayerList() {
    const modal = document.getElementById('list-modal');
    const list = document.getElementById('cosplayer-list');
    if(!modal || !list) return;

    // レイヤーさん名を重複なしで取得
    const cosplayers = [...new Set(allData.map(d => d.cosplayer).filter(n => n))];
    
    // 日本語の50音順にソート (localeCompareを使用)
    cosplayers.sort((a, b) => a.localeCompare(b, 'ja'));

    list.innerHTML = "";
    cosplayers.forEach(name => {
        const li = document.createElement('li');
        li.className = "list-item";
        li.innerText = name;
        li.onclick = () => {
            closeCosplayerList();
            filterByText(name); // その人名で検索実行
        };
        list.appendChild(li);
    });

    modal.classList.add('open');
    document.body.classList.add('modal-open');
}

function closeCosplayerList() {
    const modal = document.getElementById('list-modal');
    if(modal) modal.classList.remove('open');
    if(!document.getElementById('modal').classList.contains('open')) {
        document.body.classList.remove('modal-open');
    }
}
