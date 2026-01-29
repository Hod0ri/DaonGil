import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Accessing backend
    axios.get('http://localhost:8000/')
      .then(res => setMessage(res.data.message))
      .catch(err => console.error(err))
  }, [])

  return (
    <>
      <h1>DaonGil</h1>
      <p>Backend says: {message}</p>
    </>
  )
}

export default App
