// ==========================================
//  設定・データ定義エリア
// ==========================================
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgV5MvOa8ZUcpQ9jL1HhYQOLS_y78ZoOnQI96iru-5JZVTrRc5Li4hBkN7igEyB5p73EuaaEfLC38G/pub?gid=0&single=true&output=csv";
const FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLScOeevJJLGm7kWo48V9YR4xAWYBU7vSBHKZQPnFCdEljE1-xQ/viewform?usp=dialog";

const tagMapping = {
    "school_uniform": "制服", "maid": "メイド", "gym_uniform": "ジャージ", "swimsuit": "水着",
    "bikini": "ビキニ", "santa_costume": "サンタ", "kimono": "着物", "yukata": "浴衣",
    "dress": "ドレス", "china_dress": "チャイナ", "hoodie": "パーカー", "jacket": "ジャケット",
    "nurse": "ナース", "police": "ポリス", "idol": "アイドル", "bunny": "バニー",
    "miko": "巫女", "waitress": "ウェイトレス", "pajamas": "パジャマ", "glasses": "眼鏡",
    "animal_ears": "ケモミミ", "cat_ears": "猫耳", "rabbit_ears": "うさ耳", "fox_ears": "狐耳",
    "dog_ears": "犬耳", "headphones": "ヘッドホン", "mask": "マスク", "twintails": "ツインテ",
    "ponytail": "ポニテ", "short_hair": "ショート", "long_hair": "ロング", "braid": "三つ編み"
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
    "花芽すみれ": "👾💤", "花芽なずな": "🍣", "小雀とと": "🔫🐥", "一ノ瀬うるは": "🌠", "胡桃のあ": "🧸♔",
    "橘ひなの": "🍫💘", "如月れん": "⏰", "英リサ": "💐", "空澄セナ": "🗝♠︎", "兎咲ミミ": "🐰🍭",
    "神成きゅぴ": "🌩", "八雲べに": "💄💚", "藍沢エマ": "🥞💫", "紫宮るな": "☪🐾", "猫汰つな": "🍒✨",
    "白波らむね": "🐻‍❄️🏖", "小森めと": "🪐", "夢野あかり": "🍼", "夜乃くろむ": "💀⛓", "紡木こかげ": "📘💧",
    "千燈ゆうひ": "🫠", "蝶屋はなび": "🦋🎆", "甘結もか": "🕹🔖"
};

let allData = [], filteredData = [], currentMode = 'member', currentSort = 'new';
let favorites = JSON.parse(localStorage.getItem('vspo_favs')) || [];
let history = JSON.parse(localStorage.getItem('vspo_history')) || [];
let slideshowList = [], currentImageIndex = 0, displayLimit = 40;
let storiesData = [], currentStoryMemberIndex = 0, currentStorySlideIndex = 0, storyTimer = null;

window.onload = function() {
    if(document.getElementById('contact-link')) document.getElementById('contact-link').href = FORM_URL;
    if(document.getElementById('remove-link')) document.getElementById('remove-link').href = FORM_URL;

    generateMemberTags();
    renderUnitButtons();
    
    if (navigator.share && document.getElementById('btn-native')) {
        document.getElementById('btn-native').style.display = 'flex';
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
            allData = results.data.filter(item => item.member && item.image).map((item, index) => {
                item._originalIndex = index;
                let rawTags = item["Tags"] || item["タグ"] || "";
                let tagKeywords = "";
                for(const [e, j] of Object.entries(tagMapping)) { if(rawTags.includes(e)) tagKeywords += " " + j; }
                item._unitName = (item["ユニット"] || item["Unit"] || "").trim();
                item._tagsArray = rawTags.split(',').map(t => t.trim().toLowerCase());
                item._searchKey = (item.member + (memberReadings[item.member]||"") + item.cosplayer + tagKeywords + " " + item._unitName).toLowerCase();
                return item;
            });
            document.getElementById('total-count').innerText = `現在 ${allData.length} 枚`;
            filteredData = [...allData];
            generateStories();
            applySort();
        }
    });

    window.addEventListener('scroll', () => {
        const btn = document.getElementById('scrollTopBtn');
        if(btn) btn.style.display = window.scrollY > 300 ? "flex" : "none";
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) loadMore();
    });
};

// ▼ 推し色セット（データ属性方式：CSSと連動して確実に色が変わる）
function setTheme(memberName) {
    if (memberName && memberReadings[memberName]) {
        document.body.setAttribute('data-theme', memberName);
    } else {
        document.body.removeAttribute('data-theme');
    }
}

