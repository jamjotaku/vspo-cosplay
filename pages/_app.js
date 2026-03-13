import '../styles/globals.css' // 既存のグローバルCSS
import GlobalCommander from '../components/GlobalCommander'

function MyApp({ Component, pageProps }) {
  return (
    <GlobalCommander>
      <Component {...pageProps} />
    </GlobalCommander>
  )
}

export default MyApp