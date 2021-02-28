const express = require('express');
const app = express();
const port = 3000;

app.use(express.static('./sample/public'));
app.use(express.static('./sample/dist'));

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

