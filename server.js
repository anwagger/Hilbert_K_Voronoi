import express from 'express'

import * as linear from "./test.mjs"

const app = express();
const port = 3000;

app.use(express.static('./'));

app.get('/', (req, res) => {
  res.sendFile('index.html',{root:"./"});
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
