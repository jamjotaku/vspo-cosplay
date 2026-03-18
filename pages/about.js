import Head from 'next/head';
import Link from 'next/link';

export default function About() {
  return (
    <div className="legal-container">
      <Head>
        <title>著作権・肖像権および免責事項について - VSPO! COSPLAY HUB</title>
      </Head>

      <header className="legal-header">
        <h1>著作権・肖像権および免責事項について</h1>
        <p className="update-date">最終更新日：2026年3月18日</p>
      </header>

      <main className="legal-content">
        <section>
          <h2>1. 本サイトの性質について</h2>
          <p>
            本ウェブサイト「VSPO! COSPLAY HUB」および提供される各種ウィジェットアプリ（以下「本サービス」）は、
            個人が趣味で運営する<strong>非公式のファンプロジェクト</strong>です。
            株式会社Brave Group、および「ぶいすぽっ！」公式とは一切関係がありません。
          </p>
        </section>

        <section>
          <h2>2. 著作権・肖像権の帰属</h2>
          <ul>
            <li>
              <strong>公式コンテンツ：</strong>
              「ぶいすぽっ！」に関連するキャラクター、ロゴ、名称等の著作権は、株式会社Brave Groupおよび各権利者に帰属します。
            </li>
            <li>
              <strong>コスプレ写真・画像：</strong>
              掲載されているコスプレ写真等の肖像権はモデル（コスプレイヤー）様に、著作権は撮影者（カメラマン）様に帰属します。
            </li>
          </ul>
        </section>

        <section className="highlight">
          <h2>3. 著作者人格権への配慮と改変について</h2>
          <p>
            本サービスでは、作品の魅力をファンの皆様に届けるため、ウィジェットという形式で画像を表示しています。
            その際、システム上の制約により、意図しないトリミングやUIの重なり、演出上のエフェクトが発生する場合がございます。
          </p>
          <p>
            これらが著作者様の意図に反する「改変」にあたると判断される場合は、<strong>即座に表示の修正、または掲載の停止を無条件で行います。</strong>
            制作者様の想いと、作品の同一性を第一に尊重いたします。
          </p>
        </section>

        <section>
          <h2>4. 掲載の停止・削除依頼について</h2>
          <p>
            掲載を希望されない権利者様（モデル様、撮影者様等）は、以下の窓口よりご連絡ください。
            ご本人確認の後、速やかに削除・除外対応を実行いたします。
          </p>
          <div className="contact-box">
            <a href="https://docs.google.com/forms/d/e/1FAIpQLScOeevJJLGm7kWo48V9YR4xAWYBU7vSBHKZQPnFCdEljE1-xQ/viewform?usp=dialog" target="_blank" rel="noreferrer" className="btn">削除申請用フォーム</a>
            <p>※または運営者のSNS（@アカウント名）のダイレクトメッセージまでご連絡ください。</p>
          </div>
        </section>

        <section>
          <h2>5. 利用者の責任</h2>
          <p>
            本サービスの利用により生じたトラブルや損害について、開発者は一切の責任を負いません。
            各権利者の権利を侵害する行為（無断転載、商用利用、誹謗中傷等）を固く禁じます。
          </p>
        </section>
      </main>

      <footer className="legal-footer">
        <Link href="/">ポータル画面に戻る</Link>
      </footer>

      <style jsx>{`
        .legal-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 60px 20px;
          font-family: "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif;
          color: #333;
          line-height: 1.8;
          background: #fff;
        }
        .legal-header {
          border-bottom: 2px solid #000;
          margin-bottom: 40px;
          padding-bottom: 20px;
        }
        h1 { font-size: 24px; font-weight: bold; margin: 0; }
        h2 { font-size: 18px; border-left: 4px solid #000; padding-left: 15px; margin: 40px 0 20px; }
        .update-date { font-size: 12px; color: #666; }
        .legal-content p { margin-bottom: 20px; }
        ul { margin-bottom: 20px; padding-left: 20px; }
        li { margin-bottom: 10px; }
        .highlight {
          background: #fdf2f2;
          padding: 25px;
          border: 1px solid #e53e3e;
          border-radius: 4px;
        }
        .contact-box {
          background: #f7fafc;
          padding: 30px;
          text-align: center;
          border-radius: 4px;
        }
        .btn {
          display: inline-block;
          background: #000;
          color: #fff;
          padding: 15px 30px;
          text-decoration: none;
          font-weight: bold;
          border-radius: 4px;
          margin-bottom: 15px;
        }
        .legal-footer {
          margin-top: 60px;
          text-align: center;
          border-top: 1px solid #eee;
          padding-top: 30px;
        }
        .legal-footer a { color: #0070f3; text-decoration: underline; }
      `}</style>
    </div>
  );
}