// ▼ 絞り込み
function filterByMember(name, el) {
    document.querySelectorAll('.member-chip').forEach(c=>c.classList.remove('active'));
    if(el) el.classList.add('active');
    if(name==='all') {
        filteredData = [...allData];
        setTheme(null);
    } else {
        filteredData = allData.filter(d=>d.member===name);
        setTheme(name);
    }
    setMode('member');
    applySort();
}

function render() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    prepareSlideshowList();

    if(slideshowList.length === 0) {
        let msg = (currentMode === 'history') ? "閲覧履歴はありません" : "画像が見つかりませんでした...";
        app.innerHTML = `<div style="text-align:center; padding:50px; color:#888;">${msg}</div>`;
        document.getElementById('loading-sentinel').style.display = 'none';
        return;
    }

    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.trim() : "";
    const uniqueMembers = [...new Set(slideshowList.map(d => d.member))];
    const uniqueCosplayers = [...new Set(slideshowList.map(d => d.cosplayer))];

    // 検索で1人に絞られたら色を変える
    if (uniqueMembers.length === 1 && currentMode !== 'favorite' && currentMode !== 'history') {
        if(!document.body.getAttribute('data-theme')) setTheme(uniqueMembers[0]);
    }

    // レイヤー専用ページヘッダー表示
    if (uniqueCosplayers.length === 1 && searchTerm !== "" && currentMode !== 'favorite' && currentMode !== 'history') {
        const targetName = uniqueCosplayers[0];
        const firstItem = slideshowList[0];
        let profileUrl = null;
        if (firstItem.link) {
            const match = firstItem.link.match(/https?:\/\/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/);
            if (match) profileUrl = `https://twitter.com/${match[1]}`;
        }
        const counts = {};
        slideshowList.forEach(i => { if(i.member) counts[i.member] = (counts[i.member]||0)+1; });
        const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([n,c])=>`<span class="profile-tag-chip">${memberIcons[n]||""} ${n}</span>`).join("");

        const div = document.createElement('div');
        div.className = 'profile-header';
        let html = `<button class="profile-close" onclick="clearSearch()" title="閉じる">&times;</button><div class="profile-name">${targetName}</div>`;
        if(profileUrl) html += `<a href="${profileUrl}" target="_blank" class="profile-link-btn"><i class="fab fa-x-twitter"></i> X (Twitter)</a>`;
        html += `<div class="profile-info"><span>投稿数: ${slideshowList.length}</span><div class="profile-tags">💖 よくやるコスプレ:<br>${top}</div></div><button class="profile-back" onclick="clearSearch()">← 全員表示に戻る</button>`;
        div.innerHTML = html;
        app.appendChild(div);
    }

    let grid = document.createElement('div');
    grid.className = 'masonry-grid';
    app.appendChild(grid);

    const targetData = slideshowList.slice(0, displayLimit);
    let html = '';
    targetData.forEach(item => {
        const isFav = favorites.includes(item.image);
        const isNew = item._originalIndex >= (allData.length - 5);
        html += `
        <div class="card" onclick="openModal('${item.image}')" ondblclick="event.stopPropagation(); playHeart(this); toggleFav('${item.image}', this.querySelector('.card-fav'))">
            ${isNew ? '<div class="card-new">NEW</div>' : ''}
            <button class="card-fav ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); toggleFav('${item.image}', this)"><i class="fas fa-heart"></i></button>
            <img src="${item.image}" loading="lazy" onload="this.style.opacity=1">
            <div class="card-overlay">
                <span class="card-tag">${item.member}</span>
                <div class="card-name">${item.cosplayer}</div>
            </div>
        </div>`;
    });
    grid.innerHTML = html;
    document.getElementById('loading-sentinel').style.display = (displayLimit >= slideshowList.length) ? 'none' : 'block';
}

function playHeart(el) {
    const h = document.createElement('i');
    h.className = 'fas fa-heart pop-heart';
    el.appendChild(h);
    setTimeout(() => h.remove(), 1000);
}

function generateMemberTags() {
    const box = document.getElementById('memberBar');
    box.innerHTML = `<span class="member-chip active" onclick="filterByMember('all', this)">🏠</span>`;
    Object.keys(memberIcons).forEach(k => {
        box.innerHTML += `<span class="member-chip" onclick="filterByMember('${k}', this)">${memberIcons[k]}</span>`;
    });
}

function renderUnitButtons() {
    const list = ["花芽姉妹","あいかが","ととつな","ととリサ","BIG☆STAR","のせれん","のせミミ","のあうひ","のあらむ","のあセナ","セナひな","セナうひ","セナつな","はなばな","花鳥牛月","こかげに咲くはなばな","すみひな","のせひな","のあひな","べにエマ","ひなるな","すみるな","寒色組","ひなつな","つならむ","バカ信号機","くろかげ","蝶結び","集合"];
    const con = document.getElementById('unit-buttons-container');
    con.innerHTML = "";
    list.forEach(u => {
        const b = document.createElement('button');
        b.className = "tool-btn";
        b.innerText = u;
        b.onclick = () => { document.getElementById('searchInput').value = u; handleSearch(); };
        con.appendChild(b);
    });
}

