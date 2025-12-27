import { useState } from 'react'
import HandTree from './components/HandTree'
import './App.css'

function App() {
  return (
    <div className="app-container">
      <HandTree />
      <div className="instructions">
        <h1>Hand Gesture Tree</h1>
        <p>Open your hand to make the tree grow, close it to make it shrink.</p>
      </div>
    </div>
  )
}

export default App

