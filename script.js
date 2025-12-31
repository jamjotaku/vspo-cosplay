// ==========================================
//  設定エリア
// ==========================================
// ここにGoogleスプレッドシートの「ウェブに公開」したCSVのURLを貼ってください
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgV5MvOa8ZUcpQ9jL1HhYQOLS_y78ZoOnQI96iru-5JZVTrRc5Li4hBkN7igEyB5p73EuaaEfLC38G/pub?gid=0&single=true&output=csv"; 

// ▼▼▼ タグ翻訳辞書（ここを自由に編集してね！） ▼▼▼
// 左がAIの英語タグ、右が検索させたい日本語
const tagMapping = {
    // 【衣装】
    "school_uniform": "制服",
    "maid": "メイド",
    "gym_uniform": "ジャージ 体操服",
    "swimsuit": "水着",
    "bikini": "水着",
    "santa_costume": "サンタ",
    "kimono": "着物 和服",
    "yukata": "浴衣",
    "dress": "ドレス",
    "china_dress": "チャイナ",
    "hoodie": "パーカー",
    "jacket": "ジャケット アウター",

    // 【特徴・アクセサリ】
    "glasses": "眼鏡 メガネ",
    "animal_ears": "猫耳 ケモミミ",
    "cat_ears": "猫耳",
    "headphones": "ヘッドホン",
    "mask": "マスク",
    "twintails": "ツインテール",
    "ponytail": "ポニーテール",
    "short_hair": "ショート",
    "long_hair": "ロング",
    "blue_hair": "青髪", // 色も必要なら追加OK
    "blonde_hair": "金髪"
};

// ==========================================
//  ここから下はプログラム本体（触らなくてOK）
// ==========================================
let allData = []; // 全データをここに入れる

// ページが読み込まれたらスタート
window.onload = function() {
    loadCSV();
};

// CSVを読み込む関数
function loadCSV() {
    Papa.parse(CSV_URL, {
        download: true,
        header: true, // 1行目を列名として扱う
        complete: function(results) {
            // データの前処理（タグ翻訳）
            allData = results.data.map(row => {
                // E列（タグ列）を取得 ※列名が 'タグ' である前提
                const rawTags = row["タグ"] || ""; 
                
                // 検索用の「全部入りテキスト」を作る
                // 名前 + カテゴリ + URL(念のため)
                let searchKeywords = (row["名前"] || "") + " " + (row["カテゴリ"] || "");

                // 辞書を使って、英語タグを日本語に変換してキーワードに追加
                for (const [engTag, japWord] of Object.entries(tagMapping)) {
                    if (rawTags.includes(engTag)) {
                        searchKeywords += " " + japWord; 
                    }
                }

                // 処理したデータを返す
                return {
                    name: row["名前"],
                    image: row["画像URL"],
                    category: row["カテゴリ"], // 必要なら使う
                    keywords: searchKeywords.toLowerCase() // 検索しやすいように小文字化
                };
            }).filter(item => item.image); // URLがない空行は除外

            // 最初は全件表示
            displayImages(allData);
        }
    });
}

// 画像を表示する関数
function displayImages(data) {
    const gallery = document.getElementById('gallery'); // 画像置き場のID
    gallery.innerHTML = ""; // 一旦空っぽにする

    data.forEach(item => {
        // 画像を表示するHTMLを作る（divやimgタグなど）
        // ※今のあなたのサイトのHTMLに合わせて調整が必要かも
        const div = document.createElement('div');
        div.className = "image-card"; // CSSのクラス名
        
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = item.name;
        
        // 画像をクリックしたら大きく表示（もしあれば）
        // img.onclick = ... 

        const p = document.createElement('p');
        p.textContent = item.name;

        div.appendChild(img);
        div.appendChild(p);
        gallery.appendChild(div);
    });
    
    // 件数を表示（もしあれば）
    const countEl = document.getElementById('image-count');
    if(countEl) countEl.textContent = data.length + "件";
}

// 検索フィルター関数（検索ボタンや入力時に呼ぶ）
function filterImages() {
    const searchInput = document.getElementById('search-input'); // 検索窓のID
    if (!searchInput) return;

    const searchText = searchInput.value.toLowerCase(); // 小文字に統一
    
    // キーワードが含まれているものだけ残す
    const filtered = allData.filter(item => {
        // スペース区切りでAND検索（「制服 眼鏡」なら両方持ってるやつ）
        const words = searchText.split(/\s+/); 
        return words.every(word => item.keywords.includes(word));
    });

    displayImages(filtered);
}