function handleSearch() {
    const v = document.getElementById('searchInput').value.toLowerCase();
    const ks = v.split(/\s+/).filter(k=>k);
    filteredData = allData.filter(d => ks.every(k => d._searchKey.includes(k)));
    
    const m = Object.keys(memberReadings).find(k => k === document.getElementById('searchInput').value.trim());
    setTheme(m || null);
    applySort();
}

function setSort(type) {
    currentSort = type;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    if(type==='new') document.getElementById('btn-new').classList.add('active');
    if(type==='original') document.getElementById('btn-orig').classList.add('active');
    if(type==='shuffle') document.getElementById('btn-shuf').classList.add('active');
    applySort();
}

function applySort() {
    if(currentSort==='new') filteredData.sort((a,b)=>b._originalIndex - a._originalIndex);
    if(currentSort==='original') filteredData.sort((a,b)=>a._originalIndex - b._originalIndex);
    if(currentSort==='shuffle') filteredData.sort(()=>Math.random()-0.5);
    render();
}

function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('nav-'+mode).classList.add('active');
    setTheme(null);
    render();
}

function loadMore() {
    if(displayLimit >= slideshowList.length) return;
    displayLimit += 40;
    render();
}

function toggleFav(url, btn) {
    if(favorites.includes(url)) favorites = favorites.filter(u=>u!==url);
    else favorites.push(url);
    localStorage.setItem('vspo_favs', JSON.stringify(favorites));
    if(btn) btn.classList.toggle('active');
    if(currentMode==='favorite') render();
}

function addToHistory(url) {
    history = history.filter(h=>h!==url);
    history.push(url);
    if(history.length>50) history.shift();
    localStorage.setItem('vspo_history', JSON.stringify(history));
}

function prepareSlideshowList() {
    if(currentMode==='favorite') slideshowList = allData.filter(i=>favorites.includes(i.image));
    else if(currentMode==='history') {
        const h = [...new Set(history)].reverse();
        slideshowList = h.map(u=>allData.find(d=>d.image===u)).filter(d=>d);
    } else slideshowList = filteredData;
}

function openModal(url) {
    addToHistory(url);
    let idx = slideshowList.findIndex(d=>d.image===url);
    if(idx===-1) { slideshowList = allData; idx = allData.findIndex(d=>d.image===url); }
    if(idx!==-1) {
        currentImageIndex = idx;
        updateModal();
        document.getElementById('modal').classList.add('open');
        document.body.classList.add('modal-open');
    }
}

function updateModal() {
    const item = slideshowList[currentImageIndex];
    if(!item) return;
    document.getElementById('m-img').src = item.image;
    document.getElementById('m-link').href = item.link;
    
    const btn = document.getElementById('btn-profile');
    const m = item.link.match(/https?:\/\/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/);
    if(m) { btn.style.display='flex'; btn.href=`https://twitter.com/${m[1]}`; }
    else btn.style.display='none';

    const tCon = document.getElementById('m-tags');
    tCon.innerHTML = '';
    if(item.member) tCon.innerHTML += `<span class="modal-tag-chip" onclick="filterByText('${item.member}')">${item.member}</span>`;
    (item._tagsArray||[]).forEach(t => {
        const disp = Object.entries(tagMapping).find(([k,v])=>t.includes(k));
        if(disp) tCon.innerHTML += `<span class="modal-tag-chip" onclick="filterByText('${disp[1]}')">${disp[1]}</span>`;
    });

    const rCon = document.getElementById('m-recommend');
    rCon.innerHTML = '';
    const cands = allData.filter(d=>d.image!==item.image).map(d=>{
        let s = 0;
        if(d.member===item.member) s+=3;
        if(d.cosplayer===item.cosplayer) s+=2;
        return {i:d, s:s};
    });
    cands.sort((a,b)=>b.s-a.s).slice(0,4).forEach(c=>{
        const d = document.createElement('div');
        d.className='recommend-card';
        d.innerHTML=`<img src="${c.i.image}">`;
        d.onclick=(e)=>{ e.stopPropagation(); openModal(c.i.image); };
        rCon.appendChild(d);
    });
    document.getElementById('rec-label').style.display = (cands.length>0)?'block':'none';
}

function closeModal() {
    document.getElementById('modal').classList.remove('open');
    document.body.classList.remove('modal-open');
    if(currentMode==='history') render();
}

