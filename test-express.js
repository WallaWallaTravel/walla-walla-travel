const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.send('Express server is working on port 3000!')
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Express API working' })
})

app.listen(port, '0.0.0.0', () => {
  console.log(`Express server listening at http://0.0.0.0:${port}`)
})