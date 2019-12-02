const pick = require('../pick');

module.exports = (ctx) => {
  const list = ctx
    .db
    .get('records')
    .filter({
      name: ctx.resourceName,
    })
    .value();
  return list.map((item) => pick(item, ctx.resourcePath));
};
