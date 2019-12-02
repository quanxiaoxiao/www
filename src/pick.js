const path = require('path');
const fs = require('fs');

const _ = require('lodash');

module.exports = (d, basedir) => ({
  ..._.pick(d, ['_id', 'name', 'message', 'tag', 'timeCreate']),
  list: d.list.map((fileItem) => {
    const stats = fs.statSync(path.resolve(basedir, d._id, fileItem.path));
    return {
      path: fileItem.path,
      hash: fileItem.hash,
      size: stats.size,
    };
  }),
});
