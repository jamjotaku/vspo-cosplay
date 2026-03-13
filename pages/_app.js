// import '../styles/globals.css'  // ← ここが原因。ファイルがない場合はコメントアウト
import GlobalCommander from '../components/GlobalCommander'

function MyApp({ Component, pageProps }) {
  return (
    <GlobalCommander>
      <Component {...pageProps} />
    </GlobalCommander>
  )
}

export default MyApp