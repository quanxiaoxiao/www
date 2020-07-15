const path = require('path');
const fs = require('fs');
const tar = require('tar');

module.exports = (ctx) => {
  const _id = ctx.matchs[1] || ctx.db.get(`current.${ctx.resourceName}`).value();
  if (!_id) {
    ctx.throw(404);
  }
  const dirname = path.join(ctx.resourcePath, _id);
  try {
    const stats = fs.statSync(dirname);
    if (!stats.isDirectory()) {
      ctx.throw(404);
    }
  } catch (error) {
    ctx.throw(404);
  }
  return tar.c(
    {
      gzip: true,
      cwd: dirname,
    },
    fs.readdirSync(dirname),
  );
};
