import React, { useEffect } from 'react';


export default function App() {
  useEffect(() => {
  fetch(`${import.meta.env.VITE_API_BASE_URL}/health`)
    .then(res => res.json())
    .then(data => console.log(data))
    .catch(err => console.error(err));
}, []);


  return <h1>Hello from Vite + React in Docker!</h1>
}

