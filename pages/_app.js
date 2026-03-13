// pages/_app.js
// GlobalCommander のインポートと適用を完全に削除します
function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />
}

export default MyApp