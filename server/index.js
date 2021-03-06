const express = require('express');
const fs = require('fs');
const { resolve } = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const { promisify } = require('util');

const app = express();
const port = 3001;
let baseDir = resolve(__dirname, '..', 'project');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

app.use(cors());
app.use(bodyParser.json());

async function onCreateOrUpdate(req, res, isCreate) {
  try {
    const { filepath, content } = req.body;
    const absPath = resolve(baseDir, filepath);
    const len = content.length;
    const flag = isCreate ? 'wx' : 'r+';
    await writeFile(absPath, content, { flag });
    console.log(`successfully ${isCreate ? 'created' : 'updated' } ${filepath}. Written ${len} bytes.`);
    res.send({ success: true, msg: len });
  } catch(err) {
    console.log(`error in ${isCreate ? 'create': 'update'} file`, err);
    res.status(500).send({ success: false, msg: err.message });
  }
}

async function getFileObjs(files, folder) {
  const fileObjs = [];
  for (let i=0, ii=files.length; i < ii; i++) {
    const fileStat = await stat(resolve(folder, files[i]));
    fileObjs.push({ name: files[i], isDir: fileStat.isDirectory() });
  }
  return fileObjs;
}

async function onListFiles(req, res) {
  try {
    const { folderpath } = req.params;
    const absPath = resolve(baseDir, folderpath || '');
    const files = await readdir(absPath);
    console.log(`successfully read folder ${folderpath}. ${files.length} files were found.`);
    const fileObjs = await getFileObjs(files, absPath);
    res.send({ success: true, msg: fileObjs });
  } catch(err) {
    console.log('error in read folder', err);
    res.status(500).send({ success: false, msg: err.message });
  }
}

async function onGetFileContents(req, res) {
  try {
    const { filepath } = req.params;
    const absPath = resolve(baseDir, filepath || '');
    const content = await readFile(absPath);
    res.send({ success: true, msg: content.toString() });
  } catch(err) {
    console.log('error in read file', err);
    res.status(500).send({ success: false, msg: err.message });
  }
}

app.post('/file', async (req, res) => {
  onCreateOrUpdate(req, res, true);
});

app.put('/file', async (req, res) => {
  onCreateOrUpdate(req, res);
});

app.get('/file/?', onGetFileContents);
app.get('/file/:filepath', onGetFileContents);

app.get('/folder/?', onListFiles);
app.get('/folder/:folderpath', onListFiles);

app.get('*', (req, res) => {
  console.log('fallback route', req.url);
  res.send('cool beans');
});

app.listen(port, () => {
  console.log(`server is listening at port ${port}`);
});