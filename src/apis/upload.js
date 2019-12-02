/* eslint no-use-before-define:0 */
const util = require('util');

const uuid = require('uuid');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const onFinished = require('on-finished');
const tar = require('tar');

const getFileList = (pathName) => {
  const stats = fs.statSync(pathName);
  if (!stats.isDirectory()) {
    return [pathName];
  }
  const result = [];
  const fileList = fs.readdirSync(pathName);
  for (let i = 0; i < fileList.length; i++) {
    result.push(...getFileList(path.join(pathName, fileList[i])));
  }
  return result;
};

module.exports = async (ctx) => {
  const id = uuid();
  const dirname = path.join(ctx.resourcePath, id);
  fs.mkdirSync(dirname);

  ctx.req.pipe(tar.x({
    strip: 1,
    C: dirname,
  }));

  await util.promisify(onFinished)(ctx.req);

  const { db } = ctx;

  const now = Date.now();

  const resourceList = getFileList(dirname);

  db
    .get('records')
    .push({
      _id: id,
      name: ctx.resourceName,
      message: ctx.query.message || '',
      timeCreate: now,
      tag: ctx.query.tag || null,
      list: resourceList.map((filePathname) => {
        const buf = fs.readFileSync(filePathname);
        const hash = crypto.createHash('sha256');
        hash.update(buf);
        return {
          path: filePathname.slice(dirname.length + 1),
          hash: hash.digest('hex'),
        };
      }),
    })
    .write();


  db
    .set(`current.${ctx.resourceName}`, id)
    .write();

  return id;
};
