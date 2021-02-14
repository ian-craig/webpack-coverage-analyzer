const express = require('express');
const open = require('open');
const app = express();
const port = 3000;

app.use(express.static('.'));
app.use(express.static('./dist'));

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
  open(`http://localhost:${port}`);
});

