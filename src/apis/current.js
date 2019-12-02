const pick = require('../pick');

module.exports = (ctx) => {
  const current = ctx
    .db
    .get(`current.${ctx.resourceName}`)
    .value();
  if (!current) {
    ctx.throw(404);
  }

  const currentItem = ctx
    .db
    .get('records')
    .find({
      _id: current,
    })
    .value();

  if (!currentItem) {
    ctx.throw(404);
  }

  return pick(currentItem, ctx.resourcePath);
};
