import { lazy } from 'solid-js'
import './App.scss'
import { StoreProvider } from './state'
import { WorkerProvider } from './worker/Worker2'

const Tactics = lazy(() => import('./views/tactics/Show'))

function App() {
  return (<>
  <WorkerProvider>
  <StoreProvider>
      <Tactics />
  </StoreProvider>
    </WorkerProvider>
  </>)
}

export default App
