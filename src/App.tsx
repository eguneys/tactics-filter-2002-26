import { lazy } from 'solid-js'
import './App.scss'
import { StoreProvider } from './state'

const Tactics = lazy(() => import('./views/tactics/Show'))

function App() {
  return (<>
  <StoreProvider>
      <Tactics />
  </StoreProvider>
  </>)
}

export default App