function changeImage(dir, e) {
    if(e) e.stopPropagation();
    currentImageIndex += dir;
    if(currentImageIndex < 0) currentImageIndex = slideshowList.length - 1;
    if(currentImageIndex >= slideshowList.length) currentImageIndex = 0;
    addToHistory(slideshowList[currentImageIndex].image);
    updateModal();
}

function copyLink() {
    const item = slideshowList[currentImageIndex];
    if(item && item.link) {
        navigator.clipboard.writeText(item.link).then(()=>showToast("リンクをコピー！📋"));
    }
}

function shareX() {
    const item = slideshowList[currentImageIndex];
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(item.member + "コスプレ")}&url=${encodeURIComponent(item.link)}`);
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg; t.style.visibility='visible'; t.style.opacity=1;
    setTimeout(()=>{ t.style.opacity=0; t.style.visibility='hidden'; }, 3000);
}

// ★修正：レイヤー名鑑（ボタン化＆遷移機能）
function openCosplayerList() {
    const list = document.getElementById('cosplayer-list');
    const names = [...new Set(allData.map(d=>d.cosplayer).filter(n=>n))].sort((a,b)=>a.localeCompare(b,'ja'));
    list.innerHTML = "";
    names.forEach(n => {
        const li = document.createElement('li');
        li.className = 'list-item'; // CSSでボタン化されています
        li.innerText = n;
        li.onclick = () => { 
            // モーダルを閉じて、その名前で検索（＝ページ遷移）
            document.getElementById('list-modal').classList.remove('open'); 
            filterByText(n); 
        };
        list.appendChild(li);
    });
    document.getElementById('list-modal').classList.add('open');
}

function closeCosplayerList() { document.getElementById('list-modal').classList.remove('open'); }
function clearSearch() { document.getElementById('searchInput').value = ""; handleSearch(); }

// ★修正：ストーリー機能 (全画面ビューアーで再生)
function generateStories() {
    const c = document.getElementById('stories-container');
    c.innerHTML = "";
    storiesData = [];
    const seed = new Date().getDate(); 
    function seededRandom(s) { var x = Math.sin(s++) * 10000; return x - Math.floor(x); }

    Object.keys(memberIcons).forEach(m => {
        const items = allData.filter(d => d.member === m);
        if(items.length > 0) {
            const temp = [...items];
            for (let i = temp.length - 1; i > 0; i--) {
                const r = Math.floor(seededRandom(seed + i + m.length) * (i + 1));
                [temp[i], temp[r]] = [temp[r], temp[i]];
            }
            const picks = temp.slice(0, 5);
            storiesData.push({ name: m, icon: picks[0].image, images: picks });
        }
    });

    storiesData.forEach((s, idx) => {
        const el = document.createElement('div');
        el.className = 'story-item';
        el.innerHTML = `<div class="story-ring" id="ring-${idx}"><img class="story-img" src="${s.icon}"></div><div class="story-name">${memberIcons[s.name] || s.name}</div>`;
        el.onclick = () => openStory(idx); // タップで全画面ストーリー起動
        c.appendChild(el);
    });
}

function openStory(idx) {
    currentStoryMemberIndex = idx;
    currentStorySlideIndex = 0;
    document.getElementById(`ring-${idx}`).classList.add('seen');
    document.getElementById('story-viewer').classList.add('active');
    setTheme(storiesData[idx].name);
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
    if(fill) { setTimeout(() => { fill.style.transition = 'width 4s linear'; fill.style.width = '100%'; }, 10); }
    storyTimer = setTimeout(nextStory, 4000);
}

function nextStory() {
    const story = storiesData[currentStoryMemberIndex];
    if (currentStorySlideIndex < story.images.length - 1) {
        currentStorySlideIndex++;
        renderStorySlide();
    } else {
        if (currentStoryMemberIndex < storiesData.length - 1) {
            currentStoryMemberIndex++;
            currentStorySlideIndex = 0;
            setTheme(storiesData[currentStoryMemberIndex].name);
            renderStorySlide();
        } else { closeStory(); }
    }
}

function prevStory() {
    if (currentStorySlideIndex > 0) {
        currentStorySlideIndex--;
        renderStorySlide();
    } else if (currentStoryMemberIndex > 0) {
        currentStoryMemberIndex--;
        currentStorySlideIndex = storiesData[currentStoryMemberIndex].images.length - 1;
        setTheme(storiesData[currentStoryMemberIndex].name);
        renderStorySlide();
    }
}

function closeStory() {
    if(storyTimer) clearTimeout(storyTimer);
    document.getElementById('story-viewer').classList.remove('active');
}

function filterByText(text) {
    const input = document.getElementById('searchInput');
    if(input) { 
        input.value = text; 
        handleSearch(); 
        window.scrollTo({top:0, behavior:'smooth'}); // ページ上部へ移動
    }
}
</script>
