import React from 'react'
import { Overlay } from './Overlay'
import { MainWindow } from './MainWindow'

function App(): JSX.Element {
  const params = new URLSearchParams(window.location.search)
  if (params.get('overlay') === 'true') return <Overlay />
  return <MainWindow />
}

export default App
