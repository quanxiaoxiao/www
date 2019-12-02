module.exports = (ctx) => {
  const id = ctx.matchs[1];
  const item = ctx
    .db
    .get('records')
    .find({
      _id: id,
      name: ctx.resourceName,
    })
    .value();
  if (!item) {
    ctx.throw(404);
  }
  ctx
    .db
    .set(`current.${ctx.resourceName}`, id)
    .write();
  return id;
};
