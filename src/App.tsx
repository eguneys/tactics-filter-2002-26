import { createEffect } from 'solid-js'
import './App.scss'
import { StoreProvider, useStore } from './state'

function App() {
  return (<>
  <StoreProvider>
      <Tactics />
  </StoreProvider>
  </>)
}

function Tactics() {
  let [{ tactics }] = useStore()

  createEffect(() => {

  console.log(tactics.a_hundred.length)
  })

  return (
    <>
    <main class='tactics-filter'>

    </main>
    </>
  )
}

export default App
