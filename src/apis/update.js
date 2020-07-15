module.exports = (ctx) => {
  const _id = ctx.matchs[1];
  const item = ctx
    .db
    .get('records')
    .find({
      _id,
      name: ctx.resourceName,
    })
    .value();
  if (!item) {
    ctx.throw(404);
  }
  ctx
    .db
    .set(`current.${ctx.resourceName}`, _id)
    .write();
  return _id;
};
